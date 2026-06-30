// client/src/components/Shared/AppTable.jsx
// Reusable premium table — fully responsive via ResponsiveDataTable
// Design tokens mirror GrowingBusiness.jsx

import React from "react";
import ResponsiveDataTable from "../CorporateManagerTabs/Shared/ResponsiveDataTable";

/* ─────────────────────────────────────────────
   DESIGN TOKENS  (mirrors GrowingBusiness.jsx)
───────────────────────────────────────────── */
export const TOKENS = {
  BRAND_DARK: "#000D26",
  BRAND_NAVY: "#0A4D68",
  BRAND_TEAL: "#088395",
  BRAND_GOLD: "#C9A84C",
};

/* ─────────────────────────────────────────────
   STATUS BADGE
───────────────────────────────────────────── */
const STATUS_MAP = {
  ticketed:          { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500", label: "Ticketed" },
  ticket_pending:    { bg: "bg-amber-100",   text: "text-amber-700",   dot: "bg-amber-400",   label: "Processing" },
  voucher_generated: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500", label: "Confirmed" },
  confirmed:         { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500", label: "Confirmed" },
  booked:            { bg: "bg-blue-100",    text: "text-blue-700",    dot: "bg-blue-500",    label: "Booked" },
  failed:            { bg: "bg-red-100",     text: "text-red-600",     dot: "bg-red-500",     label: "Failed" },
  cancelled:         { bg: "bg-red-100",     text: "text-red-600",     dot: "bg-red-500",     label: "Cancelled" },
  cancel_requested:  { bg: "bg-orange-100",  text: "text-orange-700",  dot: "bg-orange-400",  label: "Cancel Req." },
  pending_approval:  { bg: "bg-slate-100",   text: "text-slate-500",   dot: "bg-slate-400",   label: "Pending" },
  approved:          { bg: "bg-sky-100",     text: "text-sky-700",     dot: "bg-sky-500",     label: "Approved" },
};

export function StatusBadge({ status }) {
  const s = STATUS_MAP[(status || "").toLowerCase()] || {
    bg: "bg-slate-100", text: "text-slate-500", dot: "bg-slate-400", label: status || "Unknown",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
      {s.label}
    </span>
  );
}

/* ─────────────────────────────────────────────
   SKELETON ROW
───────────────────────────────────────────── */
function SkeletonRow({ colCount }) {
  return (
    <tr className="animate-pulse border-b border-slate-100">
      {Array.from({ length: colCount }).map((_, i) => (
        <td key={i} className="px-5 py-4">
          <div className="h-3.5 bg-slate-200 rounded-lg w-3/4" />
        </td>
      ))}
    </tr>
  );
}

/* ─────────────────────────────────────────────
   EMPTY STATE
───────────────────────────────────────────── */
function EmptyState({ icon, message, action }) {
  return (
    <tr>
      <td colSpan={100}>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: `${TOKENS.BRAND_NAVY}12` }}
          >
            <span style={{ color: `${TOKENS.BRAND_NAVY}55` }}>{icon}</span>
          </div>
          <p className="text-slate-400 font-semibold text-sm">{message}</p>
          {action && action}
        </div>
      </td>
    </tr>
  );
}

/* ─────────────────────────────────────────────
   AppTable
   Props
   ─────
   columns       [{ key, label, render?, className?, headerClassName? }]
   data          array of row objects
   loading       boolean
   empty         { icon, message, action? }
   rowKey        (row) => string
   onRowClick    (row) => void   (optional)
   stickyHeader  boolean         (default true)
   tableMinWidth string          (default "750px")
   title         string          toolbar title
   subtitle      string          toolbar subtitle
   toolbarRight  ReactNode       extra toolbar content
   onExport      () => void      shows Export button when provided
   caption       string          sr-only <caption>
───────────────────────────────────────────── */
export default function AppTable({
  columns = [],
  data = [],
  loading = false,
  empty = { icon: null, message: "No data found" },
  rowKey = (row) => row._id ?? row.id,
  onRowClick,
  stickyHeader = true,
  tableMinWidth = "750px",
  title,
  subtitle,
  toolbarRight,
  onExport,
  caption,
  pagination,
}) {
  const SKELETON_COUNT = 6;

  return (
    <ResponsiveDataTable
      title={title}
      subtitle={subtitle}
      toolbarRight={toolbarRight}
      onExport={onExport}
      tableMinWidth={tableMinWidth}
      showToolbar={true}
      exportBgClass="bg-[#0A4D68] hover:bg-[#083d52]"
      arrowBgClass="bg-slate-50 border-slate-200 text-slate-600 hover:bg-[#0A4D68]/10 hover:border-[#0A4D68]/30 hover:text-[#0A4D68]"
      wrapperClass="border border-slate-200 shadow-sm rounded-2xl overflow-hidden"
      pagination={pagination}
    >
      <table className="w-full border-collapse text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}

        {/* ── THEAD ── */}
        <thead
          className={stickyHeader ? "sticky top-0 z-10" : ""}
          style={{ background: TOKENS.BRAND_DARK }}
        >
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`px-5 py-4 text-left text-[10px] font-bold uppercase tracking-[0.15em] whitespace-nowrap select-none ${col.headerClassName || ""}`}
                style={{ color: "rgba(255,255,255,0.55)" }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>

        {/* ── TBODY ── */}
        <tbody className="divide-y divide-slate-100 bg-white">
          {/* Loading */}
          {loading &&
            Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <SkeletonRow key={i} colCount={columns.length} />
            ))}

          {/* Empty */}
          {!loading && data.length === 0 && (
            <EmptyState icon={empty.icon} message={empty.message} action={empty.action} />
          )}

          {/* Rows */}
          {!loading &&
            data.map((row, rowIdx) => (
              <tr
                key={rowKey(row) ?? rowIdx}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`transition-colors duration-150 ${
                  onRowClick
                    ? "cursor-pointer hover:bg-[#0A4D68]/[0.04]"
                    : "hover:bg-slate-50/70"
                }`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-5 py-4 text-slate-700 align-middle whitespace-nowrap ${col.className || ""}`}
                  >
                    {col.render
                      ? col.render(row[col.key], row, rowIdx)
                      : (row[col.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </ResponsiveDataTable>
  );
}
