import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
    Adjustment,
    computeBalances,
    computeBill,
    computeSettlements,
    fromCents,
    settlementKey,
    toCents,
} from '../lib/calc';
import { MAX_BILLS, MAX_FRIENDS, MAX_ITEMS, sessionIdSchema } from '../lib/schemas';
import {
    DomainError,
    SessionDraft,
    SessionState,
    loadSession,
    mutateSession,
} from '../services/sessionService';

type Draft = SessionDraft;
type DraftBill = Draft['bills'][number];

/** Number of avatar colours the web app can draw. */
const AVATAR_COUNT = 8;

const appUrl = (sessionId: string): string => {
    const base = (process.env.APP_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
    return `${base}/?sessionId=${sessionId}`;
};

const norm = (value: string) => value.trim().toLowerCase();
const round2 = (n: number) => Math.round(n * 100) / 100;

function findFriend(draft: Draft, ref: string) {
    const exact = draft.friends.filter((f) => f.id === ref);
    const matches = exact.length ? exact : draft.friends.filter((f) => norm(f.name) === norm(ref));
    if (matches.length === 1) return matches[0];
    const names = draft.friends.map((f) => f.name).join(', ') || '(no friends yet)';
    throw new DomainError(
        matches.length === 0
            ? `No friend named "${ref}". Existing friends: ${names}.`
            : `More than one friend is named "${ref}"; use the friend id instead.`
    );
}

function findBill(draft: Draft, ref: string): DraftBill {
    const exact = draft.bills.filter((b) => b.id === ref);
    const matches = exact.length ? exact : draft.bills.filter((b) => b.name && norm(b.name) === norm(ref));
    if (matches.length === 1) return matches[0];
    const names = draft.bills.map((b) => b.name || b.id).join(', ') || '(no bills yet)';
    throw new DomainError(
        matches.length === 0
            ? `No bill "${ref}". Existing bills: ${names}.`
            : `More than one bill is named "${ref}"; use the bill id instead.`
    );
}

function findItem(bill: DraftBill, ref: string) {
    const exact = bill.items.filter((i) => i.id === ref);
    const matches = exact.length ? exact : bill.items.filter((i) => norm(i.name) === norm(ref));
    if (matches.length === 1) return matches[0];
    const names = bill.items.map((i) => i.name).join(', ') || '(no items yet)';
    throw new DomainError(
        matches.length === 0
            ? `No item "${ref}" in this bill. Items: ${names}.`
            : `More than one item is named "${ref}"; use the item id instead.`
    );
}

const sharersOf = (draft: Draft, sharedWith?: string[]) =>
    Array.from(new Set((sharedWith?.length ? sharedWith.map((r) => findFriend(draft, r)) : draft.friends).map((f) => f.id)));

const billTotal = (draft: Draft, bill: DraftBill) =>
    computeBill(bill, draft.friends.map((f) => f.id)).total;

/**
 * Stored shape of "who paid": `paidBy` = one person paid the whole bill; `payers` = several people,
 * each with an amount (must add up to the bill total) or none to split the total equally.
 */
function resolvePayers(
    draft: Draft,
    bill: DraftBill,
    paidBy: string | undefined,
    payers: { friend: string; amount?: number }[] | undefined
): DraftBill['payers'] {
    if (paidBy && payers?.length) throw new DomainError('Give either paidBy or payers, not both.');
    if (!paidBy && !payers?.length) throw new DomainError('Say who paid: paidBy for one person, or payers for several.');
    if (paidBy) return [{ id: findFriend(draft, paidBy).id }];

    const friends = payers!.map((p) => findFriend(draft, p.friend));
    if (new Set(friends.map((f) => f.id)).size !== friends.length) {
        throw new DomainError('Each friend may appear only once in payers.');
    }
    const given = payers!.filter((p) => p.amount !== undefined).length;
    if (given !== 0 && given !== payers!.length) {
        throw new DomainError('Give an amount for every payer, or for none to split equally.');
    }
    const result = payers!.map((p, i) => ({ id: friends[i].id, ...(p.amount !== undefined ? { amount: round2(p.amount) } : {}) }));
    if (given > 0) {
        const total = billTotal(draft, { ...bill, payers: result });
        const paid = result.reduce((sum, p) => sum + toCents(p.amount!), 0);
        if (paid !== total) {
            throw new DomainError(`payers add up to ${fromCents(paid)} but the bill total is ${fromCents(total)}; they must match.`);
        }
    }
    return result;
}

/** Human/LLM friendly snapshot with ids resolved to names. */
function describe(state: SessionState) {
    const ids = state.friends.map((f) => f.id);
    const nameOf = (id: string) => state.friends.find((f) => f.id === id)?.name ?? '(removed)';
    const balances = computeBalances(state.friends, state.bills);
    const paid = new Set(state.paidDebts);
    const settlements = computeSettlements(balances).map((s) => ({
        from: nameOf(s.from),
        to: nameOf(s.to),
        amount: fromCents(s.amountCents),
        transferred: paid.has(s.key),
        toPaymentAddress: state.friends.find((f) => f.id === s.to)?.paymentAddress,
    }));

    const bills = state.bills.map((bill) => {
        const r = computeBill(bill, ids);
        return {
            id: bill.id,
            name: bill.name,
            items: bill.items.map((i) => ({
                id: i.id,
                name: i.name,
                price: i.price,
                discount: i.discount,
                netPrice: fromCents(r.itemNets[i.id] ?? 0),
                sharedWith: i.assignedTo.length ? i.assignedTo.map(nameOf) : state.friends.map((f) => f.name),
            })),
            discount: bill.discount,
            servicePercent: bill.servicePercent,
            vatPercent: bill.vatPercent,
            subtotal: fromCents(r.subtotal),
            discountAmount: fromCents(r.discount),
            serviceCharge: fromCents(r.service),
            vat: fromCents(r.vat),
            total: fromCents(r.total),
            payers: Object.entries(r.paid).map(([id, cents]) => ({ name: nameOf(id), amount: fromCents(cents) })),
            owes: ids.map((id) => ({ name: nameOf(id), amount: fromCents(r.shares[id] ?? 0) })).filter((o) => o.amount > 0),
            needsPayer: bill.payers.length === 0,
            payersMismatch: r.payersMismatch,
        };
    });

    return {
        sessionId: state.sessionId,
        url: appUrl(state.sessionId),
        friends: state.friends.map((f) => ({
            id: f.id,
            name: f.name,
            paymentAddress: f.paymentAddress,
            netBalance: fromCents(balances[f.id] ?? 0), // + is owed to them, - they owe
        })),
        bills,
        totalSpent: round2(bills.reduce((sum, b) => sum + b.total, 0)),
        settlements,
    };
}

const ok = (data: unknown) => ({
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
    structuredContent: data as Record<string, unknown>,
});

const fail = (message: string) => ({
    isError: true,
    content: [{ type: 'text' as const, text: message }],
});

/** Wraps a tool body so domain errors become readable tool errors instead of protocol errors. */
const guarded =
    <A>(fn: (args: A) => Promise<unknown>) =>
    async (args: A) => {
        try {
            return ok(await fn(args));
        } catch (error) {
            if (error instanceof DomainError) return fail(error.message);
            console.error('MCP tool failed:', error);
            return fail('Unexpected server error, please try again.');
        }
    };

const sessionId = sessionIdSchema.describe(
    'The bill session id (the "sessionId" query parameter of the share link). Use create_session to get a new one.'
);
const personRef = (what: string) => z.string().min(1).describe(`${what}: the friend's name (case-insensitive) or id`);
const billRef = z.string().min(1).describe('Bill name (case-insensitive) or id');

const adjustmentInput = z
    .object({
        type: z.enum(['amount', 'percent']).describe('"amount" = fixed money off, "percent" = % off'),
        value: z.number().min(0).max(10_000_000).describe('0 clears the discount'),
    })
    .refine((a) => a.type === 'amount' || a.value <= 100, { message: 'percent must be at most 100' });

const toAdjustment = (a?: { type: 'amount' | 'percent'; value: number }): Adjustment | undefined =>
    a && a.value > 0 ? { type: a.type, value: round2(a.value) } : undefined;

const sharedWith = z
    .array(z.string().min(1))
    .optional()
    .describe('Names of the friends who share this item. Omit to split between everyone.');

const itemInput = z.object({
    name: z.string().trim().min(1).max(120),
    price: z.number().min(0).max(10_000_000).describe('Price of the item before any discount'),
    discount: adjustmentInput.optional().describe('Discount on this item only'),
    sharedWith,
});

const payersInput = z
    .array(z.object({ friend: personRef('Who paid'), amount: z.number().positive().max(10_000_000).optional() }))
    .min(1)
    .max(MAX_FRIENDS)
    .optional()
    .describe('Use instead of paidBy when several people paid the bill together. Give each amount (must add up to the bill total), or omit all amounts to split equally.');

type ItemArg = z.infer<typeof itemInput>;
type PayersArg = { friend: string; amount?: number }[];
type AdjArg = { type: 'amount' | 'percent'; value: number };

export function createMcpServer(): McpServer {
    const server = new McpServer(
        { name: 'share-bill', version: '2.0.0' },
        {
            instructions:
                'Share Bill splits expenses between friends. A session has friends and bills. A bill is one receipt (a restaurant, a taxi, a hotel) with items, ' +
                'an optional discount on the whole bill, service charge % and VAT %, and the people who paid it. ' +
                'Typical flow: create_session (or reuse a sessionId the user gives you), add_friends, add_bill for each place (items with price, optional per-item discount and who shares each item; ' +
                'paidBy for one payer or payers for several), then get_summary for who must transfer how much to whom. ' +
                'Discounts, service charge and VAT are shared in proportion to what each person consumed. ' +
                'Always give the user the session url so they can open it in the app. Amounts are in the currency the user speaks about (e.g. THB) with up to 2 decimals.',
        }
    );

    server.registerTool(
        'create_session',
        {
            title: 'Create a new bill session',
            description: 'Starts a new bill-splitting session and returns its id and the link to open it in the web app. The session is stored once something is added to it.',
            inputSchema: {},
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        },
        guarded(async () => {
            // Nothing is stored yet: the session is created by the first friend or bill added to it.
            const id = randomUUID();
            return { sessionId: id, url: appUrl(id) };
        })
    );

    server.registerTool(
        'get_session',
        {
            title: 'Get a bill session',
            description: 'Returns friends, bills (items, discounts, service charge, VAT, payers, who owes what per bill) and the settlement plan.',
            inputSchema: { sessionId },
            annotations: { readOnlyHint: true, openWorldHint: false },
        },
        guarded(async (args: { sessionId: string }) => describe(await loadSession(args.sessionId)))
    );

    server.registerTool(
        'get_summary',
        {
            title: 'Get who owes whom',
            description: "Returns the minimal list of transfers needed to settle the session, plus each friend's net balance.",
            inputSchema: { sessionId },
            annotations: { readOnlyHint: true, openWorldHint: false },
        },
        guarded(async (args: { sessionId: string }) => {
            const { friends, settlements, totalSpent, url } = describe(await loadSession(args.sessionId));
            return { url, totalSpent, balances: friends.map((f) => ({ name: f.name, netBalance: f.netBalance })), settlements };
        })
    );

    server.registerTool(
        'add_friends',
        {
            title: 'Add friends',
            description: 'Adds one or more people to the session.',
            inputSchema: {
                sessionId,
                friends: z
                    .array(
                        z.object({
                            name: z.string().trim().min(1).max(60),
                            paymentAddress: z.string().trim().max(200).optional().describe('Bank account / PromptPay / wallet used to pay this person'),
                        })
                    )
                    .min(1)
                    .max(MAX_FRIENDS),
            },
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        },
        guarded(async (args: { sessionId: string; friends: { name: string; paymentAddress?: string }[] }) => {
            const { session } = await mutateSession(args.sessionId, (draft) => {
                for (const input of args.friends) {
                    if (draft.friends.some((f) => norm(f.name) === norm(input.name))) {
                        throw new DomainError(`A friend named "${input.name}" already exists.`);
                    }
                    const used = new Set(draft.friends.map((f) => f.avatar));
                    let avatar = 0;
                    while (used.has(avatar) && avatar < AVATAR_COUNT) avatar++;
                    draft.friends.push({
                        id: randomUUID(),
                        name: input.name,
                        paid: false,
                        avatar: avatar % AVATAR_COUNT,
                        ...(input.paymentAddress ? { paymentAddress: input.paymentAddress } : {}),
                    });
                }
                if (draft.friends.length > MAX_FRIENDS) throw new DomainError(`At most ${MAX_FRIENDS} friends are allowed.`);
            });
            return describe(session);
        })
    );

    server.registerTool(
        'update_friend',
        {
            title: 'Update a friend',
            description: 'Renames a friend and/or changes their payment address. Pass an empty paymentAddress to clear it.',
            inputSchema: {
                sessionId,
                friend: personRef('Friend to update'),
                newName: z.string().trim().min(1).max(60).optional(),
                paymentAddress: z.string().trim().max(200).optional(),
            },
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        guarded(async (args: { sessionId: string; friend: string; newName?: string; paymentAddress?: string }) => {
            const { session } = await mutateSession(args.sessionId, (draft) => {
                const friend = findFriend(draft, args.friend);
                if (args.newName !== undefined) {
                    if (draft.friends.some((f) => f.id !== friend.id && norm(f.name) === norm(args.newName!))) {
                        throw new DomainError(`A friend named "${args.newName}" already exists.`);
                    }
                    friend.name = args.newName;
                }
                if (args.paymentAddress !== undefined) {
                    if (args.paymentAddress) friend.paymentAddress = args.paymentAddress;
                    else delete friend.paymentAddress;
                }
            });
            return describe(session);
        })
    );

    server.registerTool(
        'remove_friend',
        {
            title: 'Remove a friend',
            description:
                'Removes a friend from the session and from every item they shared. Fails if the friend paid for a bill: change who paid first.',
            inputSchema: { sessionId, friend: personRef('Friend to remove') },
            annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
        },
        guarded(async (args: { sessionId: string; friend: string }) => {
            const { session } = await mutateSession(args.sessionId, (draft) => {
                const friend = findFriend(draft, args.friend);
                const paidBills = draft.bills.filter((b) => b.payers.some((p) => p.id === friend.id)).map((b) => b.name || b.id);
                if (paidBills.length) {
                    throw new DomainError(`${friend.name} paid for: ${paidBills.join(', ')}. Change who paid those bills first.`);
                }
                draft.friends = draft.friends.filter((f) => f.id !== friend.id);
                draft.bills.forEach((b) => b.items.forEach((i) => (i.assignedTo = i.assignedTo.filter((id) => id !== friend.id))));
            });
            return describe(session);
        })
    );

    const buildItem = (draft: Draft, input: ItemArg) => ({
        id: randomUUID(),
        name: input.name,
        price: round2(input.price),
        ...(toAdjustment(input.discount) ? { discount: toAdjustment(input.discount) } : {}),
        assignedTo: sharersOf(draft, input.sharedWith),
    });

    server.registerTool(
        'add_bill',
        {
            title: 'Add a bill',
            description:
                'Adds one receipt: a place with its items, optional discounts, service charge and VAT, and who paid. ' +
                'Prices are before discount. Service charge is applied after the bill discount, VAT after service charge.',
            inputSchema: {
                sessionId,
                name: z.string().trim().max(120).describe('Where it was, e.g. "Shabu restaurant"'),
                items: z.array(itemInput).min(1).max(MAX_ITEMS),
                discount: adjustmentInput.optional().describe('Discount on the whole bill (after item discounts)'),
                servicePercent: z.number().min(0).max(100).optional().describe('Service charge %, e.g. 10'),
                vatPercent: z.number().min(0).max(100).optional().describe('VAT %, e.g. 7'),
                paidBy: personRef('Who paid the whole bill').optional(),
                payers: payersInput,
            },
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        },
        guarded(
            async (args: {
                sessionId: string;
                name: string;
                items: ItemArg[];
                discount?: AdjArg;
                servicePercent?: number;
                vatPercent?: number;
                paidBy?: string;
                payers?: PayersArg;
            }) => {
                const { session } = await mutateSession(args.sessionId, (draft) => {
                    if (draft.friends.length === 0) throw new DomainError('Add friends before adding bills.');
                    if (draft.bills.length >= MAX_BILLS) throw new DomainError(`At most ${MAX_BILLS} bills are allowed.`);
                    const bill: DraftBill = {
                        id: randomUUID(),
                        name: args.name,
                        items: args.items.map((i) => buildItem(draft, i)),
                        ...(toAdjustment(args.discount) ? { discount: toAdjustment(args.discount) } : {}),
                        ...(args.servicePercent ? { servicePercent: args.servicePercent } : {}),
                        ...(args.vatPercent ? { vatPercent: args.vatPercent } : {}),
                        payers: [],
                    };
                    bill.payers = resolvePayers(draft, bill, args.paidBy, args.payers);
                    draft.bills.push(bill);
                });
                return describe(session);
            }
        )
    );

    server.registerTool(
        'update_bill',
        {
            title: 'Update a bill',
            description:
                'Changes a bill\'s name, whole-bill discount (value 0 clears it), service charge %, VAT % (0 clears) and/or who paid. Use add_items / update_item / remove_item for the items.',
            inputSchema: {
                sessionId,
                bill: billRef,
                name: z.string().trim().max(120).optional(),
                discount: adjustmentInput.optional(),
                servicePercent: z.number().min(0).max(100).optional(),
                vatPercent: z.number().min(0).max(100).optional(),
                paidBy: personRef('New payer (pays the whole bill)').optional(),
                payers: payersInput,
            },
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        guarded(
            async (args: {
                sessionId: string;
                bill: string;
                name?: string;
                discount?: AdjArg;
                servicePercent?: number;
                vatPercent?: number;
                paidBy?: string;
                payers?: PayersArg;
            }) => {
                const { session } = await mutateSession(args.sessionId, (draft) => {
                    const bill = findBill(draft, args.bill);
                    if (args.name !== undefined) bill.name = args.name;
                    if (args.discount !== undefined) {
                        const adj = toAdjustment(args.discount);
                        if (adj) bill.discount = adj;
                        else delete bill.discount;
                    }
                    if (args.servicePercent !== undefined) {
                        if (args.servicePercent > 0) bill.servicePercent = args.servicePercent;
                        else delete bill.servicePercent;
                    }
                    if (args.vatPercent !== undefined) {
                        if (args.vatPercent > 0) bill.vatPercent = args.vatPercent;
                        else delete bill.vatPercent;
                    }
                    if (args.paidBy !== undefined || args.payers !== undefined) {
                        bill.payers = resolvePayers(draft, bill, args.paidBy, args.payers);
                    }
                });
                return describe(session);
            }
        )
    );

    server.registerTool(
        'remove_bill',
        {
            title: 'Remove a bill',
            description: 'Deletes a bill and all of its items.',
            inputSchema: { sessionId, bill: billRef },
            annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
        },
        guarded(async (args: { sessionId: string; bill: string }) => {
            const { session } = await mutateSession(args.sessionId, (draft) => {
                const bill = findBill(draft, args.bill);
                draft.bills = draft.bills.filter((b) => b.id !== bill.id);
            });
            return describe(session);
        })
    );

    server.registerTool(
        'add_items',
        {
            title: 'Add items to a bill',
            description: 'Adds items to an existing bill. Typed payer amounts on the bill are kept; payers without an amount absorb the change.',
            inputSchema: { sessionId, bill: billRef, items: z.array(itemInput).min(1).max(MAX_ITEMS) },
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        },
        guarded(async (args: { sessionId: string; bill: string; items: ItemArg[] }) => {
            const { session } = await mutateSession(args.sessionId, (draft) => {
                const bill = findBill(draft, args.bill);
                bill.items.push(...args.items.map((i) => buildItem(draft, i)));
                if (bill.items.length > MAX_ITEMS) throw new DomainError(`At most ${MAX_ITEMS} items per bill are allowed.`);
            });
            return describe(session);
        })
    );

    server.registerTool(
        'update_item',
        {
            title: 'Update an item',
            description: "Changes an item's name, price, item discount (value 0 clears it) or the people sharing it.",
            inputSchema: {
                sessionId,
                bill: billRef,
                item: z.string().min(1).describe('Item name (case-insensitive) or id'),
                name: z.string().trim().min(1).max(120).optional(),
                price: z.number().min(0).max(10_000_000).optional(),
                discount: adjustmentInput.optional(),
                sharedWith,
            },
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        guarded(
            async (args: {
                sessionId: string;
                bill: string;
                item: string;
                name?: string;
                price?: number;
                discount?: AdjArg;
                sharedWith?: string[];
            }) => {
                const { session } = await mutateSession(args.sessionId, (draft) => {
                    const item = findItem(findBill(draft, args.bill), args.item);
                    if (args.name !== undefined) item.name = args.name;
                    if (args.price !== undefined) item.price = round2(args.price);
                    if (args.discount !== undefined) {
                        const adj = toAdjustment(args.discount);
                        if (adj) item.discount = adj;
                        else delete item.discount;
                    }
                    if (args.sharedWith !== undefined) item.assignedTo = sharersOf(draft, args.sharedWith);
                });
                return describe(session);
            }
        )
    );

    server.registerTool(
        'remove_item',
        {
            title: 'Remove an item',
            description: 'Deletes one item from a bill.',
            inputSchema: { sessionId, bill: billRef, item: z.string().min(1).describe('Item name (case-insensitive) or id') },
            annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
        },
        guarded(async (args: { sessionId: string; bill: string; item: string }) => {
            const { session } = await mutateSession(args.sessionId, (draft) => {
                const bill = findBill(draft, args.bill);
                const item = findItem(bill, args.item);
                bill.items = bill.items.filter((i) => i.id !== item.id);
            });
            return describe(session);
        })
    );

    server.registerTool(
        'set_transfer_done',
        {
            title: 'Mark a transfer as done',
            description: 'Marks one settlement ("from" pays "to") as transferred or not yet transferred.',
            inputSchema: {
                sessionId,
                from: personRef('Person who pays'),
                to: personRef('Person who receives'),
                done: z.boolean().default(true),
            },
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        guarded(async (args: { sessionId: string; from: string; to: string; done: boolean }) => {
            const { session } = await mutateSession(args.sessionId, (draft) => {
                const from = findFriend(draft, args.from);
                const to = findFriend(draft, args.to);
                const key = settlementKey(from.id, to.id);
                const exists = computeSettlements(computeBalances(draft.friends, draft.bills)).some((s) => s.key === key);
                if (!exists) throw new DomainError(`${from.name} does not need to pay ${to.name}. Call get_summary to see current transfers.`);
                const rest = draft.paidDebts.filter((k) => k !== key);
                draft.paidDebts = args.done ? [...rest, key] : rest;
            });
            return describe(session);
        })
    );

    return server;
}
