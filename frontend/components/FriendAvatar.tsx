import React from "react";
import { Friend } from "../types";
import { cn } from "../lib/utils";

const INK = "#3b2a20";
const CHEEK = "#ff8f9c";

const Eyes = ({ y = 27 }: { y?: number }) => (
    <>
        <circle cx="17.5" cy={y} r="2.2" fill={INK} />
        <circle cx="30.5" cy={y} r="2.2" fill={INK} />
        <circle cx="18.2" cy={y - 0.8} r="0.7" fill="#fff" />
        <circle cx="31.2" cy={y - 0.8} r="0.7" fill="#fff" />
    </>
);
const Cheeks = ({ y = 32 }: { y?: number }) => (
    <>
        <circle cx="12.5" cy={y} r="2.6" fill={CHEEK} opacity=".45" />
        <circle cx="35.5" cy={y} r="2.6" fill={CHEEK} opacity=".45" />
    </>
);
const Smile = ({ y = 34 }: { y?: number }) => (
    <path d={`M21 ${y} Q24 ${y + 3} 27 ${y}`} stroke={INK} strokeWidth="1.6" strokeLinecap="round" fill="none" />
);

/** Original cartoon animals drawn as inline SVG (viewBox 48x48). */
const ANIMALS: { name: string; bg: string; art: React.ReactNode }[] = [
    {
        name: "cat",
        bg: "#ffe3c2",
        art: (
            <>
                <path d="M8 18 L11 4 L22 11 Z M40 18 L37 4 L26 11 Z" fill="#f4a24c" />
                <path d="M11 14 L12.5 8 L17 11.5 Z M37 14 L35.5 8 L31 11.5 Z" fill="#ffc2c2" />
                <circle cx="24" cy="27" r="18" fill="#f4a24c" />
                <path d="M19 10 Q24 14 29 10" stroke="#d9822b" strokeWidth="2" fill="none" strokeLinecap="round" />
                <Eyes />
                <Cheeks />
                <path d="M22.5 30.5 L25.5 30.5 L24 32.3 Z" fill="#ff8f9c" />
                <Smile y={33.5} />
                <path d="M6 30 L13 31 M6 35 L13 33.5 M42 30 L35 31 M42 35 L35 33.5" stroke="#b5651d" strokeWidth="0.9" strokeLinecap="round" />
            </>
        ),
    },
    {
        name: "dog",
        bg: "#d9ecff",
        art: (
            <>
                <ellipse cx="9" cy="22" rx="5" ry="10" fill="#8a5a3b" transform="rotate(12 9 22)" />
                <ellipse cx="39" cy="22" rx="5" ry="10" fill="#8a5a3b" transform="rotate(-12 39 22)" />
                <circle cx="24" cy="27" r="17" fill="#e2bd92" />
                <ellipse cx="24" cy="33" rx="8" ry="6" fill="#f7e4c9" />
                <Eyes y={25} />
                <ellipse cx="24" cy="30" rx="3.2" ry="2.3" fill={INK} />
                <path d="M24 32 V35 M21 35.5 Q24 38 27 35.5" stroke={INK} strokeWidth="1.3" strokeLinecap="round" fill="none" />
                <circle cx="13" cy="31" r="2.4" fill={CHEEK} opacity=".4" />
                <circle cx="35" cy="31" r="2.4" fill={CHEEK} opacity=".4" />
            </>
        ),
    },
    {
        name: "bear",
        bg: "#ffd9e3",
        art: (
            <>
                <circle cx="11" cy="11" r="6" fill="#a8744a" />
                <circle cx="37" cy="11" r="6" fill="#a8744a" />
                <circle cx="11" cy="11" r="3" fill="#e8c6a0" />
                <circle cx="37" cy="11" r="3" fill="#e8c6a0" />
                <circle cx="24" cy="27" r="18" fill="#a8744a" />
                <ellipse cx="24" cy="32.5" rx="7.5" ry="5.5" fill="#ecd3b0" />
                <Eyes y={24} />
                <ellipse cx="24" cy="30" rx="3" ry="2.2" fill={INK} />
                <Smile y={33.5} />
                <Cheeks y={30} />
            </>
        ),
    },
    {
        name: "rabbit",
        bg: "#e6dcff",
        art: (
            <>
                <ellipse cx="17" cy="11" rx="4.5" ry="11" fill="#fff" stroke="#e3d6ea" strokeWidth="1" />
                <ellipse cx="31" cy="11" rx="4.5" ry="11" fill="#fff" stroke="#e3d6ea" strokeWidth="1" />
                <ellipse cx="17" cy="11.5" rx="2" ry="7.5" fill="#ffc2d1" />
                <ellipse cx="31" cy="11.5" rx="2" ry="7.5" fill="#ffc2d1" />
                <circle cx="24" cy="29" r="16.5" fill="#fff" stroke="#e3d6ea" strokeWidth="1" />
                <Eyes y={28} />
                <Cheeks y={33} />
                <path d="M22.7 31.5 L25.3 31.5 L24 33 Z" fill="#ff8fa3" />
                <Smile y={34} />
            </>
        ),
    },
    {
        name: "panda",
        bg: "#d8f5e2",
        art: (
            <>
                <circle cx="11" cy="11" r="6" fill="#2d2a32" />
                <circle cx="37" cy="11" r="6" fill="#2d2a32" />
                <circle cx="24" cy="27" r="18" fill="#fff" stroke="#ece8ee" strokeWidth="1" />
                <ellipse cx="17" cy="26" rx="4.4" ry="5.4" fill="#2d2a32" transform="rotate(-18 17 26)" />
                <ellipse cx="31" cy="26" rx="4.4" ry="5.4" fill="#2d2a32" transform="rotate(18 31 26)" />
                <circle cx="17.3" cy="25.5" r="1.8" fill="#fff" />
                <circle cx="30.7" cy="25.5" r="1.8" fill="#fff" />
                <circle cx="17.6" cy="25.6" r="0.9" fill={INK} />
                <circle cx="30.4" cy="25.6" r="0.9" fill={INK} />
                <ellipse cx="24" cy="32" rx="2.8" ry="2" fill="#2d2a32" />
                <Smile y={34.5} />
            </>
        ),
    },
    {
        name: "frog",
        bg: "#fff3b8",
        art: (
            <>
                <circle cx="24" cy="29" r="17" fill="#7fd36e" />
                <circle cx="14.5" cy="13" r="7" fill="#7fd36e" />
                <circle cx="33.5" cy="13" r="7" fill="#7fd36e" />
                <circle cx="14.5" cy="13" r="4.6" fill="#fff" />
                <circle cx="33.5" cy="13" r="4.6" fill="#fff" />
                <circle cx="15" cy="13.4" r="2.2" fill={INK} />
                <circle cx="33" cy="13.4" r="2.2" fill={INK} />
                <path d="M13 33 Q24 43 35 33" stroke={INK} strokeWidth="1.8" strokeLinecap="round" fill="none" />
                <circle cx="21.5" cy="26" r="0.9" fill="#4aa83a" />
                <circle cx="26.5" cy="26" r="0.9" fill="#4aa83a" />
                <Cheeks y={31} />
            </>
        ),
    },
    {
        name: "chick",
        bg: "#ffe0d4",
        art: (
            <>
                <path d="M21 10 Q22 3 24 6 Q26 2 27 10" fill="#ffc933" />
                <circle cx="24" cy="27" r="18" fill="#ffd84d" />
                <Eyes y={25} />
                <Cheeks y={31} />
                <path d="M20 29 Q24 27 28 29 Q24 36 20 29 Z" fill="#ff9a3c" />
            </>
        ),
    },
    {
        name: "pig",
        bg: "#cfeefa",
        art: (
            <>
                <path d="M9 17 L10 6 L21 11 Z M39 17 L38 6 L27 11 Z" fill="#ff9fb2" />
                <circle cx="24" cy="27" r="18" fill="#ffb3c4" />
                <Eyes y={23} />
                <Cheeks y={29} />
                <ellipse cx="24" cy="31" rx="6.5" ry="5" fill="#ff8fa6" />
                <ellipse cx="21.8" cy="31" rx="1.1" ry="1.7" fill="#c24a68" />
                <ellipse cx="26.2" cy="31" rx="1.1" ry="1.7" fill="#c24a68" />
            </>
        ),
    },
];

