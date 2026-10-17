"use client";

import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Chip } from "../Chip";
import { useI18n } from "../../lib/i18n";
import { generateId } from "../../lib/id";
import { splitCents, toCents } from "../../lib/calc";
import { cn } from "../../lib/utils";
import { FriendAvatar } from "../FriendAvatar";
import { EmptyState } from "../EmptyState";
import { StepHeader } from "./StepHeader";
import { StepProps } from "./types";

const parseAmount = (raw: string): number => {
    const value = Number(raw.replace(/,/g, "").trim());
    return Number.isFinite(value) ? Math.round(value * 100) / 100 : NaN;
};

export function OrdersStep({ data, update }: StepProps) {
    const { t, formatMoney } = useI18n();
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    // Who paid: tap one name for "paid it all", tap several to split what each person put in.
    const [selected, setSelected] = useState<string[]>([]);
    // Amounts the user typed per friend id. Rows without a typed amount share what is left equally.
    const [typed, setTyped] = useState<Record<string, string>>({});

    const parsed = parseAmount(amount);
    const total = data.orders.reduce((sum, o) => sum + o.amount, 0);
    const nameOf = (id: string) => data.friends.find((f) => f.id === id)?.name ?? t("unknownPerson");

    // Drop people who were removed from the group meanwhile (another step or device).
    const payerIds = data.friends.filter((f) => selected.includes(f.id)).map((f) => f.id);
    const isTyped = (id: string) => (typed[id] ?? "").trim() !== "";
    const typedCents = payerIds.filter(isTyped).reduce((sum, id) => sum + toCents(parseAmount(typed[id]) || 0), 0);
    const untouchedIds = payerIds.filter((id) => !isTyped(id));
    const leftCents = Math.max(0, toCents(parsed > 0 ? parsed : 0) - typedCents);
    const autoShares: Record<string, number> = Object.fromEntries(
        splitCents(leftCents, Math.max(untouchedIds.length, 1)).map((cents, i) => [untouchedIds[i], cents / 100])
    );
    const payers = payerIds.map((id) => ({
        id,
        amount: payerIds.length === 1 ? parsed : isTyped(id) ? parseAmount(typed[id]) || 0 : autoShares[id] ?? 0,
    }));
    const hasTyped = payerIds.some(isTyped);
    const paidCents = payers.reduce((sum, p) => sum + toCents(p.amount), 0);
    const remainingCents = parsed > 0 ? toCents(parsed) - paidCents : 0;
    const matches = parsed > 0 && payerIds.length > 0 && remainingCents === 0;
    const canAdd = description.trim().length > 0 && matches;
    const showAmounts = payerIds.length > 1;

    const togglePayer = (id: string) => {
        setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
        setTyped({}); // the group changed: go back to an equal split
    };

    const editAmount = (id: string, value: string) => setTyped((cur) => ({ ...cur, [id]: value }));

    const addOrder = (event: React.FormEvent) => {
        event.preventDefault();
        if (!canAdd) return;
        update((cur) => ({
            ...cur,
            orders: [
                ...cur.orders,
                {
                    id: generateId(),
                    description: description.trim(),
                    amount: parsed,
                    payers,
                    // Most items are shared by everyone: the next step lets the user narrow it down.
                    assignedTo: cur.friends.map((f) => f.id),
                },
            ],
        }));
        setDescription("");
        setAmount("");
        setTyped({});
    };

    const removeOrder = (id: string) => {
        const snapshot = data;
        const order = data.orders.find((o) => o.id === id);
        if (!order) return;
        update((cur) => ({ ...cur, orders: cur.orders.filter((o) => o.id !== id) }));
        toast(t("orderDeleted", { name: order.description }), {
            action: { label: t("undo"), onClick: () => update(() => snapshot) },
        });
    };

    return (
        <section className="space-y-5">
            <StepHeader step={2} total={4} title={t("ordersTitle")} hint={t("ordersHint")} />

            <form onSubmit={addOrder} className="space-y-4 rounded-2xl border bg-card p-4">
                <div className="space-y-2">
                    <label htmlFor="order-description" className="text-sm font-medium">
                        {t("description")}
                    </label>
                    <Input
                        id="order-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={t("descriptionPlaceholder")}
                        autoComplete="off"
                        enterKeyHint="next"
                        maxLength={120}
                        className="h-12 text-base"
                    />
                </div>
                <div className="space-y-2">
                    <label htmlFor="order-amount" className="text-sm font-medium">
                        {t("amount")}
                    </label>
                    <Input
                        id="order-amount"
                        value={amount}
                        onChange={(e) => {
                            setAmount(e.target.value);
                        }}
                        inputMode="decimal"
                        pattern="[0-9]*[.,]?[0-9]*"
                        placeholder="0.00"
                        autoComplete="off"
                        enterKeyHint="done"
                        className="h-12 text-base"
                    />
                </div>

                <fieldset className="space-y-2">
                    <legend className="text-sm font-medium">{t("paidBy")}</legend>
                    <p className="text-xs text-muted-foreground">{t("paidByHint")}</p>
                    <div className="flex flex-wrap gap-2">
                        {data.friends.map((friend) => (
                            <Chip key={friend.id} selected={payerIds.includes(friend.id)} onClick={() => togglePayer(friend.id)}>
                                {friend.name}
                            </Chip>
                        ))}
                    </div>

                    {showAmounts && (
                        <div className="space-y-2 pt-2">
                            {payerIds.map((id) => {
                                const friend = data.friends.find((f) => f.id === id)!;
                                const value = isTyped(id) ? typed[id] : autoShares[id] !== undefined && parsed > 0 ? String(autoShares[id]) : "";
                                return (
                                    <div key={id} className="flex items-center gap-2">
                                        <FriendAvatar friend={friend} size={28} />
                                        <span className="min-w-0 flex-1 truncate text-base">{friend.name}</span>
                                        <Input
                                            value={value}
                                            onChange={(e) => editAmount(id, e.target.value)}
                                            inputMode="decimal"
                                            pattern="[0-9]*[.,]?[0-9]*"
                                            placeholder="0.00"
                                            aria-label={`${t("paidAmount")}: ${friend.name}`}
                                            className={cn("h-11 w-28 text-right text-base", !isTyped(id) && "text-muted-foreground")}
                                        />
                                    </div>
                                );
                            })}
                            <div className="flex items-center justify-between">
                                <p className={cn("text-sm", matches ? "text-primary" : "text-muted-foreground")}>
                                    {parsed <= 0
                                        ? ""
                                        : matches
                                        ? hasTyped
                                            ? t("payersMatch")
                                            : t("payersEqual")
                                        : remainingCents > 0
                                        ? t("payersShort", { amount: formatMoney(remainingCents / 100) })
                                        : t("payersOver", { amount: formatMoney(-remainingCents / 100) })}
                                </p>
                                {hasTyped && (
                                    <button type="button" className="min-h-[44px] text-sm text-primary" onClick={() => setTyped({})}>
                                        {t("splitPayersEqually")}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </fieldset>

                <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={!canAdd}>
                    <Plus className="mr-2 h-5 w-5" aria-hidden />
                    {canAdd || data.friends.length === 0
                        ? t("addOrder")
                        : payerIds.length === 0
                        ? t("pickPayer")
                        : showAmounts && !matches
                        ? t("payersMustMatch")
                        : t("addOrder")}
                </Button>
            </form>

            {data.orders.length === 0 ? (
                <EmptyState>{t("noOrders")}</EmptyState>
            ) : (
                <>
                    <ul className="space-y-2">
                        {data.orders.map((order) => (
                            <li key={order.id} className="flex items-center gap-3 rounded-2xl border bg-card p-3">
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-base font-medium">{order.description}</p>
                                    <p className="truncate text-sm text-muted-foreground">
                                        {order.payers.length > 1
                                            ? t("paidByMany", {
                                                  names: order.payers.map((p) => `${nameOf(p.id)} ${formatMoney(p.amount)}`).join(" · "),
                                              })
                                            : t("paidByName", { name: nameOf(order.payers[0]?.id ?? "") })}
                                    </p>
                                </div>
                                <span className="text-lg font-semibold tabular-nums">{formatMoney(order.amount)}</span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-11 w-11 text-destructive"
                                    aria-label={`${t("deleteOrder")}: ${order.description}`}
                                    onClick={() => removeOrder(order.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </li>
                        ))}
                    </ul>
                    <div className="flex items-center justify-between rounded-2xl bg-muted px-4 py-3 text-base font-semibold">
                        <span>{t("total")}</span>
                        <span className="tabular-nums">{formatMoney(total)}</span>
                    </div>
                </>
            )}
        </section>
    );
}
