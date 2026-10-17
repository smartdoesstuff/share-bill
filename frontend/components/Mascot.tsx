import React from "react";
import { cn } from "../lib/utils";

export type Mood = "wave" | "happy" | "think" | "party" | "oops";

const INK = "#3b2a20";
const GOLD = "#ffc94d";
const RIM = "#f2a81d";

const CONFETTI = [
    { x: 14, y: 14, c: "#ff7aa2", r: 20 },
    { x: 100, y: 22, c: "#5ec8a8", r: -25 },
    { x: 8, y: 66, c: "#6ea8ff", r: 40 },
    { x: 108, y: 70, c: "#ff9f43", r: -10 },
    { x: 30, y: 4, c: "#6ea8ff", r: -30 },
    { x: 84, y: 6, c: "#ff7aa2", r: 15 },
];

/** "Penny", the coin mascot. Original artwork, inline SVG, no external assets. */
export function Mascot({ mood = "happy", size = 96, className }: { mood?: Mood; size?: number; className?: string }) {
    const happyEyes = mood === "party";
    const look = mood === "think" ? { dx: 1.5, dy: -1.5 } : { dx: 0, dy: 0 };

    return (
        <svg
            viewBox="0 0 120 120"
            width={size}
            height={size}
            role="presentation"
            aria-hidden
            className={cn("shrink-0", className)}
        >
            <ellipse cx="60" cy="112" rx="28" ry="5" fill="#000" opacity=".08" />

            {mood === "party" &&
                CONFETTI.map((p, i) => (
                    <rect key={i} x={p.x} y={p.y} width="7" height="11" rx="2" fill={p.c} transform={`rotate(${p.r} ${p.x} ${p.y})`} />
                ))}

            {mood === "wave" && (
                <g>
                    <path d="M18 64 Q4 54 8 40" stroke={RIM} strokeWidth="8" strokeLinecap="round" fill="none" />
                    <circle cx="8" cy="38" r="7" fill={GOLD} stroke={RIM} strokeWidth="3" />
                </g>
            )}

            <circle cx="60" cy="58" r="44" fill={GOLD} stroke={RIM} strokeWidth="5" />
            <circle cx="60" cy="58" r="34" fill="none" stroke="#ffe48f" strokeWidth="3" strokeDasharray="2 7" strokeLinecap="round" />
            <path d="M30 36 Q36 24 48 20" stroke="#fff3c4" strokeWidth="5" strokeLinecap="round" fill="none" />

            <circle cx="35" cy="68" r="5.5" fill="#ff8f7a" opacity=".55" />
            <circle cx="85" cy="68" r="5.5" fill="#ff8f7a" opacity=".55" />

            {happyEyes ? (
                <>
                    <path d="M40 55 Q46 46 52 55" stroke={INK} strokeWidth="4" strokeLinecap="round" fill="none" />
                    <path d="M68 55 Q74 46 80 55" stroke={INK} strokeWidth="4" strokeLinecap="round" fill="none" />
                </>
            ) : (
                <>
                    <ellipse cx={46 + look.dx} cy={52 + look.dy} rx="4.5" ry="6" fill={INK} />
                    <ellipse cx={74 + look.dx} cy={52 + look.dy} rx="4.5" ry="6" fill={INK} />
                    <circle cx={47.6 + look.dx} cy={49.5 + look.dy} r="1.6" fill="#fff" />
                    <circle cx={75.6 + look.dx} cy={49.5 + look.dy} r="1.6" fill="#fff" />
                </>
            )}

            {(mood === "happy" || mood === "wave") && (
                <path d="M48 68 Q60 80 72 68" stroke={INK} strokeWidth="4" strokeLinecap="round" fill="none" />
            )}
            {mood === "think" && <ellipse cx="60" cy="73" rx="5" ry="4" fill="#8a3434" stroke={INK} strokeWidth="2.5" />}
            {mood === "party" && <path d="M47 66 Q60 88 73 66 Z" fill="#8a3434" stroke={INK} strokeWidth="3" strokeLinejoin="round" />}
            {mood === "oops" && <path d="M48 76 Q60 65 72 76" stroke={INK} strokeWidth="4" strokeLinecap="round" fill="none" />}

            {mood === "think" && (
                <g fill="#fff" stroke={RIM} strokeWidth="2">
                    <circle cx="100" cy="22" r="3" />
                    <circle cx="107" cy="12" r="4.5" />
                </g>
            )}
            {mood === "oops" && <path d="M94 30 Q98 38 94 42 Q90 38 94 30 Z" fill="#7cc4ff" stroke="#4b9be0" strokeWidth="1.5" />}
        </svg>
    );
}

/** Mascot with a speech bubble: used as the header of every step. */
export function MascotSays({ mood, title, children }: { mood: Mood; title: string; children: React.ReactNode }) {
    return (
        <div className="flex items-end gap-2">
            <Mascot mood={mood} size={76} className="motion-safe:animate-float" />
            <div className="relative mb-2 flex-1 rounded-2xl rounded-bl-md border-2 border-border bg-card px-4 py-3 shadow-sm">
                <h2 className="text-xl font-bold leading-snug">{title}</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">{children}</p>
            </div>
        </div>
    );
}

export function EmptyState({ mood = "think", children }: { mood?: Mood; children: React.ReactNode }) {
    return (
        <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card/60 px-4 py-6 text-center text-muted-foreground">
            <Mascot mood={mood} size={72} className="motion-safe:animate-float" />
            <p>{children}</p>
        </div>
    );
}
