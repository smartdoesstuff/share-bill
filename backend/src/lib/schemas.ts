import { z } from 'zod';

export const MAX_FRIENDS = 50;
export const MAX_BILLS = 100;
export const MAX_ITEMS = 200;
export const MAX_TAGS_PER_ITEM = 5;

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
    /** Colour slot of the avatar shown for this friend. */
    avatar: z.number().int().min(0).max(31).optional(),
});

const money = z.number().finite().min(0).max(10_000_000);
const percent = z.number().finite().min(0).max(100);

export const adjustmentSchema = z.object({
    type: z.enum(['amount', 'percent']),
    value: money,
}).refine((a) => a.type === 'amount' || a.value <= 100, { message: 'percent must be at most 100' });

export const itemSchema = z.object({
    id: z.string().min(1).max(64),
    name: z.string().trim().min(1).max(120),
    price: money,
    discount: adjustmentSchema.optional(),
    /** Free labels for filtering: presets are food, drink, alcohol, dessert, other; anything else is a custom tag. */
    tags: z.array(z.string().trim().min(1).max(30)).max(MAX_TAGS_PER_ITEM).optional(),
    assignedTo: z.array(z.string().min(1).max(64)).max(MAX_FRIENDS),
});

export const payerSchema = z.object({
    id: z.string().min(1).max(64),
    /** Omitted = shares what is left after the typed amounts. */
    amount: money.optional(),
});

export const billSchema = z.object({
    id: z.string().min(1).max(64),
    name: z.string().trim().max(120).default(''),
    items: z.array(itemSchema).max(MAX_ITEMS),
    /** Discount on the whole bill (after item discounts). */
    discount: adjustmentSchema.optional(),
    servicePercent: percent.optional(),
    vatPercent: percent.optional(),
    payers: z.array(payerSchema).max(MAX_FRIENDS),
});

/**
 * Before bills existed a session had flat `orders` (one item, one price, paidBy or payers).
 * Each becomes a one-item bill. Used for stored documents and for old clients.
 */
export function legacyOrdersToBills(orders: any[]): unknown[] {
    return orders.map((o) => {
        const multi = Array.isArray(o.payers) && o.payers.length > 1;
        const payers = multi
            ? o.payers.map((p: any) => ({ id: p.id, amount: p.amount }))
            : [{ id: o.payers?.[0]?.id ?? o.paidBy }];
        return {
            id: o.id,
            name: o.description,
            items: [{ id: `${o.id}-item`, name: o.description, price: o.amount, assignedTo: o.assignedTo ?? [] }],
            payers,
        };
    });
}

export const sessionBodySchema = z.preprocess(
    (raw) => {
        if (!raw || typeof raw !== 'object') return raw;
        const { orders, ...body } = raw as Record<string, unknown>;
        if (body.bills === undefined && Array.isArray(orders)) return { ...body, bills: legacyOrdersToBills(orders) };
        return body;
    },
    z.object({
        friends: z.array(friendSchema).max(MAX_FRIENDS),
        bills: z.array(billSchema).max(MAX_BILLS),
        paidDebts: z.array(z.string().max(160)).max(MAX_FRIENDS * MAX_FRIENDS).default([]),
        /** The version the client last loaded; the write is rejected if it is stale. */
        baseVersion: z.number().int().min(0),
    })
);

export type FriendData = z.infer<typeof friendSchema>;
export type BillData = z.infer<typeof billSchema>;
export type ItemData = z.infer<typeof itemSchema>;
export type SessionBody = z.infer<typeof sessionBodySchema>;
