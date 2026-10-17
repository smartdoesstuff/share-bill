"use client";

import React, { useState } from "react";
import { Copy, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useI18n } from "../../lib/i18n";
import { generateId } from "../../lib/id";
import { FriendAvatar, nextFreeAvatar } from "../FriendAvatar";
import { EmptyState } from "../EmptyState";
import { StepHeader } from "./StepHeader";
import { StepProps } from "./types";

export function FriendsStep({ data, update }: StepProps) {
    const { t } = useI18n();
    const [name, setName] = useState("");
    const [address, setAddress] = useState("");
    const [showAddress, setShowAddress] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);

    const addFriend = (event: React.FormEvent) => {
        event.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return;
        if (data.friends.some((f) => f.name.toLowerCase() === trimmed.toLowerCase())) {
            setError(t("duplicateName"));
            return;
        }
        const paymentAddress = address.trim() || undefined;
        update((cur) => ({
            ...cur,
            friends: [...cur.friends, { id: generateId(), name: trimmed, paymentAddress, avatar: nextFreeAvatar(cur.friends) }],
        }));
        setName("");
        setAddress("");
        setError(null);
    };

    const removeFriend = (id: string) => {
        const snapshot = data;
        const friend = data.friends.find((f) => f.id === id);
        if (!friend) return;
        const paidOrders = data.orders.filter((o) => o.paidBy === id).length;

        update((cur) => ({
            ...cur,
            friends: cur.friends.filter((f) => f.id !== id),
            orders: cur.orders
                .filter((o) => o.paidBy !== id)
                .map((o) => ({ ...o, assignedTo: o.assignedTo.filter((x) => x !== id) })),
        }));
        toast(
            paidOrders
                ? t("friendDeletedWithOrders", { name: friend.name, count: paidOrders })
                : t("friendDeleted", { name: friend.name }),
            { action: { label: t("undo"), onClick: () => update(() => snapshot) } }
        );
    };

    const setPaymentAddress = (id: string, value: string) =>
        update((cur) => ({
            ...cur,
            friends: cur.friends.map((f) => (f.id === id ? { ...f, paymentAddress: value.trim() ? value : undefined } : f)),
        }));

    const copyAddress = async (value: string) => {
        try {
            await navigator.clipboard.writeText(value);
            toast.success(t("paymentCopied"));
        } catch {
            toast.error(value);
        }
    };

    return (
        <section className="space-y-5">
            <StepHeader step={1} total={4} title={t("friendsTitle")} hint={t("friendsHint")} />

            <form onSubmit={addFriend} className="space-y-3 rounded-2xl border bg-card p-4">
                <div className="flex gap-2">
                    <Input
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            setError(null);
                        }}
                        placeholder={t("friendName")}
                        aria-label={t("friendName")}
                        aria-invalid={!!error}
                        autoComplete="off"
                        enterKeyHint="done"
                        maxLength={60}
                        className="h-12 text-base"
                    />
                    <Button type="submit" size="lg" className="h-12 shrink-0 px-5 text-base" disabled={!name.trim()}>
                        <Plus className="mr-1 h-5 w-5" aria-hidden /> {t("addFriend")}
                    </Button>
                </div>
                {error && (
                    <p role="alert" className="text-sm text-destructive">
                        {error}
                    </p>
                )}
                {showAddress ? (
                    <Input
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder={t("paymentAddressPlaceholder")}
                        aria-label={t("paymentAddress")}
                        autoComplete="off"
                        maxLength={200}
                        className="h-12 text-base"
                    />
                ) : (
                    <button
                        type="button"
                        onClick={() => setShowAddress(true)}
                        className="flex min-h-[44px] items-center gap-2 text-sm text-primary"
                    >
                        <Wallet className="h-4 w-4" aria-hidden /> {t("paymentAddressOptional")}
                    </button>
                )}
            </form>

            {data.friends.length === 0 ? (
                <EmptyState>{t("noFriends")}</EmptyState>
            ) : (
                <ul className="space-y-2">
                    {data.friends.map((friend) => (
                        <li key={friend.id} className="rounded-2xl border bg-card p-3">
                            <div className="flex items-center gap-3">
                                <FriendAvatar friend={friend} size={40} />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-base font-medium">{friend.name}</p>
                                    {friend.paymentAddress && (
                                        <p className="truncate text-sm text-muted-foreground">{friend.paymentAddress}</p>
                                    )}
                                </div>
                                {friend.paymentAddress && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-11 w-11"
                                        aria-label={t("copyPayment")}
                                        onClick={() => copyAddress(friend.paymentAddress!)}
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-11 w-11"
                                    aria-label={t("editPayment")}
                                    onClick={() => setEditingId(editingId === friend.id ? null : friend.id)}
                                >
                                    <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-11 w-11 text-destructive"
                                    aria-label={`${t("deleteFriend")}: ${friend.name}`}
                                    onClick={() => removeFriend(friend.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                            {editingId === friend.id && (
                                <Input
                                    autoFocus
                                    defaultValue={friend.paymentAddress ?? ""}
                                    onChange={(e) => setPaymentAddress(friend.id, e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && setEditingId(null)}
                                    placeholder={t("paymentAddressPlaceholder")}
                                    aria-label={t("paymentAddress")}
                                    maxLength={200}
                                    className="mt-3 h-12 text-base"
                                />
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
