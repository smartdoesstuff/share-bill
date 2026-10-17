import { timingSafeEqual } from 'node:crypto';
import express, { NextFunction, Request, Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpServer } from './server';

const router = express.Router();

/** Optional shared secret: set MCP_API_KEY and clients must send `Authorization: Bearer <key>`. */
function requireApiKey(req: Request, res: Response, next: NextFunction) {
    const expected = process.env.MCP_API_KEY;
    if (!expected) return next();

    const header = req.header('authorization') ?? '';
    const given = header.startsWith('Bearer ') ? header.slice(7) : '';
    const a = Buffer.from(given);
    const b = Buffer.from(expected);
    if (a.length === b.length && timingSafeEqual(a, b)) return next();

    res.status(401).set('WWW-Authenticate', 'Bearer').json({
        jsonrpc: '2.0',
        error: { code: -32001, message: 'Unauthorized' },
        id: null,
    });
}

router.use(requireApiKey);

/**
 * Stateless Streamable HTTP endpoint (MCP spec 2025-03-26+). A fresh server/transport pair
 * is created per request, so it scales horizontally and works with any MCP client
 * (Claude, ChatGPT connectors, Cursor, VS Code, MCP Inspector, ...).
 */
router.post('/', async (req: Request, res: Response) => {
    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => {
        transport.close();
        server.close();
    });

    try {
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
    } catch (error) {
        console.error('MCP request failed:', error);
        if (!res.headersSent) {
            res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null });
        }
    }
});

const methodNotAllowed = (_req: Request, res: Response) => {
    res.status(405).set('Allow', 'POST').json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Method not allowed: this MCP server is stateless, use POST.' },
        id: null,
    });
};
router.get('/', methodNotAllowed);
router.delete('/', methodNotAllowed);

export default router;
