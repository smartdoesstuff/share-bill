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
        <div role="group" aria-label={t("language")} className="flex items-center">
            {OPTIONS.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    aria-pressed={lang === option.value}
                    onClick={() => setLang(option.value)}
                    className={cn(
                        "min-h-[44px] min-w-[40px] px-2 text-sm transition-colors",
                        lang === option.value ? "font-semibold text-foreground" : "text-muted-foreground"
                    )}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}
