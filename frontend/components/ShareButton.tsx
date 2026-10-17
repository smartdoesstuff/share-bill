"use client";

import React from "react";
import { Share2 } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { useI18n } from "../lib/i18n";

interface ShareButtonProps {
    sessionId: string;
    variant?: "outline" | "default";
    label?: string;
    /** Compact icon button for the header. */
    iconOnly?: boolean;
    className?: string;
}

export function ShareButton({ sessionId, variant = "outline", label, iconOnly, className }: ShareButtonProps) {
    const { t } = useI18n();

    const handleShare = async () => {
        const url = `${window.location.origin}/?sessionId=${sessionId}`;
        try {
            if (navigator.share) {
                await navigator.share({ title: t("shareTitle"), text: t("shareText"), url });
            } else {
                await navigator.clipboard.writeText(url);
                toast.success(t("shareCopied"));
            }
        } catch (error) {
            if ((error as Error).name === "AbortError") return; // user closed the share sheet
            try {
                await navigator.clipboard.writeText(url);
                toast.success(t("shareCopied"));
            } catch {
                toast.error(t("shareFailed"));
            }
        }
    };

    return (
        <Button
            onClick={handleShare}
            variant={iconOnly ? "ghost" : variant}
            size={iconOnly ? "icon" : "default"}
            disabled={!sessionId}
            aria-label={label ?? t("share")}
            className={`h-11 gap-2 ${iconOnly ? "w-11" : ""} ${className ?? ""}`}
        >
            <Share2 className="h-4 w-4" aria-hidden />
            {!iconOnly && (label ?? t("share"))}
        </Button>
    );
}
