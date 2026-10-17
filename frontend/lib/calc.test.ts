import test from "node:test";
import assert from "node:assert/strict";
import { computeBalances, computeBill, computeDebts } from "./calc";

test("a bill with service charge and VAT adds up to what the payer put down", () => {
    const friends = [{ id: "a", name: "A" }, { id: "b", name: "B" }];
    const bill = {
        id: "1", name: "Place", servicePercent: 10, vatPercent: 7,
        items: [{ id: "i", name: "Food", price: 100, assignedTo: ["a", "b"] }],
        payers: [{ id: "a" }],
    };
    const r = computeBill(bill, ["a", "b"]);
    assert.equal(r.total, 11770);
    const balances = computeBalances(friends, [bill]);
    assert.equal(Object.values(balances).reduce((x, y) => x + y, 0), 0);
    assert.equal(computeDebts(balances)[0].amount, 58.85);
});
