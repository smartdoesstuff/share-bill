import test from 'node:test';
import assert from 'node:assert/strict';
import { billSchema, sessionBodySchema } from './schemas';

test('a legacy body with flat orders becomes one-item bills', () => {
    const body: any = sessionBodySchema.parse({
        baseVersion: 3,
        friends: [{ id: 'a', name: 'Ann' }],
        orders: [{ id: 'o1', description: 'Dinner', amount: 100, paidBy: 'a', assignedTo: ['a'] }],
    });
    assert.equal(body.bills.length, 1);
    assert.equal(body.bills[0].name, "Dinner");
    assert.equal(body.bills[0].solo, true);
    assert.equal(body.bills[0].items[0].price, 100);
    assert.deepEqual(body.bills[0].payers, [{ id: 'a' }]);
    assert.equal('orders' in body, false);
});

test('legacy multi-payer orders keep their amounts', () => {
    const body: any = sessionBodySchema.parse({
        baseVersion: 0,
        friends: [],
        orders: [{ id: 'o1', description: 'Hotel', amount: 300, payers: [{ id: 'a', amount: 200 }, { id: 'b', amount: 100 }], assignedTo: [] }],
    });
    assert.deepEqual(body.bills[0].payers, [{ id: 'a', amount: 200 }, { id: 'b', amount: 100 }]);
});

test('discount percent is limited to 100 and amounts to non-negative', () => {
    const base = { id: 'b', name: '', items: [], payers: [] };
    assert.equal(billSchema.safeParse({ ...base, discount: { type: 'percent', value: 120 } }).success, false);
    assert.equal(billSchema.safeParse({ ...base, discount: { type: 'amount', value: -1 } }).success, false);
    assert.equal(billSchema.safeParse({ ...base, discount: { type: 'percent', value: 10 }, servicePercent: 10, vatPercent: 7 }).success, true);
});
