import { Bill, Friend, Item, SessionData } from "../types";
import { isItemAssigned } from "./calc";
import { tagKey } from "./tags";

/** What the item lists show: everything, or only items matching all active parts. */
export interface ItemFilter {
    tag?: string;
    personId?: string;
    unassigned?: boolean;
}

export const NO_FILTER: ItemFilter = {};

export const isFilterActive = (f: ItemFilter): boolean => !!f.tag || !!f.personId || !!f.unassigned;
export const activeFilterCount = (f: ItemFilter): number => [f.tag, f.personId, f.unassigned].filter(Boolean).length;

export function matchesFilter(item: Item, filter: ItemFilter, friends: Friend[]): boolean {
    if (filter.tag && !(item.tags ?? []).some((t) => tagKey(t) === tagKey(filter.tag!))) return false;
    if (filter.personId && !item.assignedTo.includes(filter.personId)) return false;
    if (filter.unassigned && isItemAssigned(item, friends)) return false;
    return true;
}

/** Items of a bill that pass the filter. */
export const visibleItems = (bill: Bill, filter: ItemFilter, friends: Friend[]): Item[] =>
    bill.items.filter((i) => matchesFilter(i, filter, friends));

/** Every tag used in the session, most used first. */
export function collectTags(data: SessionData): { tag: string; count: number }[] {
    const counts = new Map<string, { tag: string; count: number }>();
    for (const bill of data.bills)
        for (const item of bill.items)
            for (const tag of item.tags ?? []) {
                const key = tagKey(tag);
                const entry = counts.get(key) ?? { tag, count: 0 };
                entry.count += 1;
                counts.set(key, entry);
            }
    return Array.from(counts.values()).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
