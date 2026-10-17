import express from 'express';
import cors from 'cors';
import sessionRoutes from '../routes/sessions';
import mcpRoutes from '../mcp/http';
import { installFakeSessionModel } from './fakeSession';

/**
 * Runs the real REST + MCP routers on an in-memory store, so the app can be tried
 * without MongoDB. Set GET_DELAY_MS to simulate a slow network when loading a session.
 */
installFakeSessionModel();

const app = express();
app.use(cors({ origin: '*', exposedHeaders: ['Mcp-Session-Id'] }));
app.use(express.json());
const delay = Number(process.env.GET_DELAY_MS) || 0;
app.use('/api/sessions', (req, _res, next) => (req.method === 'GET' && delay ? setTimeout(next, delay) : next()));
app.use('/api/sessions', sessionRoutes);
app.use('/mcp', mcpRoutes);

const port = Number(process.env.PORT) || 5050;
app.listen(port, () => console.log(`In-memory share-bill server on :${port}`));
