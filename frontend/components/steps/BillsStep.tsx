"use client";

import React, { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { GroupCard } from "../bills/GroupCard";
import { ItemEditor } from "../bills/ItemEditor";
import { ItemRow } from "../bills/ItemRow";
import { EmptyState } from "../EmptyState";
import { FilterBar } from "../FilterBar";
import { StepHeader } from "./StepHeader";
import { FilterProps, StepProps } from "./types";
import { ItemInput, Payers, Target, addItem, billTitle, groupsOf, moveItem, removeItem, updateItem } from "../../lib/bills";
import { computeBill } from "../../lib/calc";
import { isFilterActive, visibleItems } from "../../lib/filter";
import { generateId } from "../../lib/id";
import { useI18n } from "../../lib/i18n";
import { Bill } from "../../types";

export function BillsStep({ data, update, filter, onFilterChange }: StepProps & FilterProps) {
    const { t, formatMoney } = useI18n();
    const [showForm, setShowForm] = useState(data.bills.length === 0);
    const [formTarget, setFormTarget] = useState<Target>(null);
    const [openGroupId, setOpenGroupId] = useState<string | null>(null);
    // The next standalone item is probably paid by the same people as the last one.
    const [lastPayers, setLastPayers] = useState<Payers>([]);
    const formRef = useRef<HTMLDivElement>(null);

    const ids = data.friends.map((f) => f.id);
    const groups = groupsOf(data.bills).map((b) => ({ id: b.id, title: billTitle(b, data.bills, t) }));
    const total = data.bills.reduce((sum, b) => sum + computeBill(b, ids).total, 0);
    const itemCount = data.bills.reduce((n, b) => n + b.items.length, 0);
    const shownCount = data.bills.reduce((n, b) => n + visibleItems(b, filter, data.friends).length, 0);

    // The form always starts from a valid choice: a removed group falls back to "no group".
    useEffect(() => {
        if (formTarget && formTarget !== "new" && !groups.some((g) => g.id === formTarget)) setFormTarget(null);
    }, [formTarget, groups]);

    const submitNew = (input: ItemInput, payers: Payers, target: Target) => {
        const billId = generateId();
        const next = addItem(data.bills, input, data.friends, target, payers, { item: generateId(), bill: billId });
        update((cur) => ({ ...cur, bills: addItem(cur.bills, input, cur.friends, target, payers, { item: generateId(), bill: billId }).bills }));
        if (target === null) setLastPayers(payers.map((p) => ({ id: p.id })));
        // Keep adding to the same group; a brand-new group becomes the selected one.
        setFormTarget(next.groupId);
    };

    const changeBill = (id: string, fn: (bill: Bill) => Bill) =>
        update((cur) => ({ ...cur, bills: cur.bills.map((b) => (b.id === id ? fn(b) : b)) }));

    const saveItem = (bill: Bill, itemId: string, input: ItemInput, payers: Payers, target: Target) => {
        const sameSpot = target === (bill.solo ? null : bill.id);
        if (sameSpot) {
            update((cur) => ({ ...cur, bills: updateItem(cur.bills, bill.id, itemId, input, payers) }));
            return;
        }
        // Apply the edit first, then move the item to where the user chose.
        const newBillId = generateId();
        update((cur) => {
            const edited = updateItem(cur.bills, bill.id, itemId, input, payers);
            return { ...cur, bills: moveItem(edited, bill.id, itemId, target, newBillId).bills };
        });
        if (target === "new") setOpenGroupId(newBillId);
        else if (target) setOpenGroupId(target);
    };

    const deleteItem = (bill: Bill, itemId: string) => {
        const snapshot = data;
        const name = bill.items.find((i) => i.id === itemId)?.name ?? "";
        update((cur) => ({ ...cur, bills: removeItem(cur.bills, bill.id, itemId) }));
        toast(t("itemDeleted", { name }), { action: { label: t("undo"), onClick: () => update(() => snapshot) } });
    };

    const addGroup = () => {
        const group: Bill = { id: generateId(), name: "", items: [], payers: [] };
        update((cur) => ({ ...cur, bills: [...cur.bills, group] }));
        setOpenGroupId(group.id);
    };

    const deleteGroup = (bill: Bill) => {
        const snapshot = data;
        update((cur) => ({ ...cur, bills: cur.bills.filter((b) => b.id !== bill.id) }));
        toast(t("billDeleted", { name: billTitle(bill, data.bills, t) }), {
            action: { label: t("undo"), onClick: () => update(() => snapshot) },
        });
    };

    const addToGroup = (groupId: string) => {
        setFormTarget(groupId);
        setShowForm(true);
        // Wait for the form to render, then bring it into view.
        setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    };

    return (
        <section className="space-y-5">
            <StepHeader step={2} total={4} title={t("ordersTitle")} hint={t("ordersHint")} />

            <div ref={formRef} className="scroll-mt-40">
                {showForm ? (
                    <div className="space-y-3 rounded-2xl border bg-card p-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-semibold">{t("addItem")}</h3>
                            {data.bills.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="flex min-h-[44px] items-center gap-1 text-sm text-muted-foreground"
                                >
                                    <X className="h-4 w-4" aria-hidden /> {t("hideAddItem")}
                                </button>
                            )}
                        </div>
                        <ItemEditor
                            key={`${formTarget ?? "none"}`}
                            idPrefix="new-item"
                            friends={data.friends}
                            groups={groups}
                            mode="add"
                            initialPayers={lastPayers}
                            initialTarget={formTarget}
                            onSubmit={submitNew}
                        />
                    </div>
                ) : (
                    <Button size="lg" className="h-12 w-full text-base" onClick={() => setShowForm(true)}>
                        <Plus className="mr-2 h-5 w-5" aria-hidden /> {t("addItem")}
                    </Button>
                )}
            </div>

            <FilterBar data={data} filter={filter} onChange={onFilterChange} shown={shownCount} total={itemCount} />

            {data.bills.length === 0 ? (
                <EmptyState>{t("noBills")}</EmptyState>
            ) : (
                <ul className="space-y-3">
                    {data.bills.map((bill) => {
                        const shown = visibleItems(bill, filter, data.friends);
                        // With a filter on, hide entries that have items but none of them match.
                        if (isFilterActive(filter) && bill.items.length > 0 && shown.length === 0) return null;
                        const result = computeBill(bill, ids);

                        if (bill.solo) {
                            return bill.items.map((item) => (
                                <ItemRow
                                    key={item.id}
                                    bill={bill}
                                    item={item}
                                    friends={data.friends}
                                    groups={groups}
                                    netCents={result.itemNets[item.id] ?? 0}
                                    onSave={(input, payers, target) => saveItem(bill, item.id, input, payers, target)}
                                    onDelete={() => deleteItem(bill, item.id)}
                                />
                            ));
                        }
                        return (
                            <GroupCard
                                key={bill.id}
                                bill={bill}
                                bills={data.bills}
                                friends={data.friends}
                                groups={groups}
                                open={openGroupId === bill.id}
                                filter={filter}
                                onToggle={() => setOpenGroupId(openGroupId === bill.id ? null : bill.id)}
                                onChange={(fn) => changeBill(bill.id, fn)}
                                onDelete={() => deleteGroup(bill)}
                                onAddHere={() => addToGroup(bill.id)}
                                onItemSave={(itemId, input, payers, target) => saveItem(bill, itemId, input, payers, target)}
                                onItemDelete={(itemId) => deleteItem(bill, itemId)}
                            />
                        );
                    })}
                </ul>
            )}

            <div className="space-y-1">
                <Button variant="ghost" className="h-11 w-full text-primary" onClick={addGroup}>
                    {t("addBill")}
                </Button>
                <p className="text-center text-xs text-muted-foreground">{t("groupHint")}</p>
            </div>

            {data.bills.length > 0 && (
                <div className="flex items-center justify-between rounded-2xl bg-muted px-4 py-3 text-base font-semibold">
                    <span>{t("total")}</span>
                    <span className="tabular-nums">{formatMoney(total / 100)}</span>
                </div>
            )}
        </section>
    );
}
