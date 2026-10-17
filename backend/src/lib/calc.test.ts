import test from 'node:test';
import assert from 'node:assert/strict';
import { CalcBill, allocate, computeBalances, computeBill, computeSettlements, splitCents } from './calc';

const friends = [
    { id: 'a', name: 'Ann' },
    { id: 'b', name: 'Bob' },
    { id: 'c', name: 'Cat' },
];
const ids = friends.map((f) => f.id);
const sum = (o: Record<string, number>) => Object.values(o).reduce((x, y) => x + y, 0);

const bill = (over: Partial<CalcBill> & Pick<CalcBill, 'items'>): CalcBill => ({ id: 'bill', name: 'Place', payers: [{ id: 'c' }], ...over });

test('splitCents never loses a cent', () => {
    assert.deepEqual(splitCents(10000, 3), [3334, 3333, 3333]);
    assert.equal(sum(splitCents(1, 3) as any), 1);
});

test('allocate always adds up to the total, whatever the weights', () => {
    for (let i = 0; i < 200; i++) {
        const weights = { a: Math.floor(Math.random() * 10000), b: Math.floor(Math.random() * 10000), c: Math.floor(Math.random() * 10000) };
        const total = Math.floor(Math.random() * 1_000_000);
        const parts = allocate(total, weights);
        if (sum(weights) > 0) assert.equal(sum(parts), total);
    }
});

test('discount, service charge and VAT are shared in proportion to what each person consumed', () => {
    // 100 for Ann, 300 for Bob; 10% off the bill, 10% service on the rest, 7% VAT on both.
    const b = bill({
        items: [
            { id: 'x', name: 'X', price: 100, assignedTo: ['a'] },
            { id: 'y', name: 'Y', price: 300, assignedTo: ['b'] },
        ],
        discount: { type: 'percent', value: 10 },
        servicePercent: 10,
        vatPercent: 7,
    });
    const r = computeBill(b, ids);
    assert.equal(r.subtotal, 40000);
    assert.equal(r.discount, 4000);
    assert.equal(r.service, 3600);
    assert.equal(r.vat, 2772);
    assert.equal(r.total, 42372);
    assert.deepEqual([r.shares.a, r.shares.b, r.shares.c], [10593, 31779, 0]);

    const balances = computeBalances(friends, [b]);
    assert.deepEqual(balances, { a: -10593, b: -31779, c: 42372 });
});

test('item discounts: percent and fixed amount, never below zero', () => {
    const r = computeBill(
        bill({
            items: [
                { id: 'p', name: 'P', price: 200, discount: { type: 'percent', value: 25 }, assignedTo: ['a'] },
                { id: 'q', name: 'Q', price: 200, discount: { type: 'amount', value: 30 }, assignedTo: ['a'] },
                { id: 'z', name: 'Z', price: 50, discount: { type: 'amount', value: 80 }, assignedTo: ['a'] },
            ],
        }),
        ids
    );
    assert.deepEqual([r.itemNets.p, r.itemNets.q, r.itemNets.z], [15000, 17000, 0]);
});

test('a fixed bill discount is limited to the subtotal', () => {
    const r = computeBill(bill({ items: [{ id: 'x', name: 'X', price: 100, assignedTo: ['a'] }], discount: { type: 'amount', value: 500 } }), ids);
    assert.equal(r.total, 0);
});

test('a bill paid by two people: typed amount kept, the other absorbs the rest', () => {
    const b = bill({
        items: [{ id: 'x', name: 'X', price: 300, assignedTo: ids }],
        payers: [{ id: 'a', amount: 200 }, { id: 'b' }],
    });
    const r = computeBill(b, ids);
    assert.deepEqual(r.paid, { a: 20000, b: 10000 });
    assert.equal(r.payersMismatch, false);
    // everyone owes 100: Ann +100, Bob 0, Cat -100
    assert.deepEqual(computeBalances(friends, [b]), { a: 10000, b: 0, c: -10000 });
});

test('untouched payers split the total equally', () => {
    const r = computeBill(bill({ items: [{ id: 'x', name: 'X', price: 100, assignedTo: ids }], payers: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] }), ids);
    assert.deepEqual([r.paid.a, r.paid.b, r.paid.c], [3334, 3333, 3333]);
});

test('typed payer amounts that do not add up are flagged and the books still balance', () => {
    const b = bill({
        items: [{ id: 'x', name: 'X', price: 100, assignedTo: ids }],
        payers: [{ id: 'a', amount: 30 }, { id: 'b', amount: 30 }],
    });
    assert.equal(computeBill(b, ids).payersMismatch, true);
    assert.equal(sum(computeBalances(friends, [b])), 0);
});

test('bills without payers or without a price are ignored', () => {
    const noPayer = bill({ items: [{ id: 'x', name: 'X', price: 100, assignedTo: ids }], payers: [] });
    const free = bill({ items: [{ id: 'x', name: 'X', price: 0, assignedTo: ids }] });
    assert.deepEqual(computeBalances(friends, [noPayer, free]), { a: 0, b: 0, c: 0 });
});

test('an item nobody picked is shared by everyone', () => {
    const r = computeBill(bill({ items: [{ id: 'x', name: 'X', price: 90, assignedTo: [] }] }), ids);
    assert.deepEqual([r.consumed.a, r.consumed.b, r.consumed.c], [3000, 3000, 3000]);
});

test('several places paid by different people settle with few transfers', () => {
    const lunch = bill({ id: 'l', items: [{ id: 'x', name: 'Lunch', price: 300, assignedTo: ids }], payers: [{ id: 'a' }] });
    const taxi = bill({ id: 't', items: [{ id: 'y', name: 'Taxi', price: 90, assignedTo: ids }], payers: [{ id: 'b' }] });
    const balances = computeBalances(friends, [lunch, taxi]);
    assert.equal(sum(balances), 0);
    // Ann paid 300 of 390 total (owes 130): +170; Bob paid 90: -40; Cat: -130
    assert.deepEqual(balances, { a: 17000, b: -4000, c: -13000 });
    assert.equal(computeSettlements(balances).length, 2);
});
