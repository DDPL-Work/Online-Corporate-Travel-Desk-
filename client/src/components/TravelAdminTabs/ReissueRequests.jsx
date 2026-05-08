import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchReissueRequests,
  updateReissueStatus,
} from "../../Redux/Actions/reissueThunks";
import {
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiEye,
  FiArrowLeft,
  FiRefreshCw,
  FiRepeat,
  FiList,
  FiCheck,
  FiX,
  FiFilter,
} from "react-icons/fi";
import { toast } from "react-toastify";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import {
  StatCard,
  IdCell,
  Th,
  LabeledField,
  CustomDropdown,
} from "./Shared/CommonComponents";
import ResponsiveDataTable from "./Shared/ResponsiveDataTable";

export default function ReissueRequests() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { requests, loading } = useSelector((state) => state.reissue);

  const [activeTab, setActiveTab] = useState("my"); // "my" or "company"
  const [filter, setFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  const token = sessionStorage.getItem("token");
  let userId = null;
  let corporateId = null;
  let role = "employee";

  if (token) {
    try {
      const decoded = jwtDecode(token);
      userId = decoded.id;
      corporateId = decoded.corporateId; // ✅ FIXED: payload uses corporateId
      role = decoded.role || decoded.userRole || "employee";
    } catch (e) {
      console.error("Token decode error:", e);
    }
  }

  useEffect(() => {
    if (!corporateId) return;

    const params = {
      page: currentPage,
      limit: 10,
      status: filter !== "All" ? filter : undefined,
    };

    if (activeTab === "my") {
      params.userId = userId;
    } else {
      params.companyId = corporateId; // API expects companyId or corporateId?
    }

    dispatch(fetchReissueRequests(params));
  }, [dispatch, activeTab, currentPage, filter, corporateId, userId]);

  const handleStatusUpdate = async (requestId, newStatus) => {
    const message = prompt(
      `Enter reason for marking as ${newStatus} (optional):`,
    );
    if (message === null) return; // cancelled

    try {
      const userStr = sessionStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : {};

      const actionByName =
        typeof user.name === "string"
          ? user.name
          : user.name?.firstName
            ? `${user.name.firstName} ${user.name.lastName || ""}`.trim()
            : "Admin";

      await dispatch(
        updateReissueStatus({
          requestId,
          status: newStatus,
          message,
          actionBy: user._id || userId,
          actionByName,
        }),
      ).unwrap();

      toast.success(`Request ${newStatus} successfully!`);
      // refresh
      dispatch(
        fetchReissueRequests({
          page: currentPage,
          limit: 10,
          status: filter !== "All" ? filter : undefined,
          userId: activeTab === "my" ? userId : undefined,
          companyId: corporateId,
        }),
      );
    } catch (err) {
      toast.error(err || "Failed to update status");
    }
  };

  const stats = useMemo(() => {
    if (!requests) return { total: 0, pending: 0, approved: 0, rejected: 0 };
    return {
      total: requests.length,
      pending: requests.filter((r) => r.status === "PENDING").length,
      approved: requests.filter(
        (r) => r.status === "APPROVED" || r.status === "COMPLETED",
      ).length,
      rejected: requests.filter((r) => r.status === "REJECTED").length,
    };
  }, [requests]);

  const getStatusBadgeLocal = (status) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-[11px] font-semibold flex items-center gap-1 border border-yellow-200">
            <FiClock size={12} /> Pending
          </span>
        );
      case "APPROVED":
        return (
          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-[11px] font-semibold flex items-center gap-1 border border-blue-200">
            <FiCheckCircle size={12} /> Approved
          </span>
        );
      case "REJECTED":
        return (
          <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-[11px] font-semibold flex items-center gap-1 border border-red-200">
            <FiXCircle size={12} /> Rejected
          </span>
        );
      case "COMPLETED":
        return (
          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-[11px] font-semibold flex items-center gap-1 border border-green-200">
            <FiCheckCircle size={12} /> Completed
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-[11px] font-semibold border border-gray-200">
            {status}
          </span>
        );
    }
  };

  const handleExport = () => {
    if (!requests?.length) return;
    const headers = ["Request ID", "Employee", "PNR", "Type", "Status", "Requested At"];
    const rows = requests.map((req) => {
      const empName = typeof req.user?.name === "string" ? req.user.name : `${req.user?.name?.firstName || ""} ${req.user?.name?.lastName || ""}`.trim();
      return [
        req.reissueId || "—",
        empName || "—",
        req.bookingSnapshot?.pnr || req.bookingReference || "—",
        req.reissueType?.replace("_", " ") || "—",
        req.status || "—",
        new Date(req.requestedAt).toLocaleDateString("en-IN"),
      ];
    });
    const tableRows = rows
      .map(
        (row) =>
          `<tr>${row
            .map(
              (cell) =>
                `<td style="border:1px solid #dbe4f0;padding:8px;">${String(
                  cell ?? "",
                )
                  .replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")}</td>`,
            )
            .join("")}</tr>`,
      )
      .join("");
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head><body><table><thead><tr>${headers.map((h) => `<th style="border:1px solid #cbd5e1;padding:10px;background:#0f172a;color:#fff;font-weight:700;text-align:left;">${h}</th>`).join("")}</tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
    const blob = new Blob(["\ufeff", html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reissue-requests-${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full min-w-0 space-y-6 font-sans">
      <div className="flex items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all group shrink-0"
            title="Go Back"
          >
            <FiArrowLeft
              size={18}
              className="group-hover:-translate-x-0.5 transition-transform"
            />
          </button>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0A4D68] to-[#088395] flex items-center justify-center shrink-0 shadow-sm">
              <FiRepeat size={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-black text-slate-900 tracking-tight truncate">
                Reissue Requests
              </h1>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                Manage flight reissue and amendment requests
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() =>
            dispatch(
              fetchReissueRequests({
                page: currentPage,
                limit: 10,
                status: filter !== "All" ? filter : undefined,
                userId: activeTab === "my" ? userId : undefined,
                companyId: corporateId,
              }),
            )
          }
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold transition-all shadow-sm border bg-cyan-50 border-cyan-200 text-[#0A4D68] hover:bg-cyan-100 disabled:opacity-60 disabled:cursor-wait"
        >
          <FiRefreshCw size={14} className={loading ? "animate-spin" : ""} />
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
        <StatCard
          label="Total Requests"
          value={loading ? "—" : stats.total}
          Icon={FiList}
          borderCls="border-[#0A4D68]"
          iconBgCls="bg-[#0A4D68]/10"
          iconColorCls="text-[#0A4D68]"
        />
        <StatCard
          label="Pending"
          value={loading ? "—" : stats.pending}
          Icon={FiClock}
          borderCls="border-amber-500"
          iconBgCls="bg-amber-50"
          iconColorCls="text-amber-600"
        />
        <StatCard
          label="Approved"
          value={loading ? "—" : stats.approved}
          Icon={FiCheck}
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

      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {role !== "employee" && (
            <div className="md:col-span-5">
              <div className="flex p-1.5 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  onClick={() => {
                    setActiveTab("my");
                    setCurrentPage(1);
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg text-[13px] font-bold transition-all ${
                    activeTab === "my"
                      ? "bg-white text-[#0A4D68] shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  My Reissued
                </button>
                <button
                  onClick={() => {
                    setActiveTab("company");
                    setCurrentPage(1);
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg text-[13px] font-bold transition-all ${
                    activeTab === "company"
                      ? "bg-white text-[#0A4D68] shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Company Reissued
                </button>
              </div>
            </div>
          )}

          <div className={role !== "employee" ? "md:col-span-4" : "md:col-span-8"}>
            <LabeledField
              label={
                <>
                  <FiFilter size={10} /> Status
                </>
              }
            >
              <CustomDropdown
                value={filter}
                onChange={(s) => {
                  setFilter(s);
                  setCurrentPage(1);
                }}
                options={["All", "PENDING", "APPROVED", "REJECTED", "COMPLETED"]}
              />
            </LabeledField>
          </div>

          <div className="md:col-span-3">
            <button
              onClick={() => {
                setFilter("All");
                setActiveTab("my");
                setCurrentPage(1);
              }}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-bold text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200 hover:text-slate-700 transition-colors"
            >
              <FiX size={12} /> Reset Filters
            </button>
          </div>
        </div>
      </div>

      <ResponsiveDataTable
        title="Reissue Requests"
        subtitle={`${requests?.length || 0} record${requests?.length !== 1 ? "s" : ""} found`}
        tableMinWidth="1050px"
        onExport={handleExport}
        exportLabel="Export"
        exportBgClass="bg-[#0A4D68] hover:bg-[#083d52]"
        arrowBgClass="bg-cyan-50 border-cyan-200 text-[#0A4D68] hover:bg-cyan-100"
        footer={
          <div className="px-4 py-2.5 flex justify-between text-xs text-slate-400">
            <span>Showing {requests?.length || 0} Requests</span>
            <span>Page {currentPage}</span>
          </div>
        }
      >
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#0f9041] text-[#ffffff]">
              <Th>Request ID</Th>
              <Th>Employee</Th>
              <Th>PNR / Ref</Th>
              <Th>Type & Reason</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="6" className="py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <FiRefreshCw
                      size={30}
                      className="text-[#0A4D68] animate-spin opacity-20"
                    />
                    <p className="text-sm font-bold text-slate-400">
                      Loading requests...
                    </p>
                  </div>
                </td>
              </tr>
            ) : requests?.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-20 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-300">
                    <FiRepeat size={40} className="opacity-20" />
                    <p className="text-sm font-bold">
                      No reissue requests found
                    </p>
                    <p className="text-xs">
                      Try adjusting your filters or check back later
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              requests?.map((req, i) => {
                const empName =
                  typeof req.user?.name === "string"
                    ? req.user.name
                    : `${req.user?.name?.firstName || ""} ${req.user?.name?.lastName || ""}`.trim() ||
                      "Unknown User";

                return (
                  <tr
                    key={req._id}
                    className={`transition-colors hover:bg-sky-50/50 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/30"}`}
                  >
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        <IdCell id={req.reissueId} />
                        <span className="text-[10px] text-slate-400 font-medium px-1">
                          {new Date(req.requestedAt).toLocaleDateString(
                            "en-IN",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            },
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#0A4D68]/10 text-[#0A4D68] flex items-center justify-center text-[11px] font-black shrink-0">
                          {empName[0]}
                        </div>
                        <span className="font-bold text-[13px] text-slate-800">
                          {empName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-black text-[13px] text-slate-900 tracking-tight uppercase">
                          {req.bookingSnapshot?.pnr || "N/A"}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {req.bookingReference}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex w-fit px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-black uppercase tracking-wider">
                          {req.reissueType?.replace("_", " ")}
                        </span>
                        <p
                          className="text-[12px] text-slate-500 max-w-[200px] line-clamp-2 leading-relaxed"
                          title={req.reason}
                        >
                          {req.reason}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {getStatusBadgeLocal(req.status)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {(activeTab === "company" || role !== "employee") &&
                        req.status === "PENDING" ? (
                          <>
                            <button
                              onClick={() =>
                                handleStatusUpdate(req._id, "APPROVED")
                              }
                              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[11px] font-black transition-all shadow-sm uppercase tracking-wider"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() =>
                                handleStatusUpdate(req._id, "REJECTED")
                              }
                              className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[11px] font-black transition-all shadow-sm uppercase tracking-wider"
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <button
                            className="p-2 text-slate-400 hover:text-[#0A4D68] transition-colors rounded-lg hover:bg-slate-100"
                            title="View Details"
                          >
                            <FiEye size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </ResponsiveDataTable>
    </div>
  );
}
