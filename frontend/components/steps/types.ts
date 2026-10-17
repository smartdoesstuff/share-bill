import { ItemFilter } from "../../lib/filter";
import { SessionData } from "../../types";

export interface StepProps {
    data: SessionData;
    update: (fn: (current: SessionData) => SessionData) => void;
}

/** Steps that list items share one filter, so it stays when moving between them. */
export interface FilterProps {
    filter: ItemFilter;
    onFilterChange: (filter: ItemFilter) => void;
}
