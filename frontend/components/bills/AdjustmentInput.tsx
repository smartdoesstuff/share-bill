"use client";

import React, { useState } from "react";
import { Input } from "../ui/input";
import { cn } from "../../lib/utils";
import { useI18n } from "../../lib/i18n";
import { parseMoney } from "../../lib/money";
import { Adjustment } from "../../types";

interface AdjustmentInputProps {
    id: string;
    label: string;
    value?: Adjustment;
    onChange: (value: Adjustment | undefined) => void;
}

/** A discount typed as a fixed amount or as a percentage. Empty = no discount. */
export function AdjustmentInput({ id, label, value, onChange }: AdjustmentInputProps) {
    const { t } = useI18n();
    const [type, setType] = useState<Adjustment["type"]>(value?.type ?? "amount");
    const [text, setText] = useState(value ? String(value.value) : "");

    const emit = (nextType: Adjustment["type"], nextText: string) => {
        const parsed = parseMoney(nextText);
        const max = nextType === "percent" ? 100 : 10_000_000;
        onChange(parsed > 0 && parsed <= max ? { type: nextType, value: parsed } : undefined);
    };

    return (
        <div className="space-y-2">
            <label htmlFor={id} className="text-sm font-medium">
                {label}
            </label>
            <div className="flex gap-2">
                <div role="group" aria-label={label} className="flex shrink-0 rounded-xl border p-0.5">
                    {(["amount", "percent"] as const).map((option) => (
                        <button
                            key={option}
                            type="button"
                            aria-pressed={type === option}
                            onClick={() => {
                                setType(option);
                                emit(option, text);
                            }}
                            className={cn(
                                "min-h-[44px] min-w-[52px] rounded-[10px] px-3 text-sm transition-colors",
                                type === option ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                            )}
                        >
                            {option === "amount" ? t("discountAmount") : t("discountPercent")}
                        </button>
                    ))}
                </div>
                <Input
                    id={id}
                    value={text}
                    onChange={(e) => {
                        setText(e.target.value);
                        emit(type, e.target.value);
                    }}
                    inputMode="decimal"
                    pattern="[0-9]*[.,]?[0-9]*"
                    placeholder="0"
                    autoComplete="off"
                    aria-label={t("discountValue")}
                    className="h-12 text-base"
                />
            </div>
        </div>
    );
}
