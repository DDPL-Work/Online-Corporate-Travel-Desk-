import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FiUsers, FiSearch, FiRefreshCw, FiCheckCircle, FiXCircle, FiInbox, FiClock, FiX, FiEye, FiCreditCard, FiArrowLeft, FiCalendar } from "react-icons/fi";
import { MdVerifiedUser, MdBusiness, MdAccountBalanceWallet } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import ViewCorporateModal from "../../Modal/ViewCorporateModal";
import FinancialApprovalModal from "../../Modal/FinancialApprovalModal";
import { fetchCorporates, fetchCorporateById } from "../../Redux/Slice/corporateListSlice";
import TableActionBar from "../Shared/TableActionBar";
import useExcelExporter from "../../services/export/useExcelExporter";
import { pendingCorporatesExportTemplate } from "../../templates/exportTemplates/superAdminExportTemplates";
import { toast } from "sonner";

const C = {
  navy: "#003399",
  offWhite: "#f8fafc",
  white: "#ffffff",
  border: "#e2e8f0",
  muted: "#64748b",
  lightGray: "#f1f5f9",
  gold: "#d97706",
  emerald: "#10b981",
  red: "#ef4444",
  amber: "#f59e0b"
};

const Avatar = ({ name = "", size = "md", classification = "postpaid" }) => {
  const nameStr = typeof name === "string" ? name : String(name || "");
  const initials = nameStr
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  
  const isPostpaid = classification === "postpaid";
  const color = isPostpaid 
    ? "from-[#003399] to-[#000d26]"
    : "from-amber-500 to-orange-400";
    
  const sz = size === "lg" ? "w-10 h-10 text-[11px]" : "w-8 h-8 text-[10px]";
  
  return (
    <div
      className={`${sz} rounded-full bg-gradient-to-br ${color} flex items-center justify-center font-black text-white shrink-0 shadow-sm border border-white/20`}
    >
      {initials || "?"}
    </div>
  );
};

