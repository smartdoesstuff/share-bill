/**
 * Bill maths. Everything is done in integer cents so every share adds up to the total.
 *
 * A bill is one receipt (a restaurant, a taxi, a hotel...). Money flows like on a Thai receipt:
 *   item price - item discount            -> item net
 *   sum of item nets                      -> subtotal
 *   subtotal - bill discount              -> after discount
 *   + service charge % of after discount
 *   + VAT % of (after discount + service)
 *                                         -> total, which the payer(s) put down
 * Each person's share of the total is proportional to what they consumed (their item nets),
 * so discounts, service charge and VAT are split fairly instead of equally.
 */

export interface Adjustment {
    type: 'amount' | 'percent';
    value: number;
}

export interface CalcItem {
    id: string;
    name: string;
    price: number;
    discount?: Adjustment;
    assignedTo: string[];
}

export interface CalcBill {
    id: string;
    name: string;
    items: CalcItem[];
    discount?: Adjustment;
    servicePercent?: number;
    vatPercent?: number;
    /** `amount` omitted = share what is left after the typed amounts equally. */
    payers: { id: string; amount?: number }[];
}

export interface CalcFriend {
    id: string;
    name: string;
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

/** Splits `totalCents` between `parts` people; the first `remainder` people pay one cent more. */
export function splitCents(totalCents: number, parts: number): number[] {
    const base = Math.floor(totalCents / parts);
    const remainder = totalCents - base * parts;
    return Array.from({ length: parts }, (_, i) => base + (i < remainder ? 1 : 0));
}

/**
 * Splits `total` cents in proportion to `weights` (largest remainder method), so the parts always
 * add up to `total` exactly. Ties go to the lower key for a stable result.
 */
export function allocate(total: number, weights: Record<string, number>): Record<string, number> {
    const keys = Object.keys(weights).sort();
    const sum = keys.reduce((s, k) => s + weights[k], 0);
    const result: Record<string, number> = Object.fromEntries(keys.map((k) => [k, 0]));
    if (total <= 0 || sum <= 0) return result;

    const T = BigInt(total);
    const S = BigInt(sum);
    const rows = keys.map((k) => {
        const exact = T * BigInt(weights[k]);
        return { key: k, base: Number(exact / S), rem: exact % S };
    });
    let left = total - rows.reduce((s, r) => s + r.base, 0);
    rows.forEach((r) => (result[r.key] = r.base));
    rows
        .slice()
        .sort((a, b) => (a.rem === b.rem ? a.key.localeCompare(b.key) : a.rem > b.rem ? -1 : 1))
        .forEach((r) => {
            if (left > 0) {
                result[r.key] += 1;
                left -= 1;
            }
        });
    return result;
}

const applyAdjustment = (baseCents: number, adj?: Adjustment): number => {
    if (!adj || !(adj.value > 0) || baseCents <= 0) return 0;
    const cents = adj.type === 'percent' ? Math.round((baseCents * Math.min(adj.value, 100)) / 100) : toCents(adj.value);
    return Math.min(cents, baseCents);
};

export interface BillResult {
    /** Net price per item after its own discount, in cents. */
    itemNets: Record<string, number>;
    subtotal: number;
    discount: number;
    service: number;
    vat: number;
    total: number;
    /** What each friend consumed (their share of the item nets). */
    consumed: Record<string, number>;
    /** Per item, its net price plus its proportional part of the bill discount, service charge and VAT, in cents. */
    itemTotals: Record<string, number>;
    /** Per item, what each sharer consumed of it, in cents. */
    itemShares: Record<string, Record<string, number>>;
    /** What each friend owes for this bill: consumed plus their part of service/VAT, minus their part of the bill discount. */
    shares: Record<string, number>;
    /** What each payer put down, in cents. */
    paid: Record<string, number>;
    /** True when typed payer amounts do not add up to the total (the gap is put on the first payer). */
    payersMismatch: boolean;
    /** The bill cannot be settled yet: nothing to pay, or nobody paid. */
    incomplete: boolean;
}

export function computeBill(bill: CalcBill, friendIds: string[]): BillResult {
    const known = new Set(friendIds);
    const itemNets: Record<string, number> = {};
    const consumed: Record<string, number> = Object.fromEntries(friendIds.map((id) => [id, 0]));
    const itemShares: Record<string, Record<string, number>> = {};

    for (const item of bill.items) {
        const gross = Math.max(0, toCents(item.price));
        const net = gross - applyAdjustment(gross, item.discount);
        itemNets[item.id] = net;
        // Nobody picked for this item: everyone shares it, so the bill always balances.
        const picked = Array.from(new Set(item.assignedTo.filter((id) => known.has(id)))).sort();
        const sharers = picked.length > 0 ? picked : [...friendIds].sort();
        if (sharers.length === 0) continue;
        itemShares[item.id] = {};
        splitCents(net, sharers.length).forEach((cents, i) => {
            consumed[sharers[i]] += cents;
            itemShares[item.id][sharers[i]] = cents;
        });
    }

    const subtotal = Object.values(itemNets).reduce((s, c) => s + c, 0);
    const discount = applyAdjustment(subtotal, bill.discount);
    const afterDiscount = subtotal - discount;
    const service = bill.servicePercent && bill.servicePercent > 0 ? Math.round((afterDiscount * bill.servicePercent) / 100) : 0;
    const vat = bill.vatPercent && bill.vatPercent > 0 ? Math.round(((afterDiscount + service) * bill.vatPercent) / 100) : 0;
    const total = afterDiscount + service + vat;

    const shares = allocate(total, consumed);
    const itemTotals = allocate(total, itemNets);

    // Payers: typed amounts are kept, the others split what is left equally.
    const payers = bill.payers.filter((p) => known.has(p.id));
    const typed = payers.filter((p) => p.amount !== undefined);
    const untouched = payers.filter((p) => p.amount === undefined);
    const typedSum = typed.reduce((s, p) => s + toCents(p.amount!), 0);
    const paid: Record<string, number> = {};
    typed.forEach((p) => (paid[p.id] = toCents(p.amount!)));
    if (untouched.length > 0) {
        splitCents(Math.max(0, total - typedSum), untouched.length).forEach((c, i) => (paid[untouched[i].id] = c));
    }
    const paidSum = Object.values(paid).reduce((s, c) => s + c, 0);
    const payersMismatch = payers.length > 0 && paidSum !== total;
    if (payersMismatch) paid[payers[0].id] += total - paidSum; // keep the books balanced

    return {
        itemNets,
        subtotal,
        discount,
        service,
        vat,
        total,
        consumed,
        itemShares,
        itemTotals,
        shares,
        paid,
        payersMismatch,
        incomplete: total <= 0 || payers.length === 0,
    };
}

/**
 * Net balance per friend in cents. Positive = the group owes them,
 * negative = they owe the group. Incomplete bills are left out.
 */
export function computeBalances(friends: CalcFriend[], bills: CalcBill[]): Record<string, number> {
    const ids = friends.map((f) => f.id);
    const balances: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]));
    for (const bill of bills) {
        const result = computeBill(bill, ids);
        if (result.incomplete) continue;
        for (const [id, cents] of Object.entries(result.shares)) balances[id] -= cents;
        for (const [id, cents] of Object.entries(result.paid)) balances[id] += cents;
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
