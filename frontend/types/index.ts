export interface Friend {
    id: string;
    name: string;
    paid?: boolean; // legacy field, transfers are tracked in SessionData.paidDebts
    paymentAddress?: string;
    /** Colour slot of the avatar (see components/FriendAvatar). */
    avatar?: number;
}

/** A discount: a fixed amount off, or a percentage off. */
export interface Adjustment {
    type: "amount" | "percent";
    value: number;
}

export interface Item {
    id: string;
    name: string;
    /** Price before any discount. */
    price: number;
    /** Discount on this item only. */
    discount?: Adjustment;
    /** Labels for filtering and grouping: presets (see lib/tags) or anything the user typed. */
    tags?: string[];
    /** Friends who share this item. */
    assignedTo: string[];
}

/**
 * An entry in the list. Either a standalone item (`solo`: one item with its own payers, the default)
 * or a group of items paid together (a receipt, an outing...) with shared discount, service charge, VAT and payers.
 */
export interface Bill {
    id: string;
    /** True for a standalone item that belongs to no group. */
    solo?: boolean;
    /** Group name (unused for standalone items). */
    name: string;
    items: Item[];
    /** Discount on the whole bill, applied after item discounts. */
    discount?: Adjustment;
    /** Service charge %, applied after the bill discount. */
    servicePercent?: number;
    /** VAT %, applied after the service charge. */
    vatPercent?: number;
    /** Who paid the bill. `amount` omitted = shares what is left after the typed amounts, equally. */
    payers: { id: string; amount?: number }[];
}

/** The part of a session the user edits. */
export interface SessionData {
    friends: Friend[];
    bills: Bill[];
    /** Settlement keys ("fromId->toId") that have been transferred. */
    paidDebts: string[];
}

/** What the API returns: editable data plus concurrency metadata. */
export interface SessionSnapshot extends SessionData {
    sessionId: string;
    version: number;
}
