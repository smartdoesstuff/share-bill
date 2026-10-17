import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer } from './server';

// Entry point for local MCP clients that spawn a process (Claude Desktop, Claude Code, Cursor, ...).
// stdout is reserved for the protocol: log to stderr only.
dotenv.config();
console.log = (...args: unknown[]) => console.error(...args);

async function main() {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) throw new Error('MONGODB_URI is not set');
    await mongoose.connect(uri);
    await createMcpServer().connect(new StdioServerTransport());
    console.error('share-bill MCP server running on stdio');
}

main().catch((error) => {
    console.error('Failed to start MCP stdio server:', error);
    process.exit(1);
});
