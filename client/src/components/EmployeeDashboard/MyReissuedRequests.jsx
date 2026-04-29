import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchReissueRequests, updateReissueStatus } from "../../Redux/Actions/reissueThunks";
import { 
  FiCheckCircle, 
  FiXCircle, 
  FiClock, 
  FiEye, 
  FiArrowLeft, 
  FiRefreshCw, 
  FiRepeat,
  FiList,
  FiCheck
} from "react-icons/fi";
import { toast } from "react-toastify";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import { StatCard, IdCell, Th } from "../CorporateManagerTabs/Shared/CommonComponents";

export default function MyReissueRequests() {
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
    const message = prompt(`Enter reason for marking as ${newStatus} (optional):`);
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
        })
      ).unwrap();

      toast.success(`Request ${newStatus} successfully!`);
      // refresh
      dispatch(fetchReissueRequests({
        page: currentPage,
        limit: 10,
        status: filter !== "All" ? filter : undefined,
        userId: activeTab === "my" ? userId : undefined,
        companyId: corporateId
      }));
    } catch (err) {
      toast.error(err || "Failed to update status");
    }
  };

  const stats = useMemo(() => {
    if (!requests) return { total: 0, pending: 0, approved: 0, rejected: 0 };
    return {
      total: requests.length,
      pending: requests.filter(r => r.status === "PENDING").length,
      approved: requests.filter(r => r.status === "APPROVED" || r.status === "COMPLETED").length,
      rejected: requests.filter(r => r.status === "REJECTED").length,
    };
  }, [requests]);

  const getStatusBadgeLocal = (status) => {
    switch (status) {
      case "PENDING": return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-[11px] font-semibold flex items-center gap-1 border border-yellow-200"><FiClock size={12} /> Pending</span>;
      case "APPROVED": return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-[11px] font-semibold flex items-center gap-1 border border-blue-200"><FiCheckCircle size={12} /> Approved</span>;
      case "REJECTED": return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-[11px] font-semibold flex items-center gap-1 border border-red-200"><FiXCircle size={12} /> Rejected</span>;
      case "COMPLETED": return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-[11px] font-semibold flex items-center gap-1 border border-green-200"><FiCheckCircle size={12} /> Completed</span>;
      default: return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-[11px] font-semibold border border-gray-200">{status}</span>;
    }
  };

  const ReissueCard = ({ req }) => {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-all flex flex-col gap-4 relative overflow-hidden group">
        {/* Type Ribbon */}
        <div className="absolute top-0 right-0">
          <span className="px-3 py-1 bg-[#0A4D68] text-white text-[9px] font-black uppercase tracking-widest rounded-bl-xl shadow-sm">
            {req.reissueType?.replace("_", " ")}
          </span>
        </div>

        {/* Header: ID & Date */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Request ID</span>
            <IdCell id={req.reissueId} />
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Requested On</span>
            <span className="text-[12px] font-semibold text-slate-600">
              {new Date(req.requestedAt).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric"
              })}
            </span>
          </div>
        </div>

        {/* PNR / Ref Block */}
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">PNR</span>
            <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{req.bookingSnapshot?.pnr || "N/A"}</span>
          </div>
          <div className="h-8 w-[1px] bg-slate-200 mx-2" />
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Booking Ref</span>
            <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{req.bookingReference}</span>
          </div>
        </div>

        {/* Reason */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reason for Reissue</span>
          <p className="text-[12px] text-slate-600 leading-relaxed line-clamp-2 italic bg-sky-50/50 p-2 rounded-lg border border-sky-100">
            "{req.reason || "No reason provided"}"
          </p>
        </div>

        {/* Footer: Status & Action */}
        <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
          {getStatusBadgeLocal(req.status)}
          
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-50 hover:text-[#0A4D68] transition-all"
            title="View Details"
          >
            <FiEye size={14} /> Details
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        
        {/* HEADER BAR */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all group"
              title="Go Back"
            >
              <FiArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-linear-to-br from-[#0A4D68] to-[#088395] flex items-center justify-center shrink-0 shadow-lg shadow-cyan-900/10">
                <FiRepeat size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Reissue Requests
                </h1>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">
                  Manage flight reissue and amendment requests
                </p>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => dispatch(fetchReissueRequests({ 
              page: currentPage, 
              limit: 10, 
              status: filter !== "All" ? filter : undefined,
              userId: activeTab === "my" ? userId : undefined,
              companyId: corporateId
            }))}
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
          >
            <FiRefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* STAT CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

        {/* TABS & FILTERS BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-1">
          {role !== "employee" && (
            <div className="flex items-end gap-1">
              <button
                onClick={() => { setActiveTab("my"); setCurrentPage(1); }}
                className={`px-5 py-2.5 text-[13px] font-bold transition-all border-b-2 -mb-[2px] rounded-t-lg ${activeTab === "my" ? "bg-white text-[#0A4D68] border-b-[#0A4D68] shadow-sm" : "text-slate-400 border-transparent hover:text-slate-600 hover:bg-white/60"}`}
              >
                My Reissued
              </button>
              <button
                onClick={() => { setActiveTab("company"); setCurrentPage(1); }}
                className={`px-5 py-2.5 text-[13px] font-bold transition-all border-b-2 -mb-[2px] rounded-t-lg ${activeTab === "company" ? "bg-white text-[#0A4D68] border-b-[#0A4D68] shadow-sm" : "text-slate-400 border-transparent hover:text-slate-600 hover:bg-white/60"}`}
              >
                Company Reissued
              </button>
            </div>
          )}
          
          <div className="flex gap-2">
            {["All", "PENDING", "APPROVED", "REJECTED", "COMPLETED"].map((s) => (
              <button
                key={s}
                onClick={() => { setFilter(s); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all border ${filter === s ? "bg-[#0A4D68] text-white border-[#0A4D68] shadow-md shadow-cyan-900/20" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* CONTENT AREA */}
        {loading ? (
          <div className="py-20 text-center bg-white rounded-2xl shadow-sm border border-slate-200">
            <div className="flex flex-col items-center gap-3">
              <FiRefreshCw size={40} className="text-[#0A4D68] animate-spin opacity-20" />
              <p className="text-sm font-bold text-slate-400">Loading requests...</p>
            </div>
          </div>
        ) : requests?.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-2xl shadow-sm border border-slate-200">
            <div className="flex flex-col items-center gap-2 text-slate-300">
              <FiRepeat size={50} className="opacity-20" />
              <p className="text-sm font-bold">No reissue requests found</p>
              <p className="text-xs">Try adjusting your filters or check back later</p>
            </div>
          </div>
        ) : activeTab === "my" ? (
          /* CARD GRID FOR 'MY REISSUED' */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {requests?.map((req) => (
              <ReissueCard key={req._id} req={req} />
            ))}
          </div>
        ) : (
          /* TABLE FOR 'COMPANY REISSUED' */
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-[#dac448] text-slate-900">
                    <Th>Request ID</Th>
                    <Th>Employee</Th>
                    <Th>PNR / Ref</Th>
                    <Th>Type & Reason</Th>
                    <Th>Status</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requests?.map((req, i) => {
                    const empName = typeof req.user?.name === "string" 
                      ? req.user.name 
                      : `${req.user?.name?.firstName || ""} ${req.user?.name?.lastName || ""}`.trim() || "Unknown User";

                    return (
                      <tr 
                        key={req._id} 
                        className={`transition-colors hover:bg-sky-50/50 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/30"}`}
                      >
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-1">
                            <IdCell id={req.reissueId} />
                            <span className="text-[10px] text-slate-400 font-medium px-1">
                               {new Date(req.requestedAt).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric"
                               })}
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
                            <p className="text-[12px] text-slate-500 max-w-[200px] line-clamp-2 leading-relaxed" title={req.reason}>
                              {req.reason}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {getStatusBadgeLocal(req.status)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            {(activeTab === "company" || role !== "employee") && req.status === "PENDING" ? (
                              <>
                                <button
                                  onClick={() => handleStatusUpdate(req._id, "APPROVED")}
                                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[11px] font-black transition-all shadow-sm uppercase tracking-wider"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleStatusUpdate(req._id, "REJECTED")}
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
                  })}
                </tbody>
              </table>
            </div>
            
            {/* TABLE FOOTER */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase tracking-widest">
              <span>Showing {requests?.length || 0} Requests</span>
              <div className="flex items-center gap-4">
                 <span>Page {currentPage}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
