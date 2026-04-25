import React, { useEffect, useState, useMemo } from "react";
import {
  FiCreditCard, FiActivity, FiDollarSign, FiArrowLeft, FiChevronRight,
} from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchPostpaidBalance,
  fetchPostpaidTransactions,
  fetchPreviousCycles,
  fetchCycleTransactions,
} from "../../Redux/Actions/postpaidThunks";
import { clearCycleTransactions } from "../../Redux/Slice/postpaidSlice";
import { Pagination } from "./Shared/Pagination";

/* ─── constants ──────────────────────────────────────────── */
const C = {
  primary: "#0A4D68",
  secondary: "#088395",
  light: "#F8FAFC",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
};

const fmt = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }) : "—";

const fmtAmt = (n) =>
  Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* statement-id helpers (mirrors server logic for current cycle display) */
function mkStatementId(corporateId, cycleIndex) {
  const s = String(corporateId || "").slice(-8).toUpperCase();
  return `STMT${s}C${String(cycleIndex).padStart(3, "0")}`;
}
function mkTrackId(corporateId, cycleIndex) {
  const s = String(corporateId || "").slice(-4).toUpperCase();
  return `TRK${s}${String(cycleIndex).padStart(4, "0")}`;
}

/* ─── CONSTANTS ─────────────────────────────────────────── */
const DRILL_PAGE_SIZE = 10;

const STMT_COLS = [
  "Row", "Statement ID", "Statement Period",
  "Statement Date", "Due Date", "Delay Days", "Amount (₹)",
];

const TX_COLS = [
  "Statement No.", "Gen. Date", "Document No.", "Doc Type",
  "Invoice Date", "Product Type", "Booking Date", "Booking Ref",
  "Txn Type", "Amount (₹)", "Status",
];

