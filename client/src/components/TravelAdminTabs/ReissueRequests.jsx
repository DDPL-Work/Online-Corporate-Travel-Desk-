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
  FiArrowRight,
  FiActivity,
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
import { C } from "../Shared/color";
import Swal from "sweetalert2";

export default function ReissueRequests() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { requests, loading } = useSelector((state) => state.reissue);

  const [activeTab, setActiveTab] = useState("my");
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
      corporateId = decoded.corporateId;
      role = decoded.role || decoded.userRole || "employee";
    } catch (e) { console.error("Token decode error:", e); }
  }

  useEffect(() => {
    if (!corporateId) return;
    const params = {
      page: currentPage,
      limit: 10,
      status: filter !== "All" ? filter : undefined,
    };
    if (activeTab === "my") params.userId = userId;
    else params.companyId = corporateId;
    dispatch(fetchReissueRequests(params));
  }, [dispatch, activeTab, currentPage, filter, corporateId, userId]);

  const handleStatusUpdate = async (requestId, newStatus) => {
    const { value: message, isDismissed } = await Swal.fire({
      title: `Confirm ${newStatus}`,
      input: 'textarea',
      inputLabel: `Internal remarks for ${newStatus.toLowerCase()} (optional)`,
      inputPlaceholder: 'Enter processing details...',
      showCancelButton: true,
      confirmButtonColor: newStatus === 'APPROVED' ? '#10B981' : '#EF4444',
      cancelButtonColor: '#64748B',
      confirmButtonText: `Proceed with ${newStatus}`
    });

    if (isDismissed) return;

    try {
      const userStr = sessionStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : {};
      const actionByName = typeof user.name === "string" ? user.name : user.name?.firstName ? `${user.name.firstName} ${user.name.lastName || ""}`.trim() : "Admin";

      await dispatch(updateReissueStatus({
        requestId, status: newStatus, message, actionBy: user._id || userId, actionByName,
      })).unwrap();

      toast.success(`Request ${newStatus} successfully!`);
      dispatch(fetchReissueRequests({
        page: currentPage, limit: 10, status: filter !== "All" ? filter : undefined,
        userId: activeTab === "my" ? userId : undefined, companyId: corporateId,
      }));
    } catch (err) { toast.error(err || "Failed to update status"); }
  };

  const stats = useMemo(() => {
    if (!requests) return { total: 0, pending: 0, approved: 0, rejected: 0 };
    return {
      total: requests.length,
      pending: requests.filter((r) => r.status === "PENDING").length,
      approved: requests.filter((r) => r.status === "APPROVED" || r.status === "COMPLETED").length,
      rejected: requests.filter((r) => r.status === "REJECTED").length,
    };
  }, [requests]);

  const getStatusBadgeLocal = (status) => {
    const map = {
      PENDING:   { bg: "#FFFBEB", text: "#92400E", border: "#FDE68A", icon: <FiClock /> },
      APPROVED:  { bg: "#EFF6FF", text: "#1E40AF", border: "#BFDBFE", icon: <FiCheckCircle /> },
      COMPLETED: { bg: "#ECFDF5", text: "#065F46", border: "#A7F3D0", icon: <FiCheckCircle /> },
      REJECTED:  { bg: "#FEF2F2", text: "#991B1B", border: "#FECACA", icon: <FiXCircle /> },
    };
    const s = map[status] || { bg: "#F8FAFC", text: "#64748B", border: "#E2E8F0", icon: <FiActivity /> };
    return (
      <span className="px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1.5 border shadow-sm uppercase tracking-wider" style={{ background: s.bg, color: s.text, borderColor: s.border }}>
        {s.icon} {status}
      </span>
    );
  };

  const handleExport = () => {
    if (!requests?.length) return;
    const headers = ["Request ID", "Employee", "Email", "PNR", "Type", "Status", "Requested At"];
    const rows = requests.map((req) => {
      const empName = typeof req.user?.name === "string" ? req.user.name : `${req.user?.name?.firstName || ""} ${req.user?.name?.lastName || ""}`.trim();
      return [req.reissueId || "—", empName || "—", req.user?.email || "—", req.bookingSnapshot?.pnr || req.bookingReference || "—", req.reissueType?.replace("_", " ") || "—", req.status || "—", new Date(req.requestedAt).toLocaleDateString("en-IN")];
    });
    const tableHtml = rows.map(r => `<tr>${r.map(c => `<td style="border:1px solid #dbe4f0;padding:8px;">${c}</td>`).join("")}</tr>`).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head><body><table><thead><tr>${headers.map((h) => `<th style="border:1px solid #cbd5e1;padding:10px;background:#000D26;color:#fff;font-weight:700;text-align:left;">${h}</th>`).join("")}</tr></thead><tbody>${tableHtml}</tbody></table></body></html>`;
    const blob = new Blob(["\ufeff", html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `reissue-ledger.xls`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen font-sans pb-20 px-6 pt-8" style={{ background: C.offWhite }}>
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-2xl border shadow-sm" style={{ borderColor: C.border }}>
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg text-white" style={{ background: `linear-gradient(135deg, ${C.navy}, ${C.gold})` }}>
              <FiRepeat size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight" style={{ color: C.navy }}>Reissue Control</h1>
              <p className="text-xs mt-1 font-bold uppercase tracking-widest" style={{ color: C.muted }}>Manage Flight Reissues & Amendment Protocol</p>
            </div>
          </div>
          <button
            onClick={() => dispatch(fetchReissueRequests({ page: currentPage, limit: 10, status: filter !== "All" ? filter : undefined, userId: activeTab === "my" ? userId : undefined, companyId: corporateId }))}
            disabled={loading}
            className="px-6 py-3 rounded-xl font-bold text-xs flex items-center gap-2 border transition-all shadow-sm"
            style={{ background: C.white, borderColor: C.border, color: C.navy }}
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} />
            {loading ? "Syncing..." : "Sync Records"}
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard label="Total Inquiries" value={loading ? "—" : stats.total} Icon={FiList} borderCls="border-[#000D26]" iconBgCls="bg-[#000D26]10" iconColorCls="text-[#000D26]" />
          <StatCard label="Pending Action" value={loading ? "—" : stats.pending} Icon={FiClock} borderCls="border-amber-500" iconBgCls="bg-amber-50" iconColorCls="text-amber-600" />
          <StatCard label="Authorization Granted" value={loading ? "—" : stats.approved} Icon={FiCheck} borderCls="border-emerald-500" iconBgCls="bg-emerald-50" iconColorCls="text-emerald-600" />
          <StatCard label="Declined Requests" value={loading ? "—" : stats.rejected} Icon={FiXCircle} borderCls="border-rose-500" iconBgCls="bg-rose-50" iconColorCls="text-rose-600" />
        </div>

        {/* Filters Panel */}
        <div className="bg-white rounded-2xl p-6 border shadow-sm" style={{ borderColor: C.border }}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
            {role !== "employee" && (
              <div className="md:col-span-5">
                <div className="flex p-1 bg-slate-100 rounded-xl border" style={{ borderColor: C.border }}>
                  <button onClick={() => { setActiveTab("my"); setCurrentPage(1); }} className={`flex-1 px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === "my" ? "bg-white shadow-sm" : "text-slate-400"}`} style={{ color: activeTab === "my" ? C.navy : "" }}>Personal</button>
                  <button onClick={() => { setActiveTab("company"); setCurrentPage(1); }} className={`flex-1 px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === "company" ? "bg-white shadow-sm" : "text-slate-400"}`} style={{ color: activeTab === "company" ? C.navy : "" }}>Enterprise</button>
                </div>
              </div>
            )}
            <div className={role !== "employee" ? "md:col-span-5" : "md:col-span-10"}>
              <LabeledField label={<><FiFilter size={10} /> Filter by Status</>}>
                <CustomDropdown value={filter} onChange={(s) => { setFilter(s); setCurrentPage(1); }} options={["All", "PENDING", "APPROVED", "REJECTED", "COMPLETED"]} />
              </LabeledField>
            </div>
            <div className="md:col-span-2">
              <button onClick={() => { setFilter("All"); setActiveTab("my"); setCurrentPage(1); }} className="w-full py-3 rounded-xl font-black text-[11px] flex items-center justify-center gap-2 border shadow-sm transition-all hover:bg-slate-50 uppercase tracking-widest" style={{ background: C.white, borderColor: C.border, color: C.muted }}><FiX /> Reset</button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <ResponsiveDataTable title="Amendment Ledger" subtitle={`${requests?.length || 0} active inquiries`} tableMinWidth="1100px" onExport={handleExport}>
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ background: C.navy, color: C.white }}>
                <Th className="px-6 py-5">Request ID</Th>
                <Th className="px-6 py-5">Personnel</Th>
                <Th className="px-6 py-5">Email Identifier</Th>
                <Th className="px-6 py-5">PNR / Ref</Th>
                <Th className="px-6 py-5">Amendment Detail</Th>
                <Th className="px-6 py-5">Flow Status</Th>
                <Th className="px-6 py-5 text-center">Governance</Th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: C.border }}>
              {loading ? (
                <tr><td colSpan="7" className="py-24 text-center"><FiRefreshCw className="animate-spin mx-auto mb-4" size={40} style={{ color: C.gold }} /><p className="font-black uppercase tracking-widest text-slate-300">Synchronizing Matrix...</p></td></tr>
              ) : requests?.length === 0 ? (
                <tr><td colSpan="7" className="py-24 text-center opacity-20"><FiRepeat size={64} className="mx-auto" /><p className="font-black uppercase mt-4">No Inquiries Found</p></td></tr>
              ) : (
                requests?.map((req, i) => {
                  const empName = typeof req.user?.name === "string" ? req.user.name : `${req.user?.name?.firstName || ""} ${req.user?.name?.lastName || ""}`.trim() || "Staff Member";
                  return (
                    <tr key={req._id} className="hover:bg-slate-50 transition-colors" style={{ background: i % 2 === 0 ? C.white : C.offWhite }}>
                      <td className="px-6 py-5">
                         <code className="text-[10px] font-black px-2 py-1 rounded border" style={{ background: C.white, borderColor: C.border, color: C.muted }}>
                            R-{String(req.reissueId || req._id).slice(-6).toUpperCase()}
                         </code>
                         <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">{new Date(req.requestedAt).toLocaleDateString()}</p>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                           <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-black shadow-sm" style={{ background: `${C.navy}10`, color: C.navy }}>{empName[0]}</div>
                           <span className="font-black text-xs" style={{ color: C.navy }}>{empName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                         <span className="text-[11px] font-bold text-slate-500 font-mono bg-slate-100 px-2 py-1 rounded">{req.user?.email || "—"}</span>
                      </td>
                      <td className="px-6 py-5">
                         <p className="text-xs font-black" style={{ color: C.navy }}>{req.bookingSnapshot?.pnr || "N/A"}</p>
                         <p className="text-[10px] font-bold text-slate-400 uppercase">{req.bookingReference}</p>
                      </td>
                      <td className="px-6 py-5">
                         <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest" style={{ background: `${C.gold}15`, color: C.gold }}>{req.reissueType?.replace("_", " ")}</span>
                         <p className="text-[11px] font-medium text-slate-500 mt-1 line-clamp-1 italic">"{req.reason}"</p>
                      </td>
                      <td className="px-6 py-5">{getStatusBadgeLocal(req.status)}</td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-center gap-2">
                          {((activeTab === "company" || role !== "employee") && req.status === "PENDING") ? (
                            <>
                              <button onClick={() => handleStatusUpdate(req._id, "APPROVED")} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-emerald-700 transition-all">Approve</button>
                              <button onClick={() => handleStatusUpdate(req._id, "REJECTED")} className="px-4 py-2 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-rose-700 transition-all">Reject</button>
                            </>
                          ) : (
                            <button className="p-3 rounded-xl bg-slate-100 text-slate-400 hover:text-navy transition-all"><FiEye size={18} /></button>
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
    </div>
  );
}
