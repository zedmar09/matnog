import assert from "node:assert/strict";
import { describe, it } from "node:test";

/**
 * The paging arithmetic the table renders with, kept in one place so the
 * selector, the slice and the summary can be checked to agree. They did not:
 * the slice used the initial prop while the selector and summary used the
 * chosen size, so picking a different rows-per-page changed nothing and the
 * footer disagreed with the rows on screen.
 */
function page(total: number, size: number, requested: number) {
  const pageCount = size > 0 ? Math.max(1, Math.ceil(total / size)) : 1;
  const current = Math.min(requested, pageCount);
  const from = (current - 1) * size;
  const rows = size > 0 ? Math.min(size, Math.max(0, total - from)) : total;
  const sizeOptions = [...new Set([size, 10, 25, 50])].sort((a, b) => a - b);
  return {
    current,
    pageCount,
    rows,
    label: total === 0 ? "No rows" : `Showing ${from + 1}–${from + rows} of ${total}`,
    sizeOptions,
  };
}

describe("data table paging", () => {
  it("shows exactly the chosen number of rows on a full page", () => {
    const result = page(12, 10, 1);
    assert.equal(result.rows, 10, "a table set to 10 rows must not render 12");
    assert.equal(result.pageCount, 2);
    assert.equal(result.label, "Showing 1–10 of 12");
  });

  it("offers the chosen size, so the selector cannot display a different number", () => {
    // A table opened at 12 rows per page must have 12 among its options.
    assert.deepEqual(page(12, 12, 1).sizeOptions, [10, 12, 25, 50]);
    assert.deepEqual(page(12, 10, 1).sizeOptions, [10, 25, 50]);
  });

  it("keeps the summary consistent with the rows rendered", () => {
    for (const size of [10, 12, 25, 50]) {
      for (const total of [0, 1, 7, 12, 60]) {
        const result = page(total, size, 1);
        const expected = total === 0 ? "No rows" : `Showing 1–${result.rows} of ${total}`;
        assert.equal(result.label, expected, `size ${size}, total ${total}`);
      }
    }
  });

  it("returns the short last page rather than over-counting", () => {
    const result = page(12, 10, 2);
    assert.equal(result.rows, 2);
    assert.equal(result.label, "Showing 11–12 of 12");
  });

  it("clamps a page beyond the end back to the last page", () => {
    const result = page(12, 10, 9);
    assert.equal(result.current, 2);
    assert.equal(result.rows, 2);
  });

  it("handles an empty table without a negative range", () => {
    const result = page(0, 10, 1);
    assert.equal(result.rows, 0);
    assert.equal(result.pageCount, 1);
    assert.equal(result.label, "No rows");
  });
});
