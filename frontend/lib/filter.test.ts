import test from "node:test";
import assert from "node:assert/strict";
import { collectTags, matchesFilter } from "./filter";
import { normalizeTags, suggestTag } from "./tags";
import { SessionData } from "../types";

const friends = [{ id: "a", name: "Ann" }, { id: "b", name: "Bob" }];
const item = (over: Partial<SessionData["bills"][number]["items"][number]> = {}) => ({ id: "i", name: "x", price: 1, assignedTo: ["a"], ...over });

test("filter by tag ignores case; by person; by unassigned", () => {
    assert.equal(matchesFilter(item({ tags: ["Alcohol"] }), { tag: "alcohol" }, friends), true);
    assert.equal(matchesFilter(item({ tags: ["food"] }), { tag: "alcohol" }, friends), false);
    assert.equal(matchesFilter(item(), { personId: "b" }, friends), false);
    assert.equal(matchesFilter(item({ assignedTo: [] }), { unassigned: true }, friends), true);
    assert.equal(matchesFilter(item(), { unassigned: true }, friends), false);
    assert.equal(matchesFilter(item({ tags: ["drink"], assignedTo: ["a", "b"] }), { tag: "drink", personId: "b" }, friends), true);
});

test("collectTags counts across bills, case-insensitively", () => {
    const data: SessionData = {
        friends,
        paidDebts: [],
        bills: [
            { id: "1", name: "", payers: [], items: [item({ tags: ["drink", "Party"] }), item({ id: "j", tags: ["drink"] })] },
            { id: "2", name: "", payers: [], items: [item({ tags: ["party"] })] },
        ],
    };
    assert.deepEqual(collectTags(data).map((t) => [t.tag.toLowerCase(), t.count]), [["drink", 2], ["party", 2]]);
});

test("normalizeTags trims, dedupes, limits and maps presets to their key", () => {
    assert.deepEqual(normalizeTags([" Drink ", "drink", "My Tag", "my tag", ""]), ["drink", "My Tag"]);
    assert.equal(normalizeTags(["a", "b", "c", "d", "e", "f"]).length, 5);
});

test("suggestTag gives a hint for common names and stays quiet otherwise", () => {
    assert.equal(suggestTag("เบียร์สิงห์"), "alcohol");
    assert.equal(suggestTag("Iced Latte"), "drink");
    assert.equal(suggestTag("ไอศกรีมวนิลา"), "dessert");
    assert.equal(suggestTag("หมูสามชั้น"), null);
    assert.equal(suggestTag("น้ำซุป"), null);
});
