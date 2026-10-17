"use client";

import React from "react";
import { Chip } from "../Chip";
import { Button } from "../ui/button";
import { computeConsumed, isOrderAssigned } from "../../lib/calc";
import { useI18n } from "../../lib/i18n";
import { StepHeader } from "./StepHeader";
import { StepProps } from "./types";

export function SplitStep({ data, update }: StepProps) {
    const { t, formatMoney } = useI18n();
    const allIds = data.friends.map((f) => f.id);
    const unassigned = data.orders.filter((o) => !isOrderAssigned(o, data.friends)).length;

    const setAssigned = (orderId: string, ids: string[]) =>
        update((cur) => ({
            ...cur,
            orders: cur.orders.map((o) => (o.id === orderId ? { ...o, assignedTo: ids } : o)),
        }));

    const toggle = (orderId: string, friendId: string) =>
        update((cur) => ({
            ...cur,
            orders: cur.orders.map((o) =>
                o.id !== orderId
                    ? o
                    : {
                          ...o,
                          assignedTo: o.assignedTo.includes(friendId)
                              ? o.assignedTo.filter((id) => id !== friendId)
                              : [...o.assignedTo, friendId],
                      }
            ),
        }));

    return (
        <section className="space-y-5">
            <StepHeader title={t("splitTitle")} hint={t("splitHint")} />

            {unassigned > 0 && (
                <p role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {t("unassignedCount", { count: unassigned })}
                </p>
            )}

            <ul className="space-y-3">
                {data.orders.map((order) => {
                    const sharers = order.assignedTo.filter((id) => allIds.includes(id));
                    const everyone = sharers.length === allIds.length;
                    return (
                        <li key={order.id} className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="truncate text-base font-semibold">{order.description}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {sharers.length > 0
                                            ? t("perPerson", { amount: formatMoney(order.amount / sharers.length) })
                                            : t("nobodySelected")}
                                    </p>
                                </div>
                                <span className="text-lg font-semibold tabular-nums">{formatMoney(order.amount)}</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {data.friends.map((friend) => (
                                    <Chip
                                        key={friend.id}
                                        selected={order.assignedTo.includes(friend.id)}
                                        onClick={() => toggle(order.id, friend.id)}
                                    >
                                        {friend.name}
                                    </Chip>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-11 flex-1"
                                    disabled={everyone}
                                    onClick={() => setAssigned(order.id, allIds)}
                                >
                                    {t("everyone")}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-11 flex-1"
                                    disabled={sharers.length === 0}
                                    onClick={() => setAssigned(order.id, [])}
                                >
                                    {t("clear")}
                                </Button>
                            </div>
                        </li>
                    );
                })}
            </ul>

            <div className="space-y-2">
                <h3 className="text-base font-semibold">{t("perPersonTotals")}</h3>
                <ul className="divide-y rounded-xl border bg-card shadow-sm">
                    {data.friends.map((friend) => (
                        <li key={friend.id} className="flex items-center justify-between px-4 py-3 text-base">
                            <span className="truncate">{friend.name}</span>
                            <span className="font-semibold tabular-nums">
                                {formatMoney(computeConsumed(friend.id, data.friends, data.orders) / 100)}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}

