/** Parses what a person typed into an amount: "1,200.5" -> 1200.5. NaN when it is not a number. */
export const parseMoney = (raw: string): number => {
    const value = Number(raw.replace(/,/g, "").trim());
    return Number.isFinite(value) ? Math.round(value * 100) / 100 : NaN;
};
