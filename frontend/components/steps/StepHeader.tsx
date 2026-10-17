import React from "react";

export function StepHeader({ title, hint }: { title: string; hint: string }) {
    return (
        <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
            <p className="text-base text-muted-foreground">{hint}</p>
        </div>
    );
}
