"use client";

import React, { useState } from "react";
import { Chip } from "../Chip";
import { FriendAvatar } from "../FriendAvatar";
import { Input } from "../ui/input";
import { BillResult } from "../../lib/calc";
import { cn } from "../../lib/utils";
import { useI18n } from "../../lib/i18n";
import { parseMoney } from "../../lib/money";
import { Bill, Friend } from "../../types";

interface PayersPickerProps {
    friends: Friend[];
    payers: Bill["payers"];
    /** The bill's computed result: supplies the auto-shares and the match/mismatch hint. */
    result: BillResult;
    onChange: (payers: Bill["payers"]) => void;
}

/**
 * Who paid the bill. Tap one name = paid it all. Tap several = amounts appear: type what each
 * person put in; people without a typed amount share what is left equally.
 */
export function PayersPicker({ friends, payers, result, onChange }: PayersPickerProps) {
    const { t, formatMoney } = useI18n();
    const [resetKey, setResetKey] = useState(0);
    const valid = payers.filter((p) => friends.some((f) => f.id === p.id));
    const selected = valid.map((p) => p.id);
    const hasTyped = valid.some((p) => p.amount !== undefined);

    const toggle = (id: string) => {
        // Changing who paid starts from an equal split again.
        onChange(selected.includes(id) ? valid.filter((p) => p.id !== id).map((p) => ({ id: p.id })) : [...valid.map((p) => ({ id: p.id })), { id }]);
        setResetKey((k) => k + 1);
    };

    const type = (id: string, raw: string) => {
        const amount = parseMoney(raw);
        onChange(valid.map((p) => (p.id !== id ? p : raw.trim() === "" || !(amount >= 0) ? { id } : { id, amount })));
    };

    const paidCents = Object.values(result.paid).reduce((s, c) => s + c, 0);
    const diff = result.total - paidCents;
    const showRows = valid.length > 1;

    return (
        <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t("paidBy")}</legend>
            <p className="text-xs text-muted-foreground">{t("paidByHint")}</p>
            <div className="flex flex-wrap gap-2">
                {friends.map((friend) => (
                    <Chip key={friend.id} selected={selected.includes(friend.id)} onClick={() => toggle(friend.id)}>
                        {friend.name}
                    </Chip>
                ))}
            </div>

            {showRows && (
                <div className="space-y-2 pt-2">
                    {valid.map((payer) => {
                        const friend = friends.find((f) => f.id === payer.id)!;
                        return (
                            <div key={`${resetKey}-${payer.id}`} className="flex items-center gap-2">
                                <FriendAvatar friend={friend} size={28} />
                                <span className="min-w-0 flex-1 truncate text-base">{friend.name}</span>
                                <Input
                                    defaultValue={payer.amount !== undefined ? String(payer.amount) : ""}
                                    onChange={(e) => type(payer.id, e.target.value)}
                                    inputMode="decimal"
                                    pattern="[0-9]*[.,]?[0-9]*"
                                    placeholder={formatMoney((result.paid[payer.id] ?? 0) / 100)}
                                    aria-label={`${t("paidAmount")}: ${friend.name}`}
                                    className="h-11 w-28 text-right text-base placeholder:text-foreground/60"
                                />
                            </div>
                        );
                    })}
                    <div className="flex items-center justify-between">
                        <p className={cn("text-sm", result.payersMismatch ? "text-destructive" : "text-primary")}>
                            {result.total <= 0
                                ? ""
                                : !result.payersMismatch
                                ? hasTyped
                                    ? t("payersMatch")
                                    : t("payersEqual")
                                : diff > 0
                                ? t("payersShort", { amount: formatMoney(diff / 100) })
                                : t("payersOver", { amount: formatMoney(-diff / 100) })}
                        </p>
                        {hasTyped && (
                            <button
                                type="button"
                                className="min-h-[44px] text-sm text-primary"
                                onClick={() => {
                                    onChange(valid.map((p) => ({ id: p.id })));
                                    setResetKey((k) => k + 1);
                                }}
                            >
                                {t("splitPayersEqually")}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </fieldset>
    );
}
