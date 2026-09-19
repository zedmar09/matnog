// biome-ignore-all lint/a11y/noNoninteractiveTabindex: Horizontally scrollable tables must be keyboard reachable.
"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";

import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown } from "lucide-react";

export type DataTableColumn<TRow> = {
  /** Stable key for the column. */
  key: string;
  header: string;
  /** Hide the header text visually but keep it for screen readers. */
  headerHidden?: boolean;
  /** Applied to both the header cell and every body cell in the column. */
  className?: string;
  /** Supplying this makes the column sortable. */
  sortValue?: (row: TRow) => string | number;
  cell: (row: TRow) => ReactNode;
};

type SortState = { key: string; direction: "asc" | "desc" };

/**
 * Dense operational table with optional sorting and pagination. Every column
 * keeps a scoped header so the table stays navigable with a screen reader, and
 * the wrapper scrolls horizontally instead of forcing the page to.
 */
export function DataTable<TRow>({
  columns,
  rows,
  getRowKey,
  summary,
  pageSize = 10,
  initialSort,
}: {
  columns: readonly DataTableColumn<TRow>[];
  rows: readonly TRow[];
  getRowKey: (row: TRow) => string;
  /** Live count announced after the table updates. */
  summary?: ReactNode;
  /** Rows per page. Pass 0 to show every row. */
  pageSize?: number;
  initialSort?: SortState;
}) {
  const [sort, setSort] = useState<SortState | undefined>(initialSort);
  const [page, setPage] = useState(1);
  const [size, setPageSize] = useState(pageSize > 0 ? pageSize : 10);
  const [scrolled, setScrolled] = useState(false);

  // A changed filter can leave the viewer past the last page.
  useEffect(() => {
    setPage(1);
  }, []);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((item) => item.key === sort.key);
    if (!column?.sortValue) return rows;
    const read = column.sortValue;
    return [...rows].sort((a, b) => {
      const left = read(a);
      const right = read(b);
      const order =
        typeof left === "number" && typeof right === "number"
          ? left - right
          : String(left).localeCompare(String(right), undefined, { numeric: true });
      return sort.direction === "asc" ? order : -order;
    });
  }, [rows, sort, columns]);

  // Paging reads the chosen size, not the initial prop: they diverge as soon as
  // the reader picks a different rows-per-page.
  const paged = size > 0;
  const pageCount = paged ? Math.max(1, Math.ceil(sorted.length / size)) : 1;
  const current = Math.min(page, pageCount);
  const visible = paged ? sorted.slice((current - 1) * size, current * size) : sorted;
  // The chosen size must be offered, or the select would fall back to showing
  // its first option while a different number of rows is on screen.
  const sizeOptions = [...new Set([size, 10, 25, 50])].sort((a, b) => a - b);

  function toggleSort(key: string) {
    setSort((state) =>
      state?.key === key ? { key, direction: state.direction === "asc" ? "desc" : "asc" } : { key, direction: "asc" },
    );
    setPage(1);
  }

  return (
    <>
      <section
        className="ops-table-wrapper"
        aria-label={typeof summary === "string" ? summary : "Scrollable data table"}
        tabIndex={0}
        data-scrolled={scrolled ? "" : undefined}
        onScroll={(event) => {
          const node = event.currentTarget;
          setScrolled(node.scrollLeft > 0 && node.scrollWidth > node.clientWidth);
        }}
      >
        <table className="ops-table">
          <thead>
            <tr>
              {columns.map((column) => {
                const active = sort?.key === column.key;
                return (
                  <th
                    scope="col"
                    key={column.key}
                    className={column.className}
                    aria-sort={active ? (sort?.direction === "asc" ? "ascending" : "descending") : undefined}
                  >
                    {column.headerHidden ? (
                      <span className="sr-only">{column.header}</span>
                    ) : column.sortValue ? (
                      <button type="button" className="ops-sort" onClick={() => toggleSort(column.key)}>
                        {column.header}
                        {active ? (
                          sort?.direction === "asc" ? (
                            <ArrowUp size={13} aria-hidden="true" />
                          ) : (
                            <ArrowDown size={13} aria-hidden="true" />
                          )
                        ) : (
                          <ChevronsUpDown size={13} aria-hidden="true" className="ops-sort-idle" />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={getRowKey(row)}>
                {columns.map((column) => (
                  <td key={column.key} className={column.className}>
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="ops-table-foot">
        <p role="status" className="ops-table-summary">
          {sorted.length === 0
            ? "No rows"
            : `Showing ${(current - 1) * size + 1}–${Math.min(current * size, sorted.length)} of ${sorted.length}`}
          {summary != null ? <span className="ops-table-context"> · {summary}</span> : null}
        </p>
        <nav className="ops-pagination" aria-label="Table pages">
          <label>
            Rows
            <select
              value={size}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
            >
              {sizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => setPage(current - 1)} disabled={current === 1}>
            <ChevronLeft size={15} aria-hidden="true" />
            <span className="sr-only">Previous page</span>
          </button>
          <span>
            Page {current} of {pageCount}
          </span>
          <button type="button" onClick={() => setPage(current + 1)} disabled={current === pageCount}>
            <ChevronRight size={15} aria-hidden="true" />
            <span className="sr-only">Next page</span>
          </button>
        </nav>
      </div>
    </>
  );
}
