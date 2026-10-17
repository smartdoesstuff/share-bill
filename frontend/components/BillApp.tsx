"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { LanguageToggle } from "./LanguageToggle";
import { ShareButton } from "./ShareButton";
import { STEPS, Stepper } from "./Stepper";
import { SyncStatus } from "./SyncStatus";
import { FriendsStep } from "./steps/FriendsStep";
import { OrdersStep } from "./steps/OrdersStep";
import { SplitStep } from "./steps/SplitStep";
import { SummaryStep } from "./steps/SummaryStep";
import { useSession } from "../hooks/use-session";
import { isOrderAssigned } from "../lib/calc";
import { MessageKey, useI18n } from "../lib/i18n";
import { rememberLastSession } from "../lib/last-session";

/** Why the user can't leave each step yet (null = free to continue). */
function blockers(data: ReturnType<typeof useSession>["data"]): (MessageKey | null)[] {
    return [
        data.friends.length >= 2 ? null : "needTwoFriends",
        data.orders.length >= 1 ? null : "needOneOrder",
        data.orders.every((o) => isOrderAssigned(o, data.friends)) ? null : "unassignedCount",
        null,
    ];
}

const readStep = (): number | null => {
    const raw = Number(new URLSearchParams(window.location.search).get("step"));
    return Number.isInteger(raw) && raw >= 1 && raw <= STEPS.length ? raw - 1 : null;
};

export function BillApp({ sessionId }: { sessionId: string }) {
    const { t } = useI18n();
    const [requestedStep, setRequestedStep] = useState<number | null>(null);
    const { data, status, saveState, update, reload, retrySave } = useSession(sessionId);
    const didPickInitialStep = useRef(false);

    // Step comes from the URL so the browser back button walks through the steps.
    useEffect(() => {
        setRequestedStep(readStep());
        const onPop = () => setRequestedStep(readStep());
        window.addEventListener("popstate", onPop);
        return () => window.removeEventListener("popstate", onPop);
    }, []);

    // Remember the last bill that has content so the landing page can offer to resume it.
    useEffect(() => {
        if (status === "ready" && data.friends.length > 0) rememberLastSession(sessionId);
    }, [status, data.friends.length, sessionId]);

    const gates = useMemo(() => blockers(data), [data]);
    const maxReachable = useMemo(() => {
        const firstBlocked = gates.findIndex((g) => g !== null);
        return firstBlocked === -1 ? STEPS.length - 1 : firstBlocked;
    }, [gates]);

    // Returning to a finished session lands on the summary instead of an empty form.
    useEffect(() => {
        if (status !== "ready" || didPickInitialStep.current) return;
        didPickInitialStep.current = true;
        if (requestedStep === null && maxReachable === STEPS.length - 1) setRequestedStep(STEPS.length - 1);
    }, [status, requestedStep, maxReachable]);

    const step = status === "ready" ? Math.min(requestedStep ?? 0, maxReachable) : 0;

    const goTo = useCallback((index: number) => {
        const params = new URLSearchParams(window.location.search);
        params.set("step", String(index + 1));
        window.history.pushState(null, "", `/?${params.toString()}`);
        setRequestedStep(index);
        window.scrollTo({ top: 0 });
    }, []);

    const blocker = gates[step];

    return (
        <div className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col bg-background">
            <header className="sticky top-0 z-20 border-b bg-background/95 px-4 pb-1 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
                <div className="flex items-center justify-between gap-2">
                    <div>
                        <h1 className="text-lg font-semibold leading-tight">{t("appName")}</h1>
                        <SyncStatus state={saveState} onRetry={retrySave} />
                    </div>
                    <div className="flex items-center gap-1">
                        <LanguageToggle />
                        <ShareButton sessionId={sessionId} iconOnly />
                    </div>
                </div>
                <div className="mt-2">
                    <Stepper current={step} maxReachable={status === "ready" ? maxReachable : 0} onSelect={goTo} />
                </div>
            </header>

            <main className="flex-1 px-4 pb-40 pt-5">
                {status === "loading" && (
                    <div className="space-y-4" aria-busy="true" role="status">
                        <span className="sr-only">{t("loading")}</span>
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-8 w-2/3" />
                        <Skeleton className="h-40 w-full rounded-2xl" />
                        <Skeleton className="h-16 w-full rounded-2xl" />
                    </div>
                )}

                {status === "error" && (
                    <div role="alert" className="space-y-3 rounded-2xl border p-5">
                        <h2 className="text-lg font-semibold">{t("loadFailedTitle")}</h2>
                        <p className="text-muted-foreground">{t("loadFailedBody")}</p>
                        <Button onClick={reload} size="lg" className="h-12 w-full text-base">
                            <RefreshCw className="mr-2 h-4 w-4" aria-hidden /> {t("retry")}
                        </Button>
                    </div>
                )}

                {status === "ready" && (
                    <>
                        {step === 0 && <FriendsStep data={data} update={update} />}
                        {step === 1 && <OrdersStep data={data} update={update} />}
                        {step === 2 && <SplitStep data={data} update={update} />}
                        {step === 3 && <SummaryStep data={data} update={update} sessionId={sessionId} />}
                    </>
                )}
            </main>

            {status === "ready" && (
                <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 backdrop-blur">
                    <div className="mx-auto max-w-lg space-y-2 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
                        {blocker && step < STEPS.length - 1 && (
                            <p className="text-center text-sm text-muted-foreground">
                                {blocker === "unassignedCount"
                                    ? t(blocker, { count: data.orders.filter((o) => !isOrderAssigned(o, data.friends)).length })
                                    : t(blocker)}
                            </p>
                        )}
                        <div className="flex gap-3">
                            {step > 0 && (
                                <Button variant="outline" size="lg" className="h-12 flex-1 text-base" onClick={() => goTo(step - 1)}>
                                    {t("back")}
                                </Button>
                            )}
                            {step < STEPS.length - 1 && (
                                <Button
                                    size="lg"
                                    className="h-12 flex-[2] text-base"
                                    disabled={blocker !== null}
                                    onClick={() => goTo(step + 1)}
                                >
                                    {t("next")}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
