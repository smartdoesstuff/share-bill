import test from 'node:test';
import assert from 'node:assert/strict';
import { computeBalances, computeSettlements, splitCents } from './calc';

const friends = [
    { id: 'a', name: 'A' },
    { id: 'b', name: 'B' },
    { id: 'c', name: 'C' },
];

test('splitCents never loses a cent', () => {
    assert.deepEqual(splitCents(10000, 3), [3334, 3333, 3333]);
    assert.equal(splitCents(1, 3).reduce((a, b) => a + b, 0), 1);
});

test('balances sum to zero and settlements clear every balance', () => {
    const orders = [
        { id: '1', amount: 100, paidBy: 'a', assignedTo: ['a', 'b', 'c'] },
        { id: '2', amount: 45.5, paidBy: 'b', assignedTo: ['b', 'c'] },
    ];
    const balances = computeBalances(friends, orders);
    assert.equal(Object.values(balances).reduce((a, b) => a + b, 0), 0);

    const left = { ...balances };
    for (const s of computeSettlements(balances)) {
        left[s.from] += s.amountCents;
        left[s.to] -= s.amountCents;
    }
    assert.deepEqual(Object.values(left), [0, 0, 0]);
});

test('orders nobody shares and dangling references are ignored', () => {
    const balances = computeBalances(friends, [
        { id: '1', amount: 50, paidBy: 'a', assignedTo: [] },
        { id: '2', amount: 30, paidBy: 'ghost', assignedTo: ['a'] },
        { id: '3', amount: 30, paidBy: 'a', assignedTo: ['a', 'ghost'] },
    ]);
    assert.deepEqual(balances, { a: 0, b: 0, c: 0 });
});
