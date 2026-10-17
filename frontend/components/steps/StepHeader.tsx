"use client";

import React from "react";
import { useI18n } from "../../lib/i18n";

export function StepHeader({ step, total, title, hint }: { step: number; total: number; title: string; hint: string }) {
    const { t } = useI18n();
    return (
        <header className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("stepOf", { current: step, total })}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
            <p className="text-sm text-muted-foreground">{hint}</p>
        </header>
    );
}
