import React, { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiEye,
  FiRefreshCw,
  FiRepeat,
  FiXCircle,
} from "react-icons/fi";
import axios from "axios";
import ResponsiveDataTable from "./Shared/ResponsiveDataTable";

import { updateReissueStatus } from "../../Redux/Actions/reissueThunks";
import {
  getRequestId,
  getPnr,
  getUserName,
  getUserEmail,
  getJourneyType,
  getAirline,
  getTotalFare,
  getCurrency,
  getRoute,
  getTicketUrl,
  getStatus,
  getRequestedDate,
  getFareDifference,
  getSegments,
  getStatusTone,
  extractRequestArray,
} from "../../utils/reissueResolvers";
import { IdCell, Th } from "./Shared/CommonComponents";
import { Pagination } from "./Shared/Pagination";
import useExcelExporter from "../../hooks/export/useExcelExporter";
import { adminReissueRequestsExportTemplate } from "../../templates/exportTemplates/clientExportTemplates";

/* ─────────────────────────────────────────────────────────────────
   STATUS BADGE
   ───────────────────────────────────────────────────────────────── */
const StatusBadge = ({ req }) => {
  const status = getStatus(req);
  const tone = getStatusTone(status);
  const icons = {
    PENDING: <FiClock size={11} />,
    APPROVED: <FiCheckCircle size={11} />,
    COMPLETED: <FiCheckCircle size={11} />,
    REJECTED: <FiXCircle size={11} />,
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${tone}`}
    >
      {icons[status] || null}
      {status || "—"}
    </span>
  );
};

/* ─────────────────────────────────────────────────────────────────
   TICKET ACTIONS
   ───────────────────────────────────────────────────────────────── */
const TicketActions = ({ req }) => {
  const downloadUrl = getTicketUrl(req);
  const status = getStatus(req);

  if (!downloadUrl && !["COMPLETED", "TICKET_GENERATED"].includes(status)) {
    return (
      <span className="text-[10px] font-bold text-slate-400 italic">
        Ticket Pending
      </span>
    );
  }

  if (!downloadUrl) {
    return (
      <span className="text-[10px] font-bold text-slate-400 italic">
        Processing
      </span>
    );
  }

  const handleDownload = async () => {
    try {
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `reissue-${getRequestId(req)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Failed to download ticket:", error);
      window.open(downloadUrl, "_blank");
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => window.open(downloadUrl, "_blank")}
        className="inline-flex items-center gap-1 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:text-[#0A4D68] transition"
        title="View"
      >
        <FiEye size={11} /> View
      </button>
      <button
        onClick={handleDownload}
        className="inline-flex items-center gap-1 px-2 py-1.5 bg-[#0A4D68] text-white rounded-lg text-[10px] font-bold hover:bg-[#08394d] transition"
        title="Download"
      >
        <FiDownload size={11} /> DL
      </button>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────
   MAIN — Travel Admin view of all company reissue requests
   ───────────────────────────────────────────────────────────────── */
export default function ReissueRequests() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedReq, setSelectedReq] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("token");
      let corporateId = null;
      if (token) {
        const d = require("jwt-decode").jwtDecode(token);
        corporateId = d.corporateId;
      }

      // Safe fetchers that return [] on 403 or error
      const fetchSafe = async (url, params) => {
        try {
          const res = await axios.get(url, { params });
          return extractRequestArray(res);
        } catch (e) {
          return [];
        }
      };

      const [companyRequests, legacyRequests] = await Promise.all([
        fetchSafe("/api/v1/reissue/company", { corporateId, limit: 100 }),
        fetchSafe("/api/v1/flights/reissue/list", {
          companyId: corporateId,
          limit: 100,
        }), // Legacy fallback
      ]);

      const merged = [...companyRequests, ...legacyRequests];

      // Deduplicate by ID
      const uniqueMap = new Map();
      merged.forEach((r) => {
        const uid = r.requestId || r.id || r._id;
        if (uid && !uniqueMap.has(uid)) uniqueMap.set(uid, r);
      });

      setRequests(
        Array.from(uniqueMap.values()).sort(
          (a, b) =>
            new Date(getRequestedDate(b)) - new Date(getRequestedDate(a)),
        ),
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  const handleStatusUpdate = async (requestId, newStatus) => {
    const message = prompt(`Reason for ${newStatus} (optional):`) ?? "";
    if (message === null) return;
    try {
      await dispatch(
        updateReissueStatus({ requestId, status: newStatus, message }),
      ).unwrap();
      toast.success(`Request ${newStatus} successfully`);
      load();
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to update status");
    }
  };

  /* Stat counts */
  const stats = useMemo(
    () => ({
      total: requests.length,
      pending: requests.filter((r) => getStatus(r) === "PENDING").length,
      approved: requests.filter((r) =>
        ["APPROVED", "COMPLETED", "TICKET_GENERATED", "IN_PROGRESS"].includes(
          getStatus(r),
        ),
      ).length,
      rejected: requests.filter((r) => getStatus(r) === "REJECTED").length,
    }),
    [requests],
  );

  /* Client-side search filter */
  const filtered = useMemo(() => {
    let result = requests;
    if (statusFilter !== "All") {
      // Allow mapping multiple valid statuses for APPROVED queue filtering if necessary
      if (statusFilter === "APPROVED") {
        result = result.filter((r) =>
          [
            "APPROVED",
            "COMPLETED",
            "TICKET_GENERATED",
            "IN_PROGRESS",
            "ASSIGNED",
          ].includes(getStatus(r)),
        );
      } else {
        result = result.filter((r) => getStatus(r) === statusFilter);
      }
    }

    const t = search.trim().toLowerCase();
    if (!t) return result;
    return result.filter((r) => {
      const empName = getUserName(r).toLowerCase();
      const pnr = getPnr(r).toLowerCase();
      const ref = (
        r?.metadata?.orderId ||
        r?.bookingReference ||
        r?.orderId ||
        r?.bookingRef ||
        ""
      ).toLowerCase();
      const reason = (r.reason || r.remarks || "").toLowerCase();
      const id = getRequestId(r).toLowerCase();
      return [empName, pnr, ref, reason, id].some((v) => v.includes(t));
    });
  }, [requests, search, statusFilter]);

  const PAGE_SIZE = 10;
  const paginated = useMemo(() => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [filtered, currentPage]);

  const { exportExcel, isExporting } = useExcelExporter();

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-[#0A4D68]/10 text-[#0A4D68] flex items-center justify-center shrink-0">
              <FiRepeat className="w-4 h-4 md:w-5 md:h-5" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-black text-slate-900">
                Reissue Requests
              </h2>
              <p className="text-[10px] md:text-xs text-slate-400">
                Flight amendment and date-change requests
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => load()}
              className="flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 w-full md:w-auto justify-center"
            >
              <FiRefreshCw
                size={12}
                className={loading ? "animate-spin" : ""}
              />{" "}
              Refresh
            </button>
          </div>
        </div>

        {/* Stat pills */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: "Total",
              value: stats.total,
              color: "bg-[#0A4D68]/10 text-[#0A4D68]",
            },
            {
              label: "Pending",
              value: stats.pending,
              color: "bg-amber-50 text-amber-700",
            },
            {
              label: "Approved",
              value: stats.approved,
              color: "bg-emerald-50 text-emerald-700",
            },
            {
              label: "Rejected",
              value: stats.rejected,
              color: "bg-rose-50 text-rose-700",
            },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center gap-3"
            >
              <span
                className={`h-10 w-10 rounded-xl flex items-center justify-center text-lg font-black ${color}`}
              >
                {value}
              </span>
              <span className="text-[13px] font-bold text-slate-600">
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col md:flex-row gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by employee, PNR, booking ref, reason, or request ID…"
            className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-200 text-sm outline-none focus:border-[#0A4D68] bg-white"
          />
          <div className="flex gap-2 flex-nowrap overflow-x-auto pb-1 max-w-full">
            {["All", "PENDING", "APPROVED", "REJECTED", "COMPLETED"].map(
              (s) => (
                <button
                  key={s}
                  onClick={() => {
                    setStatusFilter(s);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-2 rounded-xl text-[10px] md:text-[11px] font-black uppercase tracking-wider border transition whitespace-nowrap shrink-0 ${statusFilter === s ? "bg-[#0A4D68] text-white border-[#0A4D68]" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}
                >
                  {s}
                </button>
              ),
            )}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="py-20 text-center bg-white rounded-2xl shadow-sm border border-slate-200">
            <FiRefreshCw
              size={32}
              className="mx-auto text-[#0A4D68] animate-spin opacity-30"
            />
            <p className="text-sm font-bold text-slate-400 mt-4">Loading...</p>
          </div>
        ) : !filtered.length ? (
          <div className="py-20 text-center bg-white rounded-2xl shadow-sm border border-slate-200">
            <FiRepeat size={40} className="mx-auto text-slate-200 mb-3" />
            <p className="text-sm font-bold text-slate-400">
              No reissue requests found
            </p>
          </div>
        ) : (
          <ResponsiveDataTable
            exportLabel="Export Excel"
            exportLoading={isExporting}
            exportDisabled={isExporting}
            onExport={() => exportExcel({
              pageHeader: "Reissue Requests",
              statCards: [
                { label: "Total", value: stats.total },
                { label: "Pending", value: stats.pending },
                { label: "Approved", value: stats.approved },
                { label: "Rejected", value: stats.rejected }
              ],
              appliedFilters: [
                { label: "Search", value: search || "None" },
                { label: "Status", value: statusFilter }
              ],
              data: filtered,
              columns: adminReissueRequestsExportTemplate,
              filenamePrefix: "reissue_requests"
            })}
            wrapperClass="!border-none !shadow-none"
            pagination={<Pagination currentPage={currentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />}
          >
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-[#dac448] text-slate-900 border-b border-slate-200">
                    <th className="px-4 py-3.5 text-left text-[10px] font-black uppercase tracking-widest">
                      Request ID
                    </th>
                    <th className="px-4 py-3.5 text-left text-[10px] font-black uppercase tracking-widest">
                      Employee
                    </th>
                    <th className="px-4 py-3.5 text-left text-[10px] font-black uppercase tracking-widest">
                      PNR / Ref
                    </th>
                    <th className="px-4 py-3.5 text-left text-[10px] font-black uppercase tracking-widest">
                      Route
                    </th>
                    <th className="px-4 py-3.5 text-left text-[10px] font-black uppercase tracking-widest">
                      Type & Reason
                    </th>
                    <th className="px-4 py-3.5 text-left text-[10px] font-black uppercase tracking-widest">
                      Status
                    </th>
                    <th className="px-4 py-3.5 text-left text-[10px] font-black uppercase tracking-widest">
                      Ticket
                    </th>
                    <th className="px-4 py-3.5 text-right text-[10px] font-black uppercase tracking-widest">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginated.map((r, i) => {
                    const requestId = getRequestId(r);
                    const userName = getUserName(r);
                    const userEmail = getUserEmail(r);
                    const pnr = getPnr(r);
                    const route = getRoute(r);
                    const requestedAt = getRequestedDate(r);
                    const status = getStatus(r);
                    const bookingRef =
                      r?.metadata?.orderId ||
                      r?.bookingReference ||
                      r?.orderId ||
                      r?.bookingRef ||
                      "N/A";
                    return (
                      <tr
                        key={requestId}
                        className={`hover:bg-sky-50/40 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-slate-50/30"}`}
                      >
                        <td className="px-4 py-4">
                          <p className="font-mono text-[12px] font-bold text-slate-800">
                            {requestId}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            {requestedAt}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0A4D68] to-[#088395] text-white flex items-center justify-center text-[11px] font-black shrink-0 shadow-sm">
                              {userName?.[0]?.toUpperCase() || "?"}
                            </div>
                            <div>
                              <p className="font-bold text-[13px] text-slate-800 leading-tight">
                                {userName}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                {userEmail}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-black text-sm text-slate-900 uppercase tracking-wide">
                            {pnr}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {bookingRef}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-[13px] font-bold text-slate-700">
                            {route}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-black uppercase tracking-wider">
                            {r.reissueType || r.type || "REISSUE"}
                          </span>
                          <p
                            className="text-[11px] text-slate-500 mt-1.5 italic line-clamp-1 max-w-[200px]"
                            title={r.reason || r.remarks || "N/A"}
                          >
                            &ldquo;{r.reason || r.remarks || "N/A"}&rdquo;
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge req={r} />
                        </td>
                        <td className="px-4 py-4">
                          <TicketActions req={r} />
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => navigate(`/my-reissue/${r._id || r.id}`)}
                              className="p-2 text-slate-400 hover:text-[#0A4D68] hover:bg-[#0A4D68]/5 transition-all rounded-lg"
                              title="View Details"
                            >
                              <FiEye size={16} />
                            </button>
                            {status === "PENDING" && (
                              <>
                                <button
                                  onClick={() =>
                                    handleStatusUpdate(
                                      r._id || r.id || r.requestId,
                                      "APPROVED",
                                    )
                                  }
                                  className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all rounded-lg text-[11px] font-black tracking-wide border border-emerald-100 hover:border-emerald-500"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() =>
                                    handleStatusUpdate(
                                      r._id || r.id || r.requestId,
                                      "REJECTED",
                                    )
                                  }
                                  className="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white transition-all rounded-lg text-[11px] font-black tracking-wide border border-rose-100 hover:border-rose-500"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          </ResponsiveDataTable>
        )}

        {/* Pagination */}
        {1 > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-[12px] text-slate-400">
              Showing page {currentPage}
            </p>
            <div className="flex gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-[12px] font-bold disabled:opacity-40 hover:bg-slate-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-[12px] font-bold disabled:opacity-40 hover:bg-slate-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
