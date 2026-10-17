"use client";

import React, { useState } from "react";
import { ListFilter, X } from "lucide-react";
import { Chip } from "./Chip";
import { ItemFilter, NO_FILTER, activeFilterCount, collectTags, isFilterActive } from "../lib/filter";
import { tagKey, tagLabel } from "../lib/tags";
import { useI18n } from "../lib/i18n";
import { SessionData } from "../types";

interface FilterBarProps {
    data: SessionData;
    filter: ItemFilter;
    onChange: (filter: ItemFilter) => void;
    shown: number;
    total: number;
}

/** A collapsible filter for the item lists: by tag, by person, or only items nobody has been chosen for. */
export function FilterBar({ data, filter, onChange, shown, total }: FilterBarProps) {
    const { t } = useI18n();
    const [open, setOpen] = useState(false);
    const tags = collectTags(data);
    const active = isFilterActive(filter);
    if (total === 0) return null;

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    aria-expanded={open}
                    className="flex min-h-[44px] items-center gap-2 rounded-full border px-4 text-sm font-medium"
                >
                    <ListFilter className="h-4 w-4" aria-hidden />
                    {t("filterTitle")}
                    {active && (
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-xs text-primary-foreground">
                            {activeFilterCount(filter)}
                        </span>
                    )}
                </button>
                {active && (
                    <>
                        <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                            {t("showingOf", { shown, total })}
                        </span>
                        <button
                            type="button"
                            onClick={() => onChange(NO_FILTER)}
                            className="flex min-h-[44px] items-center gap-1 text-sm text-primary"
                        >
                            <X className="h-4 w-4" aria-hidden /> {t("filterClear")}
                        </button>
                    </>
                )}
            </div>

            {open && (
                <div className="space-y-4 rounded-2xl border p-3">
                    {tags.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">{t("filterTags")}</p>
                            <div className="flex flex-wrap gap-2">
                                {tags.map(({ tag, count }) => (
                                    <Chip
                                        key={tagKey(tag)}
                                        selected={!!filter.tag && tagKey(filter.tag) === tagKey(tag)}
                                        onClick={() =>
                                            onChange({ ...filter, tag: filter.tag && tagKey(filter.tag) === tagKey(tag) ? undefined : tag })
                                        }
                                    >
                                        {tagLabel(tag, t)} <span className="text-muted-foreground">{count}</span>
                                    </Chip>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">{t("filterPeople")}</p>
                        <div className="flex flex-wrap gap-2">
                            {data.friends.map((friend) => (
                                <Chip
                                    key={friend.id}
                                    selected={filter.personId === friend.id}
                                    onClick={() => onChange({ ...filter, personId: filter.personId === friend.id ? undefined : friend.id })}
                                >
                                    {friend.name}
                                </Chip>
                            ))}
                            <Chip
                                selected={!!filter.unassigned}
                                onClick={() => onChange({ ...filter, unassigned: filter.unassigned ? undefined : true })}
                            >
                                {t("filterUnassigned")}
                            </Chip>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
