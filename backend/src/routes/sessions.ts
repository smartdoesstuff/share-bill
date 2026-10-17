import express, { Request, Response } from 'express';
import { ZodError } from 'zod';
import { sessionBodySchema, sessionIdSchema } from '../lib/schemas';
import { loadSession, toDraft, writeSession } from '../services/sessionService';

const router = express.Router();

const parseSessionId = (req: Request, res: Response): string | null => {
    const parsed = sessionIdSchema.safeParse(req.params.sessionId);
    if (!parsed.success) {
        res.status(400).json({ error: 'invalid_session_id', message: parsed.error.issues[0]?.message });
        return null;
    }
    return parsed.data;
};

/**
 * GET /api/sessions/:sessionId
 * Returns the session, or an empty one that is only stored by the first PUT. With `?since=<version>` it answers
 * `{ unchanged: true }` when nothing changed, which keeps polling cheap.
 */
router.get('/:sessionId', async (req: Request, res: Response) => {
    const sessionId = parseSessionId(req, res);
    if (!sessionId) return;

    try {
        const session = await loadSession(sessionId);
        const since = Number(req.query.since);
        if (req.query.since !== undefined && Number.isInteger(since) && since === session.version) {
            res.status(200).json({ unchanged: true, version: session.version });
            return;
        }
        res.set('Cache-Control', 'no-store');
        res.status(200).json(session);
    } catch (error) {
        console.error('Error fetching session data:', error);
        res.status(500).json({ error: 'internal_error' });
    }
});

/**
 * PUT /api/sessions/:sessionId
 * Compare-and-set write. `baseVersion` must match the stored version, otherwise
 * 409 is returned together with the latest state so the client can reconcile.
 */
router.put('/:sessionId', async (req: Request, res: Response) => {
    const sessionId = parseSessionId(req, res);
    if (!sessionId) return;

    try {
        const body = sessionBodySchema.parse(req.body);
        const result = await writeSession(sessionId, body.baseVersion, toDraft(body));
        if (!result.ok) {
            res.status(409).json({ error: 'version_conflict', session: result.session });
            return;
        }
        res.status(200).json(result.session);
    } catch (error) {
        if (error instanceof ZodError) {
            res.status(400).json({ error: 'invalid_body', issues: error.issues });
            return;
        }
        console.error('Error updating session data:', error);
        res.status(500).json({ error: 'internal_error' });
    }
});

export default router;
