"use client";

import React, { useMemo } from "react";
import { ArrowRight, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { computeBalances, computeBill, computeDebts } from "../../lib/calc";
import { cn } from "../../lib/utils";
import { useI18n } from "../../lib/i18n";
import { ShareButton } from "../ShareButton";
import { FriendAvatar } from "../FriendAvatar";
import { EmptyState } from "../EmptyState";
import { WhoAteWhat } from "../bills/WhoAteWhat";
import { tagKey, tagLabel } from "../../lib/tags";
import { StepHeader } from "./StepHeader";
import { StepProps } from "./types";

export function SummaryStep({ data, update, sessionId }: StepProps & { sessionId: string }) {
    const { t, formatMoney } = useI18n();

    const { balances, debts } = useMemo(() => {
        const b = computeBalances(data.friends, data.bills);
        return { balances: b, debts: computeDebts(b) };
    }, [data.friends, data.bills]);

    const ids = data.friends.map((f) => f.id);

    // Spend per tag including each item's share of discounts, service charge and VAT.
    const tagTotals = useMemo(() => {
        const sums = new Map<string, { tag: string; cents: number }>();
        for (const bill of data.bills) {
            const { itemTotals } = computeBill(bill, ids);
            for (const item of bill.items)
                for (const tag of item.tags ?? []) {
                    const entry = sums.get(tagKey(tag)) ?? { tag, cents: 0 };
                    entry.cents += itemTotals[item.id] ?? 0;
                    sums.set(tagKey(tag), entry);
                }
        }
        return Array.from(sums.values()).sort((a, b) => b.cents - a.cents);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data.bills, data.friends]);
    const total = data.bills.reduce((sum, bill) => sum + computeBill(bill, ids).total, 0) / 100;
    const average = data.friends.length ? total / data.friends.length : 0;
    const paid = new Set(data.paidDebts);
    const doneCount = debts.filter((d) => paid.has(d.key)).length;
    const allDone = debts.length > 0 && doneCount === debts.length;
    const nameOf = (id: string) => data.friends.find((f) => f.id === id);

    const toggleDebt = (key: string) =>
        update((cur) => ({
            ...cur,
            paidDebts: cur.paidDebts.includes(key) ? cur.paidDebts.filter((k) => k !== key) : [...cur.paidDebts, key],
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
        <section className="space-y-6">
            <StepHeader step={4} total={4} title={t("summaryTitle")} hint={allDone ? t("allSettled") : t("summaryHint")} />

            <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border p-4">
                    <p className="text-xs text-muted-foreground">{t("totalSpent")}</p>
                    <p className="text-2xl font-semibold tabular-nums">{formatMoney(total)}</p>
                </div>
                <div className="rounded-2xl border p-4">
                    <p className="text-xs text-muted-foreground">{t("average")}</p>
                    <p className="text-2xl font-semibold tabular-nums">{formatMoney(average)}</p>
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                    <h3 className="text-base font-semibold">{t("transfers")}</h3>
                    {debts.length > 0 && (
                        <span className="text-sm text-muted-foreground">
                            {t("transfersProgress", { done: doneCount, total: debts.length })}
                        </span>
                    )}
                </div>

                {debts.length === 0 ? (
                    <EmptyState>{t("noTransfers")}</EmptyState>
                ) : (
                    <ul className="space-y-2">
                        {debts.map((debt) => {
                            const isPaid = paid.has(debt.key);
                            const to = nameOf(debt.to);
                            const from = nameOf(debt.from);
                            return (
                                <li
                                    key={debt.key}
                                    className={cn(
                                        "rounded-2xl border bg-card p-3 transition-colors",
                                        isPaid && "bg-muted/60"
                                    )}
                                >
                                    <button
                                        type="button"
                                        onClick={() => toggleDebt(debt.key)}
                                        aria-pressed={isPaid}
                                        aria-label={`${isPaid ? t("unmarkTransferred") : t("markTransferred")}: ${nameOf(debt.from)?.name} → ${to?.name}`}
                                        className="flex min-h-[48px] w-full items-center gap-3 text-left"
                                    >
                                        <span
                                            aria-hidden
                                            className={cn(
                                                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2",
                                                isPaid ? "border-primary bg-primary text-primary-foreground" : "border-input"
                                            )}
                                        >
                                            {isPaid && <Check className="h-4 w-4" />}
                                        </span>
                                        <span className={cn("flex min-w-0 flex-1 items-center gap-2 text-base", isPaid && "opacity-60")}>
                                            <span className="truncate font-medium">{from?.name}</span>
                                            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                                            <span className="truncate font-medium">{to?.name}</span>
                                        </span>
                                        <span className={cn("text-base font-semibold tabular-nums", isPaid && "line-through")}>
                                            {formatMoney(debt.amount)}
                                        </span>
                                    </button>
                                    {to?.paymentAddress && (
                                        <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-muted px-3 py-1">
                                            <span className="truncate text-sm">{to.paymentAddress}</span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-11 w-11 shrink-0"
                                                aria-label={t("copyPayment")}
                                                onClick={() => copyAddress(to.paymentAddress!)}
                                            >
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            <div className="space-y-2">
                <h3 className="text-base font-semibold">{t("balances")}</h3>
                <ul className="divide-y rounded-2xl border bg-card">
                    {data.friends.map((friend) => {
                        const cents = balances[friend.id] ?? 0;
                        return (
                            <li key={friend.id} className="flex items-center justify-between gap-3 px-4 py-3 text-base">
                                <span className="flex min-w-0 items-center gap-3">
                                    <FriendAvatar friend={friend} size={32} />
                                    <span className="truncate">{friend.name}</span>
                                </span>
                                <span
                                    className={cn(
                                        "shrink-0 font-semibold tabular-nums",
                                        cents > 0 && "text-primary",
                                        cents < 0 && "text-destructive"
                                    )}
                                >
                                    {cents === 0
                                        ? t("settled")
                                        : `${cents > 0 ? t("getsBack") : t("owes")} ${formatMoney(Math.abs(cents) / 100)}`}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            </div>

            {tagTotals.length > 0 && (
                <div className="space-y-2">
                    <div>
                        <h3 className="text-base font-semibold">{t("tagTotals")}</h3>
                        <p className="text-xs text-muted-foreground">{t("tagTotalsHint")}</p>
                    </div>
                    <ul className="divide-y rounded-2xl border bg-card">
                        {tagTotals.map(({ tag, cents }) => (
                            <li key={tagKey(tag)} className="flex items-center justify-between px-4 py-3 text-base">
                                <span>{tagLabel(tag, t)}</span>
                                <span className="font-semibold tabular-nums">{formatMoney(cents / 100)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <WhoAteWhat data={data} />

            <ShareButton sessionId={sessionId} variant="default" label={t("shareSummary")} className="w-full text-base" />
        </section>
    );
}
