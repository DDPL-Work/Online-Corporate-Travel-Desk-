// client\src\components\TravelAdminTabs\ManagerRequestsPage.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchManagerRequests,
  reviewManagerRequest,
} from "../../Redux/Actions/travelAdmin.thunks";
import Swal from "sweetalert2";

import {
  FiUsers,
  FiCheck,
  FiX,
  FiSearch,
  FiRefreshCw,
  FiMail,
  FiCheckCircle,
  FiXCircle,
  FiCalendar,
  FiAlertCircle,
  FiInbox,
} from "react-icons/fi";
import { MdVerifiedUser, MdOutlinePendingActions } from "react-icons/md";
import { HiOutlineOfficeBuilding } from "react-icons/hi";
import { StatCard } from "./Shared/CommonComponents";

/* ──────────────────────────────────────── */
/*  Status badge                            */
/* ──────────────────────────────────────── */
const StatusBadge = ({ status }) => {
  const map = {
    pending: {
      label: "Pending",
      cls: "bg-amber-50 text-amber-700 border-amber-200",
      icon: <FiClock size={11} />,
    },
    approved: {
      label: "Approved",
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: <FiCheckCircle size={11} />,
    },
    rejected: {
      label: "Rejected",
      cls: "bg-red-50 text-red-600 border-red-200",
      icon: <FiXCircle size={11} />,
    },
  };
  const s = map[status?.toLowerCase()] || map.pending;

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${s.cls}`}
    >
      {s.icon}
      {s.label}
    </span>
  );
};

/* ──────────────────────────────────────── */
/*  Avatar initials                         */
/* ──────────────────────────────────────── */
const Avatar = ({ name = "", size = "md" }) => {
  const nameStr = typeof name === "string" ? name : String(name || "");
  const initials = nameStr
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const colors = [
    "from-[#0A4D68] to-[#088395]",
    "from-violet-600 to-indigo-500",
    "from-rose-500 to-pink-400",
    "from-amber-500 to-orange-400",
    "from-teal-600 to-emerald-500",
  ];
  const seed = Number.isNaN(nameStr?.charCodeAt(0)) ? 0 : nameStr.charCodeAt(0);
  const color = colors[seed % colors.length];
  const sz = size === "lg" ? "w-12 h-12 text-sm" : "w-9 h-9 text-[12px]";
  return (
    <div
      className={`${sz} rounded-full bg-linear-to-br ${color} flex items-center justify-center font-bold text-white shrink-0 shadow-sm`}
    >
      {initials || "?"}
    </div>
  );
};

// Internal icon helper for StatusBadge
const FiClock = ({ size }) => (
  <svg
    stroke="currentColor"
    fill="none"
    strokeWidth="2"
    viewBox="0 0 24 24"
    strokeLinecap="round"
    strokeLinejoin="round"
    height={size}
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

/* ──────────────────────────────────────── */
/*  Request Card                            */
/* ──────────────────────────────────────── */
const RequestCard = ({ req, onApprove, onReject, loading }) => {
  const employee = req.employeeId || req.employee || {};
  const manager = req.managerId || req.manager || {};
  const bookingSnap = req.bookingSnapshot || {};
  const status = req.status || "pending";
  const isPending = status === "pending";
  const createdAt = req.createdAt
    ? new Date(req.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

  const getNameFromObj = (person) => {
    if (!person) return "";
    if (typeof person.name === "string") return person.name.trim();
    if (person.name?.firstName || person.name?.lastName) {
      return `${person.name.firstName || ""} ${person.name.lastName || ""}`.trim();
    }
    if (person.firstName || person.lastName) {
      return `${person.firstName || ""} ${person.lastName || ""}`.trim();
    }
    return "";
  };

  const employeeName =
    getNameFromObj(employee) || req.employeeName || "Unknown Employee";
  const employeeEmail = employee.email || req.employeeEmail || "—";
  const managerName = getNameFromObj(manager) || req.managerName || "Manager";
  const managerEmail = manager.email || req.managerEmail || "—";

  return (
    <div
      className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all duration-300 ${
        isPending
          ? "border-slate-200 hover:border-[#0A4D68]/30 hover:shadow-md"
          : status === "approved"
            ? "border-emerald-200/60"
            : "border-red-200/60"
      }`}
    >
      {/* Top accent bar */}
      <div
        className={`h-1.5 w-full ${
          isPending
            ? "bg-linear-to-r from-amber-400 to-orange-400"
            : status === "approved"
              ? "bg-linear-to-r from-emerald-400 to-teal-400"
              : "bg-linear-to-r from-red-400 to-rose-400"
        }`}
      />

      <div className="px-5 py-5">
        {/* ── Row 1: employee + status + actions ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Employee info */}
          <div className="flex items-center gap-4 min-w-0">
            <Avatar name={employeeName} size="lg" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-[15px] font-extrabold text-slate-800 leading-tight truncate">
                  {employeeName}
                </p>
                <StatusBadge status={status} />
              </div>
              <div className="flex items-center gap-1 mt-1">
                <FiMail size={11} className="text-slate-400 shrink-0" />
                <p className="text-[12px] text-slate-400 truncate">
                  {employeeEmail}
                </p>
              </div>
              {employee.department && (
                <div className="flex items-center gap-1 mt-0.5">
                  <HiOutlineOfficeBuilding
                    size={11}
                    className="text-slate-400"
                  />
                  <p className="text-[11px] text-slate-400">
                    {employee.department}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons or Status badge */}
          {isPending ? (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => onReject(req._id)}
                disabled={loading}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-[12px] font-bold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 px-4 py-2.5 rounded-xl transition disabled:opacity-50"
              >
                <FiX size={13} /> Reject
              </button>
              <button
                onClick={() => onApprove(req._id)}
                disabled={loading}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-[12px] font-bold text-white bg-linear-to-r from-[#0A4D68] to-[#088395] hover:from-[#093f54] hover:to-[#066876] px-4 py-2.5 rounded-xl transition shadow-md disabled:opacity-50"
              >
                <FiCheck size={13} /> Approve
              </button>
            </div>
          ) : (
            <div
              className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full self-start sm:self-center ${
                status === "approved"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-red-50 text-red-600 border border-red-200"
              }`}
            >
              {status === "approved" ? (
                <>
                  <MdVerifiedUser size={13} /> Verified Approver
                </>
              ) : (
                <>
                  <FiXCircle size={13} /> Verification Denied
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Divider ── */}
        <div className="border-t border-slate-100 my-4" />

        {/* ── Row 2: Requested-as manager + booking + project info ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6">
          {/* Approver for */}
          <div className="flex flex-col gap-1.5 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Requested as Approver for
            </p>
            <div className="flex items-center gap-2.5 mt-0.5">
              <Avatar name={employeeName} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-slate-700 leading-tight truncate">
                  {employeeName || "—"}
                </p>
                <p className="text-[11px] text-slate-400 truncate" title={employeeEmail}>
                  {employeeEmail}
                </p>
              </div>
            </div>
          </div>

          {/* Project details */}
          <div className="flex flex-col gap-1.5 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Project
            </p>
            <div className="mt-0.5">
              <p className="text-[13px] font-bold text-slate-700 truncate" title={req.projectName}>
                {req.projectName || "—"}
              </p>
              <p className="text-[11px] text-slate-400 truncate" title={req.projectCodeId}>
                {req.projectCodeId
                  ? `${req.projectCodeId} · ${req.projectClient || "—"}`
                  : "—"}
              </p>
            </div>
          </div>

          {/* Hotel / Booking */}
          <div className="flex flex-col gap-1.5 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Booking
            </p>
            <div className="mt-0.5">
              <p className="text-[13px] font-bold text-slate-700 truncate" title={bookingSnap.hotelName}>
                {bookingSnap.hotelName || req.bookingType || "Hotel Booking"}
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                {bookingSnap.city || ""}
                {bookingSnap.checkInDate
                  ? ` · ${new Date(bookingSnap.checkInDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`
                  : ""}
              </p>
            </div>
          </div>

          {/* Date requested */}
          <div className="flex flex-col gap-1.5 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Requested On
            </p>
            <div className="flex items-center gap-2.5 mt-0.5">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200/50">
                <FiCalendar size={13} className="text-[#0A4D68]" />
              </div>
              <p className="text-[13px] font-bold text-slate-700">
                {createdAt}
              </p>
            </div>
          </div>

          {managerEmail && managerEmail !== "—" && (
            <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-100 sm:col-span-2 md:col-span-1 xl:col-span-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-0.5">
                Designated Approver
              </p>
              <div className="flex items-center gap-2.5">
                <Avatar name={managerName} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-slate-700 truncate">
                    {managerName}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate" title={managerEmail}>
                    {managerEmail}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────── */
/*  Main Page                               */
/* ──────────────────────────────────────── */
const ManagerRequestsPage = () => {
  const dispatch = useDispatch();
  const { managerRequests, loadingManagerRequests, errorManagerRequests } =
    useSelector((state) => state.adminBooking);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // all | pending | approved | rejected
  const [actionLoadingId, setActionLoadingId] = useState(null);

  useEffect(() => {
    dispatch(fetchManagerRequests());
  }, [dispatch]);

  const handleApprove = async (requestId) => {
    const result = await Swal.fire({
      title: "Verify Manager?",
      text: "This will officially verify this person as a corporate approver, allowing them to approve or reject travel requests.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#0A4D68",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: "Yes, Approve",
    });
    if (!result.isConfirmed) return;
    setActionLoadingId(requestId);
    await dispatch(reviewManagerRequest({ requestId, action: "approve" }));
    setActionLoadingId(null);
  };

  const handleReject = async (requestId) => {
    const result = await Swal.fire({
      title: "Reject Request?",
      text: "The employee will not be granted manager/approver permissions.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: "Yes, Reject",
    });
    if (!result.isConfirmed) return;
    setActionLoadingId(requestId);
    await dispatch(reviewManagerRequest({ requestId, action: "reject" }));
    setActionLoadingId(null);
  };

  const stats = useMemo(() => {
    const all = managerRequests || [];
    return {
      total: all.length,
      pending: all.filter((r) => r.status === "pending").length,
      approved: all.filter((r) => r.status === "approved").length,
      rejected: all.filter((r) => r.status === "rejected").length,
    };
  }, [managerRequests]);

  const filtered = useMemo(() => {
    let list = managerRequests || [];
    if (filter !== "all") list = list.filter((r) => r.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) => {
        const emp = r.employeeId || r.employee || {};
        const empName = (() => {
          if (!emp) return "";
          if (typeof emp.name === "string")
            return emp.name.trim().toLowerCase();
          if (emp.name?.firstName || emp.name?.lastName) {
            return `${emp.name.firstName || ""} ${emp.name.lastName || ""}`
              .trim()
              .toLowerCase();
          }
          if (emp.firstName || emp.lastName) {
            return `${emp.firstName || ""} ${emp.lastName || ""}`
              .trim()
              .toLowerCase();
          }
          return "";
        })();
        return (
          empName.includes(q) ||
          emp.email?.toLowerCase().includes(q) ||
          r.projectCodeId?.toLowerCase().includes(q) ||
          r.projectName?.toLowerCase().includes(q) ||
          r.projectClient?.toLowerCase().includes(q) ||
          r.managerEmail?.toLowerCase().includes(q) ||
          r.managerName?.toLowerCase().includes(q) ||
          r.bookingSnapshot?.hotelName?.toLowerCase().includes(q) ||
          r.purposeOfTravel?.toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [managerRequests, filter, search]);

  const FILTER_TABS = [
    { key: "all", label: "All", count: stats.total },
    { key: "pending", label: "Pending", count: stats.pending },
    { key: "approved", label: "Approved", count: stats.approved },
    { key: "rejected", label: "Rejected", count: stats.rejected },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* ── Page Header ── */}
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-[#0A4D68] to-[#088395] flex items-center justify-center shadow-lg shadow-[#0A4D68]/20 shrink-0">
                <MdVerifiedUser size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight leading-none">
                  Manager Approval Requests
                </h1>
                <p className="text-[11px] sm:text-xs font-semibold text-slate-400 mt-1.5 uppercase tracking-wider">
                  Employee verification for corporate travel approvals
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => dispatch(fetchManagerRequests())}
                disabled={loadingManagerRequests}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0A4D68] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#0A4D68]/20 transition-all active:scale-95 hover:bg-[#083d52] disabled:opacity-50"
              >
                <FiRefreshCw
                  size={14}
                  className={loadingManagerRequests ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-12 space-y-6">
        {/* ── Stat cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Requests"
            value={stats.total}
            Icon={FiUsers}
            iconBgCls="bg-[#0A4D68]/10"
            iconColorCls="text-[#0A4D68]"
            borderCls="border-[#0A4D68]"
          />
          <StatCard
            label="Pending"
            value={stats.pending}
            Icon={MdOutlinePendingActions}
            iconBgCls="bg-amber-50"
            iconColorCls="text-amber-500"
            borderCls="border-amber-400"
          />
          <StatCard
            label="Approved"
            value={stats.approved}
            Icon={FiCheckCircle}
            iconBgCls="bg-emerald-50"
            iconColorCls="text-emerald-500"
            borderCls="border-emerald-400"
          />
          <StatCard
            label="Rejected"
            value={stats.rejected}
            Icon={FiXCircle}
            iconBgCls="bg-red-50"
            iconColorCls="text-red-500"
            borderCls="border-red-400"
          />
        </div>

        {/* ── Filters + Search ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <FiSearch
              size={14}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search by employee name, email, or hotel…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 w-full pl-10 pr-4 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#0A4D68] focus:ring-2 focus:ring-[#0A4D68]/10 transition text-slate-700 placeholder:text-slate-400"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto no-scrollbar">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  filter === tab.key
                    ? "bg-white text-[#0A4D68] shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.label}
                <span
                  className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                    filter === tab.key
                      ? "bg-[#0A4D68]/10 text-[#0A4D68]"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Content ── */}
        {loadingManagerRequests ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-10 h-10 border-2 border-[#0A4D68] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-400 font-medium">
              Fetching manager requests…
            </p>
          </div>
        ) : errorManagerRequests ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
              <FiAlertCircle size={22} className="text-red-400" />
            </div>
            <p className="text-sm font-semibold text-slate-600">
              Failed to load requests
            </p>
            <p className="text-[12px] text-slate-400">{errorManagerRequests}</p>
            <button
              onClick={() => dispatch(fetchManagerRequests())}
              className="mt-2 text-sm font-bold text-[#0A4D68] border border-[#0A4D68]/20 px-4 py-2 rounded-xl hover:bg-[#0A4D68]/5 transition"
            >
              Try Again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
              <FiInbox size={22} className="text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-600">
              {search || filter !== "all"
                ? "No requests match your filters"
                : "No manager requests yet"}
            </p>
            <p className="text-[12px] text-slate-400">
              {search || filter !== "all"
                ? "Try clearing your search or filter"
                : "Requests will appear here when employees designate an approver"}
            </p>
            {(search || filter !== "all") && (
              <button
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                }}
                className="mt-1 text-sm font-bold text-[#0A4D68] border border-[#0A4D68]/20 px-4 py-2 rounded-xl hover:bg-[#0A4D68]/5 transition"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((req) => (
              <RequestCard
                key={req._id}
                req={req}
                onApprove={handleApprove}
                onReject={handleReject}
                loading={actionLoadingId === req._id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManagerRequestsPage;
