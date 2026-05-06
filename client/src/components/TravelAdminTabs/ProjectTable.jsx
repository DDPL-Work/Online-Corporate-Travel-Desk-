import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import { ToastWithTimer } from "../../utils/ToastConfirm";
import { fetchProjects, deleteProject as deleteProjectAction, getProjectFlightExpenses, getProjectHotelExpenses } from "../../Redux/Actions/project.thunk";

import {
  HiMagnifyingGlass,
  HiEye,
  HiTrash,
  HiTableCells,
  HiUsers,
  HiCheckBadge,
  HiNoSymbol,
  HiChevronDown,
  HiXMark,
  HiDocumentText,
  HiArrowLeft,
  HiCurrencyRupee,
  HiCalendarDays,
  HiCalculator,
  HiChevronLeft,
  HiChevronRight,
} from "react-icons/hi2";
import { MdOutlineFolder } from "react-icons/md";
import { FaPlane, FaHotel } from "react-icons/fa";
import { FiSearch, FiCalendar, FiX } from "react-icons/fi";
import TableScrollWrapper from "../common/TableScrollWrapper";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const AVATAR_PALETTES = [
  { bg: "bg-teal-100",   text: "text-teal-700" },
  { bg: "bg-violet-100", text: "text-violet-700" },
  { bg: "bg-blue-100",   text: "text-blue-700" },
  { bg: "bg-orange-100", text: "text-orange-700" },
  { bg: "bg-emerald-100",text: "text-emerald-700" },
  { bg: "bg-rose-100",   text: "text-rose-700" },
  { bg: "bg-amber-100",  text: "text-amber-700" },
  { bg: "bg-cyan-100",   text: "text-cyan-700" },
];

function getAvatar(str) {
  const safeStr = String(str ?? "");
  let h = 0;
  for (const c of safeStr) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_PALETTES[h % AVATAR_PALETTES.length];
}

