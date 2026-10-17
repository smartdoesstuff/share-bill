import React from "react";

export function EmptyState({ children }: { children: React.ReactNode }) {
    return (
        <p className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">{children}</p>
    );
}