const StatCard = ({ label, value, Icon, borderCls, iconBgCls, iconColorCls }) => (
  <div className={`bg-white rounded-2xl p-6 border-b-4 ${borderCls} shadow-sm flex items-center justify-between`}>
    <div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <h3 className="text-3xl font-black text-slate-800">{value}</h3>
    </div>
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBgCls} ${iconColorCls}`}>
      <Icon size={24} />
    </div>
  </div>
);

const StatusBadge = ({ status }) => {
  const statusLower = String(status || "").toLowerCase();
  if (statusLower === "active" || statusLower === "approved") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
      </span>
    );
  }
  if (statusLower === "pending") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-100">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-600 border border-red-100">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> {status}
    </span>
  );
};

export default function PendingCorporates() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const tableScrollRef = useRef(null);
  const { exportExcel, exportingKey } = useExcelExporter();

  const { corporates = [], loading } = useSelector(
    (state) => state.corporateList
  );

  const [openViewModal, setOpenViewModal] = useState(false);
  const [selectedCorporate, setSelectedCorporate] = useState(null);
  const [openFinancialApprove, setOpenFinancialApprove] = useState(false);
  
  const [search, setSearch] = useState("");
  const [selectedCorporateId, setSelectedCorporateId] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const isExporting = exportingKey === "pending_corporates";

  useEffect(() => {
    dispatch(fetchCorporates())
      .unwrap()
      .catch((err) => toast.error(err));
  }, [dispatch]);

  const baseCorporates = useMemo(
    () => corporates.filter((c) => c.status === "pending"),
    [corporates]
  );

  const handleExport = () => {
    if (loading) return;

    const statCards = [
      { label: "Total Pending", value: stats.total },
      { label: "Postpaid Accounts", value: stats.postpaid },
      { label: "Prepaid Accounts", value: stats.wallet },
      { label: "Total Credit Request", value: `₹${stats.creditSum.toLocaleString('en-IN')}` },
    ];

    const appliedFilters = [
      { label: "Search Pending", value: search || "None" },
      { label: "Corporate", value: selectedCorporateId !== "all" ? selectedCorporateId : "All Corporates" },
      { label: "Start Date", value: startDate || "Any" },
      { label: "End Date", value: endDate || "Any" },
    ];

    exportExcel({
      key: "pending_corporates",
      pageHeader: "Pending Corporates",
      statCards,
      appliedFilters,
      data: filtered,
      columns: pendingCorporatesExportTemplate,
      filenamePrefix: "pending_corporates_export",
      emptyMessage: "No pending corporates available to export",
      successMessage: "Pending corporates exported",
    });
  };

  const stats = useMemo(() => {
    return {
      total: baseCorporates.length,
      postpaid: baseCorporates.filter((c) => c.classification === "postpaid").length,
      wallet: baseCorporates.filter((c) => c.classification === "prepaid").length,
      creditSum: baseCorporates.reduce((sum, c) => sum + (c.classification === "postpaid" ? (c.creditLimit || 0) : 0), 0)
    };
  }, [baseCorporates]);

  const filtered = useMemo(() => {
    let list = baseCorporates;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => {
        return (
          c.corporateName?.toLowerCase().includes(q) ||
          c.ssoConfig?.domain?.toLowerCase().includes(q) ||
          c.primaryContact?.name?.toLowerCase().includes(q) ||
          c.primaryContact?.email?.toLowerCase().includes(q)
        );
      });
    }
    if (selectedCorporateId !== "all") {
      list = list.filter((c) => c._id === selectedCorporateId);
    }
    if (startDate || endDate) {
      list = list.filter((c) => {
        const dateToCheck = c.createdAt;
        if (!dateToCheck) return false;
        const d = new Date(dateToCheck);
        if (isNaN(d.getTime())) return false;
        
        const dStr = d.toISOString().split('T')[0];
        if (startDate && dStr < startDate) return false;
        if (endDate && dStr > endDate) return false;
        return true;
      });
    }
    return list;
  }, [baseCorporates, search, startDate, endDate, selectedCorporateId]);

  const handleRefresh = () => dispatch(fetchCorporates());

  const handleView = async (id) => {
    try {
      const res = await dispatch(fetchCorporateById(id)).unwrap();
      setSelectedCorporate(res);
      setOpenViewModal(true);
    } catch (err) {
      toast.error(err);
    }
  };

  const handleApprove = (corporate) => {
    setSelectedCorporate(corporate);
    setOpenFinancialApprove(true);
  };

  return (
    <div className="min-h-screen font-sans pb-20 -mt-6 -mx-4 md:-mx-6" style={{ background: C.offWhite }}>
      {/* Navy Header Section */}
      <div className="w-full bg-gradient-to-br from-[#003399] to-[#000d26] text-white pt-8 pb-20 px-6 md:px-10">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-3">
               <button 
                  onClick={() => navigate(-1)} 
                  className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 text-white shadow-sm"
               >
                 <FiArrowLeft size={20} />
               </button>
               <button 
                  onClick={handleRefresh} 
                  className={`p-3 rounded-xl bg-white/10 transition-all border border-white/10 ${loading ? "opacity-50 cursor-not-allowed" : "hover:bg-white/20"}`}
                  disabled={loading}
               >
                 <div className={loading ? "animate-spin" : ""}>
                   <FiRefreshCw size={20} />
                 </div>
               </button>
             </div>
             
             <div className="h-12 w-[1px] bg-white/10 mx-2 hidden md:block" />

             <div className="flex items-center gap-5">
               <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl text-white border border-white/10 bg-white/10" >
                 <FiUsers size={28} />
               </div>
               <div>
                 <h1 className="text-3xl font-black tracking-tight leading-none">Pending Corporates</h1>
                 <p className="text-[10px] mt-2 font-bold uppercase tracking-[2px] opacity-60">
                   Manage pending corporate profiles for approval
                 </p>
               </div>
             </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 md:px-10 -mt-10 space-y-10">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard label="Total Pending" value={stats.total} Icon={FiUsers} borderCls="border-[#000D26]" iconBgCls="bg-slate-100" iconColorCls="text-[#000D26]" />
          <StatCard label="Postpaid Accounts" value={stats.postpaid} Icon={FiCreditCard} borderCls="border-indigo-500" iconBgCls="bg-indigo-50" iconColorCls="text-indigo-600" />
          <StatCard label="Prepaid Accounts" value={stats.wallet} Icon={MdAccountBalanceWallet} borderCls="border-amber-500" iconBgCls="bg-amber-50" iconColorCls="text-amber-600" />
          <StatCard label="Total Credit Request" value={`₹${stats.creditSum.toLocaleString('en-IN')}`} Icon={FiClock} borderCls="border-emerald-500" iconBgCls="bg-emerald-50" iconColorCls="text-emerald-600" />
        </div>

        {/* Filter Section */}
        <div className="bg-white rounded-2xl p-6 border shadow-sm" style={{ borderColor: C.border }}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
            <div className="flex flex-col gap-1.5 lg:col-span-5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><FiSearch size={12} /> Search Pending</label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-[13px] font-medium outline-none transition-all focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10 bg-slate-50 hover:bg-white"
                  placeholder="Name, domain..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 lg:col-span-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><MdBusiness size={12}/> Corporate</label>
              <select
                className="w-full px-4 py-2.5 border rounded-xl text-[13px] font-medium outline-none transition-all focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10 bg-slate-50 hover:bg-white cursor-pointer"
                value={selectedCorporateId}
                onChange={(e) => setSelectedCorporateId(e.target.value)}
              >
                <option value="all">All Corporates</option>
                {baseCorporates.map(c => (
                  <option key={c._id} value={c._id}>{c.corporateName}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5 lg:col-span-4">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><FiCalendar size={12}/> Registered Date</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  className="w-full px-3 py-2.5 border rounded-xl text-[13px] font-medium outline-none transition-all focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10 bg-slate-50 hover:bg-white cursor-pointer"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <span className="text-slate-400 font-bold text-xs uppercase">to</span>
                <input
                  type="date"
                  className="w-full px-3 py-2.5 border rounded-xl text-[13px] font-medium outline-none transition-all focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10 bg-slate-50 hover:bg-white cursor-pointer"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex items-end lg:col-span-1">
               <button onClick={() => { setSearch(""); setStartDate(""); setEndDate(""); setSelectedCorporateId("all"); }} title="Reset Filters" className="w-full py-2.5 rounded-xl font-black text-[13px] flex items-center justify-center border shadow-sm transition-all hover:bg-slate-100 hover:text-slate-700 bg-white text-slate-500 border-slate-200">
                  <FiX />
               </button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{ borderColor: C.border }}>
          <div className="p-5 border-b flex flex-wrap items-center justify-between gap-3" style={{ borderColor: C.border, background: C.white }}>
            <div>
              <h2 className="font-black text-slate-800 tracking-tight text-lg">Pending Requests</h2>
              <p className="text-[11px] font-bold uppercase tracking-widest mt-1" style={{ color: C.muted }}>{filtered.length} pending records</p>
            </div>
            <TableActionBar
              scrollRef={tableScrollRef}
              exportLabel="Export CSV"
              onExport={handleExport}
              exportDisabled={loading || isExporting}
              exportLoading={isExporting}
              exportClassName="bg-[#003399] hover:bg-[#002266] text-white shadow-sm rounded-lg text-xs font-bold px-4 py-2"
              arrowClassName="border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50"
            />
          </div>
          
          <div ref={tableScrollRef} className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-[#003399] to-[#000d26] text-white">
                  <th className="px-6 py-5 text-[10px] uppercase font-black tracking-widest">Corporate Entity</th>
                  <th className="px-6 py-5 text-[10px] uppercase font-black tracking-widest">Primary Contact</th>
                  <th className="px-6 py-5 text-[10px] uppercase font-black tracking-widest">Classification</th>
                  <th className="px-6 py-5 text-[10px] uppercase font-black tracking-widest">Company Link</th>
                  <th className="px-6 py-5 text-[10px] uppercase font-black tracking-widest">Date</th>
                  <th className="px-6 py-5 text-[10px] uppercase font-black tracking-widest text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin text-[#003399]">
                          <FiRefreshCw size={32} />
                        </div>
                        <p className="text-sm font-bold text-slate-400">Loading corporates...</p>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length > 0 ? (
                  filtered.map((c, i) => {
                    const isPostpaid = c.classification === "postpaid";
                    const rowBg = isPostpaid ? "bg-indigo-50/40 hover:bg-indigo-100/60" : "bg-amber-50/40 hover:bg-amber-100/60";
                    return (
                    <tr key={c._id} className={`transition-colors border-b last:border-0 ${rowBg}`} style={{ borderColor: C.border }}>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <Avatar name={c.corporateName} classification={c.classification} />
                          <div className="min-w-0">
                            <p className="text-xs font-black truncate max-w-[150px]" style={{ color: C.navy }}>{c.corporateName}</p>
                            <p className="text-[9px] font-bold text-slate-400 truncate max-w-[150px]">{c.ssoConfig?.domain || "No domain"}</p>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-5">
                        <div className="min-w-0">
                          <p className="text-xs font-black truncate max-w-[150px]" style={{ color: C.navy }}>{c.primaryContact?.name || "—"}</p>
                          <p className="text-[9px] font-bold text-slate-400 truncate max-w-[150px]">{c.primaryContact?.email || "—"}</p>
                        </div>
                      </td>
                      
                      <td className="px-6 py-5">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded shadow-sm border ${
                          isPostpaid 
                            ? "bg-[#003399]/10 text-[#003399] border-[#003399]/20" 
                            : "bg-[#d97706]/10 text-[#d97706] border-[#d97706]/20"
                        }`}>
                          {isPostpaid ? <FiCreditCard size={12} /> : <MdAccountBalanceWallet size={12} />}
                          {c.classification || "N/A"}
                        </span>
                      </td>
                      
                      <td className="px-6 py-5">
                        {c.ssoConfig?.domain ? (
                          <a
                            href={`https://${c.ssoConfig.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-black text-[#003399] hover:underline bg-blue-50 px-2.5 py-1 rounded-md"
                          >
                            {c.ssoConfig.domain}
                          </a>
                        ) : (
                          <span className="text-xs font-black text-slate-400">N/A</span>
                        )}
                      </td>
                      
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-black text-slate-700">
                            {(() => {
                              const d = c.createdAt ? new Date(c.createdAt) : new Date();
                              return !isNaN(d.getTime()) ? d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "N/A";
                            })()}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                            Registered
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-5 text-center">
                        <div className="flex gap-2 items-center justify-center">
                          <button
                            onClick={() => handleView(c._id)}
                            title="View Corporate"
                            className="p-2 rounded hover:bg-white/60 text-[#003399] transition-colors cursor-pointer"
                          >
                            <FiEye size={16} />
                          </button>
                          <button
                            onClick={() => handleApprove(c)}
                            title="Approve Corporate"
                            className="p-2 rounded hover:bg-emerald-100 text-emerald-600 transition-colors cursor-pointer"
                          >
                            <FiCheckCircle size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                          <FiInbox size={32} />
                        </div>
                        <p className="text-sm font-bold text-slate-400">No pending corporates found.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL */}
        {openViewModal && selectedCorporate && (
          <ViewCorporateModal corporate={selectedCorporate} onClose={() => setOpenViewModal(false)} />
        )}

        {openFinancialApprove && selectedCorporate && (
          <FinancialApprovalModal
            corporate={selectedCorporate}
            onClose={() => {
              setOpenFinancialApprove(false);
              setSelectedCorporate(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
