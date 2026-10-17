"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { AdjustmentInput } from "./AdjustmentInput";
import { TagEditor } from "./TagEditor";
import { Chip } from "../Chip";
import { normalizeTags, suggestTag, tagKey, tagLabel } from "../../lib/tags";
import { useI18n } from "../../lib/i18n";
import { parseMoney } from "../../lib/money";
import { Adjustment } from "../../types";

export interface ItemDraft {
    name: string;
    price: number;
    discount?: Adjustment;
    tags: string[];
}

interface ItemFormProps {
    idPrefix: string;
    initial?: ItemDraft;
    submitLabel: string;
    onSubmit: (item: ItemDraft) => void;
    onCancel?: () => void;
    autoFocus?: boolean;
}

/** Name, price and an optional discount: used both to add a new item and to edit one. */
export function ItemForm({ idPrefix, initial, submitLabel, onSubmit, onCancel, autoFocus }: ItemFormProps) {
    const { t } = useI18n();
    const [name, setName] = useState(initial?.name ?? "");
    const [price, setPrice] = useState(initial ? String(initial.price) : "");
    const [discount, setDiscount] = useState<Adjustment | undefined>(initial?.discount);
    const [showDiscount, setShowDiscount] = useState(!!initial?.discount);
    const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
    const [showTags, setShowTags] = useState((initial?.tags ?? []).length > 0);
    const [formKey, setFormKey] = useState(0); // remounts the discount input after a reset

    const parsed = parseMoney(price);
    // A hint from the name (e.g. beer -> alcohol); the user decides whether to add it.
    const suggestion = suggestTag(name);
    const suggestionTaken = !!suggestion && tags.some((x) => tagKey(x) === suggestion);
    const canSubmit = name.trim().length > 0 && parsed >= 0 && price.trim() !== "";

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        event.stopPropagation();
        if (!canSubmit) return;
        onSubmit({ name: name.trim(), price: parsed, discount, tags: normalizeTags(tags) });
        if (!initial) {
            setName("");
            setPrice("");
            setDiscount(undefined);
            setShowDiscount(false);
            setTags([]);
            setShowTags(false);
            setFormKey((k) => k + 1);
        }
    };

    return (
        <form onSubmit={submit} className="space-y-3 rounded-2xl bg-muted/60 p-3">
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
                    className="h-12 bg-background text-base"
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
                    className="h-12 bg-background text-base"
                />
            </div>
            {suggestion && !suggestionTaken && (
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted-foreground">{t("suggestTagLabel")}</span>
                    <Chip
                        onClick={() => {
                            setTags((cur) => normalizeTags([...cur, suggestion]));
                            setShowTags(true);
                        }}
                    >
                        {tagLabel(suggestion, t)}
                    </Chip>
                </div>
            )}
            {showTags ? (
                <TagEditor idPrefix={idPrefix} tags={tags} onChange={setTags} />
            ) : (
                <button type="button" onClick={() => setShowTags(true)} className="block min-h-[44px] text-sm text-primary">
                    {t("addTags")}
                </button>
            )}
            {showDiscount ? (
                <AdjustmentInput key={formKey} id={`${idPrefix}-discount`} label={t("itemDiscount")} value={discount} onChange={setDiscount} />
            ) : (
                <button type="button" onClick={() => setShowDiscount(true)} className="min-h-[44px] text-sm text-primary">
                    {t("addItemDiscount")}
                </button>
            )}
            <div className="flex gap-2">
                {onCancel && (
                    <Button type="button" variant="outline" size="lg" className="h-12 flex-1 text-base" onClick={onCancel}>
                        {t("cancel")}
                    </Button>
                )}
                <Button type="submit" size="lg" className="h-12 flex-[2] text-base" disabled={!canSubmit}>
                    {!initial && <Plus className="mr-2 h-5 w-5" aria-hidden />}
                    {submitLabel}
                </Button>
            </div>
        </form>
    );
}