function initials(str) {
  const safeStr = String(str ?? "").trim();
  return safeStr
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function fmtDate(d) {
  const date = d ? new Date(d) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, borderColor, iconBg, iconColor }) {
  return (
    <div className={`bg-white rounded-xl p-5 shadow-sm border-l-4 ${borderColor} flex items-center gap-4`}>
      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-3xl font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

/* ======================================================
   💰 PROJECT EXPENSE MODAL
====================================================== */
function ProjectExpenseModal({ project, onClose }) {
  const dispatch = useDispatch();
  const { expenses } = useSelector((state) => state.corporateProject);
  const [activeTab, setActiveTab] = useState("flight");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [modalPage, setModalPage] = useState(1);
  const itemsPerPage = 5;
  useEffect(() => {
    // User instruction: project id is also known as project code id, use projectId everywhere
    const projectId = project.projectCodeId || project.code || project.projectId || project._id;
    dispatch(getProjectFlightExpenses(projectId));
    dispatch(getProjectHotelExpenses(projectId));
  }, [dispatch, project]);

  useEffect(() => {
    setModalPage(1);
  }, [activeTab, search, startDate, endDate]);

  const data = activeTab === "flight" ? expenses.flight : expenses.hotel;

  const filtered = data.filter((item) => {
    const q = search.toLowerCase();
    
    // Extract employee name
    const empName = item.userId?.name 
      ? `${item.userId.name.firstName || ""} ${item.userId.name.lastName || ""}` 
      : `${item.travellers?.[0]?.firstName || "Unknown"} ${item.travellers?.[0]?.lastName || ""}`;
    
    const empEmail = item.userId?.email || item.travellers?.[0]?.email || "";
    const orderId = (item.orderId || "").toLowerCase();

    // Check dates (using travel date or creation date as fallback)
    const travelDate = new Date(item.bookingSnapshot?.travelDate || item.bookingSnapshot?.checkInDate || item.createdAt);
    const dateOk = (!startDate || travelDate >= new Date(startDate)) && (!endDate || travelDate <= new Date(endDate));
    
    // Search check
    const searchOk = !q || empName.toLowerCase().includes(q) || empEmail.toLowerCase().includes(q) || orderId.includes(q);

    return dateOk && searchOk;
  });

  const totalSpend = filtered.reduce((sum, it) => sum + (it.pricingSnapshot?.totalAmount || 0), 0);
  const totalBookings = filtered.length;
  const totalPages = Math.ceil(totalBookings / itemsPerPage);
  const paginatedData = filtered.slice((modalPage - 1) * itemsPerPage, modalPage * itemsPerPage);

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <HiTableCells className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                Project Expenses: {project.projectName || project.name}
              </h2>
              <p className="text-sm text-slate-500 font-medium">
                Project ID: <span className="font-mono text-indigo-600 font-bold">{project.projectCodeId || project.code}</span> · Client: {project.clientName || project.client}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors text-slate-400 hover:text-slate-600"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6">
          
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
                <HiCurrencyRupee className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Project Spend</p>
                <p className="text-2xl font-black text-slate-800">₹{totalSpend.toLocaleString()}</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                <HiCalendarDays className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Bookings</p>
                <p className="text-2xl font-black text-slate-800">{totalBookings}</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                <HiCalculator className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg. Cost / Booking</p>
                <p className="text-2xl font-black text-slate-800">₹{(totalBookings > 0 ? totalSpend / totalBookings : 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
            </div>
          </div>

          {/* Filters & Tabs */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              
              {/* Tabs */}
              <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                <button
                  onClick={() => setActiveTab("flight")}
                  className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                    activeTab === "flight" 
                    ? "bg-white text-indigo-600 shadow-sm" 
                    : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <FaPlane className="w-3.5 h-3.5" />
                  Flight Expenses
                </button>
                <button
                  onClick={() => setActiveTab("hotel")}
                  className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                    activeTab === "hotel" 
                    ? "bg-white text-indigo-600 shadow-sm" 
                    : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <FaHotel className="w-3.5 h-3.5" />
                  Hotel Expenses
                </button>
              </div>

              {/* Filters */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative group">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                      type="text"
                      placeholder="Search by ID or Name..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-64 transition-all"
                    />
                  </div>
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                    <FiCalendar className="text-slate-400 w-4 h-4" />
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-transparent border-none outline-none text-xs text-slate-600 cursor-pointer"
                    />
                    <span className="text-slate-300">to</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-transparent border-none outline-none text-xs text-slate-600 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
            {expenses.loading ? (
               <div className="py-20 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
                  <p className="text-slate-500 font-medium">Fetching expense reports...</p>
               </div>
            ) : filtered.length === 0 ? (
               <div className="py-20 flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <HiDocumentText className="w-10 h-10 text-slate-300" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">No Expenses Found</h3>
                  <p className="text-slate-500 max-w-xs mt-1">We couldn't find any {activeTab} bookings matching your filters.</p>
               </div>
            ) : (
              <TableScrollWrapper>
                <table className="w-full text-left min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Order ID</th>
                      <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Employee</th>
                      <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                        {activeTab === "flight" ? "Travel Date" : "Stay Dates"}
                      </th>
                      <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Approver</th>
                      <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedData.map((item) => {
                      const empName = item.userId?.name 
                        ? `${item.userId.name.firstName || ""} ${item.userId.name.lastName || ""}` 
                        : `${item.travellers?.[0]?.firstName || "Unknown"} ${item.travellers?.[0]?.lastName || ""}`;
                      const empEmail = item.userId?.email || item.travellers?.[0]?.email || "—";
                      
                      const approverName = item.approvedBy?.name 
                        ? `${item.approvedBy.name.firstName || ""} ${item.approvedBy.name.lastName || ""}` 
                        : item.approverName || "Auto Approved";
                        
                      const isAuto = !item.approvedBy && (item.approverName === "Auto Approver" || item.requestStatus === "approved");

                      return (
                        <tr key={item._id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 py-4">
                            <span className="font-mono text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                              {item.orderId || "N/A"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-sm font-bold text-slate-800">{empName}</p>
                              <p className="text-xs text-slate-400">{empEmail}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {activeTab === "flight" ? (
                              <span className="text-sm font-medium text-slate-600">
                                {new Date(item.bookingSnapshot?.travelDate || item.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                            ) : (
                              <div>
                                <p className="text-sm font-bold text-slate-800">
                                  {new Date(item.bookingSnapshot?.checkInDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                </p>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">
                                  to {new Date(item.bookingSnapshot?.checkOutDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </p>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {isAuto ? (
                                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-100">
                                  Auto Approved
                                </span>
                              ) : (
                                <div>
                                  <p className="text-sm font-bold text-slate-800">{approverName}</p>
                                  <p className="text-[10px] text-slate-400 uppercase font-black">{item.approvedBy?.role || "Manager"}</p>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-sm font-black text-slate-900">
                              ₹{(item.pricingSnapshot?.totalAmount || 0).toLocaleString()}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </TableScrollWrapper>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
           <div className="flex items-center gap-4">
             <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
               Showing {Math.min(totalBookings, (modalPage-1)*itemsPerPage + 1)}-{Math.min(totalBookings, modalPage*itemsPerPage)} of {totalBookings} records
             </p>
             
             {totalPages > 1 && (
               <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
                 <button 
                   disabled={modalPage === 1}
                   onClick={() => setModalPage(p => p - 1)}
                   className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-50 disabled:opacity-30 transition-all"
                 >
                   <HiChevronDown className="w-5 h-5 rotate-90" />
                 </button>
                 <span className="text-xs font-black text-slate-600 px-2">Page {modalPage} of {totalPages}</span>
                 <button 
                   disabled={modalPage === totalPages}
                   onClick={() => setModalPage(p => p + 1)}
                   className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-50 disabled:opacity-30 transition-all"
                 >
                   <HiChevronDown className="w-5 h-5 -rotate-90" />
                 </button>
               </div>
             )}
           </div>

           <button 
             onClick={onClose}
             className="px-8 py-2.5 bg-slate-800 text-white text-sm font-black uppercase tracking-widest rounded-xl hover:bg-slate-900 transition-all active:scale-95 shadow-lg shadow-slate-200"
           >
             Close Report
           </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function ProjectsTable({ projects, setProjects }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { projects: storedProjects, deleteLoading } = useSelector((state) => state.corporateProject);
  const { user } = useSelector((state) => state.auth);

  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [localProjects, setLocalProjects] = useState([]);
  const [selectedProjectForExpenses, setSelectedProjectForExpenses] = useState(null);

  const effectiveProjects = Array.isArray(projects) ? projects : localProjects;

  useEffect(() => {
    if (Array.isArray(storedProjects) && storedProjects.length > 0) {
      setLocalProjects(storedProjects);
    }
  }, [storedProjects]);

  const storedUser = (() => {
    try {
      return JSON.parse(sessionStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  })();

  const authUser = user ?? storedUser;
  const corporateId = authUser?.corporateId || authUser?.corporate?._id || authUser?._id;

  useEffect(() => {
    if (corporateId) {
      dispatch(fetchProjects(corporateId));
    }
  }, [dispatch, corporateId]);

  const handleDeleteProject = async (project) => {
    const projectId = project._id || project.id;
    if (!projectId || !corporateId) {
      ToastWithTimer({ type: "error", message: "Unable to delete project." });
      return;
    }

    const result = await Swal.fire({
      title: "Delete project?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      await dispatch(
        deleteProjectAction({ id: projectId, corporateId })
      ).unwrap();

      ToastWithTimer({ type: "success", message: "Project deleted." });
      setLocalProjects((prev) => prev.filter((p) => (p._id || p.id) !== projectId));
    } catch (err) {
      ToastWithTimer({
        type: "error",
        message: err.message || "Failed to delete project.",
      });
    }
  };

  // ── Derived values ──────────────────────────────────────────
  const clients = [...new Set(effectiveProjects.map((p) => p.clientName || p.client || ""))]
    .filter(Boolean)
    .sort();
  const totalClients = clients.length;

  const filtered = effectiveProjects.filter((p) => {
    const q = search.toLowerCase();

    const name = (p.projectName || p.name || "").toLowerCase();
    const code = (p.projectCodeId || p.code || "").toLowerCase();
    const client = (p.clientName || p.client || "").toLowerCase();

    const matchQ = !q || name.includes(q) || code.includes(q) || client.includes(q);
    const matchC = !clientFilter || client === clientFilter.toLowerCase();
    return matchQ && matchC;
  });

  // ────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-slate-100 font-sans" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <main className="flex-1 overflow-y-auto p-6">

        {selectedProjectForExpenses && (
          <ProjectExpenseModal
            project={selectedProjectForExpenses}
            onClose={() => setSelectedProjectForExpenses(null)}
          />
        )}

        {/* Page heading */}
        <div className="flex items-center justify-between mb-7">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
              <HiTableCells className="w-6 h-6 text-indigo-500" />
            </div>
            <div>
              <h1 className="text-[22px] font-semibold text-slate-800">Projects Directory</h1>
              <p className="text-[13px] text-slate-500 mt-0.5">
                All uploaded project records for <strong className="text-slate-700">acme.com</strong>
              </p>
            </div>
          </div>

          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            <HiArrowLeft className="w-4 h-4" />
            Back to Upload
          </button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-4 gap-4 mb-7">
          <StatCard label="Total Projects" value={effectiveProjects.length} icon={HiTableCells}  borderColor="border-[#2a9d8f]"  iconBg="bg-teal-50"    iconColor="text-[#2a9d8f]" />
          <StatCard label="Total Clients"  value={totalClients}    icon={HiUsers}        borderColor="border-violet-500"  iconBg="bg-violet-50"  iconColor="text-violet-500" />
        </div>

        {/* Projects Table */}
        <div className="bg-white rounded-xl shadow-sm">

          {/* Toolbar */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="text-[15px] font-semibold text-slate-800 flex items-center gap-2">
              Projects
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-500 rounded-full">
                {filtered.length} record{filtered.length !== 1 ? "s" : ""}
              </span>
            </h2>
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg w-56">
                <HiMagnifyingGlass className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search projects…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-transparent border-none outline-none text-[13px] text-slate-700 placeholder-slate-400 w-full"
                />
              </div>

              {/* Client filter */}
              <div className="relative">
                <select
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] text-slate-600 outline-none cursor-pointer"
                >
                  <option value="">All Clients</option>
                  {clients.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <HiChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

            </div>
          </div>

          {/* Table */}
          <TableScrollWrapper>
            <table className="w-full min-w-[800px]">
              <thead>
                <tr style={{ background: "#1b3a4b" }}>
                  {["Project Code ID", "Project", "Client Name", "Added On", "Actions"].map((h) => (
                    <th
                      key={h}
                      className={`px-5 py-3.5 text-[11px] font-semibold text-white/80 uppercase tracking-wider whitespace-nowrap
                        ${h === "Actions" ? "text-center" : "text-left"}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => {
                  const projectName = p.projectName || p.name || "Untitled Project";
                  const projectCode = p.projectCodeId || p.code || "—";
                  const clientName = p.clientName || p.client || "—";
                  const createdAt = p.createdAt || p.addedOn;
                  const av = getAvatar(projectName);
                  return (
                    <tr key={p._id || p.id || i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[12px] font-mono font-semibold rounded-md">
                          {projectCode}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg ${av.bg} ${av.text} flex items-center justify-center text-[12px] font-bold shrink-0`}>
                            {initials(projectName)}
                          </div>
                          <span className="text-[13px] font-semibold text-slate-800">{projectName}</span>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 text-[12px] font-semibold rounded-full border border-blue-100">
                          {clientName}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-[13px] text-slate-500">
                        {fmtDate(createdAt)}
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            title="View Expenses"
                            onClick={() => setSelectedProjectForExpenses(p)}
                            className="w-7 h-7 rounded-md border border-indigo-200 bg-indigo-50 flex items-center justify-center hover:bg-indigo-100 transition"
                          >
                            <HiEye className="w-3.5 h-3.5 text-indigo-500" />
                          </button>
                          <button
                            title="Delete"
                            onClick={() => handleDeleteProject(p)}
                            disabled={deleteLoading}
                            className="w-7 h-7 rounded-md border border-rose-200 bg-rose-50 flex items-center justify-center hover:bg-rose-100 transition disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <HiTrash className="w-3.5 h-3.5 text-rose-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Empty state */}
            {filtered.length === 0 && (
              <div className="py-16 text-center">
                <HiDocumentText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-[14px] text-slate-400 font-medium">
                  {effectiveProjects.length === 0 ? "No projects yet" : "No projects match your search"}
                </p>
                <p className="text-[12px] text-slate-300 mt-1">
                  {effectiveProjects.length === 0
                    ? "Upload an Excel file on the previous page to get started"
                    : "Try adjusting your search or filters"}
                </p>
              </div>
            )}
          </TableScrollWrapper>
        </div>

      </main>
    </div>
  );
}