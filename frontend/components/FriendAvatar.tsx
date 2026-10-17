import React from "react";
import { Friend } from "../types";
import { cn } from "../lib/utils";

// Soft tint + readable text colour pairs. `avatar` on a friend picks the slot.
const TINTS: { bg: string; fg: string }[] = [
    { bg: "#dff3ec", fg: "#14664f" },
    { bg: "#e3ecfb", fg: "#2a4f94" },
    { bg: "#fbe6e1", fg: "#9a3b2a" },
    { bg: "#efe6fa", fg: "#5d3a94" },
    { bg: "#fdf0d5", fg: "#8a5a0b" },
    { bg: "#e0f2f7", fg: "#1d6478" },
    { bg: "#fae3ef", fg: "#99345f" },
    { bg: "#e9efd9", fg: "#52661a" },
];

export const AVATAR_COUNT = TINTS.length;

const hash = (value: string) => Array.from(value).reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export const avatarIndexOf = (friend: Pick<Friend, "id" | "avatar">): number =>
    typeof friend.avatar === "number" ? friend.avatar % AVATAR_COUNT : hash(friend.id) % AVATAR_COUNT;

/** Lowest colour slot not used yet, so a small group gets distinct colours. */
export function nextFreeAvatar(friends: Pick<Friend, "id" | "avatar">[]): number {
    const used = new Set(friends.map(avatarIndexOf));
    for (let i = 0; i < AVATAR_COUNT; i++) if (!used.has(i)) return i;
    return friends.length % AVATAR_COUNT;
}

interface FriendAvatarProps {
    friend: Pick<Friend, "id" | "avatar"> & { name?: string };
    size?: number;
    className?: string;
}

/** Initial in a tinted circle: quiet, but still tells people apart at a glance. */
export function FriendAvatar({ friend, size = 36, className }: FriendAvatarProps) {
    const tint = TINTS[avatarIndexOf(friend)];
    const initial = Array.from(friend.name?.trim() || "?")[0]?.toUpperCase();
    return (
        <span
            aria-hidden
            className={cn("inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold", className)}
            style={{ width: size, height: size, backgroundColor: tint.bg, color: tint.fg, fontSize: size * 0.42 }}
        >
            {initial}
        </span>
    );
}
