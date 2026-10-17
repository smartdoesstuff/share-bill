import Session from '../models/Session';

/**
 * Minimal in-memory stand-in for the Mongoose model, covering exactly the queries
 * sessionService issues, so concurrency logic can be tested without a MongoDB server.
 */
export function installFakeSessionModel() {
    const store = new Map<string, any>();
    const M = Session as any;

    const matches = (doc: any, filter: any): boolean => {
        if (filter.sessionId !== undefined && doc.sessionId !== filter.sessionId) return false;
        if (filter.version !== undefined && (doc.version ?? 0) !== filter.version) return false;
        if (filter.$or) return filter.$or.some((f: any) => matches(doc, { ...f, sessionId: filter.sessionId }));
        return true;
    };

    M.findOne = (filter: any) => ({
        lean: async () => {
            const doc = store.get(filter.sessionId);
            return doc ? structuredClone(doc) : null;
        },
    });

    M.findOneAndUpdate = async (filter: any, update: any, opts: any) => {
        let doc = store.get(filter.sessionId);
        if (!doc && opts?.upsert) {
            doc = structuredClone(update.$setOnInsert);
            store.set(doc.sessionId, doc);
            return structuredClone(doc);
        }
        if (!doc || !matches(doc, filter)) return null;
        Object.assign(doc, structuredClone(update.$set ?? {}));
        if (update.$inc?.version) doc.version = (doc.version ?? 0) + update.$inc.version;
        return structuredClone(doc);
    };

    return { store };
}
