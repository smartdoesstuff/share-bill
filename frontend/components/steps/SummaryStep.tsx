"use client";

import React, { useMemo } from "react";
import { ArrowRight, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { computeBalances, computeDebts, toCents } from "../../lib/calc";
import { cn } from "../../lib/utils";
import { useI18n } from "../../lib/i18n";
import { ShareButton } from "../ShareButton";
import { FriendAvatar } from "../FriendAvatar";
import { EmptyState, MascotSays } from "../Mascot";
import { StepProps } from "./types";

export function SummaryStep({ data, update, sessionId }: StepProps & { sessionId: string }) {
    const { t, formatMoney } = useI18n();

    const { balances, debts } = useMemo(() => {
        const b = computeBalances(data.friends, data.orders);
        return { balances: b, debts: computeDebts(b) };
    }, [data.friends, data.orders]);

    const total = data.orders.reduce((sum, o) => sum + toCents(o.amount), 0) / 100;
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
            <MascotSays mood={allDone ? "party" : "happy"} title={t("summaryTitle")}>
                {allDone ? t("allSettled") : t("summaryHint")}
            </MascotSays>

            <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-primary p-4 text-primary-foreground">
                    <p className="text-sm opacity-90">{t("totalSpent")}</p>
                    <p className="text-2xl font-bold tabular-nums">{formatMoney(total)}</p>
                </div>
                <div className="rounded-2xl bg-muted p-4">
                    <p className="text-sm text-muted-foreground">{t("average")}</p>
                    <p className="text-2xl font-bold tabular-nums">{formatMoney(average)}</p>
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
                    <EmptyState mood="party">{t("noTransfers")}</EmptyState>
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
                                        "rounded-2xl border bg-card p-3 shadow-sm transition-colors",
                                        isPaid && "border-green-600/40 bg-green-50"
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
                                                isPaid ? "border-green-600 bg-green-600 text-white" : "border-input"
                                            )}
                                        >
                                            {isPaid && <Check className="h-4 w-4" />}
                                        </span>
                                        <span className={cn("flex min-w-0 flex-1 items-center gap-2 text-base", isPaid && "opacity-60")}>
                                            {from && <FriendAvatar friend={from} size={36} />}
                                            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                                            {to && <FriendAvatar friend={to} size={36} />}
                                            <span className="min-w-0 text-sm leading-tight">
                                                <span className="block truncate font-semibold">{from?.name}</span>
                                                <span className="block truncate text-muted-foreground">{to?.name}</span>
                                            </span>
                                        </span>
                                        <span className={cn("text-lg font-bold tabular-nums", isPaid && "line-through")}>
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
                <ul className="divide-y rounded-2xl border bg-card shadow-sm">
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
                                        cents > 0 && "text-green-700",
                                        cents < 0 && "text-red-700"
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

            <ShareButton sessionId={sessionId} variant="default" label={t("shareSummary")} className="w-full text-base" />
        </section>
    );
}
