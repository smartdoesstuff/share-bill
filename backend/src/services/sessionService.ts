import Session, { ISession } from '../models/Session';
import { SessionBody } from '../lib/schemas';

export type SessionState = Pick<ISession, 'sessionId' | 'friends' | 'orders' | 'paidDebts' | 'version'>;
export type SessionDraft = Pick<SessionState, 'friends' | 'orders' | 'paidDebts'>;

export class DomainError extends Error {}

const toState = (doc: any): SessionState => ({
    sessionId: doc.sessionId,
    friends: (doc.friends ?? []).map((f: any) => ({
        id: f.id,
        name: f.name,
        paid: !!f.paid,
        ...(f.paymentAddress ? { paymentAddress: f.paymentAddress } : {}),
        ...(typeof f.avatar === 'number' ? { avatar: f.avatar } : {}),
    })),
    orders: (doc.orders ?? []).map((o: any) => ({
        id: o.id,
        description: o.description,
        amount: o.amount,
        // Documents saved before multi-payer support only have `paidBy`.
        payers: o.payers?.length
            ? o.payers.map((p: any) => ({ id: p.id, amount: p.amount }))
            : [{ id: o.paidBy, amount: o.amount }],
        assignedTo: [...(o.assignedTo ?? [])],
    })),
    paidDebts: [...(doc.paidDebts ?? [])],
    version: doc.version ?? 0,
});

export async function getSession(sessionId: string): Promise<SessionState | null> {
    const doc = await Session.findOne({ sessionId }).lean();
    return doc ? toState(doc) : null;
}

const emptyState = (sessionId: string): SessionState => ({ sessionId, friends: [], orders: [], paidDebts: [], version: 0 });

/**
 * Returns the stored session, or an empty version-0 one when it does not exist yet.
 * Reading never writes: the document is only created by the first real edit (see writeSession),
 * so visitors, link previews and bots cost nothing.
 */
export async function loadSession(sessionId: string): Promise<SessionState> {
    return (await getSession(sessionId)) ?? emptyState(sessionId);
}

export type WriteResult = { ok: true; session: SessionState } | { ok: false; session: SessionState };

/**
 * Compare-and-set write. It only succeeds when the stored version still equals `baseVersion`,
 * so a client holding stale (or never-loaded) data can never overwrite newer data.
 * A write based on version 0 creates the document if it does not exist yet.
 */
export async function writeSession(
    sessionId: string,
    baseVersion: number,
    data: SessionDraft
): Promise<WriteResult> {
    const isFirstWrite = baseVersion === 0;
    // Documents created before versioning have no `version` field: treat them as 0.
    const filter = isFirstWrite
        ? { sessionId, $or: [{ version: 0 }, { version: { $exists: false } }] }
        : { sessionId, version: baseVersion };

    try {
        const updated = await Session.findOneAndUpdate(
            filter,
            {
                $set: { friends: data.friends, orders: data.orders, paidDebts: data.paidDebts },
                $inc: { version: 1 },
            },
            { new: true, lean: true, upsert: isFirstWrite }
        );
        if (updated) return { ok: true, session: toState(updated) };
    } catch (error: any) {
        // Upsert collided with an existing document whose version moved on: that is a plain conflict.
        if (error?.code !== 11000) throw error;
    }

    return { ok: false, session: await loadSession(sessionId) };
}

export const toDraft = (body: SessionBody): SessionDraft => ({
    friends: body.friends.map((f) => ({ ...f, paid: !!f.paid })),
    orders: body.orders,
    paidDebts: body.paidDebts,
});

/**
 * Read-modify-write with automatic retry on version conflicts. Used by server-side
 * callers (MCP tools) that must not clobber edits made from the web UI at the same time.
 */
export async function mutateSession<T>(
    sessionId: string,
    mutator: (draft: SessionDraft) => T,
    maxAttempts = 5
): Promise<{ session: SessionState; result: T }> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const current = await loadSession(sessionId);
        const draft: SessionDraft = structuredClone({
            friends: current.friends,
            orders: current.orders,
            paidDebts: current.paidDebts,
        });
        const result = mutator(draft);
        const written = await writeSession(sessionId, current.version, draft);
        if (written.ok) return { session: written.session, result };
    }
    throw new DomainError('The session is being edited too frequently, please try again.');
}
