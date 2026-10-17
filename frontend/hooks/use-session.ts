"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchSession, fetchSessionIfChanged, saveSession } from "../lib/api";
import { mergeSessionData } from "../lib/merge";
import { SessionData, SessionSnapshot } from "../types";

export type LoadStatus = "loading" | "ready" | "error";
/** idle: nothing to save · pending: edits waiting · saving · saved · error: will retry */
export type SaveState = "idle" | "pending" | "saving" | "saved" | "error";

const EMPTY: SessionData = { friends: [], bills: [], paidDebts: [] };
const SAVE_DEBOUNCE_MS = 500;
const RETRY_MS = 4000;
const POLL_MS = 8000;
const MAX_CONFLICT_ROUNDS = 5;

const pick = (s: SessionSnapshot): SessionData => ({
    friends: s.friends,
    bills: s.bills,
    paidDebts: s.paidDebts ?? [],
});

/**
 * Loads a session and keeps it in sync with the server.
 *
 * Safety rules that prevent the "slow load overwrites the database" bug:
 *  1. Nothing is ever written before the first GET has succeeded (`status === "ready"`).
 *  2. Only user edits mark the state dirty; loading/polling never trigger a write.
 *  3. Every write carries the version it was based on. If someone else saved in the
 *     meantime the server answers 409 and we three-way merge instead of clobbering.
 */
export function useSession(sessionId: string | null) {
    const [data, setData] = useState<SessionData>(EMPTY);
    const [status, setStatus] = useState<LoadStatus>("loading");
    const [saveState, setSaveState] = useState<SaveState>("idle");

    const dataRef = useRef<SessionData>(EMPTY);
    const baseRef = useRef<SessionData>(EMPTY); // last state known to be on the server
    const versionRef = useRef(0);
    const statusRef = useRef<LoadStatus>("loading");
    const dirtyRef = useRef(false);
    const savingRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setTimeout>>();

    const applyRemote = useCallback((snapshot: SessionSnapshot) => {
        const next = pick(snapshot);
        versionRef.current = snapshot.version;
        baseRef.current = next;
        dataRef.current = next;
        dirtyRef.current = false;
        setData(next);
    }, []);

    const load = useCallback(async () => {
        if (!sessionId) return;
        statusRef.current = "loading";
        setStatus("loading");
        try {
            applyRemote(await fetchSession(sessionId));
            statusRef.current = "ready";
            setStatus("ready");
        } catch (error) {
            console.error("Failed to load session", error);
            statusRef.current = "error";
            setStatus("error");
        }
    }, [sessionId, applyRemote]);

    useEffect(() => {
        load();
    }, [load]);

    const schedule = useCallback((delay: number, run: () => void) => {
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(run, delay);
    }, []);

    const flush = useCallback(async () => {
        if (!sessionId || savingRef.current || !dirtyRef.current || statusRef.current !== "ready") return;
        savingRef.current = true;
        setSaveState("saving");

        try {
            let sent = dataRef.current;
            for (let round = 0; round < MAX_CONFLICT_ROUNDS; round++) {
                const result = await saveSession(sessionId, sent, versionRef.current);

                if (result.status === "ok") {
                    versionRef.current = result.session.version;
                    baseRef.current = sent;
                    if (dataRef.current === sent) {
                        dirtyRef.current = false;
                        setSaveState("saved");
                    } else {
                        // The user kept editing while we were saving.
                        setSaveState("pending");
                        schedule(SAVE_DEBOUNCE_MS, flush);
                    }
                    return;
                }

                // Someone else saved first: replay our edits on top of their version and retry.
                const remote = pick(result.session);
                const merged = mergeSessionData(baseRef.current, dataRef.current, remote);
                versionRef.current = result.session.version;
                baseRef.current = remote;
                dataRef.current = merged;
                setData(merged);
                sent = merged;
            }
            throw new Error("Too many save conflicts");
        } catch (error) {
            console.error("Failed to save session", error);
            setSaveState("error");
            schedule(RETRY_MS, flush);
        } finally {
            savingRef.current = false;
        }
    }, [sessionId, schedule]);

    /** Apply a user edit. Always derive the next state from the latest one passed to `fn`. */
    const update = useCallback(
        (fn: (current: SessionData) => SessionData) => {
            if (statusRef.current !== "ready") return;
            const next = fn(dataRef.current);
            if (next === dataRef.current) return;
            dataRef.current = next;
            dirtyRef.current = true;
            setData(next);
            setSaveState("pending");
            schedule(SAVE_DEBOUNCE_MS, flush);
        },
        [flush, schedule]
    );

    // Pick up edits made elsewhere (other phones, the MCP server) while nothing is pending here.
    useEffect(() => {
        if (!sessionId || status !== "ready") return;

        const poll = async () => {
            if (document.visibilityState !== "visible" || dirtyRef.current || savingRef.current) return;
            try {
                const changed = await fetchSessionIfChanged(sessionId, versionRef.current);
                // Re-check: the user may have started editing while the request was in flight.
                if (changed && !dirtyRef.current && !savingRef.current) applyRemote(changed);
            } catch {
                /* offline: try again on the next tick */
            }
        };

        const interval = setInterval(poll, POLL_MS);
        document.addEventListener("visibilitychange", poll);
        return () => {
            clearInterval(interval);
            document.removeEventListener("visibilitychange", poll);
        };
    }, [sessionId, status, applyRemote]);

    // Don't lose the last edits when the tab is closed or backgrounded.
    useEffect(() => {
        if (!sessionId) return;
        const flushNow = () => {
            if (document.visibilityState === "hidden" && dirtyRef.current && statusRef.current === "ready" && !savingRef.current) {
                saveSession(sessionId, dataRef.current, versionRef.current, true).catch(() => undefined);
            }
        };
        document.addEventListener("visibilitychange", flushNow);
        window.addEventListener("pagehide", flushNow);
        return () => {
            document.removeEventListener("visibilitychange", flushNow);
            window.removeEventListener("pagehide", flushNow);
        };
    }, [sessionId]);

    useEffect(() => () => clearTimeout(timerRef.current), []);

    return { data, status, saveState, update, reload: load, retrySave: flush };
}
