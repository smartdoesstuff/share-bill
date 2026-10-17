"use client";

import React from "react";
import { cn } from "../lib/utils";
import { MessageKey, useI18n } from "../lib/i18n";

export const STEPS: { id: string; label: MessageKey }[] = [
    { id: "friends", label: "stepFriends" },
    { id: "orders", label: "stepOrders" },
    { id: "split", label: "stepSplit" },
    { id: "summary", label: "stepSummary" },
];

interface StepperProps {
    current: number;
    /** Highest step the user may jump to directly. */
    maxReachable: number;
    onSelect: (index: number) => void;
}

/** Four thin bars with labels: shows progress without taking vertical space. */
export function Stepper({ current, maxReachable, onSelect }: StepperProps) {
    const { t } = useI18n();

    return (
        <nav aria-label={t("stepOf", { current: current + 1, total: STEPS.length })}>
            <ol className="flex gap-2">
                {STEPS.map((step, index) => {
                    const reachable = index <= maxReachable;
                    const isCurrent = index === current;
                    return (
                        <li key={step.id} className="flex-1">
                            <button
                                type="button"
                                disabled={!reachable}
                                onClick={() => onSelect(index)}
                                aria-current={isCurrent ? "step" : undefined}
                                className="group flex min-h-[44px] w-full flex-col justify-center gap-1.5 text-left focus-visible:outline-none disabled:cursor-not-allowed"
                            >
                                <span
                                    className={cn(
                                        "h-1 w-full rounded-full transition-colors",
                                        index <= current ? "bg-primary" : "bg-border"
                                    )}
                                />
                                <span
                                    className={cn(
                                        "truncate text-xs",
                                        isCurrent ? "font-semibold text-foreground" : "text-muted-foreground"
                                    )}
                                >
                                    {t(step.label)}
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
