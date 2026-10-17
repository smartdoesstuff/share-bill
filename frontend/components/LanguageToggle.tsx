"use client";

import React from "react";
import { cn } from "../lib/utils";
import { Lang, useI18n } from "../lib/i18n";

const OPTIONS: { value: Lang; label: string }[] = [
    { value: "th", label: "ไทย" },
    { value: "en", label: "EN" },
];

export function LanguageToggle() {
    const { lang, setLang, t } = useI18n();

    return (
        <div role="group" aria-label={t("language")} className="flex rounded-full border bg-background p-0.5">
            {OPTIONS.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    aria-pressed={lang === option.value}
                    onClick={() => setLang(option.value)}
                    className={cn(
                        "min-h-[36px] min-w-[44px] rounded-full px-3 text-sm transition-colors",
                        lang === option.value ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    )}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}
