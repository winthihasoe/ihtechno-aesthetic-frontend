import { useCallback, useMemo, useState } from "react";

export const BLANK_FILTER_VALUE = "(Blank)";

export function normalizeFilterValue(value) {
  const text = String(value ?? "").trim();
  return text === "" ? BLANK_FILTER_VALUE : text;
}

function sortFilterOptions(values) {
  return [...values].sort((a, b) => {
    if (a === BLANK_FILTER_VALUE) return 1;
    if (b === BLANK_FILTER_VALUE) return -1;
    return a.localeCompare(b, undefined, { sensitivity: "base" });
  });
}

export default function useTableColumnFilters(rows, { columns = [] } = {}) {
  const [columnSelections, setColumnSelections] = useState({});

  const columnOptions = useMemo(() => {
    const options = {};
    for (const column of columns) {
      const unique = new Set();
      for (const row of rows) {
        unique.add(normalizeFilterValue(column.getValue(row)));
      }
      options[column.key] = sortFilterOptions(unique);
    }
    return options;
  }, [rows, columns]);

  const getColumnSelectionArray = useCallback(
    (key) => {
      const options = columnOptions[key] ?? [];
      const selected = columnSelections[key];
      if (!selected) {
        return options;
      }
      return selected;
    },
    [columnOptions, columnSelections],
  );

  const hasActiveColumnFilters = useMemo(() => {
    return columns.some((column) => {
      const options = columnOptions[column.key] ?? [];
      if (options.length === 0) return false;
      const selected = columnSelections[column.key];
      if (!selected) return false;
      return selected.length !== options.length;
    });
  }, [columns, columnOptions, columnSelections]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) =>
      columns.every((column) => {
        const options = columnOptions[column.key] ?? [];
        if (options.length === 0) return true;

        const selected = columnSelections[column.key];
        if (!selected || selected.length === options.length) return true;
        if (selected.length === 0) return false;

        return selected.includes(normalizeFilterValue(column.getValue(row)));
      }),
    );
  }, [rows, columns, columnOptions, columnSelections]);

  const setColumnSelection = useCallback((key, values) => {
    setColumnSelections((prev) => ({
      ...prev,
      [key]: Array.from(new Set(values)),
    }));
  }, []);

  const clearColumnSelection = useCallback((key) => {
    setColumnSelections((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const clearAllColumnSelections = useCallback(() => {
    setColumnSelections({});
  }, []);

  const resetColumnFilters = clearAllColumnSelections;

  return {
    filteredRows,
    columnOptions,
    columnSelections,
    getColumnSelectionArray,
    setColumnSelection,
    clearColumnSelection,
    clearAllColumnSelections,
    resetColumnFilters,
    hasActiveColumnFilters,
  };
}
