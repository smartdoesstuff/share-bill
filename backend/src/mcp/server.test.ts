import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { installFakeSessionModel } from '../test/fakeSession';
import { createMcpServer } from './server';

async function connect() {
    installFakeSessionModel();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await createMcpServer().connect(serverTransport);
    const client = new Client({ name: 'test', version: '0.0.0' });
    await client.connect(clientTransport);
    const call = async (name: string, args: Record<string, unknown>) => {
        const res: any = await client.callTool({ name, arguments: args });
        return { isError: !!res.isError, data: res.structuredContent, text: res.content?.[0]?.text as string };
    };
    return { client, call };
}

test('exposes the expected tools with annotations', async () => {
    const { client } = await connect();
    const { tools } = await client.listTools();
    assert.deepEqual(
        tools.map((t) => t.name).sort(),
        ['add_friends', 'add_orders', 'create_session', 'get_session', 'get_summary', 'remove_friend', 'remove_order', 'set_transfer_done', 'update_friend', 'update_order']
    );
    assert.equal(tools.find((t) => t.name === 'get_summary')?.annotations?.readOnlyHint, true);
});

test('full flow: friends, orders by name, summary, transfer done', async () => {
    const { call } = await connect();
    const { data: created } = await call('create_session', {});
    const sessionId = created!.sessionId as string;

    await call('add_friends', { sessionId, friends: [{ name: 'Ann' }, { name: 'Bob', paymentAddress: '081-234-5678' }, { name: 'Cat' }] });
    await call('add_orders', {
        sessionId,
        orders: [
            { description: 'Dinner', amount: 300, paidBy: 'ann' },
            { description: 'Taxi', amount: 90, paidBy: 'Bob', sharedWith: ['Bob', 'Cat'] },
        ],
    });

    const { data: summary } = await call('get_summary', { sessionId });
    assert.equal(summary!.totalSpent, 390);
    const transfers = (summary!.settlements as any[]).map((s) => `${s.from}->${s.to}:${s.amount}`).sort();
    assert.deepEqual(transfers, ['Bob->Ann:55', 'Cat->Ann:145'].sort());

    const done = await call('set_transfer_done', { sessionId, from: 'Cat', to: 'Ann', done: true });
    assert.equal((done.data!.settlements as any[]).find((s) => s.from === 'Cat').transferred, true);
});

test('domain errors come back as readable tool errors', async () => {
    const { call } = await connect();
    const { data } = await call('create_session', {});
    const sessionId = data!.sessionId as string;
    await call('add_friends', { sessionId, friends: [{ name: 'Ann' }] });

    const res = await call('add_orders', { sessionId, orders: [{ description: 'X', amount: 10, paidBy: 'Zed' }] });
    assert.equal(res.isError, true);
    assert.match(res.text, /No friend named "Zed"\. Existing friends: Ann/);
});

test('cannot remove a friend who paid for an order', async () => {
    const { call } = await connect();
    const { data } = await call('create_session', {});
    const sessionId = data!.sessionId as string;
    await call('add_friends', { sessionId, friends: [{ name: 'Ann' }, { name: 'Bob' }] });
    await call('add_orders', { sessionId, orders: [{ description: 'Lunch', amount: 100, paidBy: 'Ann' }] });
    const res = await call('remove_friend', { sessionId, friend: 'Ann' });
    assert.equal(res.isError, true);
    assert.match(res.text, /Lunch/);
});
