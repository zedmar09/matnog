"use client";

import type { ReactNode } from "react";

import { SearchField } from "@/shared/components/filter-bar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";

export type OpsFilterOption = {
  /** Never empty: an empty value is reserved for "no selection". */
  value: string;
  label: string;
  icon?: ReactNode;
};

/** Sentinel for "no filter", because Radix reserves the empty string. */
export const OPS_FILTER_ANY = "__any__";

/**
 * One filter control for the staff workspace. Every module uses this so the
 * filter row looks and behaves the same everywhere.
 */
export function OpsFilter({
  label,
  value,
  onChange,
  options,
  anyLabel = "Any",
  width = 190,
}: {
  label: string;
  /** Empty string means no filter is applied. */
  value: string;
  onChange: (value: string) => void;
  options: readonly OpsFilterOption[];
  anyLabel?: string;
  width?: number;
}) {
  return (
    <div className="ops-filter">
      <span className="ops-filter-label">{label}</span>
      <Select
        value={value === "" ? OPS_FILTER_ANY : value}
        onValueChange={(next) => onChange(next === OPS_FILTER_ANY ? "" : next)}
      >
        <SelectTrigger className="ops-filter-trigger" style={{ width }} aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={OPS_FILTER_ANY}>{anyLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <span className="ops-filter-option">
                {option.icon}
                {option.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Search styled as a filter: labelled above, bordered like the selects. */
export function OpsSearch({
  label = "Search",
  value,
  onChange,
  placeholder,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="ops-filter ops-filter-search">
      <span className="ops-filter-label">{label}</span>
      <SearchField label={label} value={value} onChange={onChange} placeholder={placeholder} iconSize={16} />
    </div>
  );
}

/** Date filter shaped like the selects: labelled above, same bordered frame. */
export function OpsDateFilter({
  label,
  value,
  onChange,
  width = 170,
}: {
  label: string;
  /** Empty string means no date is applied. */
  value: string;
  onChange: (value: string) => void;
  width?: number;
}) {
  return (
    <div className="ops-filter">
      <span className="ops-filter-label">{label}</span>
      <input
        type="date"
        aria-label={label}
        value={value}
        style={{ width }}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
