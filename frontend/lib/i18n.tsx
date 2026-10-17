"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Lang = "th" | "en";

const dictionary = {
    th: {
        appName: "Share Bill",
        tagline: "หารบิลกับเพื่อนแบบง่าย ๆ",
        stepFriends: "เพื่อน",
        stepOrders: "รายการ",
        stepSplit: "แบ่งจ่าย",
        stepSummary: "สรุป",
        stepOf: "ขั้นที่ {current} จาก {total}",
        back: "ย้อนกลับ",
        next: "ถัดไป",
        done: "เสร็จสิ้น",
        share: "แชร์",
        shareTitle: "หารบิลด้วยกัน",
        shareText: "มาดูรายละเอียดการหารบิลของเรา",
        shareCopied: "คัดลอกลิงก์แล้ว",
        shareFailed: "แชร์ไม่สำเร็จ ลองอีกครั้ง",
        language: "ภาษา",

        loading: "รอแป๊บนะ กำลังโหลดข้อมูล…",
        loadFailedTitle: "โหลดข้อมูลไม่สำเร็จ",
        loadFailedBody: "ข้อมูลเดิมของคุณยังปลอดภัย เราจะไม่บันทึกอะไรทับจนกว่าจะโหลดสำเร็จ",
        retry: "ลองอีกครั้ง",
        saving: "กำลังบันทึก…",
        saved: "บันทึกแล้ว",
        pending: "มีการแก้ไข…",
        saveError: "บันทึกไม่ได้ กำลังลองใหม่",

        friendsTitle: "ใครมาหารบ้าง?",
        friendsHint: "เพิ่มชื่อเพื่อนทุกคนที่ร่วมจ่าย อย่างน้อย 2 คนนะ",
        friendName: "ชื่อเพื่อน",
        addFriend: "เพิ่ม",
        paymentAddress: "บัญชีรับเงิน / พร้อมเพย์",
        paymentAddressOptional: "เพิ่มบัญชีรับเงิน (ไม่บังคับ)",
        paymentAddressPlaceholder: "เช่น 081-234-5678",
        editPayment: "แก้ไขบัญชีรับเงิน",
        copyPayment: "คัดลอกบัญชี",
        paymentCopied: "คัดลอกบัญชีแล้ว",
        noFriends: "ยังไม่มีเพื่อน เริ่มเพิ่มคนแรกได้เลย",
        needTwoFriends: "เพิ่มเพื่อนอย่างน้อย 2 คนเพื่อไปต่อ",
        duplicateName: "มีชื่อนี้อยู่แล้ว",
        deleteFriend: "ลบเพื่อน",
        changeAvatar: "เปลี่ยนตัวการ์ตูน",
        friendDeleted: "ลบ {name} แล้ว",
        friendDeletedWithOrders: "ลบ {name} และ {count} รายการที่เขาจ่ายแล้ว",
        undo: "เลิกทำ",

        ordersTitle: "ใครจ่ายอะไรไป?",
        ordersHint: "เพิ่มรายการที่มีการจ่ายเงิน และบอกว่าใครเป็นคนจ่าย",
        description: "ชื่อรายการ",
        descriptionPlaceholder: "เช่น ค่าข้าว",
        amount: "จำนวนเงิน",
        paidBy: "คนจ่าย",
        addOrder: "เพิ่มรายการ",
        pickPayer: "เลือกคนจ่าย",
        noOrders: "ยังไม่มีรายการ",
        paidByName: "จ่ายโดย {name}",
        deleteOrder: "ลบรายการ",
        orderDeleted: "ลบ \"{name}\" แล้ว",
        needOneOrder: "เพิ่มอย่างน้อย 1 รายการเพื่อไปต่อ",
        total: "รวมทั้งหมด",
        unknownPerson: "(ไม่ทราบ)",

        splitTitle: "ใครหารอะไรบ้าง?",
        splitHint: "แตะชื่อเพื่อเลือกคนที่ต้องหารแต่ละรายการ",
        everyone: "ทุกคน",
        clear: "ล้าง",
        perPerson: "คนละ {amount}",
        nobodySelected: "ยังไม่ได้เลือกคนหาร",
        unassignedCount: "ยังไม่ได้เลือกคนหาร {count} รายการ",
        perPersonTotals: "ยอดที่แต่ละคนต้องหาร",

        summaryTitle: "สรุปการโอนเงิน",
        summaryHint: "แตะที่รายการเมื่อโอนเสร็จแล้ว",
        totalSpent: "ยอดรวม",
        average: "เฉลี่ยต่อคน",
        balances: "ยอดสุทธิของแต่ละคน",
        getsBack: "ได้รับคืน",
        owes: "ต้องจ่าย",
        settled: "เท่ากัน",
        transfers: "ต้องโอนให้ใคร",
        transferred: "โอนแล้ว",
        notTransferred: "ยังไม่โอน",
        transfersProgress: "โอนแล้ว {done} จาก {total}",
        noTransfers: "ไม่มีใครต้องโอนเงินเลย",
        allSettled: "โอนครบแล้ว เรียบร้อย!",
        markTransferred: "ทำเครื่องหมายว่าโอนแล้ว",
        unmarkTransferred: "ยกเลิกเครื่องหมายโอนแล้ว",
        shareSummary: "แชร์ลิงก์สรุป",
    },
    en: {
        appName: "Share Bill",
        tagline: "Split bills with friends, effortlessly",
        stepFriends: "Friends",
        stepOrders: "Items",
        stepSplit: "Split",
        stepSummary: "Summary",
        stepOf: "Step {current} of {total}",
        back: "Back",
        next: "Next",
        done: "Done",
        share: "Share",
        shareTitle: "Split the bill",
        shareText: "Check out our shared bill details",
        shareCopied: "Link copied",
        shareFailed: "Couldn't share, please try again",
        language: "Language",

        loading: "Loading your data…",
        loadFailedTitle: "Couldn't load your data",
        loadFailedBody: "Your existing data is safe. Nothing will be saved until loading succeeds.",
        retry: "Try again",
        saving: "Saving…",
        saved: "Saved",
        pending: "Editing…",
        saveError: "Couldn't save, retrying",

        friendsTitle: "Who's splitting?",
        friendsHint: "Add everyone who's sharing the bill (at least 2 people)",
        friendName: "Friend's name",
        addFriend: "Add",
        paymentAddress: "Payment account / PromptPay",
        paymentAddressOptional: "Add payment account (optional)",
        paymentAddressPlaceholder: "e.g. 081-234-5678",
        editPayment: "Edit payment account",
        copyPayment: "Copy account",
        paymentCopied: "Account copied",
        noFriends: "No friends yet. Add the first one above.",
        needTwoFriends: "Add at least 2 friends to continue",
        duplicateName: "That name is already on the list",
        deleteFriend: "Remove friend",
        changeAvatar: "Change cartoon",
        friendDeleted: "Removed {name}",
        friendDeletedWithOrders: "Removed {name} and {count} item(s) they paid for",
        undo: "Undo",

        ordersTitle: "Who paid for what?",
        ordersHint: "Add each expense and who paid for it",
        description: "Item",
        descriptionPlaceholder: "e.g. Dinner",
        amount: "Amount",
        paidBy: "Paid by",
        addOrder: "Add item",
        pickPayer: "Pick who paid",
        noOrders: "No items yet",
        paidByName: "Paid by {name}",
        deleteOrder: "Remove item",
        orderDeleted: "Removed \"{name}\"",
        needOneOrder: "Add at least 1 item to continue",
        total: "Total",
        unknownPerson: "(unknown)",

        splitTitle: "Who shares what?",
        splitHint: "Tap names to choose who splits each item",
        everyone: "Everyone",
        clear: "Clear",
        perPerson: "{amount} each",
        nobodySelected: "Nobody selected yet",
        unassignedCount: "{count} item(s) still need people",
        perPersonTotals: "Each person's share",

        summaryTitle: "Who pays whom",
        summaryHint: "Tap a transfer once it's done",
        totalSpent: "Total spent",
        average: "Average per person",
        balances: "Net balance per person",
        getsBack: "Gets back",
        owes: "Owes",
        settled: "Even",
        transfers: "Transfers",
        transferred: "Paid",
        notTransferred: "Not paid",
        transfersProgress: "{done} of {total} paid",
        noTransfers: "Nobody needs to pay anyone",
        allSettled: "All settled up!",
        markTransferred: "Mark as paid",
        unmarkTransferred: "Mark as not paid",
        shareSummary: "Share summary link",
    },
} as const;

