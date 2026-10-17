import test from "node:test";
import assert from "node:assert/strict";
import { addItem, moveItem, removeItem, updateItem, ItemInput } from "./bills";
import { Bill } from "../types";

const friends = [{ id: "a", name: "Ann" }, { id: "b", name: "Bob" }];
const input = (name: string, price = 10): ItemInput => ({ name, price, tags: [] });
const ids = (n: string) => ({ item: `i-${n}`, bill: `b-${n}` });

test("a new item is standalone by default, with its own payers and everyone sharing it", () => {
    const { bills, groupId } = addItem([], input("Taxi", 120), friends, null, [{ id: "a" }], ids("1"));
    assert.equal(groupId, null);
    assert.equal(bills.length, 1);
    assert.equal(bills[0].solo, true);
    assert.deepEqual(bills[0].payers, [{ id: "a" }]);
    assert.deepEqual(bills[0].items[0].assignedTo, ["a", "b"]);
});

test("an item can be added to an existing group or to a brand-new group", () => {
    const group: Bill = { id: "g", name: "Dinner", items: [], payers: [{ id: "a" }] };
    const toGroup = addItem([group], input("Soup"), friends, "g", [], ids("1"));
    assert.equal(toGroup.bills[0].items.length, 1);

    const toNew = addItem([], input("Soup"), friends, "new", [], ids("2"));
    assert.equal(toNew.groupId, "b-2");
    assert.equal(toNew.bills[0].solo, undefined);
    assert.deepEqual(toNew.bills[0].payers, []);
});

test("editing a standalone item updates its payers; a group item leaves group payers alone", () => {
    const solo = addItem([], input("Taxi"), friends, null, [{ id: "a" }], ids("1")).bills;
    const edited = updateItem(solo, "b-1", "i-1", { name: "Cab", price: 20, tags: ["drink"] }, [{ id: "b" }]);
    assert.equal(edited[0].items[0].name, "Cab");
    assert.deepEqual(edited[0].items[0].tags, ["drink"]);
    assert.deepEqual(edited[0].payers, [{ id: "b" }]);

    const group: Bill = { id: "g", name: "G", items: [{ id: "x", name: "X", price: 1, assignedTo: [] }], payers: [{ id: "a" }] };
    const kept = updateItem([group], "g", "x", input("Y"), [{ id: "b" }]);
    assert.deepEqual(kept[0].payers, [{ id: "a" }]);
});

test("removing a standalone item removes its entry; removing a group item keeps the group", () => {
    const solo = addItem([], input("Taxi"), friends, null, [{ id: "a" }], ids("1")).bills;
    assert.equal(removeItem(solo, "b-1", "i-1").length, 0);
    const group: Bill = { id: "g", name: "G", items: [{ id: "x", name: "X", price: 1, assignedTo: [] }], payers: [] };
    const after = removeItem([group], "g", "x");
    assert.equal(after.length, 1);
    assert.equal(after[0].items.length, 0);
});

test("moving a standalone item into a group drops its own payers; out of a group it is paid by the group's payers", () => {
    const g: Bill = { id: "g", name: "G", items: [], payers: [{ id: "a", amount: 5 }, { id: "b", amount: 5 }] };
    const solo = addItem([g], input("Taxi"), friends, null, [{ id: "b" }], ids("1")).bills;

    const into = moveItem(solo, "b-1", "i-1", "g", "unused");
    assert.equal(into.bills.length, 1);
    assert.equal(into.bills[0].items[0].name, "Taxi");

    const out = moveItem(into.bills, "g", "i-1", null, "b-new");
    assert.equal(out.bills.length, 2);
    const standalone = out.bills.find((b) => b.solo)!;
    assert.deepEqual(standalone.payers, [{ id: "a" }, { id: "b" }]); // ids only, equal shares
    assert.equal(out.bills.find((b) => b.id === "g")!.items.length, 0);
});

test("moving a standalone item into a new group keeps its payers so the group is complete", () => {
    const solo = addItem([], input("Taxi"), friends, null, [{ id: "a" }], ids("1")).bills;
    const moved = moveItem(solo, "b-1", "i-1", "new", "g-new");
    assert.equal(moved.groupId, "g-new");
    assert.equal(moved.bills.length, 1);
    assert.deepEqual(moved.bills[0].payers, [{ id: "a" }]);
    assert.equal(moved.bills[0].solo, undefined);
});

test("moving to where it already is changes nothing", () => {
    const solo = addItem([], input("Taxi"), friends, null, [{ id: "a" }], ids("1")).bills;
    assert.equal(moveItem(solo, "b-1", "i-1", null, "x").bills, solo);
});
