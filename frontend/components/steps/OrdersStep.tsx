"use client";

import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Chip } from "../Chip";
import { useI18n } from "../../lib/i18n";
import { generateId } from "../../lib/id";
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

    const parsed = parseAmount(amount);
    const canAdd = description.trim().length > 0 && parsed > 0 && !!paidBy;
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
                    paidBy,
                    // Most items are shared by everyone: the next step lets the user narrow it down.
                    assignedTo: cur.friends.map((f) => f.id),
                },
            ],
        }));
        setDescription("");
        setAmount("");
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
                    <legend className="text-sm font-medium">{t("paidBy")}</legend>
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
                </fieldset>
                <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={!canAdd}>
                    <Plus className="mr-2 h-5 w-5" aria-hidden />
                    {selectedPayer || data.friends.length === 0 ? t("addOrder") : t("pickPayer")}
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
                                        {t("paidByName", { name: nameOf(order.paidBy) })}
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
