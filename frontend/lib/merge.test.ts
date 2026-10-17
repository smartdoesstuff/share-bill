import test from "node:test";
import assert from "node:assert/strict";
import { mergeSessionData } from "./merge";
import { SessionData } from "../types";

const f = (id: string, name = id) => ({ id, name });
const data = (p: Partial<SessionData>): SessionData => ({ friends: [], orders: [], paidDebts: [], ...p });

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
