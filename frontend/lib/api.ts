import { SessionData, SessionSnapshot } from "../types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
    }
}

export type SaveResult =
    | { status: "ok"; session: SessionSnapshot }
    | { status: "conflict"; session: SessionSnapshot };

export async function fetchSession(sessionId: string, signal?: AbortSignal): Promise<SessionSnapshot> {
    const res = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, { cache: "no-store", signal });
    if (!res.ok) throw new ApiError(res.status, `GET session failed (${res.status})`);
    return res.json();
}

/** Cheap poll: resolves to null when nothing changed since `version`. */
export async function fetchSessionIfChanged(sessionId: string, version: number): Promise<SessionSnapshot | null> {
    const res = await fetch(`${API_BASE_URL}/sessions/${sessionId}?since=${version}`, { cache: "no-store" });
    if (!res.ok) throw new ApiError(res.status, `GET session failed (${res.status})`);
    const body = await res.json();
    return body.unchanged ? null : body;
}

export async function saveSession(
    sessionId: string,
    data: SessionData,
    baseVersion: number,
    keepalive = false
): Promise<SaveResult> {
    const res = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, baseVersion }),
        keepalive,
    });
    if (res.status === 409) {
        const body = await res.json();
        return { status: "conflict", session: body.session };
    }
    if (!res.ok) throw new ApiError(res.status, `PUT session failed (${res.status})`);
    return { status: "ok", session: await res.json() };
}
