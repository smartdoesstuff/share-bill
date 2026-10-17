"use client";

import React, { useMemo, useState } from "react";
import { ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { AdjustmentInput } from "./AdjustmentInput";
import { ItemDraft, ItemForm } from "./ItemForm";
import { PayersPicker } from "./PayersPicker";
import { computeBill } from "../../lib/calc";
import { ItemFilter, isFilterActive, visibleItems } from "../../lib/filter";
import { tagLabel } from "../../lib/tags";
import { generateId } from "../../lib/id";
import { cn } from "../../lib/utils";
import { useI18n } from "../../lib/i18n";
import { parseMoney } from "../../lib/money";
import { Bill, Friend, Item } from "../../types";

interface BillCardProps {
    bill: Bill;
    index: number;
    friends: Friend[];
    open: boolean;
    onToggle: () => void;
    onChange: (fn: (bill: Bill) => Bill) => void;
    onDelete: () => void;
    filter: ItemFilter;
}

const sharersLabel = (item: Item, friends: Friend[], t: ReturnType<typeof useI18n>["t"]) => {
    const names = friends.filter((f) => item.assignedTo.includes(f.id)).map((f) => f.name);
    if (names.length === 0) return t("sharedByNobody");
    if (names.length === friends.length) return t("sharedByEveryone");
    return names.join(", ");
};

export function BillCard({ bill, index, friends, open, onToggle, onChange, onDelete, filter }: BillCardProps) {
    const { t, formatMoney } = useI18n();
    const [showAdd, setShowAdd] = useState(bill.items.length === 0);
    const [showExtras, setShowExtras] = useState(
        !!bill.discount || !!bill.servicePercent || !!bill.vatPercent
    );
    const [editingId, setEditingId] = useState<string | null>(null);

    const result = useMemo(() => computeBill(bill, friends.map((f) => f.id)), [bill, friends]);
    const title = bill.name.trim() || t("billN", { n: index + 1 });
    const filtered = isFilterActive(filter);
    const shownItems = visibleItems(bill, filter, friends);
    const nameOf = (id: string) => friends.find((f) => f.id === id)?.name ?? t("unknownPerson");
    const payerIds = bill.payers.filter((p) => friends.some((f) => f.id === p.id)).map((p) => p.id);

    const addItem = (draft: ItemDraft) =>
        onChange((b) => ({
            ...b,
            items: [
                ...b.items,
                {
                    id: generateId(),
                    name: draft.name,
                    price: draft.price,
                    ...(draft.discount ? { discount: draft.discount } : {}),
                    ...(draft.tags.length ? { tags: draft.tags } : {}),
                    // Most items are shared by everyone: the next step lets the user narrow it down.
                    assignedTo: friends.map((f) => f.id),
                },
            ],
        }));

    const saveItem = (id: string, draft: ItemDraft) => {
        onChange((b) => ({
            ...b,
            items: b.items.map((i) => {
                if (i.id !== id) return i;
                const { discount: _old, tags: _oldTags, ...rest } = i;
                return {
                    ...rest,
                    name: draft.name,
                    price: draft.price,
                    ...(draft.discount ? { discount: draft.discount } : {}),
                    ...(draft.tags.length ? { tags: draft.tags } : {}),
                };
            }),
        }));
        setEditingId(null);
    };

    const removeItem = (item: Item) => {
        const before = bill;
        onChange((b) => ({ ...b, items: b.items.filter((i) => i.id !== item.id) }));
        toast(t("itemDeleted", { name: item.name }), {
            action: { label: t("undo"), onClick: () => onChange(() => before) },
        });
    };

    const setPercent = (key: "servicePercent" | "vatPercent", raw: string) => {
        const value = parseMoney(raw);
        onChange((b) => {
            const { [key]: _drop, ...rest } = b;
            return value > 0 && value <= 100 ? { ...rest, [key]: value } : rest;
        });
    };

    return (
        <li className="rounded-2xl border bg-card">
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={open}
                className="flex min-h-[64px] w-full items-center gap-3 p-4 text-left"
            >
                <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold">{title}</p>
                    <p className="truncate text-sm text-muted-foreground">
                        {t("itemsCount", { count: bill.items.length })}
                        {" · "}
                        {payerIds.length === 0 ? (
                            <span className="text-destructive">{t("needPayer")}</span>
                        ) : payerIds.length > 1 ? (
                            t("paidByMany", { names: payerIds.map(nameOf).join(", ") })
                        ) : (
                            t("paidByName", { name: nameOf(payerIds[0]) })
                        )}
                    </p>
                </div>
                <span className="text-lg font-semibold tabular-nums">{formatMoney(result.total / 100)}</span>
                <ChevronDown className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden />
                <span className="sr-only">{open ? t("collapse") : t("expand")}</span>
            </button>

            {open && (
                <div className="space-y-5 border-t p-4">
                    <div className="space-y-2">
                        <label htmlFor={`${bill.id}-name`} className="text-sm font-medium">
                            {t("billName")}
                        </label>
                        <Input
                            id={`${bill.id}-name`}
                            value={bill.name}
                            onChange={(e) => onChange((b) => ({ ...b, name: e.target.value }))}
                            placeholder={t("billNamePlaceholder")}
                            autoComplete="off"
                            maxLength={120}
                            className="h-12 text-base"
                        />
                    </div>

                    <section className="space-y-2">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold">
                                {t("itemsTitle")} ({filtered ? `${shownItems.length}/${bill.items.length}` : bill.items.length})
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowAdd((v) => !v)}
                                aria-expanded={showAdd}
                                className="flex min-h-[44px] items-center gap-1 text-sm text-primary"
                            >
                                {showAdd ? (
                                    t("hideAddItem")
                                ) : (
                                    <>
                                        <Plus className="h-4 w-4" aria-hidden /> {t("showAddItem")}
                                    </>
                                )}
                            </button>
                        </div>

                        {showAdd && <ItemForm idPrefix={`${bill.id}-new`} submitLabel={t("addItem")} onSubmit={addItem} />}

                        {shownItems.length === 0 ? (
                            <p className="rounded-xl border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
                                {filtered && bill.items.length > 0 ? t("noItemsMatch") : t("noItems")}
                            </p>
                        ) : (
                            <ul className="divide-y rounded-xl border">
                                {shownItems.map((item) =>
                                    editingId === item.id ? (
                                        <li key={item.id} className="p-2">
                                            <ItemForm
                                                idPrefix={`${item.id}-edit`}
                                                initial={{ name: item.name, price: item.price, discount: item.discount, tags: item.tags ?? [] }}
                                                submitLabel={t("saveItem")}
                                                onSubmit={(draft) => saveItem(item.id, draft)}
                                                onCancel={() => setEditingId(null)}
                                                autoFocus
                                            />
                                        </li>
                                    ) : (
                                        <li key={item.id} className="flex items-start gap-2 px-3 py-2">
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-base">{item.name}</p>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    {item.discount && (
                                                        <span className="mr-1.5 rounded-md bg-muted px-1.5 py-0.5 text-foreground">
                                                            {item.discount.type === "percent"
                                                                ? `-${item.discount.value}%`
                                                                : `-${formatMoney(item.discount.value)}`}
                                                        </span>
                                                    )}
                                                    {sharersLabel(item, friends, t)}
                                                </p>
                                                {(item.tags ?? []).length > 0 && (
                                                    <p className="mt-1 flex flex-wrap gap-1">
                                                        {(item.tags ?? []).map((tag) => (
                                                            <span key={tag} className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                                                                {tagLabel(tag, t)}
                                                            </span>
                                                        ))}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <p className="text-base font-medium tabular-nums">
                                                    {formatMoney((result.itemNets[item.id] ?? 0) / 100)}
                                                </p>
                                                {item.discount && (
                                                    <p className="text-xs text-muted-foreground line-through tabular-nums">
                                                        {formatMoney(item.price)}
                                                    </p>
                                                )}
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-11 w-11 shrink-0"
                                                aria-label={`${t("editItem")}: ${item.name}`}
                                                onClick={() => setEditingId(item.id)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-11 w-11 shrink-0 text-destructive"
                                                aria-label={`${t("deleteItem")}: ${item.name}`}
                                                onClick={() => removeItem(item)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </li>
                                    )
                                )}
                            </ul>
                        )}
                    </section>

                    <section className="space-y-3">
                        <button
                            type="button"
                            onClick={() => setShowExtras((v) => !v)}
                            aria-expanded={showExtras}
                            className="flex min-h-[44px] w-full items-center justify-between text-sm font-semibold"
                        >
                            {t("extras")}
                            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", showExtras && "rotate-180")} aria-hidden />
                        </button>
                        {showExtras && (
                            <div className="space-y-3 rounded-2xl bg-muted/60 p-3">
                                <AdjustmentInput
                                    id={`${bill.id}-bill-discount`}
                                    label={t("billDiscount")}
                                    value={bill.discount}
                                    onChange={(discount) =>
                                        onChange((b) => {
                                            const { discount: _drop, ...rest } = b;
                                            return discount ? { ...rest, discount } : rest;
                                        })
                                    }
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <label htmlFor={`${bill.id}-service`} className="text-sm font-medium">
                                            {t("servicePercent")}
                                        </label>
                                        <Input
                                            id={`${bill.id}-service`}
                                            defaultValue={bill.servicePercent ? String(bill.servicePercent) : ""}
                                            onChange={(e) => setPercent("servicePercent", e.target.value)}
                                            inputMode="decimal"
                                            placeholder="10"
                                            autoComplete="off"
                                            className="h-12 bg-background text-base"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor={`${bill.id}-vat`} className="text-sm font-medium">
                                            {t("vatPercent")}
                                        </label>
                                        <Input
                                            id={`${bill.id}-vat`}
                                            defaultValue={bill.vatPercent ? String(bill.vatPercent) : ""}
                                            onChange={(e) => setPercent("vatPercent", e.target.value)}
                                            inputMode="decimal"
                                            placeholder="7"
                                            autoComplete="off"
                                            className="h-12 bg-background text-base"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>

                    <dl className="space-y-1.5 rounded-2xl border p-3 text-sm">
                        <div className="flex justify-between">
                            <dt className="text-muted-foreground">{t("subtotal")}</dt>
                            <dd className="tabular-nums">{formatMoney(result.subtotal / 100)}</dd>
                        </div>
                        {result.discount > 0 && (
                            <div className="flex justify-between">
                                <dt className="text-muted-foreground">{t("discountLine")}</dt>
                                <dd className="tabular-nums">-{formatMoney(result.discount / 100)}</dd>
                            </div>
                        )}
                        {result.service > 0 && (
                            <div className="flex justify-between">
                                <dt className="text-muted-foreground">{t("serviceLine", { percent: bill.servicePercent ?? 0 })}</dt>
                                <dd className="tabular-nums">{formatMoney(result.service / 100)}</dd>
                            </div>
                        )}
                        {result.vat > 0 && (
                            <div className="flex justify-between">
                                <dt className="text-muted-foreground">{t("vatLine", { percent: bill.vatPercent ?? 0 })}</dt>
                                <dd className="tabular-nums">{formatMoney(result.vat / 100)}</dd>
                            </div>
                        )}
                        <div className="flex justify-between border-t pt-2 text-base font-semibold">
                            <dt>{t("billTotal")}</dt>
                            <dd className="tabular-nums">{formatMoney(result.total / 100)}</dd>
                        </div>
                    </dl>

                    <PayersPicker
                        friends={friends}
                        payers={bill.payers}
                        result={result}
                        onChange={(payers) => onChange((b) => ({ ...b, payers }))}
                    />

                    <Button variant="ghost" className="h-12 w-full text-destructive" onClick={onDelete}>
                        <Trash2 className="mr-2 h-4 w-4" aria-hidden /> {t("deleteBill")}
                    </Button>
                </div>
            )}
        </li>
    );
}
