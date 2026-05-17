import EmptyStatePanel from "./EmptyStatePanel";
import { cx, uiTokens } from "./designTokens";

export default function DataTable({
  columns = [],
  rows = [],
  getRowKey = (row, index) => row?._id || row?.id || index,
  emptyTitle = "No records found",
  emptyDescription,
  className = "",
}) {
  if (!rows.length) {
    return (
      <EmptyStatePanel
        title={emptyTitle}
        description={emptyDescription}
        className={className}
      />
    );
  }

  return (
    <div className={cx("overflow-x-auto", className)}>
      <table className={uiTokens.table}>
        <thead className={uiTokens.tableHead}>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key || column.header}
                className={cx("px-4 py-3", column.align === "right" && "text-right")}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((row, index) => (
            <tr key={getRowKey(row, index)} className={uiTokens.tableRow}>
              {columns.map((column) => (
                <td
                  key={column.key || column.header}
                  className={cx("px-4 py-3 align-middle", column.align === "right" && "text-right")}
                >
                  {column.render ? column.render(row, index) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
