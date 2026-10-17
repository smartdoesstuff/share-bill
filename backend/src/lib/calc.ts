export interface CalcFriend {
    id: string;
    name: string;
}

export interface CalcOrder {
    id: string;
    amount: number;
    paidBy: string;
    assignedTo: string[];
}

export interface Settlement {
    key: string;
    from: string;
    to: string;
    /** Amount in minor units (satang / cents). */
    amountCents: number;
}

export const toCents = (amount: number): number => Math.round(amount * 100);
export const fromCents = (cents: number): number => cents / 100;
export const settlementKey = (from: string, to: string): string => `${from}->${to}`;

/**
 * Splits `totalCents` between `parts` people without losing a single satang:
 * the first `remainder` people pay one cent more.
 */
export function splitCents(totalCents: number, parts: number): number[] {
    const base = Math.floor(totalCents / parts);
    const remainder = totalCents - base * parts;
    return Array.from({ length: parts }, (_, i) => base + (i < remainder ? 1 : 0));
}

/**
 * Net balance per friend in cents. Positive = the group owes them,
 * negative = they owe the group. Orders nobody shares are ignored, as are
 * references to friends that no longer exist.
 */
export function computeBalances(friends: CalcFriend[], orders: CalcOrder[]): Record<string, number> {
    const balances: Record<string, number> = {};
    const known = new Set(friends.map((f) => f.id));
    friends.forEach((f) => (balances[f.id] = 0));

    for (const order of orders) {
        if (!known.has(order.paidBy)) continue;
        const sharers = Array.from(new Set(order.assignedTo.filter((id) => known.has(id)))).sort();
        if (sharers.length === 0) continue;

        const total = toCents(order.amount);
        balances[order.paidBy] += total;
        splitCents(total, sharers.length).forEach((share, i) => {
            balances[sharers[i]] -= share;
        });
    }
    return balances;
}

/** Greedy settlement: biggest debtor pays biggest creditor until everyone is even. */
export function computeSettlements(balances: Record<string, number>): Settlement[] {
    const debtors = Object.entries(balances)
        .filter(([, b]) => b < 0)
        .map(([id, b]) => ({ id, left: -b }))
        .sort((a, b) => b.left - a.left || a.id.localeCompare(b.id));
    const creditors = Object.entries(balances)
        .filter(([, b]) => b > 0)
        .map(([id, b]) => ({ id, left: b }))
        .sort((a, b) => b.left - a.left || a.id.localeCompare(b.id));

    const result: Settlement[] = [];
    let i = 0;
    let j = 0;
    while (i < debtors.length && j < creditors.length) {
        const amountCents = Math.min(debtors[i].left, creditors[j].left);
        if (amountCents > 0) {
            result.push({
                key: settlementKey(debtors[i].id, creditors[j].id),
                from: debtors[i].id,
                to: creditors[j].id,
                amountCents,
            });
        }
        debtors[i].left -= amountCents;
        creditors[j].left -= amountCents;
        if (debtors[i].left === 0) i++;
        if (creditors[j].left === 0) j++;
    }
    return result;
}
