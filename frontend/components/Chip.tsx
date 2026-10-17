import React from "react";
import { Check } from "lucide-react";
import { cn } from "../lib/utils";

interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    selected?: boolean;
    avatar?: React.ReactNode;
}

/** Large, thumb-friendly toggle used for picking people. */
export function Chip({ selected, avatar, className, children, ...props }: ChipProps) {
    return (
        <button
            type="button"
            aria-pressed={selected}
            className={cn(
                "inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-4 text-base transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                selected
                    ? "border-primary bg-primary/5 font-medium text-primary"
                    : "border-input bg-background text-foreground hover:bg-muted",
                className
            )}
            {...props}
        >
            {avatar}
            {children}
            {selected && <Check className="h-4 w-4" aria-hidden />}
        </button>
    );
}
