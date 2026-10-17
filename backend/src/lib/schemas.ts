import { z } from 'zod';

export const MAX_FRIENDS = 50;
export const MAX_ORDERS = 300;

export const sessionIdSchema = z
    .string()
    .min(8)
    .max(64)
    .regex(/^[A-Za-z0-9_-]+$/, 'sessionId may only contain letters, digits, "-" and "_"');

export const friendSchema = z.object({
    id: z.string().min(1).max(64),
    name: z.string().trim().min(1).max(60),
    paid: z.boolean().optional().default(false),
    paymentAddress: z.string().trim().max(200).optional(),
    /** Index of the cartoon avatar shown for this friend. */
    avatar: z.number().int().min(0).max(31).optional(),
});

const payerSchema = z.object({
    id: z.string().min(1).max(64),
    amount: z.number().finite().min(0).max(10_000_000),
});

const orderObject = z
    .object({
        id: z.string().min(1).max(64),
        description: z.string().trim().min(1).max(120),
        amount: z.number().finite().min(0).max(10_000_000),
        /** Who paid how much. One entry = one person paid it all. */
        payers: z.array(payerSchema).min(1).max(MAX_FRIENDS),
        assignedTo: z.array(z.string().min(1).max(64)).max(MAX_FRIENDS),
    })
    .refine((o) => o.payers.reduce((sum, p) => sum + Math.round(p.amount * 100), 0) === Math.round(o.amount * 100), {
        message: 'payers must add up to the order amount',
        path: ['payers'],
    });

/** Older clients (and stored data) used a single `paidBy`; turn it into `payers`. */
export const orderSchema = z.preprocess((raw) => {
    if (!raw || typeof raw !== 'object') return raw;
    const { paidBy, ...order } = raw as Record<string, unknown>;
    const payers = order.payers;
    if ((!Array.isArray(payers) || payers.length === 0) && typeof paidBy === 'string') {
        return { ...order, payers: [{ id: paidBy, amount: order.amount }] };
    }
    return order;
}, orderObject);

export const sessionBodySchema = z.object({
    friends: z.array(friendSchema).max(MAX_FRIENDS),
    orders: z.array(orderSchema).max(MAX_ORDERS),
    paidDebts: z.array(z.string().max(160)).max(MAX_FRIENDS * MAX_FRIENDS).default([]),
    /** The version the client last loaded; the write is rejected if it is stale. */
    baseVersion: z.number().int().min(0),
});

export type FriendData = z.infer<typeof friendSchema>;
export type OrderData = z.infer<typeof orderSchema>;
export type SessionBody = z.infer<typeof sessionBodySchema>;
