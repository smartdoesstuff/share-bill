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
                "inline-flex min-h-[48px] items-center gap-2 rounded-full border-2 pl-2 pr-4 text-base transition-all active:scale-95",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                selected
                    ? "border-primary bg-primary/10 font-semibold text-primary"
                    : "border-input bg-background text-foreground hover:bg-accent",
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
