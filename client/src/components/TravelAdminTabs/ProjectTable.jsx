import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import { ToastWithTimer } from "../../utils/ToastConfirm";
import { 
  fetchProjects, 
  deleteProject as deleteProjectAction, 
  getProjectFlightExpenses, 
  getProjectHotelExpenses 
} from "../../Redux/Actions/project.thunk";
import { fetchEmployees } from "../../Redux/Slice/employeeActionSlice";

import {
  HiMagnifyingGlass,
  HiEye,
  HiTrash,
  HiTableCells,
  HiUsers,
  HiCurrencyRupee,
  HiCalendarDays,
  HiCalculator,
  HiArrowLeft,
  HiArrowRight,
  HiDocumentText,
  HiXMark,
  HiChevronLeft,
  HiChevronRight
} from "react-icons/hi2";
import { FiRefreshCw, FiX, FiSearch, FiCalendar, FiArrowRight, FiClock, FiList } from "react-icons/fi";
import { FaPlane, FaHotel, FaClipboardList, FaRupeeSign } from "react-icons/fa";
import {
  LabeledField,
  CustomDropdown,
  StatCard,
  IdCell,
  Th,
  StatusBadge,
  SearchBar,
  dateCls
} from "./Shared/CommonComponents";
import ResponsiveDataTable from "./Shared/ResponsiveDataTable";
import { Pagination } from "./Shared/Pagination";
import { C } from "../Shared/color";
import { airlineLogo } from "../../utils/formatter";

/* ─────────────────────────────────────────────────────────────── */
/*  Helpers                                                        */
/* ─────────────────────────────────────────────────────────────── */
const AVATAR_PALETTES = [
  { bg: "#00339910", text: "#003399" },
  { bg: "#7C3AED10", text: "#7C3AED" },
  { bg: "#2563EB10", text: "#2563EB" },
  { bg: "#EA580C10", text: "#EA580C" },
  { bg: "#05966910", text: "#059669" },
  { bg: "#E11D4810", text: "#E11D48" },
  { bg: "#D9770610", text: "#D97706" },
  { bg: "#0891B210", text: "#0891B2" },
];

