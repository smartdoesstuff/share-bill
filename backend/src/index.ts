import express, { Application, NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import sessionRoutes from './routes/sessions';
import mcpRoutes from './mcp/http';

dotenv.config();

const app: Application = express();
const PORT = Number(process.env.PORT) || 5050;
const CONNECTION_URL = process.env.MONGODB_URI || process.env.MONGO_URI;

app.disable('x-powered-by');
app.use(
    cors({
        origin: '*',
        allowedHeaders: ['Content-Type', 'Authorization', 'Mcp-Session-Id', 'Mcp-Protocol-Version', 'Last-Event-ID'],
        exposedHeaders: ['Mcp-Session-Id'],
    })
);
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
    res.status(mongoose.connection.readyState === 1 ? 200 : 503).json({ ok: mongoose.connection.readyState === 1 });
});

app.use('/api/sessions', sessionRoutes);
app.use('/mcp', mcpRoutes);

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
    if ((error as any).type === 'entity.parse.failed') {
        res.status(400).json({ error: 'invalid_json' });
        return;
    }
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'internal_error' });
});

async function main() {
    if (!CONNECTION_URL) {
        throw new Error('MONGODB_URI is not set');
    }
    await mongoose.connect(CONNECTION_URL);
    console.log('Connected to MongoDB');
    app.listen(PORT, () => console.log(`Server running on port ${PORT} (REST: /api/sessions, MCP: /mcp)`));
}

main().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
