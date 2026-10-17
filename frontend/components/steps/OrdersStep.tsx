"use client";

import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Chip } from "../Chip";
import { useI18n } from "../../lib/i18n";
import { generateId } from "../../lib/id";
import { payersOf, toCents } from "../../lib/calc";
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
    const [paidBy, setPaidBy] = useState("");
    const [multi, setMulti] = useState(false);
    const [payerAmounts, setPayerAmounts] = useState<Record<string, string>>({});

    const parsed = parseAmount(amount);
    // Multi-payer: what each person put in, and whether it adds up to the item price.
    const entered = data.friends
        .map((f) => ({ id: f.id, amount: parseAmount(payerAmounts[f.id] ?? "") }))
        .filter((p) => p.amount > 0);
    const paidCents = entered.reduce((sum, p) => sum + toCents(p.amount), 0);
    const remainingCents = parsed > 0 ? toCents(parsed) - paidCents : 0;
    const payersOk = multi ? entered.length > 0 && parsed > 0 && remainingCents === 0 : !!paidBy;
    const canAdd = description.trim().length > 0 && parsed > 0 && payersOk;
    const nameOf = (id: string) => data.friends.find((f) => f.id === id)?.name ?? t("unknownPerson");
    const total = data.orders.reduce((sum, o) => sum + o.amount, 0);

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
                    paidBy: multi ? entered[0].id : paidBy,
                    ...(multi && entered.length > 1 ? { payers: entered } : {}),
                    // Most items are shared by everyone: the next step lets the user narrow it down.
                    assignedTo: cur.friends.map((f) => f.id),
                },
            ],
        }));
        setDescription("");
        setAmount("");
        setPayerAmounts({});
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

    // Keep the remembered payer valid if that friend was removed in another step/device.
    const selectedPayer = data.friends.some((f) => f.id === paidBy) ? paidBy : "";

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
                        onChange={(e) => setAmount(e.target.value)}
                        inputMode="decimal"
                        pattern="[0-9]*[.,]?[0-9]*"
                        placeholder="0.00"
                        autoComplete="off"
                        enterKeyHint="done"
                        className="h-12 text-base"
                    />
                </div>
                <fieldset className="space-y-2">
                    <div className="flex items-center justify-between">
                        <legend className="text-sm font-medium">{t("paidBy")}</legend>
                        <button
                            type="button"
                            onClick={() => setMulti((m) => !m)}
                            className="min-h-[44px] text-sm text-primary"
                        >
                            {multi ? t("paySingle") : t("payMultiple")}
                        </button>
                    </div>
                    {multi ? (
                        <div className="space-y-2">
                            {data.friends.map((friend) => {
                                const value = payerAmounts[friend.id] ?? "";
                                return (
                                    <div key={friend.id} className="flex items-center gap-2">
                                        <FriendAvatar friend={friend} size={28} />
                                        <span className="min-w-0 flex-1 truncate text-base">{friend.name}</span>
                                        {remainingCents > 0 && !value && (
                                            <button
                                                type="button"
                                                className="min-h-[44px] shrink-0 px-1 text-sm text-primary"
                                                onClick={() =>
                                                    setPayerAmounts((cur) => ({ ...cur, [friend.id]: String(remainingCents / 100) }))
                                                }
                                            >
                                                {t("fillRemaining")}
                                            </button>
                                        )}
                                        <Input
                                            value={value}
                                            onChange={(e) => setPayerAmounts((cur) => ({ ...cur, [friend.id]: e.target.value }))}
                                            inputMode="decimal"
                                            pattern="[0-9]*[.,]?[0-9]*"
                                            placeholder="0.00"
                                            aria-label={`${t("paidAmount")}: ${friend.name}`}
                                            className="h-11 w-28 text-right text-base"
                                        />
                                    </div>
                                );
                            })}
                            {parsed > 0 && (
                                <p
                                    className={cn(
                                        "text-sm",
                                        remainingCents === 0 && paidCents > 0 ? "text-primary" : "text-muted-foreground"
                                    )}
                                >
                                    {remainingCents === 0 && paidCents > 0
                                        ? t("payersMatch")
                                        : remainingCents > 0
                                        ? t("payersShort", { amount: formatMoney(remainingCents / 100) })
                                        : t("payersOver", { amount: formatMoney(-remainingCents / 100) })}
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {data.friends.map((friend) => (
                                <Chip
                                    key={friend.id}
                                    selected={selectedPayer === friend.id}
                                    onClick={() => setPaidBy(friend.id)}
                                >
                                    {friend.name}
                                </Chip>
                            ))}
                        </div>
                    )}
                </fieldset>
                <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={!canAdd}>
                    <Plus className="mr-2 h-5 w-5" aria-hidden />
                    {payersOk || data.friends.length === 0 ? t("addOrder") : multi ? t("payersMustMatch") : t("pickPayer")}
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
                                        {payersOf(order).length > 1
                                            ? t("paidByMany", {
                                                  names: payersOf(order)
                                                      .map((p) => `${nameOf(p.id)} ${formatMoney(p.amount)}`)
                                                      .join(" · "),
                                              })
                                            : t("paidByName", { name: nameOf(order.paidBy) })}
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
