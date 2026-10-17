"use client";

import React, { useMemo } from "react";
import { Chip } from "../Chip";
import { FriendAvatar } from "../FriendAvatar";
import { Button } from "../ui/button";
import { computeBill, isItemAssigned } from "../../lib/calc";
import { useI18n } from "../../lib/i18n";
import { Bill, Item } from "../../types";
import { StepHeader } from "./StepHeader";
import { StepProps } from "./types";

export function SplitStep({ data, update }: StepProps) {
    const { t, formatMoney } = useI18n();
    const allIds = data.friends.map((f) => f.id);
    const billsWithItems = data.bills.filter((b) => b.items.length > 0);
    const unassigned = billsWithItems.reduce((n, b) => n + b.items.filter((i) => !isItemAssigned(i, data.friends)).length, 0);

    // What each person pays in total across all bills, including their part of discounts, service charge and VAT.
    const totals = useMemo(() => {
        const sums: Record<string, number> = Object.fromEntries(allIds.map((id) => [id, 0]));
        for (const bill of data.bills) {
            const { shares } = computeBill(bill, allIds);
            for (const [id, cents] of Object.entries(shares)) sums[id] += cents;
        }
        return sums;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data.bills, data.friends]);

    const setAssigned = (billId: string, itemId: string, ids: string[]) =>
        update((cur) => ({
            ...cur,
            bills: cur.bills.map((b) =>
                b.id !== billId ? b : { ...b, items: b.items.map((i) => (i.id === itemId ? { ...i, assignedTo: ids } : i)) }
            ),
        }));

    const toggle = (billId: string, item: Item, friendId: string) =>
        setAssigned(
            billId,
            item.id,
            item.assignedTo.includes(friendId) ? item.assignedTo.filter((id) => id !== friendId) : [...item.assignedTo, friendId]
        );

    const titleOf = (bill: Bill) => bill.name.trim() || t("billN", { n: data.bills.indexOf(bill) + 1 });

    return (
        <section className="space-y-5">
            <StepHeader step={3} total={4} title={t("splitTitle")} hint={t("splitHint")} />

            {unassigned > 0 && (
                <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {t("unassignedCount", { count: unassigned })}
                </p>
            )}

            {billsWithItems.map((bill) => {
                const result = computeBill(bill, allIds);
                return (
                    <div key={bill.id} className="space-y-2">
                        <h3 className="text-base font-semibold">{titleOf(bill)}</h3>
                        <ul className="space-y-3">
                            {bill.items.map((item) => {
                                const sharers = item.assignedTo.filter((id) => allIds.includes(id));
                                const everyone = sharers.length === allIds.length;
                                const net = (result.itemNets[item.id] ?? 0) / 100;
                                return (
                                    <li key={item.id} className="space-y-3 rounded-2xl border bg-card p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-base font-medium">{item.name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {sharers.length > 0
                                                        ? t("perPerson", { amount: formatMoney(net / sharers.length) })
                                                        : t("nobodySelected")}
                                                </p>
                                            </div>
                                            <span className="text-lg font-semibold tabular-nums">{formatMoney(net)}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {data.friends.map((friend) => (
                                                <Chip
                                                    key={friend.id}
                                                    selected={item.assignedTo.includes(friend.id)}
                                                    onClick={() => toggle(bill.id, item, friend.id)}
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
                                                onClick={() => setAssigned(bill.id, item.id, allIds)}
                                            >
                                                {t("everyone")}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-11 flex-1"
                                                disabled={sharers.length === 0}
                                                onClick={() => setAssigned(bill.id, item.id, [])}
                                            >
                                                {t("clear")}
                                            </Button>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                );
            })}

            <div className="space-y-2">
                <h3 className="text-base font-semibold">{t("perPersonTotals")}</h3>
                <ul className="divide-y rounded-2xl border bg-card">
                    {data.friends.map((friend) => (
                        <li key={friend.id} className="flex items-center justify-between px-4 py-3 text-base">
                            <span className="flex min-w-0 items-center gap-3">
                                <FriendAvatar friend={friend} size={28} />
                                <span className="truncate">{friend.name}</span>
                            </span>
                            <span className="font-semibold tabular-nums">{formatMoney((totals[friend.id] ?? 0) / 100)}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
