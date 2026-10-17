import mongoose, { Schema } from 'mongoose';

export interface IFriend {
    id: string;
    name: string;
    paid: boolean;
    paymentAddress?: string;
    avatar?: number;
}

export interface IAdjustment {
    type: 'amount' | 'percent';
    value: number;
}

export interface IItem {
    id: string;
    name: string;
    price: number;
    discount?: IAdjustment;
    tags?: string[];
    assignedTo: string[]; // friend ids
}

export interface IBill {
    id: string;
    /** A standalone item, not part of a group. */
    solo?: boolean;
    name: string;
    items: IItem[];
    discount?: IAdjustment;
    servicePercent?: number;
    vatPercent?: number;
    /** Who paid the bill; `amount` omitted = shares what is left equally. */
    payers: { id: string; amount?: number }[];
}

export interface ISession {
    sessionId: string;
    friends: IFriend[];
    bills: IBill[];
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

const AdjustmentSchema = new Schema<IAdjustment>(
    { type: { type: String, enum: ['amount', 'percent'], required: true }, value: { type: Number, required: true } },
    { _id: false }
);

const ItemSchema = new Schema<IItem>(
    {
        id: { type: String, required: true },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        discount: { type: AdjustmentSchema },
        tags: { type: [String], default: undefined },
        assignedTo: { type: [String], default: [] },
    },
    { _id: false }
);

const BillSchema = new Schema<IBill>(
    {
        id: { type: String, required: true },
        solo: { type: Boolean },
        name: { type: String, default: '' },
        items: { type: [ItemSchema], default: [] },
        discount: { type: AdjustmentSchema },
        servicePercent: { type: Number },
        vatPercent: { type: Number },
        payers: { type: [new Schema({ id: String, amount: Number }, { _id: false })], default: [] },
    },
    { _id: false }
);

const SessionSchema = new Schema<ISession>(
    {
        sessionId: { type: String, unique: true, required: true },
        friends: { type: [FriendSchema], default: [] },
        bills: { type: [BillSchema], default: [] },
        paidDebts: { type: [String], default: [] },
        version: { type: Number, default: 0 },
    },
    { timestamps: true }
);

export default mongoose.model<ISession>('Session', SessionSchema);
