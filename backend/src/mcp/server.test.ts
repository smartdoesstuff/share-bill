import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { installFakeSessionModel } from '../test/fakeSession';
import { createMcpServer } from './server';

async function connect() {
    const { store } = installFakeSessionModel();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await createMcpServer().connect(serverTransport);
    const client = new Client({ name: 'test', version: '0.0.0' });
    await client.connect(clientTransport);
    const call = async (name: string, args: Record<string, unknown>) => {
        const res: any = await client.callTool({ name, arguments: args });
        return { isError: !!res.isError, data: res.structuredContent, text: res.content?.[0]?.text as string };
    };
    const start = async (names = ['Ann', 'Bob', 'Cat']) => {
        const { data } = await call('create_session', {});
        const sessionId = data!.sessionId as string;
        await call('add_friends', { sessionId, friends: names.map((name) => ({ name })) });
        return sessionId;
    };
    return { client, call, store, start };
}

test('exposes the expected tools with annotations', async () => {
    const { client } = await connect();
    const { tools } = await client.listTools();
    assert.deepEqual(
        tools.map((t) => t.name).sort(),
        [
            'add_bill', 'add_friends', 'add_items', 'assign_by_tag', 'create_session', 'get_session', 'get_summary', 'remove_bill',
            'remove_friend', 'remove_item', 'set_transfer_done', 'update_bill', 'update_friend', 'update_item',
        ]
    );
    assert.equal(tools.find((t) => t.name === 'get_summary')?.annotations?.readOnlyHint, true);
});

test('restaurant bill with item discount, bill discount, service charge and VAT paid by two people', async () => {
    const { call, start } = await connect();
    const sessionId = await start();

    const res = await call('add_bill', {
        sessionId,
        name: 'Shabu',
        items: [
            { name: 'Meat set', price: 400, sharedWith: ['Ann', 'Bob'] },
            { name: 'Drinks', price: 100, discount: { type: 'percent', value: 50 }, sharedWith: ['Cat'] },
            { name: 'Veggies', price: 150 },
        ],
        discount: { type: 'amount', value: 50 },
        servicePercent: 10,
        vatPercent: 7,
        payers: [{ friend: 'Ann' }, { friend: 'Bob' }],
    });
    assert.equal(res.isError, false);
    const bill = (res.data!.bills as any[])[0];
    // 400 + 50 + 150 = 600; -50 = 550; +10% = 605; +7% VAT = 647.35
    assert.equal(bill.subtotal, 600);
    assert.equal(bill.discountAmount, 50);
    assert.equal(bill.serviceCharge, 55);
    assert.equal(bill.vat, 42.35);
    assert.equal(bill.total, 647.35);
    assert.deepEqual(bill.payers.map((p: any) => p.amount), [323.68, 323.67]);
    assert.equal(bill.owes.reduce((s: number, o: any) => s + o.amount, 0).toFixed(2), '647.35');

    const { data: summary } = await call('get_summary', { sessionId });
    assert.equal(summary!.totalSpent, 647.35);
    // Cat consumed only 50 + her third of veggies, so she is the only debtor.
    const settlements = summary!.settlements as any[];
    assert.ok(settlements.every((s) => s.from === 'Cat' || s.from === 'Bob' || s.from === 'Ann'));
    const net = (summary!.balances as any[]).reduce((s, b) => s + b.netBalance, 0);
    assert.ok(Math.abs(net) < 0.005);
});

test('several places paid by different people', async () => {
    const { call, start } = await connect();
    const sessionId = await start();
    await call('add_bill', { sessionId, name: 'Lunch', items: [{ name: 'Lunch', price: 300 }], paidBy: 'Ann' });
    await call('add_bill', { sessionId, name: 'Taxi', items: [{ name: 'Taxi', price: 90 }], paidBy: 'Bob' });
    const { data } = await call('get_summary', { sessionId });
    const transfers = (data!.settlements as any[]).map((s) => `${s.from}->${s.to}:${s.amount}`).sort();
    // Ann paid 300 of 390 (owes 130): +170. Bob paid 90: -40. Cat: -130.
    assert.deepEqual(transfers, ['Bob->Ann:40', 'Cat->Ann:130']);
});

test('typed payer amounts must add up to the bill total', async () => {
    const { call, start } = await connect();
    const sessionId = await start();
    const bad = await call('add_bill', {
        sessionId,
        name: 'Hotel',
        items: [{ name: 'Room', price: 300 }],
        payers: [{ friend: 'Ann', amount: 100 }, { friend: 'Bob', amount: 100 }],
    });
    assert.equal(bad.isError, true);
    assert.match(bad.text, /must match/);

    const ok = await call('add_bill', {
        sessionId,
        name: 'Hotel',
        items: [{ name: 'Room', price: 300 }],
        payers: [{ friend: 'Ann', amount: 200 }, { friend: 'Bob', amount: 100 }],
    });
    assert.equal(ok.isError, false);

    const both = await call('add_bill', { sessionId, name: 'X', items: [{ name: 'X', price: 10 }], paidBy: 'Ann', payers: [{ friend: 'Ann' }] });
    assert.equal(both.isError, true);
    const partial = await call('add_bill', { sessionId, name: 'Y', items: [{ name: 'Y', price: 10 }], payers: [{ friend: 'Ann', amount: 5 }, { friend: 'Bob' }] });
    assert.equal(partial.isError, true);
});

