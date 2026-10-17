export interface Friend {
    id: string;
    name: string;
    paid?: boolean; // legacy field, transfers are tracked in SessionData.paidDebts
    paymentAddress?: string;
    /** Index of the cartoon avatar (see components/FriendAvatar). */
    avatar?: number;
}

export interface OrderItem {
    id: string;
    description: string;
    amount: number;
    paidBy: string;
    assignedTo: string[];
}

/** The part of a session the user edits. */
export interface SessionData {
    friends: Friend[];
    orders: OrderItem[];
    /** Settlement keys ("fromId->toId") that have been transferred. */
    paidDebts: string[];
}

/** What the API returns: editable data plus concurrency metadata. */
export interface SessionSnapshot extends SessionData {
    sessionId: string;
    version: number;
}

export interface DebtCalculation {
    key: string;
    from: string;
    to: string;
    amount: number;
}