/* ══════════════════════════════════════════════════════════ */
export default function CreditUtilizationPostpaid() {
  const dispatch = useDispatch();

  /* tab: "current" | "previous" */
  const [activeTab, setActiveTab] = useState("current");

  /* drill-down state (shared across both tabs) */
  const [drillCycle, setDrillCycle] = useState(null);
  // { cycleIndex, statementId, trackId, periodStart, periodEnd, isCurrent }

  /* frontend-only drill-down page */
  const [drillPage, setDrillPage] = useState(1);

  const {
    balance, loadingBalance,
    transactions, pagination, loadingTransactions,
    previousCycles, loadingCycles,
    cycleTransactions, cycleTransactionsMeta, loadingCycleTransactions,
  } = useSelector((s) => s.postpaid);

  /* ── Derived values ──────────────────────────────────────── */
  const daysRemaining = useMemo(() => {
    if (!balance?.currentCycleEnd) return null;
    return Math.max(0, Math.ceil(
      (new Date(balance.currentCycleEnd).getTime() - Date.now()) / 86400000
    ));
  }, [balance]);

  const pct = balance
    ? Math.min(100, ((balance.usedCredit || 0) / (balance.totalLimit || 1)) * 100)
    : 0;
  const pctColor = pct > 85 ? C.danger : pct > 60 ? C.warning : C.success;

  /* Current cycle as a "statement row" for display */
  const currentCycleRow = useMemo(() => {
    if (!balance) return null;
    const corpId = balance._id || "unknown";
    // We don't know cycleIndex from balance directly; use a sentinel "current"
    const stmtDate = balance.currentCycleEnd
      ? new Date(new Date(balance.currentCycleEnd).getTime() + 86400000)
      : null;
    const dueDate = stmtDate
      ? new Date(stmtDate.getTime() + 8 * 86400000)
      : null;
    const delayDays = dueDate && new Date() > dueDate
      ? Math.floor((Date.now() - dueDate.getTime()) / 86400000)
      : 0;
    return {
      rowNum: 1,
      cycleIndex: "current",
      statementId: "CURRENT CYCLE",
      trackId: "—",
      periodStart: balance.currentCycleStart,
      periodEnd: balance.currentCycleEnd,
      statementDate: stmtDate,
      dueDate,
      delayDays,
      statementAmount: balance.usedCredit || 0,
      isCurrent: true,
    };
  }, [balance]);

  /* ── Effects ─────────────────────────────────────────────── */
  useEffect(() => { dispatch(fetchPostpaidBalance()); }, [dispatch]);

  /* Fetch previous cycles when switching to that tab */
  useEffect(() => {
    if (activeTab === "previous" && !drillCycle) dispatch(fetchPreviousCycles());
  }, [dispatch, activeTab, drillCycle]);

  /* Current-cycle drill-down: fetch ALL in one shot (frontend paginates) */
  useEffect(() => {
    if (!drillCycle?.isCurrent) return;
    const params = {
      startDate: balance?.currentCycleStart
        ? new Date(balance.currentCycleStart).toISOString().split("T")[0]
        : undefined,
      endDate: balance?.currentCycleEnd
        ? new Date(balance.currentCycleEnd).toISOString().split("T")[0]
        : undefined,
      page: 1,
      limit: 500, // fetch all — pagination is done on frontend
    };
    dispatch(fetchPostpaidTransactions(params));
  }, [dispatch, drillCycle, balance]);

  /* Past-cycle drill-down */
  useEffect(() => {
    if (!drillCycle || drillCycle.isCurrent) return;
    dispatch(fetchCycleTransactions({ cycleIndex: drillCycle.cycleIndex }));
  }, [dispatch, drillCycle]);

  /* ── Handlers ────────────────────────────────────────────── */
  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setDrillCycle(null);
    dispatch(clearCycleTransactions());
  };

  const handleBack = () => {
    setDrillCycle(null);
    setDrillPage(1);
    dispatch(clearCycleTransactions());
  };

  const openDrillDown = (row) => {
    setDrillCycle(row);
    setDrillPage(1);
  };

  /* All transactions for the open drill-down */
  const drillTx = drillCycle?.isCurrent ? (transactions || []) : (cycleTransactions || []);
  const drillLoading = drillCycle?.isCurrent ? loadingTransactions : loadingCycleTransactions;
  const drillStmtId = drillCycle?.statementId;

  /* Client-side page slice */
  const paginatedDrillTx = useMemo(() => {
    const start = (drillPage - 1) * DRILL_PAGE_SIZE;
    return drillTx.slice(start, start + DRILL_PAGE_SIZE);
  }, [drillTx, drillPage]);

  /* ── Render ──────────────────────────────────────────────── */
  return (
    <div className="min-h-screen p-6 font-sans" style={{ backgroundColor: C.light }}>
      <div className="max-w-7xl mx-auto space-y-5">

        {/* ── PAGE HEADER ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shadow text-white"
              style={{ background: `linear-gradient(135deg,${C.primary},${C.secondary})` }}
            >
              <FiCreditCard size={22} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">
                Credit Utilization (Postpaid)
              </h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                Monitor corporate credit usage
              </p>
            </div>
          </div>

          {!loadingBalance && balance && (
            <div className="flex items-center gap-4">
              <div className="border-r border-slate-200 pr-4 text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Current Cycle</p>
                <p className="text-xs font-bold text-slate-700">
                  {fmt(balance.currentCycleStart)} → {fmt(balance.currentCycleEnd)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Resets In</p>
                <p className="text-sm font-black flex items-center gap-1" style={{ color: C.primary }}>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                  {daysRemaining} Days
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── STAT CARDS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Credit Limit"    value={loadingBalance ? "…" : `₹${fmtAmt(balance?.totalLimit)}`}              Icon={FaRupeeSign}   color={C.primary}   />
          <StatCard label="Used Credit"     value={loadingBalance ? "…" : `₹${fmtAmt(balance?.usedCredit)}`}              Icon={FiActivity}    color={C.warning}   />
          <StatCard
            label={balance?.availableCredit < 0 ? "Over Limit" : "Available"}
            value={loadingBalance ? "…" : `₹${fmtAmt(Math.abs(balance?.availableCredit))}`}
            Icon={FiDollarSign}
            color={balance?.availableCredit < 0 ? C.danger : C.success}
          />
          <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 flex flex-col justify-between" style={{ borderColor: C.secondary }}>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Utilization</p>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: pctColor }} />
            </div>
            <p className="text-lg font-black mt-1" style={{ color: pctColor }}>{pct.toFixed(1)}%</p>
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="flex gap-1 bg-white border border-slate-100 rounded-xl p-1 shadow-sm w-fit">
          {[["current", "Current Cycle"], ["previous", "Previous Cycles"]].map(([k, lbl]) => (
            <button
              key={k}
              onClick={() => handleTabSwitch(k)}
              className="px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all"
              style={{
                background: activeTab === k ? C.primary : "transparent",
                color: activeTab === k ? "#fff" : "#94a3b8",
              }}
            >
              {lbl}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════
            DRILL-DOWN VIEW  (shared for both tabs)
        ══════════════════════════════════════════════════ */}
        {drillCycle && (
          <div className="space-y-4">
            {/* Back bar */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase border border-slate-200 hover:bg-slate-100 transition-colors text-slate-600"
              >
                <FiArrowLeft size={13} />
                Back to {activeTab === "current" ? "Current Cycle" : "Statements"}
              </button>
              <div className="bg-white border border-slate-100 rounded-lg px-4 py-2 text-xs flex items-center gap-2 flex-wrap">
                <span className="text-slate-400 font-bold uppercase tracking-widest">Statement:</span>
                <span className="font-black" style={{ color: C.primary }}>{drillStmtId}</span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-500">
                  {fmt(drillCycle.periodStart)} – {fmt(drillCycle.periodEnd)}
                </span>
              </div>
            </div>

            {/* Transactions table */}
            <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
              <TableHeader title={`Transactions — ${drillStmtId}`} count={drillTx.length} />
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr style={{ backgroundColor: C.primary }} className="text-white">
                      {TX_COLS.map((h) => (
                        <th key={h} className="px-3 py-3 font-bold uppercase tracking-widest whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {drillLoading ? (
                      <tr><td colSpan={TX_COLS.length} className="py-10 text-center text-slate-400">Loading…</td></tr>
                    ) : drillTx.length === 0 ? (
                      <tr><td colSpan={TX_COLS.length} className="py-10 text-center text-slate-400">No transactions for this cycle.</td></tr>
                    ) : paginatedDrillTx.map((t, i) => (
                      <tr
                        key={t._id}
                        className="hover:bg-blue-50/40 transition-colors"
                        style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#f8fafc" }}
                      >
                        <td className="px-3 py-2.5 font-mono text-[10px] font-bold" style={{ color: C.secondary }}>
                          {String(t._id)}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">{fmt(t.createdAt)}</td>
                        <td className="px-3 py-2.5 font-mono text-slate-700">{t.bookingReference || "—"}</td>
                        <td className="px-3 py-2.5 text-slate-600">
                          {t.type === "booking" ? "Sales Invoice" : t.type || "—"}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">{fmt(t.bookingDate || t.createdAt)}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">
                          {t.metadata?.bookingType
                            ? t.metadata.bookingType.charAt(0).toUpperCase() + t.metadata.bookingType.slice(1)
                            : t.metadata?.productType
                            ? t.metadata.productType
                            : t.metadata?.serviceType
                            ? t.metadata.serviceType
                            : t.type === "booking"
                            ? "Air - Domestic"
                            : "—"}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">{fmt(t.travelDate || t.bookingDate)}</td>
                        <td className="px-3 py-2.5 font-mono text-slate-700">{t.bookingReference || t.paymentReference || "—"}</td>
                        <td className="px-3 py-2.5 capitalize text-slate-600">
                          {t.transactionType || (t.type === "booking" ? "debit" : "credit")}
                        </td>
                        <td
                          className="px-3 py-2.5 font-black"
                          style={{
                            color: (t.transactionType === "debit" || (!t.transactionType && t.type === "booking")) ? C.danger : C.success
                          }}
                        >
                          {(t.transactionType === "debit" || (!t.transactionType && t.type === "booking")) ? "-" : "+"}₹{fmtAmt(t.amount)}
                        </td>
                        <td className="px-3 py-2.5"><StatusBadge status={t.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer: count + net total + frontend pagination */}
              <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {drillTx.length} transaction(s)
                </span>
                <span className="text-xs font-black text-slate-700">
                  Net: ₹{fmtAmt(
                    drillTx.filter(t => t.transactionType === "debit" || (!t.transactionType && t.type === "booking")).reduce((s, t) => s + (t.amount || 0), 0) -
                    drillTx.filter(t => t.transactionType === "credit" || (!t.transactionType && ["payment", "topup", "refund"].includes(t.type))).reduce((s, t) => s + (t.amount || 0), 0)
                  )}
                </span>
                <Pagination
                  currentPage={drillPage}
                  totalItems={drillTx.length}
                  pageSize={DRILL_PAGE_SIZE}
                  onPageChange={setDrillPage}
                />
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            STATEMENT LIST — CURRENT CYCLE  (no drill-down active)
        ══════════════════════════════════════════════════ */}
        {!drillCycle && activeTab === "current" && (
          <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
            <TableHeader title="Current Billing Cycle" count={currentCycleRow ? 1 : 0} />
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr style={{ backgroundColor: C.primary }} className="text-white">
                    {STMT_COLS.map((h) => (
                      <th key={h} className="px-4 py-3 font-bold uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingBalance ? (
                    <tr><td colSpan={STMT_COLS.length} className="py-10 text-center text-slate-400">Loading…</td></tr>
                  ) : !currentCycleRow ? (
                    <tr><td colSpan={STMT_COLS.length} className="py-10 text-center text-slate-400">No data available.</td></tr>
                  ) : (
                    <StatementRow row={currentCycleRow} onClick={() => openDrillDown(currentCycleRow)} />
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            STATEMENT LIST — PREVIOUS CYCLES  (no drill-down active)
        ══════════════════════════════════════════════════ */}
        {!drillCycle && activeTab === "previous" && (
          <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
            <TableHeader title="Previous Billing Cycle Statements" count={previousCycles.length} />
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr style={{ backgroundColor: C.primary }} className="text-white">
                    {STMT_COLS.map((h) => (
                      <th key={h} className="px-4 py-3 font-bold uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingCycles ? (
                    <tr><td colSpan={STMT_COLS.length} className="py-10 text-center text-slate-400">Loading statements…</td></tr>
                  ) : previousCycles.length === 0 ? (
                    <tr><td colSpan={STMT_COLS.length} className="py-10 text-center text-slate-400">No previous cycles found.</td></tr>
                  ) : previousCycles.map((c) => (
                    <StatementRow key={c.cycleIndex} row={c} onClick={() => openDrillDown(c)} />
                  ))}
                </tbody>
                {/* ── TOTAL ROW ── */}
                {!loadingCycles && previousCycles.length > 0 && (
                  <tfoot>
                    <tr style={{ backgroundColor: "#F1F5F9" }} className="border-t-2 border-slate-200">
                      <td colSpan={STMT_COLS.length - 1} className="px-4 py-3 font-black text-slate-700 uppercase tracking-widest text-[10px] text-right">
                        Total ({previousCycles.length} cycle{previousCycles.length > 1 ? "s" : ""})
                      </td>
                      <td className="px-4 py-3 font-black text-slate-900 text-sm">
                        ₹{fmtAmt(previousCycles.reduce((sum, c) => sum + (c.statementAmount || 0), 0))}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   SHARED STATEMENT ROW
══════════════════════════════════════════════════════════ */
function StatementRow({ row, onClick }) {
  return (
    <tr
      onClick={onClick}
      className="hover:bg-blue-50 cursor-pointer transition-colors"
    >
      <td className="px-4 py-3 font-mono text-slate-500">{row.rowNum}</td>
      <td className="px-4 py-3">
        <span className="font-bold flex items-center gap-1" style={{ color: "#088395" }}>
          {row.statementId} <FiChevronRight size={12} />
        </span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-slate-700">
        {fmt(row.periodStart)} – {fmt(row.periodEnd)}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-slate-700">{fmt(row.statementDate)}</td>
      <td className="px-4 py-3 whitespace-nowrap text-slate-700">{fmt(row.dueDate)}</td>
      <td className="px-4 py-3 text-center">
        <span
          className="px-2 py-0.5 rounded-full font-bold text-[10px]"
          style={{
            backgroundColor: row.delayDays > 0 ? "#FEF2F2" : "#F0FDF4",
            color: row.delayDays > 0 ? "#DC2626" : "#16A34A",
          }}
        >
          {row.delayDays}
        </span>
      </td>
      <td className="px-4 py-3 font-black text-slate-900">{fmtAmt(row.statementAmount)}</td>
    </tr>
  );
}

/* ── HELPER COMPONENTS ─────────────────────────────────── */
function StatCard({ label, value, Icon, color }) {
  return (
    <div className="bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm border-l-4" style={{ borderColor: color }}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: color + "20" }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
        <p className="text-lg font-black text-slate-900 leading-none">{value}</p>
      </div>
    </div>
  );
}

function TableHeader({ title, count }) {
  return (
    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/60">
      <h2 className="font-black text-slate-700 uppercase tracking-tight text-sm">{title}</h2>
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{count} record(s)</span>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    paid:      { bg: "#ECFDF5", text: "#065F46", label: "Paid" },
    billed:    { bg: "#ECFEFF", text: "#155E75", label: "Billed" },
    pending:   { bg: "#FFFBEB", text: "#92400E", label: "Pending" },
    failed:    { bg: "#FFF1F2", text: "#9F1239", label: "Failed" },
    cancelled: { bg: "#F1F5F9", text: "#475569", label: "Cancelled" },
  };
  const s = map[status] || map.pending;
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  );
}