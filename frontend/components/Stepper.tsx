"use client";

import React from "react";
import { Check } from "lucide-react";
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

export function Stepper({ current, maxReachable, onSelect }: StepperProps) {
    const { t } = useI18n();

    return (
        <nav aria-label={t("stepOf", { current: current + 1, total: STEPS.length })}>
            <ol className="flex items-start">
                {STEPS.map((step, index) => {
                    const isDone = index < current;
                    const isCurrent = index === current;
                    const reachable = index <= maxReachable;
                    return (
                        <li key={step.id} className="relative flex flex-1 flex-col items-center">
                            {index > 0 && (
                                <span
                                    aria-hidden
                                    className={cn(
                                        "absolute right-1/2 top-[15px] h-0.5 w-full -translate-y-1/2 transition-colors",
                                        index <= current ? "bg-primary" : "bg-border"
                                    )}
                                />
                            )}
                            <button
                                type="button"
                                disabled={!reachable}
                                onClick={() => onSelect(index)}
                                aria-current={isCurrent ? "step" : undefined}
                                className="relative flex min-h-[44px] flex-col items-center gap-1 px-1 focus-visible:outline-none disabled:cursor-not-allowed"
                            >
                                <span
                                    className={cn(
                                        "z-10 flex h-[30px] w-[30px] items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
                                        isDone && "border-primary bg-primary text-primary-foreground",
                                        isCurrent && "border-primary bg-background text-primary",
                                        !isDone && !isCurrent && "border-border bg-background text-muted-foreground"
                                    )}
                                >
                                    {isDone ? <Check className="h-4 w-4" aria-hidden /> : index + 1}
                                </span>
                                <span
                                    className={cn(
                                        "text-xs",
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
