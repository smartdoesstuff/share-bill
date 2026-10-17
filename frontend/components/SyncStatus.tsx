"use client";

import React from "react";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { SaveState } from "../hooks/use-session";
import { useI18n } from "../lib/i18n";

export function SyncStatus({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
    const { t } = useI18n();

    return (
        <div role="status" aria-live="polite" className="flex h-6 items-center text-xs text-muted-foreground">
            {state === "saving" && (
                <span className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> {t("saving")}
                </span>
            )}
            {state === "pending" && <span>{t("pending")}</span>}
            {state === "saved" && (
                <span className="flex items-center gap-1 text-green-700">
                    <Check className="h-3 w-3" aria-hidden /> {t("saved")}
                </span>
            )}
            {state === "error" && (
                <button onClick={onRetry} className="flex items-center gap-1 text-destructive underline">
                    <AlertCircle className="h-3 w-3" aria-hidden /> {t("saveError")}
                </button>
            )}
        </div>
    );
}
