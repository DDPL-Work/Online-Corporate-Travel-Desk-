import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiKey,
  FiEdit2,
  FiPlusCircle,
  FiToggleLeft,
  FiToggleRight,
  FiSearch,
  FiCreditCard,
  FiActivity,
  FiX,
  FiInbox,
  FiArrowLeft,
  FiRefreshCw,
} from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa";
import { apiConfigurationsData } from "../../data/dummyData";
import AddApiConfigModal from "../../Modal/AddApiConfigModal";
import EditApiConfigModal from "../../Modal/EditApiConfigModal";
import { useDispatch, useSelector } from "react-redux";
import { fetchTboBalance } from "../../Redux/Slice/tboBalanceSlice";
import TableActionBar from "../Shared/TableActionBar";
import useExcelExporter from "../../services/export/useExcelExporter";
import { apiConfigurationsExportTemplate } from "../../templates/exportTemplates/superAdminExportTemplates";

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

export default function ApiConfigurations() {
  const navigate = useNavigate();
  const tableScrollRef = useRef(null);
  const { exportExcel, exportingKey } = useExcelExporter();
  const [records, setRecords] = useState(apiConfigurationsData);
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [selected, setSelected] = useState(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [type, setType] = useState("All");
  const [status, setStatus] = useState("All");

  const dispatch = useDispatch();
  const {
    balance,
    creditLimit,
    currency,
    loading: balanceLoading,
    lastUpdated,
  } = useSelector((state) => state.tboBalance);

  const types = ["All", "Flight", "Hotel", "Finance"];
  const statuses = ["All", "Active", "Inactive"];
  const isExporting = exportingKey === "api_configurations";

  // Filtered list
  const filtered = records.filter((r) => {
    const typeMatch = type === "All" || r.type === type;
    const statusMatch = status === "All" || r.status === status;
    const searchMatch =
      !searchTerm ||
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.apiKey.toLowerCase().includes(searchTerm.toLowerCase());
    return typeMatch && statusMatch && searchMatch;
  });

  const total = records.length;
  const active = records.filter((r) => r.status === "Active").length;
  const inactive = total - active;

  function addConfig(data) {
    setRecords((prev) => [...prev, { ...data, id: Date.now() }]);
    setOpenAdd(false);
  }

  function updateConfig(updated) {
    setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setOpenEdit(false);
  }

  function toggleStatus(id) {
    setRecords((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: r.status === "Active" ? "Inactive" : "Active" }
          : r
      )
    );
  }

  const handleExport = () => {
    const statCards = [
      { label: "TBO API Balance", value: balanceLoading ? "Loading…" : `${currency} ${(Number(balance) || 0).toLocaleString()}` },
      { label: "Credit Limit", value: `${currency} ${(Number(creditLimit) || 0).toLocaleString()}` },
      { label: "Total APIs", value: total },
      { label: "Active APIs", value: active },
    ];
    
    const appliedFilters = [
      { label: "Search", value: searchTerm || "None" },
      { label: "Connection Type", value: type },
      { label: "Status", value: status },
    ];

    exportExcel({
      key: "api_configurations",
      pageHeader: "System Connections",
      statCards,
      appliedFilters,
      data: filtered,
      columns: apiConfigurationsExportTemplate,
      filenamePrefix: "system_connections_export",
      emptyMessage: "No connections available to export",
      successMessage: "Connections exported",
    });
  };

  useEffect(() => {
    dispatch(fetchTboBalance());
  }, [dispatch]);

  const handleRefresh = () => {
    dispatch(fetchTboBalance());
  };

  const resetFilters = () => {
    setSearchTerm("");
    setType("All");
    setStatus("All");
  };

  return (
    <div className="min-h-screen font-sans pb-20 -mt-6 -mx-4 md:-mx-6" style={{ background: C.offWhite }}>

      {/* ── Navy Gradient Header ── */}
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
                  className={`p-3 rounded-xl bg-white/10 transition-all border border-white/10 ${balanceLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-white/20"}`}
                  disabled={balanceLoading}
               >
                 <div className={balanceLoading ? "animate-spin" : ""}>
                   <FiRefreshCw size={20} />
                 </div>
               </button>
             </div>
             
             <div className="h-12 w-[1px] bg-white/10 mx-2 hidden md:block" />

             <div className="flex items-center gap-5">
               <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl text-white border border-white/10 bg-white/10" >
                 <FiKey size={28} />
               </div>
               <div>
                 <h1 className="text-3xl font-black tracking-tight leading-none">System Connections</h1>
                 <p className="text-[10px] mt-2 font-bold uppercase tracking-[2px] opacity-60">
                   Manage connections to other systems
                 </p>
               </div>
             </div>
          </div>

          {/* Add Button in header */}
          <button
            onClick={() => setOpenAdd(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm"
          >
            <FiPlusCircle size={16} />
            Add Connection
          </button>
        </div>
      </div>

      <div className="w-full px-4 md:px-10 -mt-10 space-y-8">

        {/* ── TBO Balance Stat Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <StatCard
            label="TBO API Balance"
            value={balanceLoading ? "Loading…" : `${currency} ${(Number(balance) || 0).toLocaleString()}`}
            Icon={FaRupeeSign}
            borderCls="border-[#000D26]"
            iconBgCls="bg-slate-100"
            iconColorCls="text-[#000D26]"
          />
          <StatCard
            label="Credit Limit"
            value={`${currency} ${(Number(creditLimit) || 0).toLocaleString()}`}
            Icon={FiCreditCard}
            borderCls="border-[#003399]"
            iconBgCls="bg-indigo-50"
            iconColorCls="text-indigo-600"
          />
          <StatCard
            label="Balance Status"
            customValue
            value={
              Number(balance) < Number(creditLimit) * 0.2 ? (
                <span className="text-rose-600 text-sm font-black">Low — top-up required</span>
              ) : (
                <span className="text-emerald-600 text-sm font-black">Sufficient balance</span>
              )
            }
            Icon={FiActivity}
            borderCls="border-emerald-500"
            iconBgCls="bg-emerald-50"
            iconColorCls="text-emerald-600"
            subtitle={lastUpdated && `Last updated: ${new Date(lastUpdated).toLocaleTimeString()}`}
          />
        </div>

        {/* ── API Count Stat Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <StatCard
            label="Total Connections"
            value={total}
            Icon={FiKey}
            borderCls="border-[#003399]"
            iconBgCls="bg-indigo-50"
            iconColorCls="text-[#003399]"
          />
          <StatCard
            label="Active Connections"
            value={active}
            Icon={FiToggleRight}
            borderCls="border-emerald-500"
            iconBgCls="bg-emerald-50"
            iconColorCls="text-emerald-600"
          />
          <StatCard
            label="Inactive Connections"
            value={inactive}
            Icon={FiToggleLeft}
            borderCls="border-rose-500"
            iconBgCls="bg-rose-50"
            iconColorCls="text-rose-600"
          />
        </div>

        {/* FILTERS SECTION */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-9 gap-4">
            <div className="lg:col-span-4">
              <LabeledInput label={<span className="flex items-center gap-1"><FiSearch size={12}/> Search</span>}>
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Connection Name / Type / Key..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none bg-slate-50 focus:border-[#003399]"
                  />
                </div>
              </LabeledInput>
            </div>

            <div className="lg:col-span-2">
              <LabeledInput label={<span className="flex items-center gap-1"><FiKey size={12}/> Connection Type</span>}>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-slate-50 cursor-pointer focus:border-[#003399]"
                >
                  {types.map((t) => (
                    <option key={t} value={t}>
                      {t === "All" ? "All Types" : t}
                    </option>
                  ))}
                </select>
              </LabeledInput>
            </div>

            <div className="lg:col-span-2">
              <LabeledInput label={<span className="flex items-center gap-1"><FiActivity size={12}/> Status</span>}>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-slate-50 cursor-pointer focus:border-[#003399]"
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {s === "All" ? "All Statuses" : s}
                    </option>
                  ))}
                </select>
              </LabeledInput>
            </div>

            <div className="lg:col-span-1 flex items-end">
              <button
                onClick={resetFilters}
                title="Reset Filters"
                className="w-full h-[38px] rounded-lg font-black text-[13px] flex items-center justify-center border shadow-sm transition-all hover:bg-slate-100 hover:text-slate-700 bg-white text-slate-500 border-slate-200"
              >
                <FiX />
              </button>
            </div>
          </div>
        </div>

        {/* ── Data Table ── */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{ borderColor: C.border }}>
          <div className="p-5 border-b flex flex-wrap items-center justify-between gap-3" style={{ borderColor: C.border, background: C.white }}>
            <div>
              <h2 className="font-black text-slate-800 tracking-tight text-lg">List of Connections</h2>
              <p className="text-[11px] font-bold uppercase tracking-widest mt-1" style={{ color: C.muted }}>
                {filtered.length} connection{filtered.length !== 1 ? "s" : ""} found
              </p>
            </div>
            <TableActionBar
              scrollRef={tableScrollRef}
              exportLabel="Export CSV"
              onExport={handleExport}
              exportDisabled={isExporting}
              exportLoading={isExporting}
              exportClassName="bg-[#003399] hover:bg-[#002266] text-white shadow-sm rounded-lg text-xs font-bold px-4 py-2"
              arrowClassName="border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50"
            />
          </div>

          <div ref={tableScrollRef} className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-[#003399] to-[#000d26] text-white">
                  <th className="px-6 py-5 text-[10px] uppercase font-black tracking-widest">Connection Name</th>
                  <th className="px-6 py-5 text-[10px] uppercase font-black tracking-widest">Type</th>
                  <th className="px-6 py-5 text-[10px] uppercase font-black tracking-widest">Access Key</th>
                  <th className="px-6 py-5 text-[10px] uppercase font-black tracking-widest">Status</th>
                  <th className="px-6 py-5 text-[10px] uppercase font-black tracking-widest text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                          <FiInbox size={32} />
                        </div>
                        <p className="text-sm font-bold text-slate-400">No connections found matching the criteria.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr
                      key={row.id}
                      className="transition-colors border-b last:border-0 hover:bg-slate-50/80"
                      style={{ borderColor: C.border }}
                    >
                      <td className="px-6 py-5">
                        <p className="text-xs font-black text-[#003399]">{row.name}</p>
                      </td>
                      <td className="px-6 py-5">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded shadow-sm border bg-[#003399]/10 text-[#003399] border-[#003399]/20">
                          {row.type}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="font-mono bg-slate-100 px-2.5 py-1 rounded-lg text-slate-600 text-xs border border-slate-200">
                          {row.apiKey.substring(0, 12)}****
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex gap-2 items-center justify-center">
                          <button
                            title="Edit"
                            onClick={() => { setSelected(row); setOpenEdit(true); }}
                            className="p-2 rounded hover:bg-blue-100 text-blue-600 transition-colors cursor-pointer"
                          >
                            <FiEdit2 size={16} />
                          </button>
                          <button
                            title="Toggle Status"
                            onClick={() => toggleStatus(row.id)}
                            className={`p-2 rounded transition-colors cursor-pointer ${
                              row.status === "Active"
                                ? "hover:bg-rose-100 text-rose-600"
                                : "hover:bg-emerald-100 text-emerald-600"
                            }`}
                          >
                            {row.status === "Active" ? <FiToggleRight size={20} /> : <FiToggleLeft size={20} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="bg-slate-50 px-6 py-3 border-t flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest" style={{ borderColor: C.border }}>
            <span>Showing {filtered.length} connection(s)</span>
            <span>Active: {active} | Inactive: {inactive}</span>
          </div>
        </div>

        {/* MODALS */}
        {openAdd && (
          <AddApiConfigModal onClose={() => setOpenAdd(false)} onSave={addConfig} />
        )}
        {openEdit && selected && (
          <EditApiConfigModal data={selected} onClose={() => setOpenEdit(false)} onSave={updateConfig} />
        )}
      </div>
    </div>
  );
}

/* ─── HELPER COMPONENTS ─── */

function StatCard({ label, value, Icon, borderCls, iconBgCls, iconColorCls, customValue, subtitle }) {
  return (
    <div className={`bg-white rounded-xl p-5 border-b-4 ${borderCls} shadow-sm flex items-center justify-between`}>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
        {customValue ? (
          value
        ) : (
          <h3 className="text-xl font-black text-slate-800 leading-none">{value}</h3>
        )}
        {subtitle && <p className="text-[10px] text-slate-400 mt-1.5">{subtitle}</p>}
      </div>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ml-3 ${iconBgCls} ${iconColorCls}`}>
        <Icon size={20} />
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const isActive = status === "Active";
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
        isActive
          ? "bg-emerald-50 text-emerald-600 border-emerald-100"
          : "bg-rose-50 text-rose-600 border-rose-100"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-rose-500"}`} />
      {status}
    </span>
  );
}

function LabeledInput({ label, children }) {
  return (
    <div className="flex flex-col gap-1 text-left">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
        {label}
      </label>
      {children}
    </div>
  );
}