test('editing items and adjustments updates the totals', async () => {
    const { call, start } = await connect();
    const sessionId = await start();
    await call('add_bill', { sessionId, name: 'Cafe', items: [{ name: 'Cake', price: 100 }], paidBy: 'Ann' });

    await call('add_items', { sessionId, bill: 'Cafe', items: [{ name: 'Tea', price: 50 }] });
    await call('update_item', { sessionId, bill: 'Cafe', item: 'Cake', discount: { type: 'amount', value: 20 } });
    let res = await call('update_bill', { sessionId, bill: 'Cafe', vatPercent: 7 });
    let bill = (res.data!.bills as any[])[0];
    assert.equal(bill.subtotal, 130);
    assert.equal(bill.total, 139.1);

    res = await call('update_bill', { sessionId, bill: 'Cafe', vatPercent: 0 });
    assert.equal((res.data!.bills as any[])[0].total, 130);

    res = await call('remove_item', { sessionId, bill: 'Cafe', item: 'Tea' });
    assert.equal((res.data!.bills as any[])[0].items.length, 1);
    res = await call('remove_bill', { sessionId, bill: 'Cafe' });
    assert.equal((res.data!.bills as any[]).length, 0);
});

test('domain errors come back as readable tool errors', async () => {
    const { call, start } = await connect();
    const sessionId = await start(['Ann']);
    const res = await call('add_bill', { sessionId, name: 'X', items: [{ name: 'X', price: 10 }], paidBy: 'Zed' });
    assert.equal(res.isError, true);
    assert.match(res.text, /No friend named "Zed"\. Existing friends: Ann/);
    const noBill = await call('add_items', { sessionId, bill: 'Nope', items: [{ name: 'X', price: 1 }] });
    assert.match(noBill.text, /No bill "Nope"/);
});

test('cannot remove a friend who paid a bill', async () => {
    const { call, start } = await connect();
    const sessionId = await start(['Ann', 'Bob']);
    await call('add_bill', { sessionId, name: 'Lunch', items: [{ name: 'Lunch', price: 100 }], paidBy: 'Ann' });
    const res = await call('remove_friend', { sessionId, friend: 'Ann' });
    assert.equal(res.isError, true);
    assert.match(res.text, /Lunch/);
    const bob = await call('remove_friend', { sessionId, friend: 'Bob' });
    assert.equal(bob.isError, false);
});

test('create_session stores nothing until something is added', async () => {
    const { call, store } = await connect();
    const { data } = await call('create_session', {});
    assert.equal(store.size, 0);
    await call('add_friends', { sessionId: data!.sessionId, friends: [{ name: 'Ann' }] });
    assert.equal(store.size, 1);
});

test('tags: set on items, assign sharers by tag, spend per tag', async () => {
    const { call, start } = await connect();
    const sessionId = await start();
    await call('add_bill', {
        sessionId,
        name: 'Bar',
        items: [
            { name: 'Beer', price: 200, tags: ['alcohol', 'Drink', 'drink'] },
            { name: 'Wine', price: 300, tags: ['alcohol'] },
            { name: 'Fries', price: 100, tags: ['food'] },
        ],
        vatPercent: 10,
        paidBy: 'Ann',
    });

    const res = await call('assign_by_tag', { sessionId, tag: 'ALCOHOL', sharedWith: ['Bob', 'Cat'] });
    const items = (res.data!.bills as any[])[0].items;
    assert.deepEqual(items[0].tags, ['alcohol', 'Drink']);
    assert.deepEqual(items[0].sharedWith, ['Bob', 'Cat']);
    assert.deepEqual(items[1].sharedWith, ['Bob', 'Cat']);
    assert.deepEqual(items[2].sharedWith, ['Ann', 'Bob', 'Cat']);

    // 10% VAT is spread over items: alcohol = (200 + 300) * 1.1
    const totals = Object.fromEntries((res.data!.tagTotals as any[]).map((t) => [t.tag, t.total]));
    assert.equal(totals.alcohol, 550);
    assert.equal(totals.food, 110);

    const none = await call('assign_by_tag', { sessionId, tag: 'dessert', sharedWith: ['Ann'] });
    assert.equal(none.isError, true);

    const cleared = await call('update_item', { sessionId, bill: 'Bar', item: 'Fries', tags: [] });
    assert.deepEqual((cleared.data!.bills as any[])[0].items[2].tags, []);
});
