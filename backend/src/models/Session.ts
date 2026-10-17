import mongoose, { Schema } from 'mongoose';

export interface IFriend {
    id: string;
    name: string;
    paid: boolean;
    paymentAddress?: string;
    avatar?: number;
}

export interface IOrderItem {
    id: string;
    description: string;
    amount: number;
    paidBy: string;
    assignedTo: string[]; // friend ids
}

export interface ISession {
    sessionId: string;
    friends: IFriend[];
    orders: IOrderItem[];
    /** Settlement keys ("fromId->toId") the group has marked as transferred. */
    paidDebts: string[];
    /** Bumped on every write; used for optimistic concurrency control. */
    version: number;
}

const FriendSchema = new Schema<IFriend>(
    {
        id: { type: String, required: true },
        name: { type: String, required: true },
        paid: { type: Boolean, default: false },
        paymentAddress: { type: String },
        avatar: { type: Number },
    },
    { _id: false }
);

const OrderItemSchema = new Schema<IOrderItem>(
    {
        id: { type: String, required: true },
        description: { type: String, required: true },
        amount: { type: Number, required: true },
        paidBy: { type: String, required: true },
        assignedTo: { type: [String], default: [] },
    },
    { _id: false }
);

const SessionSchema = new Schema<ISession>(
    {
        sessionId: { type: String, unique: true, required: true },
        friends: { type: [FriendSchema], default: [] },
        orders: { type: [OrderItemSchema], default: [] },
        paidDebts: { type: [String], default: [] },
        version: { type: Number, default: 0 },
    },
    { timestamps: true }
);

export default mongoose.model<ISession>('Session', SessionSchema);
