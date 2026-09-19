"use client";
import type { ReactNode } from "react";

import { Search, X } from "lucide-react";

import { cn } from "@/shared/lib/utils";

/** Search input with an accessible label and a clear control. */
export function SearchField({
  label,
  value,
  onChange,
  placeholder,
  iconSize = 20,
  clearable = true,
  disabled = false,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  iconSize?: number;
  clearable?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("search-field", className)}>
      <Search size={iconSize} aria-hidden="true" />
      <input
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
      {clearable && value && (
        <button type="button" aria-label="Clear search" onClick={() => onChange("")}>
          <X size={18} />
        </button>
      )}
    </div>
  );
}

export type FilterOption = { value: string; label: string };

/** Single-select filter group. Selection is exposed through aria-pressed. */
export function FilterTabs({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: readonly FilterOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <fieldset className={className ?? "filter-tabs"} aria-label={label}>
      {options.map((option) => (
        <button
          type="button"
          key={option.value}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </fieldset>
  );
}

/** Live result count paired with a quiet source label. */
export function ResultsSummary({ children, source }: { children: ReactNode; source?: string }) {
  return (
    <div className="results-heading">
      <p role="status">{children}</p>
      {source && <span>{source}</span>}
    </div>
  );
}

/**
 * Search, audience filters and result count for a browsing list. Operational
 * screens compose the parts directly when they need extra controls.
 */
export function FilterBar({
  searchLabel,
  searchPlaceholder,
  query,
  onQueryChange,
  filterLabel,
  filters,
  filterValue,
  onFilterChange,
  filterClassName,
  results,
  resultsSource,
}: {
  searchLabel: string;
  searchPlaceholder?: string;
  query: string;
  onQueryChange: (value: string) => void;
  filterLabel: string;
  filters: readonly FilterOption[];
  filterValue: string;
  onFilterChange: (value: string) => void;
  filterClassName?: string;
  results: ReactNode;
  resultsSource?: string;
}) {
  return (
    <>
      <div className="directory-toolbar">
        <SearchField label={searchLabel} placeholder={searchPlaceholder} value={query} onChange={onQueryChange} />
      </div>
      <FilterTabs
        label={filterLabel}
        options={filters}
        value={filterValue}
        onChange={onFilterChange}
        className={filterClassName}
      />
      <ResultsSummary source={resultsSource}>{results}</ResultsSummary>
    </>
  );
}
