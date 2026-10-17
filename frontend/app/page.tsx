"use client";

import { useCallback, useEffect, useState } from "react";
import { BillApp } from "../components/BillApp";
import { Landing } from "../components/Landing";
import { generateId } from "../lib/id";

const readSessionId = (): string | null => new URLSearchParams(window.location.search).get("sessionId");

/**
 * `/` is the landing page. A bill lives at `/?sessionId=...`, so existing share links keep working.
 * Starting a bill only picks an id in the browser; nothing is stored until the first edit.
 */
export default function Home() {
    // undefined = URL not read yet (avoids flashing the landing page for people opening a share link)
    const [sessionId, setSessionId] = useState<string | null | undefined>(undefined);

    useEffect(() => {
        setSessionId(readSessionId());
        const onPop = () => setSessionId(readSessionId());
        window.addEventListener("popstate", onPop);
        return () => window.removeEventListener("popstate", onPop);
    }, []);

    const open = useCallback((id: string) => {
        window.history.pushState(null, "", `/?sessionId=${id}`);
        window.scrollTo({ top: 0 });
        setSessionId(id);
    }, []);

    if (sessionId === undefined) return <div className="min-h-[100dvh]" />;
    if (sessionId === null) return <Landing onStart={() => open(generateId())} onResume={open} />;
    return <BillApp key={sessionId} sessionId={sessionId} />;
}
