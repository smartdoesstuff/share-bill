"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { BillCard } from "../bills/BillCard";
import { EmptyState } from "../EmptyState";
import { StepHeader } from "./StepHeader";
import { StepProps } from "./types";
import { computeBill } from "../../lib/calc";
import { generateId } from "../../lib/id";
import { useI18n } from "../../lib/i18n";
import { Bill } from "../../types";

export function BillsStep({ data, update }: StepProps) {
    const { t, formatMoney } = useI18n();
    const [openId, setOpenId] = useState<string | null>(data.bills.length === 1 ? data.bills[0].id : null);
    const ids = data.friends.map((f) => f.id);
    const total = data.bills.reduce((sum, b) => sum + computeBill(b, ids).total, 0);

    const addBill = () => {
        const bill: Bill = { id: generateId(), name: "", items: [], payers: [] };
        update((cur) => ({ ...cur, bills: [...cur.bills, bill] }));
        setOpenId(bill.id);
    };

    const changeBill = (id: string, fn: (bill: Bill) => Bill) =>
        update((cur) => ({ ...cur, bills: cur.bills.map((b) => (b.id === id ? fn(b) : b)) }));

    const deleteBill = (bill: Bill, index: number) => {
        const snapshot = data;
        update((cur) => ({ ...cur, bills: cur.bills.filter((b) => b.id !== bill.id) }));
        toast(t("billDeleted", { name: bill.name.trim() || t("billN", { n: index + 1 }) }), {
            action: { label: t("undo"), onClick: () => update(() => snapshot) },
        });
    };

    return (
        <section className="space-y-5">
            <StepHeader step={2} total={4} title={t("ordersTitle")} hint={t("ordersHint")} />

            {data.bills.length === 0 ? (
                <EmptyState>{t("noBills")}</EmptyState>
            ) : (
                <ul className="space-y-3">
                    {data.bills.map((bill, index) => (
                        <BillCard
                            key={bill.id}
                            bill={bill}
                            index={index}
                            friends={data.friends}
                            open={openId === bill.id}
                            onToggle={() => setOpenId(openId === bill.id ? null : bill.id)}
                            onChange={(fn) => changeBill(bill.id, fn)}
                            onDelete={() => deleteBill(bill, index)}
                        />
                    ))}
                </ul>
            )}

            <Button variant="outline" size="lg" className="h-12 w-full text-base" onClick={addBill}>
                <Plus className="mr-2 h-5 w-5" aria-hidden /> {t("addBill")}
            </Button>

            {data.bills.length > 0 && (
                <div className="flex items-center justify-between rounded-2xl bg-muted px-4 py-3 text-base font-semibold">
                    <span>{t("total")}</span>
                    <span className="tabular-nums">{formatMoney(total / 100)}</span>
                </div>
            )}
        </section>
    );
}
