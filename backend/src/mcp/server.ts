import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { computeBalances, computeSettlements, fromCents, settlementKey } from '../lib/calc';
import { MAX_FRIENDS, MAX_ORDERS, sessionIdSchema } from '../lib/schemas';
import {
    DomainError,
    SessionDraft,
    SessionState,
    getOrCreateSession,
    mutateSession,
} from '../services/sessionService';

const appUrl = (sessionId: string): string => {
    const base = (process.env.APP_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
    return `${base}/?sessionId=${sessionId}`;
};

const norm = (value: string) => value.trim().toLowerCase();

function findFriend(draft: SessionDraft, ref: string) {
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

function findOrder(draft: SessionDraft, ref: string) {
    const exact = draft.orders.filter((o) => o.id === ref);
    const matches = exact.length ? exact : draft.orders.filter((o) => norm(o.description) === norm(ref));
    if (matches.length === 1) return matches[0];
    const names = draft.orders.map((o) => o.description).join(', ') || '(no orders yet)';
    throw new DomainError(
        matches.length === 0
            ? `No order "${ref}". Existing orders: ${names}.`
            : `More than one order is named "${ref}"; use the order id instead.`
    );
}

/** Human/LLM friendly snapshot with ids resolved to names. */
function describe(state: SessionState) {
    const nameOf = (id: string) => state.friends.find((f) => f.id === id)?.name ?? '(removed)';
    const balances = computeBalances(state.friends, state.orders);
    const paid = new Set(state.paidDebts);
    const settlements = computeSettlements(balances).map((s) => ({
        from: nameOf(s.from),
        to: nameOf(s.to),
        amount: fromCents(s.amountCents),
        transferred: paid.has(s.key),
        toPaymentAddress: state.friends.find((f) => f.id === s.to)?.paymentAddress,
    }));

    return {
        sessionId: state.sessionId,
        url: appUrl(state.sessionId),
        friends: state.friends.map((f) => ({
            id: f.id,
            name: f.name,
            paymentAddress: f.paymentAddress,
            netBalance: fromCents(balances[f.id] ?? 0), // + is owed to them, - they owe
        })),
        orders: state.orders.map((o) => ({
            id: o.id,
            description: o.description,
            amount: o.amount,
            paidBy: nameOf(o.paidBy),
            sharedWith: o.assignedTo.map(nameOf),
        })),
        totalSpent: fromCents(state.orders.reduce((sum, o) => sum + Math.round(o.amount * 100), 0)),
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

export function createMcpServer(): McpServer {
    const server = new McpServer(
        { name: 'share-bill', version: '1.0.0' },
        {
            instructions:
                'Share Bill splits expenses between friends. Typical flow: create_session (or reuse a sessionId the user gives you), ' +
                'add_friends, add_orders (say who paid and who shared each item; omit sharedWith to split between everyone), ' +
                'then get_summary to see who must transfer how much to whom. Always give the user the session url so they can open it in the app. ' +
                'Amounts are in the same currency the user speaks about (e.g. THB) with up to 2 decimals.',
        }
    );

    server.registerTool(
        'create_session',
        {
            title: 'Create a new bill session',
            description: 'Creates an empty bill-splitting session and returns its id and the link to open it in the web app.',
            inputSchema: {},
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        },
        guarded(async () => {
            const state = await getOrCreateSession(randomUUID());
            return { sessionId: state.sessionId, url: appUrl(state.sessionId) };
        })
    );

    server.registerTool(
        'get_session',
        {
            title: 'Get a bill session',
            description: 'Returns friends, orders and the settlement plan of a session.',
            inputSchema: { sessionId },
            annotations: { readOnlyHint: true, openWorldHint: false },
        },
        guarded(async (args: { sessionId: string }) => describe(await getOrCreateSession(args.sessionId)))
    );

    server.registerTool(
        'get_summary',
        {
            title: 'Get who owes whom',
            description: 'Returns the minimal list of transfers needed to settle the session, plus each friend\'s net balance.',
            inputSchema: { sessionId },
            annotations: { readOnlyHint: true, openWorldHint: false },
        },
        guarded(async (args: { sessionId: string }) => {
            const { friends, settlements, totalSpent, url } = describe(await getOrCreateSession(args.sessionId));
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
                    draft.friends.push({
                        id: randomUUID(),
                        name: input.name,
                        paid: false,
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
                'Removes a friend from the session and from every order they shared. Fails if the friend paid for an order: remove or reassign that order first.',
            inputSchema: { sessionId, friend: personRef('Friend to remove') },
            annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
        },
        guarded(async (args: { sessionId: string; friend: string }) => {
            const { session } = await mutateSession(args.sessionId, (draft) => {
                const friend = findFriend(draft, args.friend);
                const paidOrders = draft.orders.filter((o) => o.paidBy === friend.id).map((o) => o.description);
                if (paidOrders.length) {
                    throw new DomainError(`${friend.name} paid for: ${paidOrders.join(', ')}. Remove or reassign those orders first.`);
                }
                draft.friends = draft.friends.filter((f) => f.id !== friend.id);
                draft.orders.forEach((o) => (o.assignedTo = o.assignedTo.filter((id) => id !== friend.id)));
            });
            return describe(session);
        })
    );

    const sharedWith = z
        .array(z.string().min(1))
        .optional()
        .describe('Names of the friends who share this item. Omit to split between everyone.');

    server.registerTool(
        'add_orders',
        {
            title: 'Add orders',
            description: 'Adds one or more expenses. Each says what it was, how much, who paid and who shares it.',
            inputSchema: {
                sessionId,
                orders: z
                    .array(
                        z.object({
                            description: z.string().trim().min(1).max(120),
                            amount: z.number().positive().max(10_000_000).describe('Total price of the item'),
                            paidBy: personRef('Who paid'),
                            sharedWith,
                        })
                    )
                    .min(1)
                    .max(100),
            },
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        },
        guarded(
            async (args: {
                sessionId: string;
                orders: { description: string; amount: number; paidBy: string; sharedWith?: string[] }[];
            }) => {
                const { session } = await mutateSession(args.sessionId, (draft) => {
                    if (draft.friends.length === 0) throw new DomainError('Add friends before adding orders.');
                    for (const input of args.orders) {
                        const payer = findFriend(draft, input.paidBy);
                        const sharers = input.sharedWith?.length
                            ? input.sharedWith.map((ref) => findFriend(draft, ref))
                            : draft.friends;
                        draft.orders.push({
                            id: randomUUID(),
                            description: input.description,
                            amount: Math.round(input.amount * 100) / 100,
                            paidBy: payer.id,
                            assignedTo: Array.from(new Set(sharers.map((f) => f.id))),
                        });
                    }
                    if (draft.orders.length > MAX_ORDERS) throw new DomainError(`At most ${MAX_ORDERS} orders are allowed.`);
                });
                return describe(session);
            }
        )
    );

    server.registerTool(
        'update_order',
        {
            title: 'Update an order',
            description: 'Changes the description, amount, payer or the people sharing an existing order.',
            inputSchema: {
                sessionId,
                order: z.string().min(1).describe('Order description (case-insensitive) or id'),
                description: z.string().trim().min(1).max(120).optional(),
                amount: z.number().positive().max(10_000_000).optional(),
                paidBy: personRef('New payer').optional(),
                sharedWith,
            },
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        guarded(
            async (args: {
                sessionId: string;
                order: string;
                description?: string;
                amount?: number;
                paidBy?: string;
                sharedWith?: string[];
            }) => {
                const { session } = await mutateSession(args.sessionId, (draft) => {
                    const order = findOrder(draft, args.order);
                    if (args.description !== undefined) order.description = args.description;
                    if (args.amount !== undefined) order.amount = Math.round(args.amount * 100) / 100;
                    if (args.paidBy !== undefined) order.paidBy = findFriend(draft, args.paidBy).id;
                    if (args.sharedWith !== undefined) {
                        const sharers = args.sharedWith.length ? args.sharedWith.map((ref) => findFriend(draft, ref)) : draft.friends;
                        order.assignedTo = Array.from(new Set(sharers.map((f) => f.id)));
                    }
                });
                return describe(session);
            }
        )
    );

    server.registerTool(
        'remove_order',
        {
            title: 'Remove an order',
            description: 'Deletes an order from the session.',
            inputSchema: { sessionId, order: z.string().min(1).describe('Order description (case-insensitive) or id') },
            annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
        },
        guarded(async (args: { sessionId: string; order: string }) => {
            const { session } = await mutateSession(args.sessionId, (draft) => {
                const order = findOrder(draft, args.order);
                draft.orders = draft.orders.filter((o) => o.id !== order.id);
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
                const exists = computeSettlements(computeBalances(draft.friends, draft.orders)).some((s) => s.key === key);
                if (!exists) throw new DomainError(`${from.name} does not need to pay ${to.name}. Call get_summary to see current transfers.`);
                const rest = draft.paidDebts.filter((k) => k !== key);
                draft.paidDebts = args.done ? [...rest, key] : rest;
            });
            return describe(session);
        })
    );

    return server;
}
