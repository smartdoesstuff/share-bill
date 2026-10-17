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

export const orderSchema = z.object({
    id: z.string().min(1).max(64),
    description: z.string().trim().min(1).max(120),
    amount: z.number().finite().min(0).max(10_000_000),
    paidBy: z.string().min(1).max(64),
    payers: z
        .array(z.object({ id: z.string().min(1).max(64), amount: z.number().finite().min(0).max(10_000_000) }))
        .max(MAX_FRIENDS)
        .optional(),
    assignedTo: z.array(z.string().min(1).max(64)).max(MAX_FRIENDS),
});

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
