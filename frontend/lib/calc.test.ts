import test from "node:test";
import assert from "node:assert/strict";
import { computeBalances, computeDebts } from "./calc";

test("100 split three ways: no cent is lost and debts settle everyone", () => {
    const friends = [{ id: "a", name: "A" }, { id: "b", name: "B" }, { id: "c", name: "C" }];
    const balances = computeBalances(friends, [{ id: "1", description: "x", amount: 100, paidBy: "a", assignedTo: ["a", "b", "c"] }]);
    assert.equal(Object.values(balances).reduce((x, y) => x + y, 0), 0);
    const total = computeDebts(balances).reduce((s, d) => s + Math.round(d.amount * 100), 0);
    assert.equal(total, 6666);
});
