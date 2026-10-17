"use client";

import React, { useState } from "react";
import { ItemEditor } from "./ItemEditor";
import { ItemInput, Payers, Target } from "../../lib/bills";
import { tagLabel } from "../../lib/tags";
import { cn } from "../../lib/utils";
import { useI18n } from "../../lib/i18n";
import { Bill, Friend, Item } from "../../types";

interface ItemRowProps {
    bill: Bill;
    item: Item;
    friends: Friend[];
    groups: { id: string; title: string }[];
    /** What the item costs after its own discount, in cents. */
    netCents: number;
    onSave: (input: ItemInput, payers: Payers, target: Target) => void;
    onDelete: () => void;
    /** Rows inside a group sit in the group's card; standalone rows are cards on their own. */
    card?: boolean;
}

/** A calm row: name, price, who shares it. Tap it to edit, move it to a group or delete it. */
export function ItemRow({ bill, item, friends, groups, netCents, onSave, onDelete, card }: ItemRowProps) {
    const { t, formatMoney } = useI18n();
    const [editing, setEditing] = useState(false);
    const nameOf = (id: string) => friends.find((f) => f.id === id)?.name ?? t("unknownPerson");

    const sharers = friends.filter((f) => item.assignedTo.includes(f.id));
    const sharedText =
        sharers.length === 0 ? t("sharedByNobody") : sharers.length === friends.length ? t("sharedByEveryone") : sharers.map((f) => f.name).join(", ");
    const payerIds = bill.payers.filter((p) => friends.some((f) => f.id === p.id)).map((p) => p.id);

    return (
        <li className={cn(card ? "" : "rounded-2xl border bg-card")}>
            {editing ? (
                <div className="p-3">
                    <ItemEditor
                        idPrefix={`${item.id}-edit`}
                        friends={friends}
                        groups={groups}
                        mode="edit"
                        initial={{ name: item.name, price: item.price, discount: item.discount, tags: item.tags ?? [] }}
                        // Leaving a group keeps the group's payers (equal shares) so the item is complete right away.
                        initialPayers={bill.solo ? bill.payers : bill.payers.map((p) => ({ id: p.id }))}
                        initialTarget={bill.solo ? null : bill.id}
                        onSubmit={(input, payers, target) => {
                            onSave(input, payers, target);
                            setEditing(false);
                        }}
                        onCancel={() => setEditing(false)}
                        onDelete={onDelete}
                        autoFocus
                    />
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => setEditing(true)}
                    aria-label={`${t("editItem")}: ${item.name}`}
                    className="flex min-h-[60px] w-full items-start gap-3 px-4 py-3 text-left"
                >
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-base">{item.name}</p>
                        <p className="truncate text-sm text-muted-foreground">
                            {item.discount && (
                                <span className="mr-1.5 rounded-md bg-muted px-1.5 py-0.5 text-xs text-foreground">
                                    {item.discount.type === "percent" ? `-${item.discount.value}%` : `-${formatMoney(item.discount.value)}`}
                                </span>
                            )}
                            {bill.solo && (
                                <>
                                    {payerIds.length === 0 ? (
                                        <span className="text-destructive">{t("needPayer")}</span>
                                    ) : payerIds.length > 1 ? (
                                        t("paidByMany", { names: payerIds.map(nameOf).join(", ") })
                                    ) : (
                                        t("paidByName", { name: nameOf(payerIds[0]) })
                                    )}
                                    {" · "}
                                </>
                            )}
                            {sharedText}
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
                        <p className="text-base font-medium tabular-nums">{formatMoney(netCents / 100)}</p>
                        {item.discount && <p className="text-xs text-muted-foreground line-through tabular-nums">{formatMoney(item.price)}</p>}
                    </div>
                </button>
            )}
        </li>
    );
}
