import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { toast } from "react-toastify";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiEye,
  FiList,
  FiRefreshCw,
  FiRepeat,
  FiXCircle,
  FiSearch,
  FiX,
  FiUser,
} from "react-icons/fi";

import {
  fetchLegacyReissueRequests,
  updateReissueStatus,
  fetchReissueRequests,
  fetchOfflineReissueRequests,
  fetchCompanyReissueRequests,
} from "../../Redux/Actions/reissueThunks";
import {
  getRequestId,
  getPnr,
  getUserName,
  getUserEmail,
  getAirline,
  getRoute,
  getTicketUrl,
  getStatus,
  getRequestedDate,
  getStatusTone,
  resolvePrimarySegment,
} from "../../utils/reissueResolvers";
import { airlineLogo } from "../../utils/formatter";
import {
  LabeledField,
  StatCard,
  dateCls,
  IdCell,
  SearchBar,
  Th,
  CustomDropdown,
} from "../TravelAdminTabs/Shared/CommonComponents";
import ResponsiveDataTable from "../TravelAdminTabs/Shared/ResponsiveDataTable";
import { Pagination } from "../TravelAdminTabs/Shared/Pagination";
import { C } from "../Shared/color";
import useExcelExporter from "../../hooks/export/useExcelExporter";

/* ─────────────────────────────────────────────────────────────────
   STATUS BADGE
   ───────────────────────────────────────────────────────────────── */
const ReissueStatusBadge = ({ req }) => {
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
      {status}
    </span>
  );
};

/* ─────────────────────────────────────────────────────────────────
   TICKET ACTION BUTTONS
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

  const handleView = () => {
    window.open(downloadUrl, "_blank", "noopener,noreferrer");
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `reissue-ticket-${getRequestId(req)}.pdf`;
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
        onClick={handleView}
        className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-slate-50 hover:text-[#000D26] hover:border-[#000D26] transition-all cursor-pointer"
        title="View ticket in browser"
      >
        <FiEye size={11} /> View
      </button>
      <button
        onClick={handleDownload}
        className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 bg-[#000D26] text-white rounded-lg text-[10px] font-bold hover:bg-[#04112F] transition-all cursor-pointer"
        title="Download ticket"
      >
        <FiDownload size={11} /> DL
      </button>
    </div>
  );
};

const getAirlineCode = (req) => {
  const segment = resolvePrimarySegment(req) || {};
  const code =
    segment?.airlineCode ||
    segment?.airline ||
    req?.selectedFlight?.airlineCode ||
    req?.newJourney?.segments?.[0]?.airlineCode ||
    req?.oldJourney?.segments?.[0]?.airlineCode ||
    req?.airlineCode ||
    req?.airline ||
    "AI";
  if (typeof code === "string") {
    const lower = code.toLowerCase();
    if (lower.includes("indigo")) return "6E";
    if (lower.includes("vistara")) return "UK";
    if (lower.includes("air india")) return "AI";
    if (lower.includes("spicejet")) return "SG";
    if (lower.includes("airasia")) return "I5";
    if (lower.includes("go first")) return "G8";
    if (lower.includes("akasa")) return "QP";
    return code.substring(0, 2).toUpperCase();
  }
  return "AI";
};

/* ─────────────────────────────────────────────────────────────────
   MAIN COMPONENT
   ───────────────────────────────────────────────────────────────── */
