import { Adjustment, Bill, Friend, Item } from "../types";

export type Payers = Bill["payers"];

/** What the item form produces. */
export interface ItemInput {
    name: string;
    price: number;
    discount?: Adjustment;
    tags: string[];
}

/** Where an item goes: a group id, `null` for a standalone item, or "new" for a brand-new group. */
export type Target = string | null | "new";

export const isSolo = (bill: Bill): boolean => !!bill.solo;
export const groupsOf = (bills: Bill[]): Bill[] => bills.filter((b) => !b.solo);

/** Display name: a standalone item shows its item name, a group its name or "Group N". */
export function billTitle(bill: Bill, bills: Bill[], t: (key: "billN", params: { n: number }) => string): string {
    if (bill.solo) return bill.items[0]?.name ?? "";
    return bill.name.trim() || t("billN", { n: groupsOf(bills).indexOf(bill) + 1 });
}

const makeItem = (input: ItemInput, friends: Friend[], id: string, assignedTo?: string[]): Item => ({
    id,
    name: input.name,
    price: input.price,
    ...(input.discount ? { discount: input.discount } : {}),
    ...(input.tags.length ? { tags: input.tags } : {}),
    // Most items are shared by everyone: the split step lets the user narrow it down.
    assignedTo: assignedTo ?? friends.map((f) => f.id),
});

const newGroup = (id: string, payers: Payers = []): Bill => ({ id, name: "", items: [], payers });

/** Ids only: a payer's typed amount belongs to one specific bill. */
const idsOnly = (payers: Payers): Payers => payers.map((p) => ({ id: p.id }));

/** Adds a new item as a standalone entry (target null), inside a group, or in a new group. */
export function addItem(
    bills: Bill[],
    input: ItemInput,
    friends: Friend[],
    target: Target,
    payers: Payers,
    ids: { item: string; bill: string }
): { bills: Bill[]; groupId: string | null } {
    const item = makeItem(input, friends, ids.item);
    if (target === null) {
        return { bills: [...bills, { id: ids.bill, solo: true, name: "", items: [item], payers }], groupId: null };
    }
    if (target === "new") {
        return { bills: [...bills, { ...newGroup(ids.bill), items: [item] }], groupId: ids.bill };
    }
    return { bills: bills.map((b) => (b.id === target ? { ...b, items: [...b.items, item] } : b)), groupId: target };
}

/** Edits an item. For a standalone item `payers` replaces who paid. */
export function updateItem(bills: Bill[], billId: string, itemId: string, input: ItemInput, payers?: Payers): Bill[] {
    return bills.map((bill) => {
        if (bill.id !== billId) return bill;
        return {
            ...bill,
            ...(bill.solo && payers ? { payers } : {}),
            items: bill.items.map((item) => {
                if (item.id !== itemId) return item;
                const { discount: _d, tags: _t, ...rest } = item;
                return {
                    ...rest,
                    name: input.name,
                    price: input.price,
                    ...(input.discount ? { discount: input.discount } : {}),
                    ...(input.tags.length ? { tags: input.tags } : {}),
                };
            }),
        };
    });
}

/** Deletes an item; deleting a standalone item removes its entry. */
export function removeItem(bills: Bill[], billId: string, itemId: string): Bill[] {
    return bills.flatMap((bill) => {
        if (bill.id !== billId) return [bill];
        if (bill.solo) return [];
        return [{ ...bill, items: bill.items.filter((i) => i.id !== itemId) }];
    });
}

/**
 * Moves an item between a group and the standalone list, or from one group to another.
 *  - into a group: the group's payers apply, the item keeps who shares it
 *  - out of a group: becomes a standalone item paid by the group's payers (equal shares)
 */
export function moveItem(
    bills: Bill[],
    billId: string,
    itemId: string,
    target: Target,
    newBillId: string
): { bills: Bill[]; groupId: string | null } {
    const source = bills.find((b) => b.id === billId);
    const item = source?.items.find((i) => i.id === itemId);
    if (!source || !item) return { bills, groupId: source && !source.solo ? source.id : null };
    if ((target === null && source.solo) || target === source.id) return { bills, groupId: source.solo ? null : source.id };

    const without = removeItem(bills, billId, itemId);
    if (target === null) {
        return { bills: [...without, { id: newBillId, solo: true, name: "", items: [item], payers: idsOnly(source.payers) }], groupId: null };
    }
    if (target === "new") {
        // A standalone item brings its payers along so the new group is already complete.
        const group = { ...newGroup(newBillId, source.solo ? idsOnly(source.payers) : []), items: [item] };
        return { bills: [...without, group], groupId: newBillId };
    }
    return { bills: without.map((b) => (b.id === target ? { ...b, items: [...b.items, item] } : b)), groupId: target };
}
