import type { MessageKey } from "./i18n";

/** Built-in tags are stored by a stable key and shown in the user's language; custom tags are stored as typed. */
export const PRESET_TAGS = ["food", "drink", "alcohol", "dessert", "other"] as const;
export const MAX_TAGS_PER_ITEM = 5;
export const MAX_TAG_LENGTH = 30;

const PRESET_LABELS: Record<(typeof PRESET_TAGS)[number], MessageKey> = {
    food: "tagFood",
    drink: "tagDrink",
    alcohol: "tagAlcohol",
    dessert: "tagDessert",
    other: "tagOther",
};

export const tagKey = (tag: string): string => tag.trim().toLowerCase();

export const isPresetTag = (tag: string): tag is (typeof PRESET_TAGS)[number] =>
    (PRESET_TAGS as readonly string[]).includes(tagKey(tag));

/** The text to show for a stored tag. */
export const tagLabel = (tag: string, t: (key: MessageKey) => string): string =>
    isPresetTag(tag) ? t(PRESET_LABELS[tagKey(tag) as (typeof PRESET_TAGS)[number]]) : tag;

/** Trims, drops empties and case-insensitive duplicates, limits the count. */
export function normalizeTags(tags: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const raw of tags) {
        const tag = raw.trim().slice(0, MAX_TAG_LENGTH);
        const key = tagKey(tag);
        if (!tag || seen.has(key)) continue;
        seen.add(key);
        result.push(isPresetTag(tag) ? key : tag);
    }
    return result.slice(0, MAX_TAGS_PER_ITEM);
}

// Words that hint at a preset tag. Order matters: alcohol is checked before drink.
const HINTS: [(typeof PRESET_TAGS)[number], string[]][] = [
    ["alcohol", ["เบียร์", "beer", "เหล้า", "วิสกี้", "whisky", "whiskey", "ไวน์", "wine", "โซจู", "soju", "สาโท", "สาเก", "sake", "ค็อกเทล", "cocktail", "vodka", "วอดก้า", "rum", "gin", "เหล้า", "highball", "ไฮบอล"]],
    ["dessert", ["ไอศกรีม", "ไอติม", "ice cream", "icecream", "เค้ก", "cake", "ขนม", "ของหวาน", "dessert", "บิงซู", "bingsu", "พุดดิ้ง", "pudding", "เครป", "crepe", "ช็อกโกแลต", "chocolate", "โดนัท", "donut"]],
    ["drink", ["น้ำเปล่า", "น้ำอัดลม", "น้ำส้ม", "น้ำผลไม้", "น้ำแข็ง", "ชา", "กาแฟ", "coffee", "latte", "tea", "โค้ก", "coke", "cola", "เป๊ปซี่", "pepsi", "soda", "โซดา", "juice", "smoothie", "สมูทตี้", "นม", "milk", "water", "เครื่องดื่ม", "drink"]],
];

/** A suggested preset tag for an item name, or null. A hint only: the user decides. */
export function suggestTag(name: string): (typeof PRESET_TAGS)[number] | null {
    const text = name.toLowerCase();
    if (!text.trim()) return null;
    for (const [tag, words] of HINTS) if (words.some((w) => text.includes(w))) return tag;
    return null;
}
