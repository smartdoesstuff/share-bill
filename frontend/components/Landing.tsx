"use client";

import React, { useEffect, useState } from "react";
import { ArrowRight, Check, Home, Plane, ShoppingBasket, Utensils } from "lucide-react";
import { Button } from "./ui/button";
import { LanguageToggle } from "./LanguageToggle";
import { MessageKey, useI18n } from "../lib/i18n";
import { readLastSession } from "../lib/last-session";

const USE_CASES: { icon: React.ElementType; title: MessageKey; body: MessageKey }[] = [
    { icon: Utensils, title: "useCaseMeal", body: "useCaseMealBody" },
    { icon: Plane, title: "useCaseTrip", body: "useCaseTripBody" },
    { icon: ShoppingBasket, title: "useCaseShared", body: "useCaseSharedBody" },
    { icon: Home, title: "useCaseOffice", body: "useCaseOfficeBody" },
];

const STEPS: { title: MessageKey; body: MessageKey }[] = [
    { title: "howFriends", body: "howFriendsBody" },
    { title: "howOrders", body: "howOrdersBody" },
    { title: "howSummary", body: "howSummaryBody" },
];

const TRUST: MessageKey[] = ["trustNoSignup", "trustShare", "trustMobile", "trustAi"];

interface LandingProps {
    onStart: () => void;
    onResume: (sessionId: string) => void;
}

/** Shown when there is no session in the URL. Rendering it costs nothing: no session exists until the first edit. */
export function Landing({ onStart, onResume }: LandingProps) {
    const { t } = useI18n();
    const [lastSession, setLastSession] = useState<string | null>(null);

    useEffect(() => setLastSession(readLastSession()), []);

    return (
        <div className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col px-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
            <header className="flex items-center justify-between pt-[max(0.75rem,env(safe-area-inset-top))]">
                <span className="text-lg font-semibold">{t("appName")}</span>
                <LanguageToggle />
            </header>

            <main className="flex-1 space-y-12 pt-10">
                <section className="space-y-5">
                    <p className="text-sm font-medium text-primary">{t("landingEyebrow")}</p>
                    <h1 className="text-4xl font-semibold leading-tight tracking-tight">{t("landingTitle")}</h1>
                    <p className="text-base leading-relaxed text-muted-foreground">{t("landingBody")}</p>
                    <div className="space-y-3 pt-2">
                        <Button size="lg" className="h-14 w-full text-base" onClick={onStart}>
                            {t("startSplit")}
                            <ArrowRight className="ml-2 h-5 w-5" aria-hidden />
                        </Button>
                        {lastSession && (
                            <Button
                                variant="outline"
                                size="lg"
                                className="h-12 w-full text-base"
                                onClick={() => onResume(lastSession)}
                            >
                                {t("resumeLast")}
                            </Button>
                        )}
                    </div>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-semibold">{t("useCasesTitle")}</h2>
                    <ul className="grid gap-3">
                        {USE_CASES.map(({ icon: Icon, title, body }) => (
                            <li key={title} className="flex items-start gap-4 rounded-2xl border p-4">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                                    <Icon className="h-5 w-5" aria-hidden />
                                </span>
                                <div>
                                    <p className="font-medium">{t(title)}</p>
                                    <p className="text-sm text-muted-foreground">{t(body)}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-semibold">{t("howTitle")}</h2>
                    <ol className="space-y-4">
                        {STEPS.map((step, index) => (
                            <li key={step.title} className="flex items-start gap-4">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                                    {index + 1}
                                </span>
                                <div className="pt-0.5">
                                    <p className="font-medium">{t(step.title)}</p>
                                    <p className="text-sm text-muted-foreground">{t(step.body)}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                </section>

                <section className="space-y-3 rounded-2xl bg-muted p-5">
                    <ul className="space-y-3">
                        {TRUST.map((key) => (
                            <li key={key} className="flex items-start gap-3 text-sm">
                                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                                {t(key)}
                            </li>
                        ))}
                    </ul>
                </section>

                <Button size="lg" className="h-14 w-full text-base" onClick={onStart}>
                    {t("startSplit")}
                    <ArrowRight className="ml-2 h-5 w-5" aria-hidden />
                </Button>
            </main>
        </div>
    );
}