export const AVATAR_COUNT = ANIMALS.length;

const hash = (value: string) => Array.from(value).reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export const avatarIndexOf = (friend: Pick<Friend, "id" | "avatar">): number =>
    typeof friend.avatar === "number" ? friend.avatar % AVATAR_COUNT : hash(friend.id) % AVATAR_COUNT;

/** Lowest avatar not used yet, so a small group gets all-different animals. */
export function nextFreeAvatar(friends: Pick<Friend, "id" | "avatar">[]): number {
    const used = new Set(friends.map(avatarIndexOf));
    for (let i = 0; i < AVATAR_COUNT; i++) if (!used.has(i)) return i;
    return friends.length % AVATAR_COUNT;
}

interface FriendAvatarProps {
    friend: Pick<Friend, "id" | "avatar">;
    size?: number;
    className?: string;
}

export function FriendAvatar({ friend, size = 40, className }: FriendAvatarProps) {
    const animal = ANIMALS[avatarIndexOf(friend)];
    return (
        <span
            aria-hidden
            className={cn("inline-flex shrink-0 overflow-hidden rounded-full", className)}
            style={{ width: size, height: size, backgroundColor: animal.bg }}
        >
            <svg viewBox="0 0 48 48" width={size} height={size} role="presentation">
                {animal.art}
            </svg>
        </span>
    );
}
