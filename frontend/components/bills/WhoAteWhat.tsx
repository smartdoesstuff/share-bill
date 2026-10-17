"use client";

import React, { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { FriendAvatar } from "../FriendAvatar";
import { computeBill } from "../../lib/calc";
import { billTitle } from "../../lib/bills";
import { cn } from "../../lib/utils";
import { useI18n } from "../../lib/i18n";
import { SessionData } from "../../types";

/** Per person: which items they share in each bill, and what they pay including discounts, service charge and VAT. */
export function WhoAteWhat({ data }: { data: SessionData }) {
    const { t, formatMoney } = useI18n();
    const [openId, setOpenId] = useState<string | null>(null);
    const ids = data.friends.map((f) => f.id);

    const results = useMemo(
        () => data.bills.map((bill) => ({ bill, result: computeBill(bill, ids) })),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [data.bills, data.friends]
    );

    return (
        <div className="space-y-2">
            <div>
                <h3 className="text-base font-semibold">{t("whoAteWhat")}</h3>
                <p className="text-sm text-muted-foreground">{t("whoAteWhatHint")}</p>
            </div>
            <ul className="divide-y rounded-2xl border bg-card">
                {data.friends.map((friend) => {
                    const total = results.reduce((sum, { result }) => sum + (result.shares[friend.id] ?? 0), 0);
                    const open = openId === friend.id;
                    return (
                        <li key={friend.id}>
                            <button
                                type="button"
                                onClick={() => setOpenId(open ? null : friend.id)}
                                aria-expanded={open}
                                className="flex min-h-[56px] w-full items-center gap-3 px-4 py-2 text-left"
                            >
                                <FriendAvatar friend={friend} size={32} />
                                <span className="min-w-0 flex-1 truncate text-base">{friend.name}</span>
                                <span className="text-base font-semibold tabular-nums">{formatMoney(total / 100)}</span>
                                <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden />
                            </button>
                            {open && (
                                <div className="space-y-3 border-t bg-muted/40 px-4 py-3">
                                    {results.every(({ result }) => (result.shares[friend.id] ?? 0) === 0) && (
                                        <p className="text-sm text-muted-foreground">{t("nothingShared")}</p>
                                    )}
                                    {results.map(({ bill, result }) => {
                                        const mine = bill.items.filter((i) => (result.itemShares[i.id]?.[friend.id] ?? 0) > 0 || (result.itemShares[i.id] && friend.id in result.itemShares[i.id]));
                                        const share = result.shares[friend.id] ?? 0;
                                        if (mine.length === 0 && share === 0) return null;
                                        const extras = share - (result.consumed[friend.id] ?? 0);
                                        return (
                                            <div key={bill.id} className="space-y-1">
                                                <p className="text-sm font-semibold">
                                                    {billTitle(bill, data.bills, t)}
                                                </p>
                                                <ul className="space-y-0.5 text-sm">
                                                    {mine.map((item) => (
                                                        <li key={item.id} className="flex justify-between gap-3">
                                                            <span className="truncate text-muted-foreground">{item.name}</span>
                                                            <span className="tabular-nums">{formatMoney((result.itemShares[item.id][friend.id] ?? 0) / 100)}</span>
                                                        </li>
                                                    ))}
                                                    {extras !== 0 && (
                                                        <li className="flex justify-between gap-3">
                                                            <span className="truncate text-muted-foreground">{t("extrasShare")}</span>
                                                            <span className="tabular-nums">
                                                                {extras > 0 ? "+" : "-"}
                                                                {formatMoney(Math.abs(extras) / 100)}
                                                            </span>
                                                        </li>
                                                    )}
                                                    <li className="flex justify-between gap-3 border-t pt-0.5 font-medium">
                                                        <span>{t("total")}</span>
                                                        <span className="tabular-nums">{formatMoney(share / 100)}</span>
                                                    </li>
                                                </ul>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
