import { DebtCalculation, Friend, OrderItem } from "../types";

// Mirrors backend/src/lib/calc.ts: all maths is done in integer cents so shares always add up.

export const toCents = (amount: number): number => Math.round(amount * 100);
export const settlementKey = (from: string, to: string): string => `${from}->${to}`;

export function splitCents(totalCents: number, parts: number): number[] {
    const base = Math.floor(totalCents / parts);
    const remainder = totalCents - base * parts;
    return Array.from({ length: parts }, (_, i) => base + (i < remainder ? 1 : 0));
}


/** Credits per payer in cents, adjusted so they always add up to the order total. */
export function payerCredits(order: Pick<OrderItem, "amount" | "payers">, known: Set<string>): [string, number][] {
    const total = toCents(order.amount);
    const credits = order.payers
        .filter((p) => known.has(p.id))
        .map((p) => [p.id, toCents(p.amount)] as [string, number]);
    if (credits.length === 0) return [];
    // Absorb any rounding / validation gap into the first payer so balances still sum to zero.
    const gap = total - credits.reduce((sum, [, c]) => sum + c, 0);
    credits[0][1] += gap;
    return credits;
}

/** Net balance in cents per friend: positive = is owed money, negative = owes money. */
export function computeBalances(friends: Friend[], orders: OrderItem[]): Record<string, number> {
    const balances: Record<string, number> = {};
    const known = new Set(friends.map((f) => f.id));
    friends.forEach((f) => (balances[f.id] = 0));

    for (const order of orders) {
        const sharers = Array.from(new Set(order.assignedTo.filter((id) => known.has(id)))).sort();
        if (sharers.length === 0) continue;

        const total = toCents(order.amount);
        const credits = payerCredits(order, known);
        if (credits.length === 0) continue;
        credits.forEach(([id, cents]) => (balances[id] += cents));
        splitCents(total, sharers.length).forEach((share, i) => {
            balances[sharers[i]] -= share;
        });
    }
    return balances;
}

export function computeDebts(balances: Record<string, number>): DebtCalculation[] {
    const byAmount = (a: { id: string; left: number }, b: { id: string; left: number }) =>
        b.left - a.left || a.id.localeCompare(b.id);
    const debtors = Object.entries(balances)
        .filter(([, b]) => b < 0)
        .map(([id, b]) => ({ id, left: -b }))
        .sort(byAmount);
    const creditors = Object.entries(balances)
        .filter(([, b]) => b > 0)
        .map(([id, b]) => ({ id, left: b }))
        .sort(byAmount);

    const debts: DebtCalculation[] = [];
    let i = 0;
    let j = 0;
    while (i < debtors.length && j < creditors.length) {
        const cents = Math.min(debtors[i].left, creditors[j].left);
        if (cents > 0) {
            debts.push({
                key: settlementKey(debtors[i].id, creditors[j].id),
                from: debtors[i].id,
                to: creditors[j].id,
                amount: cents / 100,
            });
        }
        debtors[i].left -= cents;
        creditors[j].left -= cents;
        if (debtors[i].left === 0) i++;
        if (creditors[j].left === 0) j++;
    }
    return debts;
}

/** What a friend consumed in total (their share of every order), in cents. */
export function computeConsumed(friendId: string, friends: Friend[], orders: OrderItem[]): number {
    const known = new Set(friends.map((f) => f.id));
    let total = 0;
    for (const order of orders) {
        const sharers = Array.from(new Set(order.assignedTo.filter((id) => known.has(id)))).sort();
        const index = sharers.indexOf(friendId);
        if (index === -1) continue;
        total += splitCents(toCents(order.amount), sharers.length)[index];
    }
    return total;
}

export const isOrderAssigned = (order: OrderItem, friends: Friend[]): boolean =>
    order.assignedTo.some((id) => friends.some((f) => f.id === id));