const MyReissueRequests = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const {
    legacyRequests,
    legacyLoading,
    requests: onlineRequests,
    loading: onlineLoading,
    offlineRequests,
    offlineLoading,
    companyRequests,
    companyLoading,
  } = useSelector((s) => s.reissue);

  const { exportExcel, isExporting } = useExcelExporter();

  // If URL has ?scope=company (e.g. from sidebar), start on company tab
  const initialTab = searchParams.get("scope") === "company" ? "company" : "my";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [filter, setFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedReq, setSelectedReq] = useState(null);

  // Search and Timeline state (visual for now)
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Decode token
  let userId = null,
    corporateId = null,
    role = "employee";
  try {
    const token = sessionStorage.getItem("token");
    if (token) {
      const d = jwtDecode(token);
      userId = d.id;
      corporateId = d.corporateId;
      role = d.role || d.userRole || "employee";
    }
  } catch { }

  const buildParams = () => ({
    page: currentPage,
    limit: 10,
    ...(filter !== "All" ? { status: filter } : {}),
  });

  const load = () => {
    const params = buildParams();
    if (activeTab === "my") {
      dispatch(fetchReissueRequests(params));
      dispatch(fetchOfflineReissueRequests(params));
    } else {
      dispatch(fetchCompanyReissueRequests({ ...params, corporateId }));
      dispatch(
        fetchLegacyReissueRequests({ ...params, companyId: corporateId }),
      );
    }
  };

  useEffect(() => {
    if (userId || corporateId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, activeTab, currentPage, filter, userId, corporateId]);

  const handleStatusUpdate = async (requestId, newStatus) => {
    const message = prompt(`Enter reason for ${newStatus} (optional):`) ?? "";
    if (message === null) return;
    try {
      let actionByName = "Admin";
      try {
        const u = JSON.parse(sessionStorage.getItem("user") || "{}");
        actionByName =
          typeof u.name === "string"
            ? u.name
            : [u.name?.firstName, u.name?.lastName].filter(Boolean).join(" ") ||
            "Admin";
      } catch { }
      await dispatch(
        updateReissueStatus({
          requestId,
          status: newStatus,
          message,
          actionBy: userId,
          actionByName,
        }),
      ).unwrap();
      toast.success(`Request ${newStatus} successfully!`);
      load();
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to update status");
    }
  };

  const currentRequests = useMemo(() => {
    let baseRequests = [];
    if (activeTab === "company") {
      const merged = [...(companyRequests || []), ...(legacyRequests || [])];
      // Deduplicate by ID
      const uniqueMap = new Map();
      merged.forEach((r) => {
        const uid = r.requestId || r.id || r._id;
        if (uid && !uniqueMap.has(uid)) uniqueMap.set(uid, r);
      });
      baseRequests = Array.from(uniqueMap.values());
    } else {
      baseRequests = [...(onlineRequests || []), ...(offlineRequests || [])];
    }

    // Sort
    let sorted = baseRequests.sort((a, b) => {
      const d1 = new Date(a.createdAt || a.date);
      const d2 = new Date(b.createdAt || b.date);
      return d2 - d1;
    });

    // Client-side search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      sorted = sorted.filter(
        (r) =>
          (r.pnr || "").toLowerCase().includes(q) ||
          (r.requestId || r.id || r._id || "")
            .toString()
            .toLowerCase()
            .includes(q),
      );
    }

    // Client-side date filter
    if (dateFrom || dateTo) {
      sorted = sorted.filter((r) => {
        const d = new Date(r.createdAt || r.date).toISOString().slice(0, 10);
        return (!dateFrom || d >= dateFrom) && (!dateTo || d <= dateTo);
      });
    }

    return sorted;
  }, [
    activeTab,
    companyRequests,
    legacyRequests,
    onlineRequests,
    offlineRequests,
    searchQuery,
    dateFrom,
    dateTo,
  ]);

  const paginatedRequests = useMemo(() => {
    return currentRequests.slice((currentPage - 1) * 10, currentPage * 10);
  }, [currentRequests, currentPage]);

  const loading =
    legacyLoading || onlineLoading || offlineLoading || companyLoading;

  const stats = useMemo(
    () => ({
      total: currentRequests.length,
      pending: currentRequests.filter((r) => getStatus(r) === "PENDING").length,
      approved: currentRequests.filter((r) =>
        ["APPROVED", "COMPLETED", "TICKET_GENERATED", "IN_PROGRESS"].includes(
          getStatus(r),
        ),
      ).length,
      rejected: currentRequests.filter((r) => getStatus(r) === "REJECTED")
        .length,
    }),
    [currentRequests],
  );

  const resetFilters = () => {
    setSearchQuery("");
    setDateFrom("");
    setDateTo("");
    setFilter("All");
  };



  return (
    <div
      className="min-h-screen font-sans pb-20 -mt-6 -mx-4 md:-mx-6"
      style={{ background: C.offWhite }}
    >
      {/* Navy Header Section */}
      <div className="w-full bg-linear-to-br from-[#003399] to-[#000d26] text-white pt-8 pb-20 px-6 md:px-10">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 cursor-pointer"
              >
                <FiArrowLeft className="text-white" size={20} />
              </button>
              <button
                onClick={load}
                className={`p-3 rounded-xl bg-white/10 transition-all border border-white/10 cursor-pointer ${loading ? "opacity-50 cursor-not-allowed" : "hover:bg-white/20"}`}
                disabled={loading}
              >
                <div className={loading ? "animate-spin" : ""}>
                  <FiRefreshCw size={20} />
                </div>
              </button>
            </div>

            <div className="h-12 w-px bg-white/10 mx-2 hidden md:block" />

            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl text-white border border-white/10 bg-white/10">
                <FiRepeat size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight leading-none">
                  Amendment Ledger
                </h1>
                <p className="text-[10px] mt-2 font-bold uppercase tracking-[2px] opacity-60">
                  Management of Flight Reissue Requests and Travel Document
                  Modifications
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 md:px-10 -mt-10 space-y-8">
        {/* Tab Switcher */}
        {role !== "employee" && (
          <div className="flex gap-2 p-1.5 bg-white border border-slate-200/60 shadow-xl rounded-2xl w-fit">
            {[
              ["my", "My Requests", FiUser],
              ["company", "Corporate View", FiList],
            ].map(([k, lbl, Icon]) => (
              <button
                key={k}
                onClick={() => {
                  setActiveTab(k);
                  setCurrentPage(1);
                }}
                className={`px-8 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all cursor-pointer ${activeTab === k ? "bg-[#000D26] text-white shadow-lg scale-[1.02]" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}
              >
                <Icon size={14} /> {lbl}
              </button>
            ))}
          </div>
        )}

        {/* Stats Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            label="Total Requests"
            value={loading ? "—" : stats.total}
            Icon={FiList}
            borderCls="border-[#000D26]"
            iconBgCls="bg-slate-100"
            iconColorCls="text-[#000D26]"
          />
          <StatCard
            label="Pending Review"
            value={loading ? "—" : stats.pending}
            Icon={FiClock}
            borderCls="border-amber-500"
            iconBgCls="bg-amber-50"
            iconColorCls="text-amber-600"
          />
          <StatCard
            label="Processed"
            value={loading ? "—" : stats.approved}
            Icon={FiCheckCircle}
            borderCls="border-emerald-500"
            iconBgCls="bg-emerald-50"
            iconColorCls="text-emerald-600"
          />
          <StatCard
            label="Rejected"
            value={loading ? "—" : stats.rejected}
            Icon={FiXCircle}
            borderCls="border-rose-500"
            iconBgCls="bg-rose-50"
            iconColorCls="text-rose-600"
          />
        </div>

        {/* Search & Filter section */}
        <div
          className="bg-white rounded-2xl p-6 border shadow-sm"
          style={{ borderColor: C.border }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
            <LabeledField
              label={
                <>
                  <FiSearch size={10} /> Request Search
                </>
              }
              className="lg:col-span-4"
            >
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="PNR, Request ID..."
              />
            </LabeledField>
            <LabeledField label="Status" className="lg:col-span-3">
              <CustomDropdown
                value={filter}
                onChange={setFilter}
                options={[
                  "All",
                  "PENDING",
                  "APPROVED",
                  "REJECTED",
                  "COMPLETED",
                ]}
              />
            </LabeledField>
            <LabeledField label="Request Window" className="lg:col-span-3">
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className={dateCls}
                  style={{ borderColor: C.border }}
                />
                <span className="text-slate-300">to</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className={dateCls}
                  style={{ borderColor: C.border }}
                />
              </div>
            </LabeledField>
            <div className="flex items-end lg:col-span-2">
              <button
                onClick={resetFilters}
                className="w-full py-2.5 rounded-xl font-black text-[11px] flex items-center justify-center gap-2 border shadow-sm transition-all hover:bg-slate-50 uppercase tracking-widest cursor-pointer"
                style={{
                  background: C.white,
                  borderColor: C.border,
                  color: C.muted,
                }}
              >
                <FiX /> Reset
              </button>
            </div>
          </div>
        </div>

        {/* Table Ledger */}
        <ResponsiveDataTable
          title={
            activeTab === "my" ? "Amendment Ledger" : "Corporate Amendments"
          }
          subtitle={`${currentRequests.length} active records`}
          wrapperClass="!border-none !shadow-none"
          exportLabel="Export Excel"
          exportLoading={isExporting}
          exportDisabled={isExporting}
          onExport={() => exportExcel({
            pageHeader: activeTab === "my" ? "Amendment Ledger" : "Corporate Amendments",
            statCards: [
              { label: "Total Requests", value: stats.total },
              { label: "Pending Review", value: stats.pending },
              { label: "Processed", value: stats.approved },
              { label: "Rejected", value: stats.rejected }
            ],
            appliedFilters: [
              { label: "Search", value: searchQuery || "None" },
              { label: "Status", value: filter },
              { label: "Request Window", value: `${dateFrom || "Any"} to ${dateTo || "Any"}` }
            ],
            data: currentRequests,
            columns: [
              { header: "Request ID", value: (r) => getRequestId(r) },
              { header: "PNR", value: (r) => getPnr(r) },
              { header: "Booking Ref", value: (r) => r.bookingReference || r.bookingRef || "N/A" },
              { header: "Employee", value: (r) => getUserName(r) },
              { header: "Route", value: (r) => getRoute(r) },
              { header: "Type", value: (r) => r.reissueType || r.type || "REISSUE" },
              { header: "Reason", value: (r) => r.reason || r.remarks || "N/A" },
              { header: "Date", value: (r) => getRequestedDate(r) },
              { header: "Status", value: (r) => getStatus(r) }
            ],
            filenamePrefix: "reissue_requests"
          })}
          pagination={
            <Pagination
              currentPage={currentPage}
              totalItems={currentRequests.length}
              pageSize={10}
              onPageChange={setCurrentPage}
            />
          }
        >
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-linear-to-r from-[#003399] to-[#000d26] text-white">
                <Th className="px-6! py-5!">Request ID</Th>
                {activeTab === "company" && (
                  <Th className="px-6! py-5!">Employee / Context</Th>
                )}
                <Th className="px-6! py-5!">PNR </Th>
                <Th className="px-6! py-5!">Airline & Route</Th>
                <Th className="px-6! py-5!">Type & Reason</Th>
                <Th className="px-6! py-5!">Status</Th>
                <Th className="px-6! py-5!">Ticket</Th>
                <Th className="px-6! py-5! text-left!">Action</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={activeTab === "company" ? 8 : 7}
                    className="px-6! py-20! text-center"
                  >
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <FiRefreshCw size={28} className="animate-spin" />
                      <p className="text-sm font-semibold">Loading ledger...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedRequests.length > 0 ? (
                paginatedRequests.map((req, i) => {
                  const requestId = getRequestId(req);
                  const userName = getUserName(req);
                  const userEmail = getUserEmail(req);
                  const pnr = getPnr(req);
                  const route = getRoute(req);
                  const airline = getAirline(req);
                  const status = getStatus(req);
                  const requestedAt = getRequestedDate(req);
                  const bookingRef =
                    req.bookingReference || req.bookingRef || "N/A";

                  return (
                    <tr
                      key={requestId}
                      className="hover:bg-slate-100 transition-colors"
                      style={{
                        background: i % 2 === 0 ? C.white : C.lightGray,
                      }}
                    >
                      {/* Request ID */}
                      <td className="px-6! py-5!">
                        <IdCell id={requestId} />
                        <p className="text-[10px] font-semibold text-slate-400 mt-1">
                          {requestedAt}
                        </p>
                      </td>

                      {/* Employee (Corporate View Only) */}
                      {activeTab === "company" && (
                        <td className="px-6! py-5!">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#000D26]/10 text-[#000D26] flex items-center justify-center text-[11px] font-black shrink-0">
                              {userName?.[0]?.toUpperCase() || "?"}
                            </div>
                            <div>
                              <p className="font-bold text-[13px] text-slate-800 leading-tight">
                                {userName}
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {userEmail}
                              </p>
                            </div>
                          </div>
                        </td>
                      )}

                      {/* PNR  */}
                      <td className="px-6! py-5!">
                        <p className="font-black text-sm text-slate-900 uppercase">
                          {pnr}
                        </p>
                        {/* <p className="text-[11px] font-bold text-slate-400 font-mono mt-0.5">
                          {bookingRef}
                        </p> */}
                      </td>

                      {/* Airline & Route */}
                      <td className="px-6! py-5!">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-white border border-slate-100 flex items-center justify-center p-1.5 shadow-sm overflow-hidden shrink-0">
                            <img src={airlineLogo(getAirlineCode(req))}
                              alt={airline}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src =
                                  "https://cdn-icons-png.flaticon.com/512/3114/3114883.png";
                              }}
                            />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">
                              {airline}
                            </p>
                            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                              {route}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Type & Reason */}
                      <td className="px-6! py-5!">
                        <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 rounded text-[9px] font-black uppercase tracking-wider inline-block mb-1">
                          {req.reissueType || req.type || "REISSUE"}
                        </span>
                        <p
                          className="text-[11px] text-slate-600 italic line-clamp-1 max-w-[200px]"
                          title={req.reason || req.remarks || "N/A"}
                        >
                          &ldquo;{req.reason || req.remarks || "N/A"}&rdquo;
                        </p>
                      </td>

                      {/* Status */}
                      <td className="px-6! py-5!">
                        <ReissueStatusBadge req={req} />
                      </td>

                      {/* Ticket */}
                      <td className="px-6! py-5!">
                        <TicketActions req={req} />
                      </td>

                      {/* Action */}
                      <td className="px-6! py-5! text-left!">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/my-reissue/${req._id || req.id}`)}
                            className="p-3 rounded-xl transition-all shadow-sm hover:shadow-md bg-linear-to-br from-[#003399] to-[#000d26] hover:bg-white hover:from-white hover:to-white group cursor-pointer"
                            title="View Details"
                          >
                            <FiEye
                              size={18}
                              className="text-[#E7C695] group-hover:text-[#000d26] transition-colors"
                            />
                          </button>
                          {status === "PENDING" && activeTab === "company" && (
                            <>
                              <button
                                onClick={() =>
                                  handleStatusUpdate(
                                    req._id || req.id || req.requestId,
                                    "APPROVED",
                                  )
                                }
                                className="px-3 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all rounded-xl text-[10px] font-black tracking-wide border border-emerald-100 hover:border-emerald-500 cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() =>
                                  handleStatusUpdate(
                                    req._id || req.id || req.requestId,
                                    "REJECTED",
                                  )
                                }
                                className="px-3 py-2 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all rounded-xl text-[10px] font-black tracking-wide border border-rose-100 hover:border-rose-500 cursor-pointer"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={activeTab === "company" ? 8 : 7}
                    className="px-6! py-20! text-center"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                        <FiSearch size={32} />
                      </div>
                      <p className="text-sm font-bold text-slate-400">
                        No reissue requests found for the selected criteria.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </ResponsiveDataTable>
      </div>
    </div>
  );
};

export default MyReissueRequests;