export type MessageKey = keyof (typeof dictionary)["th"];
type Params = Record<string, string | number>;

interface I18nValue {
    lang: Lang;
    setLang: (lang: Lang) => void;
    t: (key: MessageKey, params?: Params) => string;
    formatMoney: (amount: number) => string;
}

const I18nContext = createContext<I18nValue | null>(null);
const STORAGE_KEY = "share-bill:lang";

export function I18nProvider({ children }: { children: React.ReactNode }) {
    const [lang, setLangState] = useState<Lang>("th");

    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored === "th" || stored === "en") return setLangState(stored);
        } catch {
            /* storage unavailable (private mode) */
        }
        setLangState(navigator.language?.toLowerCase().startsWith("th") ? "th" : "en");
    }, []);

    useEffect(() => {
        document.documentElement.lang = lang;
    }, [lang]);

    const setLang = useCallback((next: Lang) => {
        setLangState(next);
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch {
            /* ignore */
        }
    }, []);

    const value = useMemo<I18nValue>(() => {
        const formatter = new Intl.NumberFormat(lang === "th" ? "th-TH" : "en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
        return {
            lang,
            setLang,
            t: (key, params) =>
                dictionary[lang][key].replace(/\{(\w+)\}/g, (_, name) => String(params?.[name] ?? `{${name}}`)),
            formatMoney: (amount) => formatter.format(amount),
        };
    }, [lang, setLang]);

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
    const ctx = useContext(I18nContext);
    if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
    return ctx;
}
