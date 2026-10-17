import test from 'node:test';
import assert from 'node:assert/strict';
import { orderSchema } from './schemas';

const base = { id: 'o1', description: 'Dinner', amount: 100, assignedTo: ['a'] };

test('a legacy order with paidBy becomes a single payer', () => {
    const order = orderSchema.parse({ ...base, paidBy: 'a' }) as any;
    assert.deepEqual(order.payers, [{ id: 'a', amount: 100 }]);
    assert.equal('paidBy' in order, false);
});

test('payers must add up to the amount', () => {
    assert.equal(orderSchema.safeParse({ ...base, payers: [{ id: 'a', amount: 60 }, { id: 'b', amount: 30 }] }).success, false);
    assert.equal(orderSchema.safeParse({ ...base, payers: [{ id: 'a', amount: 60 }, { id: 'b', amount: 40 }] }).success, true);
});

test('an order without any payer is rejected', () => {
    assert.equal(orderSchema.safeParse({ ...base }).success, false);
});
