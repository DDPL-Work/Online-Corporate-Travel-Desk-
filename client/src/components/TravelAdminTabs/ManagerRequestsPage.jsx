// client\src\components\TravelAdminTabs\ManagerRequestsPage.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
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
  FiCheckCircle,
  FiXCircle,
  FiInbox,
  FiArrowRight,
  FiClock,
} from "react-icons/fi";
import { MdVerifiedUser } from "react-icons/md";
import {
  LabeledField,
  StatCard,
  StatusBadge,
  SearchBar,
  Th,
  CustomDropdown,
} from "./Shared/CommonComponents";
import ResponsiveDataTable from "./Shared/ResponsiveDataTable";
import { Pagination } from "./Shared/Pagination";
import { C } from "../Shared/color";

const Avatar = ({ name = "", size = "md" }) => {
  const nameStr = typeof name === "string" ? name : String(name || "");
  const initials = nameStr
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  
  const colors = [
    "from-[#003399] to-[#000d26]",
    "from-violet-600 to-indigo-500",
    "from-rose-500 to-pink-400",
    "from-amber-500 to-orange-400",
    "from-teal-600 to-emerald-500",
  ];
  
  const seed = nameStr.length > 0 ? nameStr.charCodeAt(0) : 0;
  const color = colors[seed % colors.length];
  const sz = size === "lg" ? "w-10 h-10 text-[11px]" : "w-8 h-8 text-[10px]";
  
  return (
    <div
      className={`${sz} rounded-full bg-gradient-to-br ${color} flex items-center justify-center font-black text-white shrink-0 shadow-sm border border-white/20`}
    >
      {initials || "?"}
    </div>
  );
};

const ManagerRequestsPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { managerRequests, loadingManagerRequests } =
    useSelector((state) => state.adminBooking);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    dispatch(fetchManagerRequests());
  }, [dispatch]);

  const handleApprove = async (requestId) => {
    const result = await Swal.fire({
      title: "Verify Manager?",
      text: "This will officially verify this person as a corporate approver, allowing them to approve or reject travel requests.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: C.navy,
      cancelButtonColor: "#94a3b8",
      confirmButtonText: "Yes, Approve",
      customClass: {
        popup: 'rounded-2xl',
        confirmButton: 'rounded-xl font-bold px-6 py-2.5',
        cancelButton: 'rounded-xl font-bold px-6 py-2.5'
      }
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
      customClass: {
        popup: 'rounded-2xl',
        confirmButton: 'rounded-xl font-bold px-6 py-2.5',
        cancelButton: 'rounded-xl font-bold px-6 py-2.5'
      }
    });
    if (!result.isConfirmed) return;
    setActionLoadingId(requestId);
    await dispatch(reviewManagerRequest({ requestId, action: "reject" }));
    setActionLoadingId(null);
  };

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
        const empName = getNameFromObj(emp).toLowerCase();
        return (
          empName.includes(q) ||
          emp.email?.toLowerCase().includes(q) ||
          r.projectCodeId?.toLowerCase().includes(q) ||
          r.projectName?.toLowerCase().includes(q) ||
          r.managerEmail?.toLowerCase().includes(q) ||
          r.managerName?.toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [managerRequests, filter, search]);

  const paginated = useMemo(() => {
    return filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  }, [filtered, currentPage]);

  const handleRefresh = () => dispatch(fetchManagerRequests());

  return (
    <div className="min-h-screen font-sans pb-20 -mt-6 -mx-4 md:-mx-6" style={{ background: C.offWhite }}>
      {/* Navy Header Section - Matched with TotalBookings */}
      <div className="w-full bg-gradient-to-br from-[#003399] to-[#000d26] text-white pt-8 pb-20 px-6 md:px-10">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-3">
               <button 
                  onClick={() => navigate(-1)} 
                  className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10"
               >
                 <FiArrowRight className="rotate-180" size={20} />
               </button>
               <button 
                  onClick={handleRefresh} 
                  className={`p-3 rounded-xl bg-white/10 transition-all border border-white/10 ${loadingManagerRequests ? "opacity-50 cursor-not-allowed" : "hover:bg-white/20"}`}
                  disabled={loadingManagerRequests}
               >
                 <div className={loadingManagerRequests ? "animate-spin" : ""}>
                   <FiRefreshCw size={20} />
                 </div>
               </button>
             </div>
             
             <div className="h-12 w-[1px] bg-white/10 mx-2 hidden md:block" />

             <div className="flex items-center gap-5">
               <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl text-white border border-white/10 bg-white/10" >
                 <MdVerifiedUser size={28} />
               </div>
               <div>
                 <h1 className="text-3xl font-black tracking-tight leading-none">Approver Verification</h1>
                 <p className="text-[10px] mt-2 font-bold uppercase tracking-[2px] opacity-60">
                   Employee verification for corporate travel approvals and management permissions
                 </p>
               </div>
             </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 md:px-10 -mt-10 space-y-10">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard label="Total Requests" value={stats.total} Icon={FiUsers} borderCls="border-[#000D26]" iconBgCls="bg-slate-100" iconColorCls="text-[#000D26]" />
          <StatCard label="Pending Review" value={stats.pending} Icon={FiClock} borderCls="border-amber-500" iconBgCls="bg-amber-50" iconColorCls="text-amber-600" />
          <StatCard label="Verified Assets" value={stats.approved} Icon={FiCheckCircle} borderCls="border-emerald-500" iconBgCls="bg-emerald-50" iconColorCls="text-emerald-600" />
          <StatCard label="Denied Access" value={stats.rejected} Icon={FiXCircle} borderCls="border-red-500" iconBgCls="bg-red-50" iconColorCls="text-red-600" />
        </div>

        {/* Filter Section */}
        <div className="bg-white rounded-2xl p-6 border shadow-sm" style={{ borderColor: C.border }}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
            <LabeledField label={<><FiSearch size={10} /> Search Directory</>} className="lg:col-span-6">
              <SearchBar value={search} onChange={(val) => { setSearch(val); setCurrentPage(1); }} placeholder="Employee name, email, or project..." />
            </LabeledField>
            <LabeledField label="Filter Status" className="lg:col-span-3">
              <CustomDropdown value={filter} onChange={(val) => { setFilter(val); setCurrentPage(1); }} options={[
                { label: "All Requests", value: "all" },
                { label: "Pending Verification", value: "pending" },
                { label: "Approved Approvers", value: "approved" },
                { label: "Rejected Requests", value: "rejected" }
              ]} />
            </LabeledField>
            <div className="flex items-end lg:col-span-3">
               <button onClick={() => { setSearch(""); setFilter("all"); setCurrentPage(1); }} className="w-full py-2.5 rounded-xl font-black text-[11px] flex items-center justify-center gap-2 border shadow-sm transition-all hover:bg-slate-50 uppercase tracking-widest" style={{ background: C.white, borderColor: C.border, color: C.muted }}><FiX /> Reset Filters</button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <ResponsiveDataTable 
          title="Verification Ledger" 
          subtitle={`${filtered.length} authentication entries`} 
          exportConfig={{
            data: filtered,
            filename: `manager_requests_${new Date().toISOString().split('T')[0]}.csv`,
            columns: [
              { header: "Personnel", accessor: (r) => getNameFromObj(r.employeeId || r.employee) || r.employeeName || "Unknown" },
              { header: "Project Scope", accessor: (r) => r.projectName || "—" },
              // { header: "Booking Context", accessor: (r) => (r.bookingSnapshot || {}).hotelName || r.bookingType || "Hotel Booking" },
              // { header: "Order ID", accessor: (r) => r.orderId || "—" },
              { header: "Designated Approver", accessor: (r) => getNameFromObj(r.managerId || r.manager) || r.managerName || "Manager" },
              { header: "Requested On", accessor: (r) => r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-IN") : "—" },
              { header: "Status", key: "status" }
            ]
          }}
          wrapperClass="!border-none !shadow-none"
          pagination={<Pagination currentPage={currentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />}
        >
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-[#003399] to-[#000d26] text-white">
                <Th className="!px-6 !py-5">Personnel</Th>
                <Th className="!px-6 !py-5">Project Scope</Th>
                {/* <Th className="!px-6 !py-5">Booking Context</Th>
                <Th className="!px-6 !py-5">Order ID</Th> */}
                <Th className="!px-6 !py-5">Designated Approver</Th>
                <Th className="!px-6 !py-5">Requested On</Th>
                <Th className="!px-6 !py-5">Status</Th>
                <Th className="!px-6 !py-5 !text-center">Action</Th>
              </tr>
            </thead>
            <tbody>
              {paginated.length > 0 ? paginated.map((req, i) => {
                const employee = req.employeeId || req.employee || {};
                const employeeName = getNameFromObj(employee) || req.employeeName || "Unknown";
                const managerName = getNameFromObj(req.managerId || req.manager) || req.managerName || "Manager";
                const bookingSnap = req.bookingSnapshot || {};
                const isPending = req.status === "pending";

                return (
                  <tr key={req._id} className="hover:bg-slate-50 transition-colors" style={{ background: i % 2 === 0 ? C.white : C.lightGray }}>
                    <td className="!px-6 !py-5">
                       <div className="flex items-center gap-3">
                          <Avatar name={employeeName} />
                          <div className="min-w-0">
                            <p className="text-xs font-black truncate max-w-[140px]" style={{ color: C.navy }}>{employeeName}</p>
                            <p className="text-[9px] font-bold text-slate-400 truncate max-w-[140px]">{employee.email || req.employeeEmail}</p>
                          </div>
                       </div>
                    </td>
                    <td className="!px-6 !py-5">
                       <p className="text-xs font-black truncate max-w-[150px]" style={{ color: C.navy }}>{req.projectName || "—"}</p>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{req.projectCodeId || "—"}</p>
                    </td>
                    {/* <td className="!px-6 !py-5">
                       <p className="text-xs font-black truncate max-w-[150px]" style={{ color: C.navy }}>{bookingSnap.hotelName || req.bookingType || "Hotel Booking"}</p>
                       <p className="text-[10px] font-bold text-gold uppercase">{bookingSnap.city || "—"}</p>
                    </td>
                    <td className="!px-6 !py-5">
                       <p className="text-[11px] font-black" style={{ color: C.navy }}>{req.orderId || "—"}</p>
                    </td> */}
                    <td className="!px-6 !py-5">
                       <div className="flex items-center gap-2">
                          <Avatar name={managerName} size="sm" />
                          <div className="min-w-0">
                             <p className="text-[11px] font-black truncate max-w-[120px]" style={{ color: C.navy }}>{managerName}</p>
                             <p className="text-[9px] font-bold text-slate-400 truncate max-w-[120px]">{req.managerEmail || "—"}</p>
                          </div>
                       </div>
                    </td>
                    <td className="!px-6 !py-5 text-[11px] font-bold text-slate-500 uppercase">
                      {req.createdAt ? new Date(req.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                    </td>
                    <td className="!px-6 !py-5">
                       <StatusBadge status={req.status} />
                    </td>
                    <td className="!px-6 !py-5 !text-center">
                       {isPending ? (
                          <div className="flex items-center justify-center gap-2">
                             <button 
                               onClick={() => handleApprove(req._id)}
                               disabled={actionLoadingId === req._id}
                               className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all shadow-sm group"
                               title="Approve"
                             >
                               <FiCheck size={14} />
                             </button>
                             <button 
                               onClick={() => handleReject(req._id)}
                               disabled={actionLoadingId === req._id}
                               className="p-2 rounded-lg bg-red-50 text-red-600 border border-red-100 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                               title="Reject"
                             >
                               <FiX size={14} />
                             </button>
                          </div>
                       ) : (
                          <div className="flex justify-center">
                             <div className={`p-2 rounded-lg border flex items-center justify-center ${req.status === "approved" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-red-50 text-red-600 border-red-100"}`}>
                                {req.status === "approved" ? <MdVerifiedUser size={16} /> : <FiXCircle size={16} />}
                             </div>
                          </div>
                       )}
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={7} className="!px-6 !py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                        <FiInbox size={32} />
                      </div>
                      <p className="text-sm font-bold text-slate-400">No verification requests found matching the criteria.</p>
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

export default ManagerRequestsPage;
