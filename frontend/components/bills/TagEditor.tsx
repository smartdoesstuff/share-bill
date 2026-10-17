"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import { Chip } from "../Chip";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { useI18n } from "../../lib/i18n";
import { MAX_TAGS_PER_ITEM, MAX_TAG_LENGTH, PRESET_TAGS, normalizeTags, tagKey, tagLabel } from "../../lib/tags";

interface TagEditorProps {
    idPrefix: string;
    tags: string[];
    onChange: (tags: string[]) => void;
}

/** Pick built-in tags with one tap or add your own. */
export function TagEditor({ idPrefix, tags, onChange }: TagEditorProps) {
    const { t } = useI18n();
    const [custom, setCustom] = useState("");
    const has = (tag: string) => tags.some((x) => tagKey(x) === tagKey(tag));
    const customTags = tags.filter((tag) => !(PRESET_TAGS as readonly string[]).includes(tagKey(tag)));
    const full = tags.length >= MAX_TAGS_PER_ITEM;

    const toggle = (tag: string) => onChange(has(tag) ? tags.filter((x) => tagKey(x) !== tagKey(tag)) : normalizeTags([...tags, tag]));

    const addCustom = () => {
        if (custom.trim()) onChange(normalizeTags([...tags, custom]));
        setCustom("");
    };

    return (
        <div className="space-y-2">
            <p className="text-sm font-medium">{t("tagsLabel")}</p>
            <div className="flex flex-wrap gap-2">
                {PRESET_TAGS.map((tag) => (
                    <Chip key={tag} selected={has(tag)} disabled={!has(tag) && full} onClick={() => toggle(tag)}>
                        {tagLabel(tag, t)}
                    </Chip>
                ))}
                {customTags.map((tag) => (
                    <Chip key={tag} selected onClick={() => toggle(tag)} aria-label={`${t("removeTag")}: ${tag}`}>
                        {tag}
                        <X className="h-3.5 w-3.5" aria-hidden />
                    </Chip>
                ))}
            </div>
            <div className="flex gap-2">
                <Input
                    id={`${idPrefix}-custom-tag`}
                    value={custom}
                    onChange={(e) => setCustom(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            addCustom();
                        }
                    }}
                    placeholder={t("addCustomTagPlaceholder")}
                    aria-label={t("addCustomTag")}
                    maxLength={MAX_TAG_LENGTH}
                    disabled={full}
                    className="h-11 bg-background text-base"
                />
                <Button type="button" variant="outline" className="h-11 shrink-0" onClick={addCustom} disabled={full || !custom.trim()}>
                    {t("addTagButton")}
                </Button>
            </div>
        </div>
    );
}
