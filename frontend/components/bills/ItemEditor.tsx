"use client";

import React, { useMemo, useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Chip } from "../Chip";
import { AdjustmentInput } from "./AdjustmentInput";
import { PayersPicker } from "./PayersPicker";
import { TagEditor } from "./TagEditor";
import { ItemInput, Payers, Target } from "../../lib/bills";
import { computeBill } from "../../lib/calc";
import { normalizeTags, suggestTag, tagKey, tagLabel } from "../../lib/tags";
import { cn } from "../../lib/utils";
import { useI18n } from "../../lib/i18n";
import { parseMoney } from "../../lib/money";
import { Adjustment, Friend } from "../../types";

interface ItemEditorProps {
    idPrefix: string;
    friends: Friend[];
    /** Groups the item can go to. */
    groups: { id: string; title: string }[];
    mode: "add" | "edit";
    initial?: ItemInput;
    /** Payers of a standalone item (used when no group is chosen). */
    initialPayers?: Payers;
    /** null = standalone. */
    initialTarget?: Target;
    onSubmit: (input: ItemInput, payers: Payers, target: Target) => void;
    onCancel?: () => void;
    onDelete?: () => void;
    autoFocus?: boolean;
}

/**
 * One form for adding and editing an item. By default it is just name, price and who paid.
 * Discount, tags and the group live under "More options" so the common case stays short.
 */
export function ItemEditor({
    idPrefix,
    friends,
    groups,
    mode,
    initial,
    initialPayers = [],
    initialTarget = null,
    onSubmit,
    onCancel,
    onDelete,
    autoFocus,
}: ItemEditorProps) {
    const { t } = useI18n();
    const [name, setName] = useState(initial?.name ?? "");
    const [price, setPrice] = useState(initial ? String(initial.price) : "");
    const [discount, setDiscount] = useState<Adjustment | undefined>(initial?.discount);
    const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
    const [payers, setPayers] = useState<Payers>(initialPayers);
    const [target, setTarget] = useState<Target>(initialTarget);
    const [showMore, setShowMore] = useState(!!initial?.discount || (initial?.tags ?? []).length > 0 || initialTarget !== null);
    const [resetKey, setResetKey] = useState(0);

    const parsed = parseMoney(price);
    const standalone = target === null;

    // A throwaway one-item bill gives the payers picker its live amounts and mismatch hint.
    const result = useMemo(
        () =>
            computeBill(
                {
                    id: "preview",
                    name: "",
                    items: [{ id: "preview", name, price: parsed >= 0 ? parsed : 0, discount, assignedTo: friends.map((f) => f.id) }],
                    payers,
                },
                friends.map((f) => f.id)
            ),
        [name, parsed, discount, payers, friends]
    );

    const knownPayers = payers.filter((p) => friends.some((f) => f.id === p.id));
    const payersOk = !standalone || (knownPayers.length > 0 && !result.payersMismatch);
    const canSubmit = name.trim().length > 0 && price.trim() !== "" && parsed >= 0 && payersOk;

    const suggestion = suggestTag(name);
    const suggestionTaken = !!suggestion && tags.some((x) => tagKey(x) === suggestion);

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        event.stopPropagation();
        if (!canSubmit) return;
        onSubmit({ name: name.trim(), price: parsed, discount, tags: normalizeTags(tags) }, standalone ? knownPayers : [], target);
        if (mode === "add") {
            setName("");
            setPrice("");
            setDiscount(undefined);
            setTags([]);
            setResetKey((k) => k + 1);
        }
    };

    return (
        <form onSubmit={submit} className="space-y-3">
            <div className="space-y-2">
                <label htmlFor={`${idPrefix}-name`} className="text-sm font-medium">
                    {t("itemName")}
                </label>
                <Input
                    id={`${idPrefix}-name`}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("itemNamePlaceholder")}
                    autoComplete="off"
                    autoFocus={autoFocus}
                    enterKeyHint="next"
                    maxLength={120}
                    className="h-12 text-base"
                />
            </div>
            <div className="space-y-2">
                <label htmlFor={`${idPrefix}-price`} className="text-sm font-medium">
                    {t("price")}
                </label>
                <Input
                    id={`${idPrefix}-price`}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    inputMode="decimal"
                    pattern="[0-9]*[.,]?[0-9]*"
                    placeholder="0.00"
                    autoComplete="off"
                    enterKeyHint="done"
                    className="h-12 text-base"
                />
            </div>

            {suggestion && !suggestionTaken && (
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted-foreground">{t("suggestTagLabel")}</span>
                    <Chip
                        onClick={() => {
                            setTags((cur) => normalizeTags([...cur, suggestion]));
                            setShowMore(true);
                        }}
                    >
                        {tagLabel(suggestion, t)}
                    </Chip>
                </div>
            )}

            {standalone ? (
                <PayersPicker
                    key={resetKey}
                    friends={friends}
                    payers={payers}
                    result={result}
                    onChange={setPayers}
                />
            ) : (
                <p className="text-sm text-muted-foreground">{t("groupPayersNote")}</p>
            )}

            <button
                type="button"
                onClick={() => setShowMore((v) => !v)}
                aria-expanded={showMore}
                className="flex min-h-[44px] items-center gap-1 text-sm text-primary"
            >
                {t("moreOptions")}
                <ChevronDown className={cn("h-4 w-4 transition-transform", showMore && "rotate-180")} aria-hidden />
            </button>

            {showMore && (
                <div className="space-y-4 rounded-2xl bg-muted/60 p-3">
                    <AdjustmentInput key={`d${resetKey}`} id={`${idPrefix}-discount`} label={t("itemDiscount")} value={discount} onChange={setDiscount} />
                    <TagEditor idPrefix={idPrefix} tags={tags} onChange={setTags} />
                    <div className="space-y-2">
                        <p className="text-sm font-medium">{t("groupLabel")}</p>
                        <div className="flex flex-wrap gap-2">
                            <Chip selected={target === null} onClick={() => setTarget(null)}>
                                {t("noGroup")}
                            </Chip>
                            {groups.map((group) => (
                                <Chip key={group.id} selected={target === group.id} onClick={() => setTarget(group.id)}>
                                    {group.title}
                                </Chip>
                            ))}
                            <Chip selected={target === "new"} onClick={() => setTarget("new")}>
                                <Plus className="h-4 w-4" aria-hidden /> {t("newGroup")}
                            </Chip>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex gap-2">
                {mode === "edit" && onDelete && (
                    <Button type="button" variant="ghost" className="h-12 shrink-0 px-4 text-destructive" onClick={onDelete}>
                        {t("deleteItem")}
                    </Button>
                )}
                {mode === "edit" && onCancel && (
                    <Button type="button" variant="outline" size="lg" className="h-12 flex-1 text-base" onClick={onCancel}>
                        {t("cancel")}
                    </Button>
                )}
                <Button type="submit" size="lg" className="h-12 flex-[2] text-base" disabled={!canSubmit}>
                    {mode === "add" && <Plus className="mr-2 h-5 w-5" aria-hidden />}
                    {mode === "add" ? t("addItem") : t("saveItem")}
                </Button>
            </div>
        </form>
    );
}
