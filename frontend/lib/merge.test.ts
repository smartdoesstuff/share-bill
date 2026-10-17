import test from "node:test";
import assert from "node:assert/strict";
import { mergeSessionData } from "./merge";
import { SessionData } from "../types";

const f = (id: string, name = id) => ({ id, name });
const data = (p: Partial<SessionData>): SessionData => ({ friends: [], bills: [], paidDebts: [], ...p });

test("keeps friends added on both sides", () => {
    const base = data({ friends: [f("a")] });
    const local = data({ friends: [f("a"), f("b")] });
    const remote = data({ friends: [f("a"), f("c")] });
    assert.deepEqual(mergeSessionData(base, local, remote).friends.map((x) => x.id), ["a", "c", "b"]);
});

test("a local delete wins over an untouched remote copy, remote additions survive", () => {
    const base = data({ friends: [f("a"), f("b")] });
    const local = data({ friends: [f("a")] });
    const remote = data({ friends: [f("a"), f("b"), f("c")] });
    assert.deepEqual(mergeSessionData(base, local, remote).friends.map((x) => x.id), ["a", "c"]);
});

test("remote edits are kept where the user did not touch the record", () => {
    const base = data({ friends: [f("a", "Ann"), f("b", "Bob")] });
    const local = data({ friends: [f("a", "Anna"), f("b", "Bob")] });
    const remote = data({ friends: [f("a", "Ann"), f("b", "Bobby")] });
    assert.deepEqual(mergeSessionData(base, local, remote).friends.map((x) => x.name), ["Anna", "Bobby"]);
});

test("paid transfers merge as a set", () => {
    const base = data({ paidDebts: ["x"] });
    const local = data({ paidDebts: ["x", "y"] });
    const remote = data({ paidDebts: [] });
    assert.deepEqual(mergeSessionData(base, local, remote).paidDebts.sort(), ["y"]);
});

const bill = (id: string, itemIds: string[], name = id) => ({
    id,
    name,
    items: itemIds.map((i) => ({ id: i, name: i, price: 10, assignedTo: [] })),
    payers: [],
});

test("two people adding items to the same bill both keep their items", () => {
    const base = data({ bills: [bill("b1", ["x"])] });
    const local = data({ bills: [bill("b1", ["x", "mine"])] });
    const remote = data({ bills: [bill("b1", ["x", "theirs"])] });
    const merged = mergeSessionData(base, local, remote);
    assert.deepEqual(merged.bills[0].items.map((i) => i.id).sort(), ["mine", "theirs", "x"]);
});

test("an untouched bill follows the server, a locally added bill is kept", () => {
    const base = data({ bills: [bill("b1", ["x"])] });
    const local = data({ bills: [bill("b1", ["x"]), bill("b2", ["y"])] });
    const remote = data({ bills: [bill("b1", ["x", "z"])] });
    const merged = mergeSessionData(base, local, remote);
    assert.deepEqual(merged.bills.map((b) => b.id), ["b1", "b2"]);
    assert.deepEqual(merged.bills[0].items.map((i) => i.id), ["x", "z"]);
});
