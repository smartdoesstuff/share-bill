"use client";

import React, { useMemo, useState } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { AdjustmentInput } from "./AdjustmentInput";
import { ItemRow } from "./ItemRow";
import { PayersPicker } from "./PayersPicker";
import { ItemInput, Payers, Target, billTitle } from "../../lib/bills";
import { computeBill } from "../../lib/calc";
import { ItemFilter, isFilterActive, visibleItems } from "../../lib/filter";
import { cn } from "../../lib/utils";
import { useI18n } from "../../lib/i18n";
import { parseMoney } from "../../lib/money";
import { Bill, Friend } from "../../types";

interface GroupCardProps {
    bill: Bill;
    bills: Bill[];
    friends: Friend[];
    groups: { id: string; title: string }[];
    open: boolean;
    filter: ItemFilter;
    onToggle: () => void;
    onChange: (fn: (bill: Bill) => Bill) => void;
    onDelete: () => void;
    onAddHere: () => void;
    onItemSave: (itemId: string, input: ItemInput, payers: Payers, target: Target) => void;
    onItemDelete: (itemId: string) => void;
}

/** A group of items paid together: shared discount, service charge, VAT and payers. */
export function GroupCard({
    bill,
    bills,
    friends,
    groups,
    open,
    filter,
    onToggle,
    onChange,
    onDelete,
    onAddHere,
    onItemSave,
    onItemDelete,
}: GroupCardProps) {
    const { t, formatMoney } = useI18n();
    const [showExtras, setShowExtras] = useState(!!bill.discount || !!bill.servicePercent || !!bill.vatPercent);

    const result = useMemo(() => computeBill(bill, friends.map((f) => f.id)), [bill, friends]);
    const title = billTitle(bill, bills, t);
    const nameOf = (id: string) => friends.find((f) => f.id === id)?.name ?? t("unknownPerson");
    const payerIds = bill.payers.filter((p) => friends.some((f) => f.id === p.id)).map((p) => p.id);
    const shown = visibleItems(bill, filter, friends);
    const filtered = isFilterActive(filter);

    const setPercent = (key: "servicePercent" | "vatPercent", raw: string) => {
        const value = parseMoney(raw);
        onChange((b) => {
            const { [key]: _drop, ...rest } = b;
            return value > 0 && value <= 100 ? { ...rest, [key]: value } : rest;
        });
    };

    return (
        <li className="rounded-2xl border bg-card">
            <button type="button" onClick={onToggle} aria-expanded={open} className="flex min-h-[64px] w-full items-center gap-3 p-4 text-left">
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
                            autoFocus={bill.items.length === 0 && bill.name === ""}
                            maxLength={120}
                            className="h-12 text-base"
                        />
                    </div>

                    <section className="space-y-2">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold">
                                {t("itemsTitle")} ({filtered ? `${shown.length}/${bill.items.length}` : bill.items.length})
                            </h3>
                            <button type="button" onClick={onAddHere} className="flex min-h-[44px] items-center gap-1 text-sm text-primary">
                                <Plus className="h-4 w-4" aria-hidden /> {t("addToGroup")}
                            </button>
                        </div>
                        {shown.length === 0 ? (
                            <p className="rounded-xl border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
                                {filtered && bill.items.length > 0 ? t("noItemsMatch") : t("noItems")}
                            </p>
                        ) : (
                            <ul className="divide-y rounded-xl border">
                                {shown.map((item) => (
                                    <ItemRow
                                        key={item.id}
                                        card
                                        bill={bill}
                                        item={item}
                                        friends={friends}
                                        groups={groups}
                                        netCents={result.itemNets[item.id] ?? 0}
                                        onSave={(input, payers, target) => onItemSave(item.id, input, payers, target)}
                                        onDelete={() => onItemDelete(item.id)}
                                    />
                                ))}
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

                    <PayersPicker friends={friends} payers={bill.payers} result={result} onChange={(payers) => onChange((b) => ({ ...b, payers }))} />

                    <Button variant="ghost" className="h-12 w-full text-destructive" onClick={onDelete}>
                        <Trash2 className="mr-2 h-4 w-4" aria-hidden /> {t("deleteBill")}
                    </Button>
                </div>
            )}
        </li>
    );
}