function getAvatar(str) {
  const safeStr = String(str ?? "");
  let h = 0;
  for (const c of safeStr) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  const p = AVATAR_PALETTES[h % AVATAR_PALETTES.length];
  return p;
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
  if (!date || Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const RouteCell = ({ routes, airline }) => {
  if (!routes || routes.length === 0)
    return <span className="text-slate-400">No Route</span>;

  const airlineCode = (airline?.airlineCode || "AI").toUpperCase();
  const airlineName = airline?.airlineName || "Airline";
  const logoUrl = airlineLogo(airlineCode);

  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-white border border-slate-100 flex items-center justify-center p-1.5 shadow-sm overflow-hidden">
        <img src={logoUrl}
          alt={airlineName}
          className="w-full h-full object-contain"
          loading="eager" onError={(e) => {
            e.target.onerror = null;
            e.target.src =
              "https://cdn-icons-png.flaticon.com/512/3114/3114883.png";
          }}
        />
      </div>
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-black text-slate-800 uppercase tracking-tight">
            {routes[0].fromCode}
          </span>
          <FiArrowRight size={12} className="text-slate-400" />
          <span className="text-[13px] font-black text-slate-800 uppercase tracking-tight">
            {routes.length > 1
              ? routes[0].toCode
              : routes[routes.length - 1].toCode}
          </span>
          {routes.length > 1 && (
            <span className="bg-amber-50 text-amber-600 text-[8px] font-black px-1.5 py-0.5 rounded border border-amber-100 ml-1">
              RT
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
          <span className="capitalize">{routes[0].fromCity || "Origin"}</span>
          <span>→</span>
          <span className="capitalize">
            {routes.length > 1
              ? routes[0].toCity || "Turnaround"
              : routes[routes.length - 1].toCity || "Dest"}
          </span>
        </div>
      </div>
    </div>
  );
};

/* ───────────────────────────────────────────────────────────────────────────── */
/*  💰 PROJECT EXPENSE MODAL                                                    */
/* ───────────────────────────────────────────────────────────────────────────── */
function ProjectExpenseModal({ project, onClose }) {
  const dispatch = useDispatch();
  const scrollRef = useRef(null);
  const { expenses } = useSelector((state) => state.corporateProject);
  const [activeTab, setActiveTab] = useState("flight");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [modalPage, setModalPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    const projectId = project.projectCodeId || project.code || project.projectId || project._id;
    dispatch(getProjectFlightExpenses(projectId));
    dispatch(getProjectHotelExpenses(projectId));
  }, [dispatch, project]);

  const data = activeTab === "flight" ? expenses.flight : expenses.hotel;

  const filtered = useMemo(() => {
    return data.filter((item) => {
      const q = search.toLowerCase();
      const empName = item.userId?.name 
        ? `${item.userId.name.firstName || ""} ${item.userId.name.lastName || ""}` 
        : `${item.travellers?.[0]?.firstName || "Unknown"} ${item.travellers?.[0]?.lastName || ""}`;
      
      const empEmail = item.userId?.email || item.travellers?.[0]?.email || "";
      const orderId = (item.orderId || "").toLowerCase();

      const travelDate = new Date(item.bookingSnapshot?.travelDate || item.bookingSnapshot?.checkInDate || item.createdAt);
      const dateOk = (!startDate || travelDate >= new Date(startDate)) && (!endDate || travelDate <= new Date(endDate));
      const searchOk = !q || empName.toLowerCase().includes(q) || empEmail.toLowerCase().includes(q) || orderId.includes(q);

      return dateOk && searchOk;
    });
  }, [data, search, startDate, endDate]);

  const totalSpend = useMemo(() => filtered.reduce((sum, it) => sum + (it.pricingSnapshot?.totalAmount || 0), 0), [filtered]);
  const totalBookings = filtered.length;
  const totalPages = Math.ceil(totalBookings / itemsPerPage);
  const paginatedData = filtered.slice((modalPage - 1) * itemsPerPage, modalPage * itemsPerPage);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-10 bg-[#000D26]70 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-7xl h-full max-h-[850px] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border border-white/20">
        
        {/* Header */}
        <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-white relative z-10">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#003399] to-[#000d26] flex items-center justify-center shadow-xl shadow-blue-900/10">
              <HiTableCells className="w-8 h-8 text-[#E7C695]" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                Project Audit Ledger
              </h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-[2px] mt-1">
                {project.projectName || project.name} <span className="mx-2 opacity-30">/</span> <span className="text-[#003399] font-mono">{project.projectCodeId || project.code}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 flex items-center justify-center transition-all active:scale-95 shadow-sm">
            <HiXMark size={28} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-slate-50/30 p-10 custom-scrollbar">
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
            <div className="bg-white p-7 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-6 group hover:shadow-xl hover:-translate-y-1 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-[#003399]10 flex items-center justify-center">
                <HiCurrencyRupee className="w-8 h-8 text-[#003399]" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cumulative Spend</p>
                <p className="text-3xl font-black text-slate-800 tabular-nums">₹{totalSpend.toLocaleString()}</p>
              </div>
            </div>
            <div className="bg-white p-7 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-6 group hover:shadow-xl hover:-translate-y-1 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <HiCalendarDays className="w-8 h-8 text-emerald-500" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Deployments</p>
                <p className="text-3xl font-black text-slate-800 tabular-nums">{totalBookings}</p>
              </div>
            </div>
            <div className="bg-white p-7 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-6 group hover:shadow-xl hover:-translate-y-1 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center">
                <HiCalculator className="w-8 h-8 text-amber-500" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Efficiency Index</p>
                <p className="text-3xl font-black text-slate-800 tabular-nums">₹{(totalBookings > 0 ? totalSpend / totalBookings : 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
            </div>
          </div>

          {/* Filters & Tabs */}
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 mb-8">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
              
              <div className="flex bg-slate-50 p-1.5 rounded-2xl w-fit border border-slate-100 shadow-inner">
                <button
                  onClick={() => setActiveTab("flight")}
                  className={`flex items-center gap-3 px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                    activeTab === "flight" 
                    ? "bg-[#000D26] text-white shadow-lg scale-[1.02]" 
                    : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <FaPlane size={14} /> Flight Logs
                </button>
                <button
                  onClick={() => setActiveTab("hotel")}
                  className={`flex items-center gap-3 px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                    activeTab === "hotel" 
                    ? "bg-[#000D26] text-white shadow-lg scale-[1.02]" 
                    : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <FaHotel size={14} /> Hotel Logs
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="relative group flex-1 min-w-[300px]">
                  <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#003399] transition-colors" />
                  <input
                    type="text"
                    placeholder="Search Reference or Personnel..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-blue-900/5 focus:border-[#003399] transition-all placeholder:text-slate-300"
                  />
                </div>
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3">
                  <FiCalendar className="text-slate-300 w-4 h-4" />
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent border-none outline-none text-[11px] font-black text-slate-600 cursor-pointer uppercase" />
                  <span className="text-slate-200">/</span>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent border-none outline-none text-[11px] font-black text-slate-600 cursor-pointer uppercase" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden relative">
            <div className="px-10 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Transaction Ledger</h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => { if(scrollRef.current) scrollRef.current.scrollBy({ left: -300, behavior: 'smooth' }); }}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-[#003399] hover:border-[#003399] transition-all shadow-sm active:scale-90"
                >
                  <HiChevronLeft size={16} />
                </button>
                <button 
                  onClick={() => { if(scrollRef.current) scrollRef.current.scrollBy({ left: 300, behavior: 'smooth' }); }}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-[#003399] hover:border-[#003399] transition-all shadow-sm active:scale-90"
                >
                  <HiChevronRight size={16} />
                </button>
              </div>
            </div>
            {expenses.loading ? (
               <div className="py-24 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 border-[6px] border-slate-100 border-t-[#003399] rounded-full animate-spin mb-6" />
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Compiling Audit Trail...</p>
               </div>
            ) : filtered.length === 0 ? (
               <div className="py-24 flex flex-col items-center justify-center text-center">
                  <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mb-6 shadow-inner text-slate-200">
                    <HiDocumentText size={48} />
                  </div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">Zero Reconciliation Found</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Adjust filters to re-scan the database</p>
               </div>
            ) : (
              <div ref={scrollRef} className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left min-w-[900px] border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100">
                      <Th className="!px-10 !py-6">Reference ID</Th>
                      <Th className="!px-10 !py-6">Personnel</Th>
                      <Th className="!px-10 !py-6">{activeTab === "flight" ? "Travel Date" : "Timeline"}</Th>
                      <Th className="!px-10 !py-6">Authorization</Th>
                      <Th className="!px-10 !py-6 text-right">Net Amount</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {paginatedData.map((item, i) => {
                      const empName = item.userId?.name 
                        ? `${item.userId.name.firstName || ""} ${item.userId.name.lastName || ""}` 
                        : `${item.travellers?.[0]?.firstName || "Unknown"} ${item.travellers?.[0]?.lastName || ""}`;
                      const empEmail = item.userId?.email || item.travellers?.[0]?.email || "—";
                      const approverName = item.approvedBy?.name ? `${item.approvedBy.name.firstName || ""} ${item.approvedBy.name.lastName || ""}` : item.approverName || "Auto Processed";
                      const isAuto = !item.approvedBy && (item.approverName === "Auto Approver" || item.requestStatus === "approved");

                      return (
                        <tr key={item._id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="!px-10 !py-6"><IdCell id={item.orderId} /></td>
                          <td className="!px-10 !py-6">
                            <div>
                              <p className="text-sm font-black text-slate-800 tracking-tight">{empName}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{empEmail}</p>
                            </div>
                          </td>
                          <td className="!px-10 !py-6">
                            {activeTab === "flight" ? (
                              <p className="text-[11px] font-black text-slate-600 uppercase">
                                {new Date(item.bookingSnapshot?.travelDate || item.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </p>
                            ) : (
                              <div>
                                <p className="text-[11px] font-black text-slate-800">
                                  {new Date(item.bookingSnapshot?.checkInDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} → {new Date(item.bookingSnapshot?.checkOutDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </p>
                              </div>
                            )}
                          </td>
                          <td className="!px-10 !py-6">
                             {isAuto ? (
                               <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest rounded-lg border border-emerald-100">System Validated</span>
                             ) : (
                               <div>
                                 <p className="text-[11px] font-black text-slate-800">{approverName}</p>
                                 <p className="text-[9px] text-slate-400 uppercase font-black tracking-tighter">{item.approvedBy?.role || "Unit Admin"}</p>
                               </div>
                             )}
                          </td>
                          <td className="!px-10 !py-6 text-right">
                            <span className="text-sm font-black text-[#003399] tabular-nums">₹{(item.pricingSnapshot?.totalAmount || 0).toLocaleString()}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-10 py-6 border-t border-slate-100 bg-white flex flex-col md:flex-row justify-between items-center gap-6">
           <div className="flex items-center gap-8">
             <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
               Page {modalPage} of {totalPages || 1} <span className="mx-2">/</span> {totalBookings} Entries
             </p>
             
             {totalPages > 1 && (
               <div className="flex items-center gap-2">
                 <button disabled={modalPage === 1} onClick={() => setModalPage(p => p - 1)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 disabled:opacity-30 transition-all shadow-sm"><HiArrowLeft size={16} /></button>
                 <button disabled={modalPage === totalPages} onClick={() => setModalPage(p => p + 1)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 disabled:opacity-30 transition-all shadow-sm"><HiArrowRight size={16} /></button>
               </div>
             )}
           </div>

           <button onClick={onClose} className="group bg-[#000D26] text-white px-10 py-4 rounded-[1.2rem] text-[11px] font-black uppercase tracking-[0.2em] shadow-xl hover:shadow-2xl transition-all active:scale-95 flex items-center gap-3">
             Exit Audit <FiX size={16} className="group-hover:rotate-90 transition-transform" />
           </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────────── */
/*  MAIN COMPONENT                                                              */
/* ───────────────────────────────────────────────────────────────────────────── */
export default function ProjectsTable({ projects, setProjects }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { projects: storedProjects, deleteLoading, expenses } = useSelector((state) => state.corporateProject);
  const { user } = useSelector((state) => state.auth);
  const { employees } = useSelector((state) => state.employeeAction);

  // Top-Level Tab Switcher: "directory" vs "bookings"
  const [activeMainTab, setActiveMainTab] = useState("directory");

  // Project selector state for Bookings tab
  const [selectedProjectId, setSelectedProjectId] = useState("");

  // Booking Type selector: "all" vs "flight" vs "hotel"
  const [bookingTypeFilter, setBookingTypeFilter] = useState("all");

  // Selected Employee filter state for Bookings tab
  const [selectedEmployeeEmail, setSelectedEmployeeEmail] = useState("all");

  // Fetch employees list on load
  useEffect(() => {
    dispatch(fetchEmployees());
  }, [dispatch]);

  // Project Registry filters
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("All Clients");
  const [localProjects, setLocalProjects] = useState([]);
  const [selectedProjectForExpenses, setSelectedProjectForExpenses] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Project Bookings filters & pagination
  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingStartDate, setBookingStartDate] = useState("");
  const [bookingEndDate, setBookingEndDate] = useState("");
  const [bookingPage, setBookingPage] = useState(1);

  const effectiveProjects = Array.isArray(projects) ? projects : localProjects;

  useEffect(() => {
    if (Array.isArray(storedProjects)) {
      setLocalProjects(storedProjects);
    }
  }, [storedProjects]);

  const authUser = user || JSON.parse(sessionStorage.getItem("user") || "null");
  const corporateId = authUser?.corporateId || authUser?.corporate?._id || authUser?._id;

  const handleRefresh = async () => {
    if (activeMainTab === "directory") {
      if (corporateId) {
        setIsSyncing(true);
        await dispatch(fetchProjects(corporateId));
        setTimeout(() => setIsSyncing(false), 500);
      }
    } else {
      if (selectedProjectId) {
        setIsSyncing(true);
        await Promise.all([
          dispatch(getProjectFlightExpenses(selectedProjectId)),
          dispatch(getProjectHotelExpenses(selectedProjectId))
        ]);
        setTimeout(() => setIsSyncing(false), 500);
      }
    }
  };

  useEffect(() => {
    if (corporateId) dispatch(fetchProjects(corporateId));
  }, [dispatch, corporateId]);

  // Auto-select the first project code when switching to the Bookings tab
  useEffect(() => {
    if (activeMainTab === "bookings" && !selectedProjectId) {
      setSelectedProjectId("all");
    }
  }, [activeMainTab, selectedProjectId]);

  // Fetch flight and hotel expenses for selected project reactively
  useEffect(() => {
    if (selectedProjectId) {
      dispatch(getProjectFlightExpenses(selectedProjectId));
      dispatch(getProjectHotelExpenses(selectedProjectId));
    }
  }, [dispatch, selectedProjectId]);

  const handleDeleteProject = async (project) => {
    const projectId = project._id || project.id;
    const result = await Swal.fire({
      title: "Archive Project?",
      text: "This record will be permanently purged from the registry.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Purge Record",
      confirmButtonColor: "#E11D48",
      cancelButtonText: "Keep Active",
      reverseButtons: true,
      customClass: { popup: 'rounded-[2rem] p-8' }
    });

    if (result.isConfirmed) {
      try {
        await dispatch(deleteProjectAction({ id: projectId, corporateId })).unwrap();
        ToastWithTimer({ type: "success", message: "Record Purged" });
        setLocalProjects(prev => prev.filter(p => (p._id || p.id) !== projectId));
      } catch (err) {
        ToastWithTimer({ type: "error", message: err.message || "Operation Failed" });
      }
    }
  };

  const clients = useMemo(() => {
    const c = [...new Set(effectiveProjects.map((p) => p.clientName || p.client || ""))].filter(Boolean).sort();
    return ["All Clients", ...c];
  }, [effectiveProjects]);

  const filtered = useMemo(() => {
    return effectiveProjects.filter((p) => {
      const q = search.toLowerCase();
      const name = (p.projectName || p.name || "").toLowerCase();
      const code = (p.projectCodeId || p.code || "").toLowerCase();
      const client = (p.clientName || p.client || "").toLowerCase();
      const matchQ = !q || name.includes(q) || code.includes(q) || client.includes(q);
      const matchC = clientFilter === "All Clients" || client === clientFilter.toLowerCase();
      return matchQ && matchC;
    });
  }, [effectiveProjects, search, clientFilter]);

  const paginated = useMemo(() => {
    return filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  }, [filtered, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, clientFilter]);

  // Project Selector Dropdown options mapping
  const projectOptions = useMemo(() => {
    const opts = [{ value: "all", label: "All Projects" }];
    (effectiveProjects || []).forEach((p) => {
      const id = p.projectCodeId || p.code || p.projectId || p.id || p._id;
      const name = p.projectName || p.name || "Untitled";
      opts.push({
        value: id,
        label: id,
        subLabel: name,
      });
    });
    return opts;
  }, [effectiveProjects]);

  // Employee Dropdown options mapping (no matter what roles they hold)
  const employeeOptions = useMemo(() => {
    const opts = [{ value: "all", label: "All Personnel" }];
    (employees || []).forEach((e) => {
      const name = typeof e.name === "string" 
        ? e.name 
        : `${e.name?.firstName || ""} ${e.name?.lastName || ""}`.trim();
      const email = e.email || "";
      opts.push({
        value: email.toLowerCase(),
        label: name || email,
        subLabel: email,
      });
    });
    return opts;
  }, [employees]);

  // Format Project Flight Bookings
  const formattedFlightBookings = useMemo(() => {
    return (expenses?.flight || []).map((b) => {
      const traveller = b.userId?.name
        ? `${b.userId.name.firstName || ""} ${b.userId.name.lastName || ""}`.trim()
        : `${b.travellers?.[0]?.firstName || "Staff"} ${b.travellers?.[0]?.lastName || "Member"}`.trim();
      
      const status = b.executionStatus === "ticketed" ? "Confirmed" : "Pending";
      const pnr = b.bookingResult?.pnr || "—";
      const amount = b.pricingSnapshot?.totalAmount ?? b.bookingSnapshot?.amount ?? 0;

      const segments = b.flightRequest?.segments || [];
      const onwardSegments = segments.filter(s => s.journeyType === "onward");
      const returnSegments = segments.filter(s => s.journeyType === "return");

      const buildLeg = (segs) => {
        if (!segs.length) return null;
        const first = segs[0];
        const last = segs[segs.length - 1];
        return {
          fromCode: first?.origin?.airportCode || "N/A",
          toCode: last?.destination?.airportCode || "N/A",
          fromCity: first?.origin?.city || "Unknown",
          toCity: last?.destination?.city || "Unknown",
        };
      };

      const routes = [];
      if (onwardSegments.length > 0 || returnSegments.length > 0) {
        const onwardLeg = buildLeg(onwardSegments);
        const returnLeg = buildLeg(returnSegments);
        if (onwardLeg) routes.push(onwardLeg);
        if (returnLeg) routes.push(returnLeg);
      } else if (segments.length > 0) {
        const leg = buildLeg(segments);
        if (leg) routes.push(leg);
      }

      const airline = segments[0]
        ? {
            airlineCode: segments[0].airlineCode || segments[0].airline?.airlineCode,
            airlineName: segments[0].airlineName || segments[0].airline?.airlineName,
          }
        : null;

      return {
        ...b,
        travellerName: traveller,
        employeeId: b.userId?.email || b.travellers?.[0]?.email || "—",
        status,
        pnr,
        amount,
        bookedDate: b.createdAt,
        routes,
        airline,
      };
    });
  }, [expenses?.flight]);

  // Format Project Hotel Bookings
  const formattedHotelBookings = useMemo(() => {
    return (expenses?.hotel || []).map((b) => {
      const guest = b.userId?.name
        ? `${b.userId.name.firstName || ""} ${b.userId.name.lastName || ""}`.trim()
        : "Staff Member";
      const status = b.executionStatus === "voucher_generated" ? "Confirmed" : "Pending";
      const amount = b.pricingSnapshot?.totalAmount ?? b.bookingSnapshot?.amount ?? 0;

      const hotelName = b.bookingSnapshot?.hotelName || b.hotelRequest?.selectedHotel?.hotelName || "Unknown Hotel";
      const city = b.hotelRequest?.selectedHotel?.city || b.hotelRequest?.city || b.hotelRequest?.cityName || b.bookingSnapshot?.city || "—";

      return {
        ...b,
        guestName: guest,
        employeeId: b.userId?.email || "—",
        status,
        amount,
        bookedDate: b.createdAt,
        hotelName,
        city,
      };
    });
  }, [expenses?.hotel]);

  // Merge Flight Bookings and Hotel Bookings into a Single Unified Table
  const combinedBookings = useMemo(() => {
    const list = [];
    
    // Add flight bookings
    (formattedFlightBookings || []).forEach((b) => {
      list.push({
        ...b,
        bookingType: "flight",
        key: `flight-${b._id || b.orderId}`,
      });
    });

    // Add hotel bookings
    (formattedHotelBookings || []).forEach((b) => {
      list.push({
        ...b,
        bookingType: "hotel",
        key: `hotel-${b._id || b.orderId}`,
      });
    });

    // Sort by booked date descending (newest bookings first)
    return list.sort((a, b) => {
      const da = a.bookedDate ? new Date(a.bookedDate).getTime() : 0;
      const db = b.bookedDate ? new Date(b.bookedDate).getTime() : 0;
      return db - da;
    });
  }, [formattedFlightBookings, formattedHotelBookings]);

  // Filter Combined Bookings by Search, Type, Employee & Date Window
  const filteredBookings = useMemo(() => {
    const q = bookingSearch.toLowerCase();
    
    return combinedBookings.filter((b) => {
      const booked = b.bookedDate ? new Date(b.bookedDate).toISOString().slice(0, 10) : "";
      
      const typeMatch = bookingTypeFilter === "all" || b.bookingType === bookingTypeFilter;

      const employeeMatch = selectedEmployeeEmail === "all" || 
        (b.employeeId && b.employeeId.toLowerCase() === selectedEmployeeEmail);

      const searchMatch = !q ||
        (b.bookingType === "flight" 
          ? (b.travellerName?.toLowerCase().includes(q) || b.employeeId?.toLowerCase().includes(q) || b.pnr?.toLowerCase().includes(q) || b.orderId?.toLowerCase().includes(q))
          : (b.guestName?.toLowerCase().includes(q) || b.employeeId?.toLowerCase().includes(q) || b.hotelName?.toLowerCase().includes(q) || b.orderId?.toLowerCase().includes(q))
        );

      const dateMatch = (!bookingStartDate || booked >= bookingStartDate) && (!bookingEndDate || booked <= bookingEndDate);

      return typeMatch && employeeMatch && searchMatch && dateMatch;
    });
  }, [combinedBookings, bookingSearch, bookingStartDate, bookingEndDate, bookingTypeFilter, selectedEmployeeEmail]);

  const paginatedBookings = useMemo(() => {
    return filteredBookings.slice((bookingPage - 1) * PAGE_SIZE, bookingPage * PAGE_SIZE);
  }, [filteredBookings, bookingPage]);

  useEffect(() => {
    setBookingPage(1);
  }, [bookingSearch, bookingStartDate, bookingEndDate, bookingTypeFilter, selectedProjectId, selectedEmployeeEmail]);

  const bookingTotalSpend = useMemo(() => {
    return filteredBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
  }, [filteredBookings]);

  const bookingTotalBookings = filteredBookings.length;

  const handleExport = () => {
    if (!filtered.length) return;
    const headers = ["Project ID", "Project Name", "Client Name", "Start Date", "End Date"];
    const rows = filtered.map(p => [p.projectCodeId || p.projectId || p.code || "N/A", p.projectName || p.name || "N/A", p.clientName || "N/A", fmtDate(p.startDate), fmtDate(p.endDate)]);
    const tableRows = rows.map(row => `<tr>${row.map(cell => `<td style="border:1px solid #dbe4f0;padding:8px;">${String(cell ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>`).join("")}</tr>`).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head><body><table><thead><tr>${headers.map(h => `<th style="border:1px solid #cbd5e1;padding:10px;background:#000D26;color:#fff;">${h}</th>`).join("")}</tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
    const blob = new Blob(["\ufeff", html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `projects-${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const handleBookingExport = () => {
    if (!filteredBookings.length) return;
    
    const headers = ["Booking Type", "Order ID", "Personnel", "Deployment Info", "Ingestion Date", "Status", "Amount"];
      
    const rows = filteredBookings.map((b) => {
      const isFlight = b.bookingType === "flight";
      const name = isFlight ? b.travellerName : b.guestName;
      const details = isFlight 
        ? b.routes?.map((l) => `${l.fromCode}→${l.toCode}`).join(" | ") || "—"
        : `${b.hotelName} (${b.city})`;

      return [
        b.bookingType.toUpperCase(),
        b.orderId,
        name,
        details,
        new Date(b.bookedDate).toLocaleDateString(),
        b.status,
        `₹${b.amount.toLocaleString()}`,
      ];
    });

    const tableHtml = rows
      .map(
        (r) =>
          `<tr>${r.map((c) => `<td style="border:1px solid #dbe4f0;padding:8px;">${c}</td>`).join("")}</tr>`,
      )
      .join("");
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head><body><table><thead><tr>${headers.map((h) => `<th style="border:1px solid #cbd5e1;padding:10px;background:#000D26;color:#fff;">${h}</th>`).join("")}</tr></thead><tbody>${tableHtml}</tbody></table></body></html>`;
    const blob = new Blob(["\ufeff", html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `project-manifest-${selectedProjectId}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const ledgerDateRange = useMemo(() => {
    const fmt = (d) => {
      if (!d || Number.isNaN(d.getTime())) return "—";
      return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    };

    if (bookingStartDate || bookingEndDate) {
      const start = bookingStartDate ? fmt(new Date(bookingStartDate)) : "Beginning";
      const end = bookingEndDate ? fmt(new Date(bookingEndDate)) : "Present";
      return `${start} to ${end}`;
    }

    if (filteredBookings.length === 0) return "—";
    const newest = new Date(filteredBookings[0].bookedDate);
    const oldest = new Date(filteredBookings[filteredBookings.length - 1].bookedDate);
    
    const newStr = fmt(newest);
    const oldStr = fmt(oldest);
    if (newStr === "—" || oldStr === "—") return "—";
    return newStr === oldStr ? newStr : `${oldStr} to ${newStr}`;
  }, [filteredBookings, bookingStartDate, bookingEndDate]);

  return (
    <div className="min-h-screen font-sans pb-20 -mt-6 -mx-4 md:-mx-6" style={{ background: C.offWhite }}>
      
      {selectedProjectForExpenses && <ProjectExpenseModal project={selectedProjectForExpenses} onClose={() => setSelectedProjectForExpenses(null)} />}

      {/* Header Section */}
      <div className="w-full bg-gradient-to-br from-[#003399] to-[#000d26] text-white pt-8 pb-20 px-6 md:px-10">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-3">
               <button onClick={() => navigate(-1)} className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10">
                 <HiArrowLeft size={20} />
               </button>
               <button onClick={handleRefresh} className={`p-3 rounded-xl bg-white/10 transition-all border border-white/10 ${(isSyncing || expenses?.loading) ? "opacity-50 cursor-not-allowed" : "hover:bg-white/20"}`} disabled={isSyncing || expenses?.loading}>
                 <div className={(isSyncing || expenses?.loading) ? "animate-spin" : ""}>
                   <FiRefreshCw size={20} />
                 </div>
               </button>
             </div>
             <div className="h-12 w-[1px] bg-white/10 mx-2 hidden md:block" />
             <div className="flex items-center gap-5">
               <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl text-white border border-white/10 bg-white/10" >
                 <HiTableCells size={28} />
               </div>
               <div>
                 <h1 className="text-3xl font-black tracking-tight leading-none uppercase">Projects Directory</h1>
                 <p className="text-[10px] mt-2 font-bold uppercase tracking-[2px] opacity-60">Manage, audit and track institutional project expenditures</p>
               </div>
             </div>
          </div>
          <button onClick={() => navigate("/project-management")} className="group bg-[#E7C695] hover:bg-white text-[#000D26] px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl transition-all flex items-center gap-3">
             Add Projects <HiTableCells size={16} />
          </button>
        </div>
      </div>

      <div className="w-full px-4 md:px-10 -mt-10 space-y-8">
        
        {/* Top-Level Tab Switcher */}
        <div className="flex gap-2 p-1.5 bg-white border border-slate-200/60 shadow-xl rounded-2xl w-fit">
          <button
            onClick={() => setActiveMainTab("directory")}
            className={`px-8 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all ${activeMainTab === "directory" ? "bg-[#000D26] text-white shadow-lg scale-[1.02]" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}
          >
            <HiTableCells size={14} /> Project Registry
          </button>
          <button
            onClick={() => setActiveMainTab("bookings")}
            className={`px-8 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all ${activeMainTab === "bookings" ? "bg-[#000D26] text-white shadow-lg scale-[1.02]" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}
          >
            <FaClipboardList size={14} /> Project Bookings
          </button>
        </div>

        {activeMainTab === "directory" ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard label="Total Projects" value={effectiveProjects.length} Icon={HiTableCells} borderCls="border-[#003399]" iconBgCls="bg-[#003399]10" iconColorCls="text-[#003399]" />
              <StatCard label="Active Clients" value={clients.length - 1} Icon={HiUsers} borderCls="border-violet-500" iconBgCls="bg-violet-50" iconColorCls="text-violet-600" />
              <StatCard label="Last Updated" value="Today" Icon={FiCalendar} borderCls="border-emerald-500" iconBgCls="bg-emerald-50" iconColorCls="text-emerald-600" />
            </div>

            {/* Filters */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200/60 p-8 shadow-2xl">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end">
                <div className="md:col-span-5">
                  <LabeledField label={<><HiMagnifyingGlass size={12} /> Search Directory</>}>
                    <div className="relative group">
                      <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#003399] transition-colors" />
                      <input
                        type="text"
                        placeholder="Search by name, code or client..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-900/5 focus:border-[#003399] transition-all"
                      />
                    </div>
                  </LabeledField>
                </div>
                <div className="md:col-span-4">
                  <LabeledField label={<><HiUsers size={12} /> Client Segregation</>}>
                    <CustomDropdown value={clientFilter} onChange={setClientFilter} options={clients} />
                  </LabeledField>
                </div>
                <div className="md:col-span-3">
                  <button onClick={() => { setSearch(""); setClientFilter("All Clients"); }} className="w-full py-4 rounded-2xl font-black text-[11px] text-slate-400 border-2 border-slate-50 flex items-center justify-center gap-2 hover:bg-slate-50 transition-all uppercase tracking-widest">
                    <FiX size={16} /> Reset Registry
                  </button>
                </div>
              </div>
            </div>

            {/* Table */}
              <ResponsiveDataTable 
                title="Project Registry" 
                subtitle={`${filtered.length} entries located`} 
                exportConfig={{
                  data: filtered,
                  filename: `project_registry_${new Date().toISOString().split('T')[0]}.csv`,
                  columns: [
                    { header: "ID Protocol", accessor: (p) => p.projectCodeId || p.code || "—" },
                    { header: "Project Title", accessor: (p) => p.projectName || p.name || "Untitled" },
                    { header: "Client Entity", accessor: (p) => p.clientName || p.client || "—" },
                    { header: "Flight Bookings", accessor: (p) => p.flightBookings?.length || 0 },
                    { header: "Hotel Bookings", accessor: (p) => p.hotelBookings?.length || 0 },
                    { header: "Ingestion Date", accessor: (p) => new Date(p.createdAt || p.addedOn).toLocaleDateString() }
                  ]
                }}
                wrapperClass="!border-none !shadow-none"
              pagination={<Pagination currentPage={currentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />}
            >
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-[#003399] to-[#000d26] text-white">
                    <Th className="!px-8 !py-6">ID Protocol</Th>
                    <Th className="!px-8 !py-6">Project Title</Th>
                    <Th className="!px-8 !py-6">Client Entity</Th>
                    <Th className="!px-8 !py-6">Bookings</Th>
                    <Th className="!px-8 !py-6">Ingestion Date</Th>
                    <Th className="!px-8 !py-6 text-center">Protocol Actions</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginated.map((p, i) => {
                    const projectName = p.projectName || p.name || "Untitled";
                    const projectCode = p.projectCodeId || p.code || "—";
                    const clientName = p.clientName || p.client || "—";
                    const createdAt = p.createdAt || p.addedOn;
                    const av = getAvatar(projectName);
                    return (
                      <tr key={p._id || i} className="hover:bg-slate-100/50 transition-colors group">
                        <td className="!px-8 !py-6"><IdCell id={projectCode} /></td>
                        <td className="!px-8 !py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-black shrink-0 shadow-sm transition-transform group-hover:scale-110" style={{ backgroundColor: av.bg, color: av.text }}>{initials(projectName)}</div>
                            <span className="text-sm font-black text-slate-800 tracking-tight">{projectName}</span>
                          </div>
                        </td>
                        <td className="!px-8 !py-6">
                          <span className="inline-flex items-center px-3 py-1 bg-blue-50 text-[#003399] text-[10px] font-black uppercase tracking-widest rounded-lg border border-blue-100">{clientName}</span>
                        </td>
                        <td className="!px-8 !py-6">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-400 border border-slate-100">{p.bookingCount || 0}</div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active</span>
                          </div>
                        </td>
                        <td className="!px-8 !py-6 text-[11px] font-bold text-slate-400 uppercase">{fmtDate(createdAt)}</td>
                        <td className="!px-8 !py-6">
                          <div className="flex items-center justify-center gap-3">
                            <button title="Audit Expenses" onClick={() => setSelectedProjectForExpenses(p)} className="w-10 h-10 rounded-xl bg-[#003399]10 text-[#003399] flex items-center justify-center hover:bg-[#003399] hover:text-white transition-all shadow-sm"><HiEye size={18} /></button>
                            <button title="Purge Record" onClick={() => handleDeleteProject(p)} disabled={deleteLoading} className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-sm disabled:opacity-30"><HiTrash size={18} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ResponsiveDataTable>
          </>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <StatCard
                label="Selected Project Code"
                value={selectedProjectId === "all" ? "All Projects" : selectedProjectId || "None"}
                Icon={FaClipboardList}
                borderCls="border-[#000D26]"
                iconBgCls="bg-slate-100"
                iconColorCls="text-[#000D26]"
              />
              <StatCard
                label="Total Amount"
                value={`₹${bookingTotalSpend.toLocaleString()}`}
                Icon={HiCurrencyRupee}
                borderCls="border-violet-500"
                iconBgCls="bg-violet-50"
                iconColorCls="text-violet-600"
              />
              <StatCard
                label="Ledger Timeline"
                value={ledgerDateRange}
                Icon={HiCalendarDays}
                borderCls="border-emerald-500"
                iconBgCls="bg-emerald-50"
                iconColorCls="text-emerald-600"
              />
            </div>

             {/* Selector Dropdown, Filters & Sub-Tabs */}
             <div className="bg-white rounded-2xl p-6 border shadow-sm" style={{ borderColor: C.border }}>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 items-end">
                 <LabeledField label={<><HiTableCells size={10} /> Active Project Code</>} className="lg:col-span-2">
                   <CustomDropdown
                     value={selectedProjectId}
                     onChange={setSelectedProjectId}
                     options={projectOptions}
                     placeholder="Choose Project..."
                   />
                 </LabeledField>

                 <LabeledField label={<><HiUsers size={10} /> Personnel Filter</>} className="lg:col-span-3">
                   <CustomDropdown
                     value={selectedEmployeeEmail}
                     onChange={setSelectedEmployeeEmail}
                     options={employeeOptions}
                     placeholder="Select employee..."
                   />
                 </LabeledField>
 
                 <LabeledField label={<><HiMagnifyingGlass size={10} /> Search Manifest</>} className="lg:col-span-2">
                   <SearchBar
                     value={bookingSearch}
                     onChange={setBookingSearch}
                     placeholder="Search PNR, hotel, ID..."
                   />
                 </LabeledField>
 
                 <LabeledField label="Booking Window" className="lg:col-span-3">
                   <div className="flex items-center gap-2">
                     <input
                       type="date"
                       value={bookingStartDate}
                       onChange={(e) => setBookingStartDate(e.target.value)}
                       className={dateCls}
                       style={{ borderColor: C.border }}
                     />
                     <span className="text-slate-300">to</span>
                     <input
                       type="date"
                       value={bookingEndDate}
                       onChange={(e) => setBookingEndDate(e.target.value)}
                       className={dateCls}
                       style={{ borderColor: C.border }}
                     />
                   </div>
                 </LabeledField>
 
                 <div className="flex items-end lg:col-span-2">
                   <button
                     onClick={() => {
                       setBookingSearch("");
                       setBookingStartDate("");
                       setBookingEndDate("");
                       setSelectedEmployeeEmail("all");
                     }}
                     className="w-full py-2.5 rounded-xl font-black text-[11px] flex items-center justify-center gap-2 border shadow-sm transition-all hover:bg-slate-50 uppercase tracking-widest"
                     style={{
                       background: C.white,
                       borderColor: C.border,
                       color: C.muted,
                     }}
                   >
                     <FiX /> Reset Filters
                   </button>
                 </div>
               </div>
             </div>

            {/* Booking Type Filter Tabs (All, Flight, Hotel) */}
            <div className="flex gap-2 p-1.5 bg-white border border-slate-200/60 shadow-xl rounded-2xl w-fit">
              {[
                ["all", "All Bookings", FaClipboardList],
                ["flight", "Flight Manifests", FaPlane],
                ["hotel", "Hotel Stays", FaHotel],
              ].map(([k, lbl, Icon]) => (
                <button
                  key={k}
                  onClick={() => {
                    setBookingTypeFilter(k);
                    setBookingPage(1);
                  }}
                  className={`px-8 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all ${bookingTypeFilter === k ? "bg-[#000D26] text-white shadow-lg scale-[1.02]" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}
                >
                  <Icon size={14} /> {lbl}
                </button>
              ))}
            </div>

            {/* Responsive DataTable */}
            {expenses?.loading ? (
              <div className="py-24 flex flex-col items-center justify-center bg-white rounded-[2.5rem] border border-slate-200/60 shadow-2xl">
                 <div className="w-16 h-16 border-[6px] border-slate-100 border-t-[#003399] rounded-full animate-spin mb-6" />
                 <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Compiling Project Bookings...</p>
              </div>
            ) : (
              <ResponsiveDataTable
                title={
                  bookingTypeFilter === "all"
                    ? "Combined Project Ledger"
                    : bookingTypeFilter === "flight"
                    ? "Project Flight Manifests"
                    : "Project Hotel Manifests"
                }
                subtitle={`${filteredBookings.length} deployment entries mapped`}
                exportConfig={{
                  data: filteredBookings,
                  filename: `project_bookings_${new Date().toISOString().split('T')[0]}.csv`,
                  columns: [
                    { header: "Type", key: "bookingType" },
                    { header: "Order Reference", key: "orderId" },
                    { header: "Personnel", accessor: (b) => b.bookingType === "flight" ? b.travellerName : b.guestName },
                    { header: "Email Identifier", key: "employeeId" },
                    { header: "Ingestion Date", accessor: (b) => new Date(b.bookedDate).toLocaleDateString() },
                    { header: "Status", key: "status" },
                    { header: "Net Outlay", accessor: (b) => `₹${b.amount.toLocaleString()}` },
                  ]
                }}
                wrapperClass="!border-none !shadow-none"
                pagination={
                  <Pagination
                    currentPage={bookingPage}
                    totalItems={filteredBookings.length}
                    pageSize={PAGE_SIZE}
                    onPageChange={setBookingPage}
                  />
                }
              >
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-[#003399] to-[#000d26] text-white">
                      <Th className="!px-6 !py-5">Type</Th>
                      <Th className="!px-6 !py-5">Order Reference</Th>
                      <Th className="!px-6 !py-5">Personnel</Th>
                      <Th className="!px-6 !py-5">Deployment Details</Th>
                      <Th className="!px-6 !py-5">Email Identifier</Th>
                      <Th className="!px-6 !py-5">Ingestion Date</Th>
                      <Th className="!px-6 !py-5">Status</Th>
                      <Th className="!px-6 !py-5">Net Outlay</Th>
                      <Th className="!px-6 !py-5 !text-center">Audits</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedBookings.length > 0 ? (
                      paginatedBookings.map((b, i) => {
                        const isFlight = b.bookingType === "flight";
                        const name = isFlight ? b.travellerName : b.guestName;
                        const purpose = isFlight
                          ? (b.flightRequest?.purposeOfTravel || "Business Flight")
                          : (b.hotelRequest?.purposeOfTravel || "Business Stay");
                        const path = isFlight
                          ? `/employee-flight-booking/${b._id}`
                          : `/employee-hotel-booking/${b._id}`;

                        return (
                          <tr
                            key={b.key}
                            className="hover:bg-slate-100 transition-colors"
                            style={{ background: i % 2 === 0 ? C.white : C.lightGray }}
                          >
                            <td className="!px-6 !py-5">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-tight ${
                                  isFlight
                                    ? "bg-blue-50 text-[#003399] border border-blue-100"
                                    : "bg-amber-50 text-[#D97706] border border-amber-100"
                                }`}
                              >
                                {isFlight ? <FaPlane size={10} /> : <FaHotel size={10} />}
                                {b.bookingType}
                              </span>
                            </td>
                            <td className="!px-6 !py-5">
                              <IdCell id={b.orderId} />
                            </td>
                            <td className="!px-6 !py-5">
                              <p className="text-xs font-black" style={{ color: C.navy }}>
                                {name}
                              </p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide truncate max-w-[120px]">
                                {purpose}
                              </p>
                            </td>
                            <td className="!px-6 !py-5">
                              {isFlight ? (
                                <RouteCell routes={b.routes} airline={b.airline} />
                              ) : (
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg bg-white border border-slate-100 flex items-center justify-center p-1.5 shadow-sm overflow-hidden text-[#D97706]">
                                    <FaHotel size={18} />
                                  </div>
                                  <div className="flex flex-col gap-0.5">
                                    <p className="text-[13px] font-black text-slate-800 tracking-tight line-clamp-1">
                                      {b.hotelName}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                      {b.city}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="!px-6 !py-5">
                              <span
                                className="text-[11px] font-bold font-mono px-2 py-1 rounded"
                                style={{ background: C.offWhite, color: C.navy }}
                              >
                                {b.employeeId}
                              </span>
                            </td>
                            <td className="!px-6 !py-5 text-[11px] font-bold text-slate-500 uppercase">
                              {new Date(b.bookedDate).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </td>
                            <td className="!px-6 !py-5">
                              <StatusBadge status={b.status} />
                            </td>
                            <td
                              className="!px-6 !py-5 font-black text-xs"
                              style={{ color: C.navy }}
                            >
                              ₹{b.amount.toLocaleString()}
                            </td>
                            <td className="!px-6 !py-5 !text-center">
                              <button
                                onClick={() => navigate(path)}
                                className="p-3 rounded-xl transition-all shadow-sm hover:shadow-md bg-gradient-to-br from-[#003399] to-[#000d26] hover:bg-white hover:from-white hover:to-white group"
                              >
                                <FiArrowRight
                                  size={18}
                                  className="text-[#E7C695] group-hover:text-[#000d26] transition-colors"
                                />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={9} className="!px-6 !py-20 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                              <FiSearch size={32} />
                            </div>
                            <p className="text-sm font-bold text-slate-400">
                              No active deployments mapped to this project scope.
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </ResponsiveDataTable>
            )}
          </div>
        )}
      </div>
    </div>
  );
}