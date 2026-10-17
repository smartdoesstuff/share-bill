import { SessionData } from "../types";

type WithId = { id: string };

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Three-way merge of a list of records keyed by `id`.
 *  - base:   what the server had when this client last synced
 *  - local:  what this client has now
 *  - remote: what the server has now
 * Local changes (adds, edits, deletes) win; everything else follows the server.
 */
export function mergeById<T extends WithId>(base: T[], local: T[], remote: T[]): T[] {
    const baseById = new Map(base.map((x) => [x.id, x]));
    const localById = new Map(local.map((x) => [x.id, x]));

    const result: T[] = [];
    const seen = new Set<string>();

    // Keep the server's order, apply local decisions on top.
    for (const r of remote) {
        seen.add(r.id);
        const b = baseById.get(r.id);
        const l = localById.get(r.id);
        if (!l) {
            // Missing locally: deleted here if we knew it before, otherwise it is new from the server.
            if (!b) result.push(r);
            continue;
        }
        result.push(b && same(b, l) ? r : l);
    }
    // Added locally (never seen by the server) or edited locally but deleted remotely.
    for (const l of local) {
        if (seen.has(l.id)) continue;
        const b = baseById.get(l.id);
        if (!b || !same(b, l)) result.push(l);
    }
    return result;
}

function mergeSet(base: string[], local: string[], remote: string[]): string[] {
    const b = new Set(base);
    const l = new Set(local);
    const out = new Set(remote);
    local.forEach((x) => !b.has(x) && out.add(x));
    base.forEach((x) => !l.has(x) && out.delete(x));
    return Array.from(out);
}

export function mergeSessionData(base: SessionData, local: SessionData, remote: SessionData): SessionData {
    return {
        friends: mergeById(base.friends, local.friends, remote.friends),
        orders: mergeById(base.orders, local.orders, remote.orders),
        paidDebts: mergeSet(base.paidDebts, local.paidDebts, remote.paidDebts),
    };
}
