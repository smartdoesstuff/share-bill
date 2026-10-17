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
        paidBy: o.paidBy,
        assignedTo: [...(o.assignedTo ?? [])],
    })),
    paidDebts: [...(doc.paidDebts ?? [])],
    version: doc.version ?? 0,
});

export async function getSession(sessionId: string): Promise<SessionState | null> {
    const doc = await Session.findOne({ sessionId }).lean();
    return doc ? toState(doc) : null;
}

/** Returns the session, creating an empty one on first access. Safe under concurrent calls. */
export async function getOrCreateSession(sessionId: string): Promise<SessionState> {
    try {
        const doc = await Session.findOneAndUpdate(
            { sessionId },
            { $setOnInsert: { sessionId, friends: [], orders: [], paidDebts: [], version: 0 } },
            { upsert: true, new: true, lean: true }
        );
        return toState(doc);
    } catch (error: any) {
        // Two first requests raced on the unique index: the loser just reads the winner's document.
        if (error?.code === 11000) {
            const doc = await Session.findOne({ sessionId }).lean();
            if (doc) return toState(doc);
        }
        throw error;
    }
}

export type WriteResult = { ok: true; session: SessionState } | { ok: false; session: SessionState };

/**
 * Compare-and-set write. It only succeeds when the stored version still equals `baseVersion`,
 * so a client holding stale (or never-loaded) data can never overwrite newer data.
 */
export async function writeSession(
    sessionId: string,
    baseVersion: number,
    data: SessionDraft
): Promise<WriteResult> {
    // Documents created before versioning have no `version` field: treat them as 0.
    const versionFilter =
        baseVersion === 0 ? { $or: [{ version: 0 }, { version: { $exists: false } }] } : { version: baseVersion };

    const updated = await Session.findOneAndUpdate(
        { sessionId, ...versionFilter },
        {
            $set: { friends: data.friends, orders: data.orders, paidDebts: data.paidDebts },
            $inc: { version: 1 },
        },
        { new: true, lean: true }
    );
    if (updated) return { ok: true, session: toState(updated) };

    const current = await getOrCreateSession(sessionId);
    return { ok: false, session: current };
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
        const current = await getOrCreateSession(sessionId);
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
