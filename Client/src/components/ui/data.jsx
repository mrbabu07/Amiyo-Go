import { ArrowDown, ArrowUp, CalendarDays, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "./foundation";
import { Checkbox, Input, Select } from "./forms";
import { EmptyState } from "./feedback";
import { cn, getPaginationMeta } from "./utils";

function getRowValue(row, accessor) {
  if (typeof accessor === "function") return accessor(row);
  return row?.[accessor];
}

export function Table({
  columns = [],
  data = [],
  rowKey = "id",
  sortKey,
  sortDirection = "asc",
  onSort,
  selectedRows = [],
  onSelectRow,
  onSelectAll,
  bulkSelect = false,
  onRowClick,
  renderRow,
  filterBar,
  pagination,
  emptyState,
  className = "",
}) {
  const getRowId = (row) => (typeof rowKey === "function" ? rowKey(row) : row[rowKey] || row._id);
  const allSelected = data.length > 0 && data.every((row) => selectedRows.includes(getRowId(row)));
  const partlySelected = data.some((row) => selectedRows.includes(getRowId(row))) && !allSelected;

  return (
    <div className={cn("overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900", className)}>
      {filterBar ? <div className="border-b border-slate-200 p-3 dark:border-slate-800">{filterBar}</div> : null}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs font-extrabold uppercase text-slate-500 dark:bg-slate-950 dark:text-slate-400">
            <tr>
              {bulkSelect ? (
                <th scope="col" className="w-12 px-4 py-3">
                  <Checkbox
                    aria-label="Select all rows"
                    checked={allSelected}
                    indeterminate={partlySelected}
                    onChange={(event) => onSelectAll?.(event.target.checked)}
                  />
                </th>
              ) : null}
              {columns.map((column) => {
                const sortable = Boolean(column.sortable || column.sortKey);
                const activeSort = sortKey === (column.sortKey || column.accessor);
                return (
                  <th key={column.id || column.accessor || column.header} scope="col" className={cn("px-4 py-3", column.headerClassName)}>
                    {sortable ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-md font-extrabold hover:text-slate-800 dark:hover:text-slate-100"
                        onClick={() => onSort?.(column.sortKey || column.accessor)}
                      >
                        {column.header}
                        {activeSort ? (
                          sortDirection === "desc" ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />
                        ) : null}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.length ? (
              data.map((row, rowIndex) => {
                const rowId = getRowId(row);
                if (renderRow) {
                  return renderRow(row, { rowIndex, rowId, selected: selectedRows.includes(rowId) });
                }
                return (
                  <TableRow key={rowId || rowIndex} clickable={Boolean(onRowClick)} onClick={() => onRowClick?.(row)}>
                    {bulkSelect ? (
                      <td className="w-12 px-4 py-3" onClick={(event) => event.stopPropagation()}>
                        <Checkbox
                          aria-label={`Select row ${rowIndex + 1}`}
                          checked={selectedRows.includes(rowId)}
                          onChange={(event) => onSelectRow?.(rowId, event.target.checked, row)}
                        />
                      </td>
                    ) : null}
                    {columns.map((column) => (
                      <td
                        key={column.id || column.accessor || column.header}
                        className={cn("px-4 py-3 text-slate-700 dark:text-slate-200", column.cellClassName)}
                      >
                        {column.cell ? column.cell(row, rowIndex) : getRowValue(row, column.accessor)}
                      </td>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <tr>
                <td colSpan={columns.length + (bulkSelect ? 1 : 0)} className="p-4">
                  {emptyState || (
                    <EmptyState
                      title="No records found"
                      description="Adjust the filters or create a new record to get started."
                    />
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pagination ? <div className="border-t border-slate-200 p-3 dark:border-slate-800">{pagination}</div> : null}
    </div>
  );
}

export function TableRow({ children, clickable = false, className = "", ...props }) {
  return (
    <tr
      tabIndex={clickable ? 0 : undefined}
      className={cn(
        "transition hover:bg-slate-50 dark:hover:bg-slate-800/60",
        clickable && "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500",
        className,
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

export function Pagination({
  page = 1,
  pageSize = 10,
  total = 0,
  pageSizeOptions = [10, 20, 50],
  onPageChange,
  onPageSizeChange,
  className = "",
}) {
  const meta = getPaginationMeta({ page, pageSize, total });

  return (
    <div className={cn("flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between", className)}>
      <p className="font-medium text-slate-500">
        Showing <span className="font-extrabold text-slate-800 dark:text-slate-100">{meta.start}-{meta.end}</span> of{" "}
        <span className="font-extrabold text-slate-800 dark:text-slate-100">{meta.total}</span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="h-10 rounded-lg border border-slate-300 bg-white px-2 text-sm font-semibold dark:border-slate-700 dark:bg-slate-950"
          value={meta.pageSize}
          onChange={(event) => onPageSizeChange?.(Number(event.target.value))}
          aria-label="Rows per page"
        >
          {pageSizeOptions.map((option) => (
            <option key={option} value={option}>
              {option} / page
            </option>
          ))}
        </select>
        <Button
          variant="secondary"
          size="sm"
          disabled={!meta.hasPrevious}
          leftIcon={<ChevronLeft className="h-4 w-4" />}
          onClick={() => onPageChange?.(meta.page - 1)}
        >
          Prev
        </Button>
        <span className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-extrabold dark:border-slate-800">
          {meta.page} / {meta.totalPages}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={!meta.hasNext}
          rightIcon={<ChevronRight className="h-4 w-4" />}
          onClick={() => onPageChange?.(meta.page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

function formatDateInput(date) {
  return date.toISOString().slice(0, 10);
}

function getPresetRange(preset) {
  const end = new Date();
  const start = new Date(end);

  if (preset === "today") return { startDate: formatDateInput(start), endDate: formatDateInput(end), preset };
  if (preset === "7d") start.setDate(end.getDate() - 6);
  if (preset === "30d") start.setDate(end.getDate() - 29);
  if (preset === "month") start.setDate(1);

  return { startDate: formatDateInput(start), endDate: formatDateInput(end), preset };
}

export function DateRangePicker({
  value = {},
  onChange,
  presets = [
    { value: "today", label: "Today" },
    { value: "7d", label: "7d" },
    { value: "30d", label: "30d" },
    { value: "month", label: "This month" },
    { value: "custom", label: "Custom" },
  ],
  className = "",
}) {
  const activePreset = value.preset || "7d";
  const custom = activePreset === "custom";

  const selectPreset = (preset) => {
    if (preset === "custom") {
      onChange?.({ ...value, preset });
      return;
    }
    onChange?.(getPresetRange(preset));
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <CalendarDays className="ml-2 h-4 w-4 text-slate-400" />
        {presets.map((preset) => (
          <button
            key={preset.value}
            type="button"
            className={cn(
              "rounded-md px-2.5 py-1.5 text-xs font-extrabold transition",
              activePreset === preset.value
                ? "bg-primary-600 text-white"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900",
            )}
            onClick={() => selectPreset(preset.value)}
          >
            {preset.label}
          </button>
        ))}
      </div>
      {custom ? (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={value.startDate || ""}
            onChange={(event) => onChange?.({ ...value, startDate: event.target.value, preset: "custom" })}
            className="h-10 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            aria-label="Start date"
          />
          <input
            type="date"
            value={value.endDate || ""}
            onChange={(event) => onChange?.({ ...value, endDate: event.target.value, preset: "custom" })}
            className="h-10 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            aria-label="End date"
          />
        </div>
      ) : null}
    </div>
  );
}

export function FilterBar({
  searchValue = "",
  onSearchChange,
  statusOptions = [],
  statusValue,
  onStatusChange,
  dateRange,
  onDateRangeChange,
  extraFilters,
  className = "",
}) {
  return (
    <div className={cn("grid gap-3 lg:grid-cols-[minmax(220px,1fr)_auto_auto] lg:items-end", className)}>
      <Input
        label="Search"
        value={searchValue}
        onChange={(event) => onSearchChange?.(event.target.value)}
        placeholder="Search by name, ID, phone"
        prefix={<Search className="h-4 w-4" />}
        clearable
      />
      {statusOptions.length ? (
        <Select
          label="Status"
          options={statusOptions}
          value={statusValue}
          onChange={onStatusChange}
          placeholder="All status"
        />
      ) : null}
      {onDateRangeChange ? <DateRangePicker value={dateRange} onChange={onDateRangeChange} /> : null}
      {extraFilters ? <div className="lg:col-span-full">{extraFilters}</div> : null}
    </div>
  );
}

export function Tabs({ tabs = [], value, onChange, className = "" }) {
  return (
    <div className={cn("flex gap-2 overflow-x-auto border-b border-slate-200 dark:border-slate-800", className)} role="tablist">
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm font-extrabold transition",
              active
                ? "border-primary-600 text-primary-700 dark:text-primary-300"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-100",
            )}
            onClick={() => onChange?.(tab.value, tab)}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
