const KEY = "share-bill:last-session";

export function rememberLastSession(sessionId: string): void {
    try {
        localStorage.setItem(KEY, sessionId);
    } catch {
        /* storage unavailable (private mode) */
    }
}

export function readLastSession(): string | null {
    try {
        return localStorage.getItem(KEY);
    } catch {
        return null;
    }
}
