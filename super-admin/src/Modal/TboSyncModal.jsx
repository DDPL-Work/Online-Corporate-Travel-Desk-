import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import Pagination from "../components/Shared/Pagination";
import api from "../API/axios";
import { FiPlay, FiPause, FiSquare, FiRefreshCw, FiX, FiActivity, FiServer, FiDatabase } from "react-icons/fi";

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
  amber: "#f59e0b",
};

export default function TboSyncModal({ onClose }) {
  const [syncStatus, setSyncStatus] = useState(null);
  const [loading, setLoading]       = useState(false);
  const [activeTab, setActiveTab]   = useState("controls");
  const [logs, setLogs]             = useState([]);
  const [logPage, setLogPage]       = useState(1);
  const LOGS_PER_PAGE = 10;

  const fetchLogs = async () => {
    try {
      const res = await api.get("/tbo/sync-logs");
      if (res.data.success) setLogs(res.data.logs);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStatus = async () => {
    try {
      const res = await api.get("/tbo/sync-status");
      if (res.data.success) setSyncStatus(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchLogs();
  }, []);

  const handleAction = async (action) => {
    setLoading(true);
    try {
      const endpoints = {
        pause:  () => api.post("/tbo/sync-hotels/pause"),
        resume: () => api.post("/tbo/sync-hotels/resume"),
        cancel: () => api.post("/tbo/sync-hotels/cancel"),
        syncCountries: () => api.post("/tbo/sync-countries"),
        syncCities:    () => api.post("/tbo/sync-cities"),
        syncTBOHotelCodeList:  () => api.post("/tbo/sync-hotels?reset=true"),
        syncHotelDetails: () => api.post("/tbo/sync-hotel-details"),
      };
      await endpoints[action]?.();
      await fetchStatus();
      await fetchLogs();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fullStatus = syncStatus;
  const hotelSyncData = fullStatus?.hotelSync;

  const isSyncing = 
    fullStatus?.countrySync?.isSyncing || 
    fullStatus?.citySync?.isSyncing || 
    fullStatus?.hotelSync?.isSyncing || 
    fullStatus?.hotelDetailsSync?.isSyncing;

  const isPaused = 
    fullStatus?.countrySync?.isPaused || 
    fullStatus?.citySync?.isPaused || 
    fullStatus?.hotelSync?.isPaused || 
    fullStatus?.hotelDetailsSync?.isPaused;

  const isCancelled = 
    fullStatus?.countrySync?.isCancelled || 
    fullStatus?.citySync?.isCancelled || 
    fullStatus?.hotelSync?.isCancelled || 
    fullStatus?.hotelDetailsSync?.isCancelled;
  
  const totalLogPages = Math.max(1, Math.ceil(logs.length / LOGS_PER_PAGE));
  const paginatedLogs = logs.slice((logPage - 1) * LOGS_PER_PAGE, logPage * LOGS_PER_PAGE);

  const handlePageChange = (page) => {
    setLogPage(page);
  };

  let activeData = null;
  let activeType = "hotel"; // default
  let cardTitle = "Master Hotel Sync Progress";

  if (fullStatus?.countrySync?.isSyncing || fullStatus?.countrySync?.isPaused) {
    activeType = "country";
    activeData = fullStatus.countrySync;
    cardTitle = "Master Country Sync Progress";
  } else if (fullStatus?.citySync?.isSyncing || fullStatus?.citySync?.isPaused) {
    activeType = "city";
    activeData = fullStatus.citySync;
    cardTitle = "Master City Sync Progress";
  } else if (fullStatus?.hotelDetailsSync?.isSyncing || fullStatus?.hotelDetailsSync?.isPaused) {
    activeType = "hotelDetails";
    activeData = fullStatus.hotelDetailsSync;
    cardTitle = "Hotel Details Sync Progress";
  } else {
    activeType = "hotel";
    activeData = fullStatus?.hotelSync;
    cardTitle = "Master Hotel Sync Progress";
  }

  let stats = [];
  let progress = 0;

  if (activeType === "country") {
    stats = [
      { label: "Total Countries", value: activeData?.totalCountries?.toLocaleString() || "0" },
      { label: "Countries Processed", value: activeData?.processedCountries?.toLocaleString() || "0", highlight: true },
      { label: "Countries Saved", value: activeData?.totalSaved?.toLocaleString() || "0" },
      { label: "Status", value: activeData?.isSyncing ? "Running" : "Idle" }
    ];
    if (activeData?.totalCountries) progress = Math.round((activeData.processedCountries / activeData.totalCountries) * 100);
  } else if (activeType === "city") {
    stats = [
      { label: "Total Countries", value: activeData?.totalCountries?.toLocaleString() || "0" },
      { label: "Countries Processed", value: activeData?.processedCountries?.toLocaleString() || "0", highlight: true },
      { label: "Cities Saved", value: activeData?.totalCitiesSaved?.toLocaleString() || "0" },
      { label: "Last Country", value: activeData?.lastCountry || "—" }
    ];
    if (activeData?.totalCountries) progress = Math.round((activeData.processedCountries / activeData.totalCountries) * 100);
  } else if (activeType === "hotelDetails") {
    stats = [
      { label: "Total Cities", value: activeData?.totalCities?.toLocaleString() || "0" },
      { label: "Cities Processed", value: activeData?.processedCities?.toLocaleString() || "0", highlight: true },
      { label: "Details Saved", value: activeData?.totalDetailsSaved?.toLocaleString() || "0" },
      { label: "Last Hotel", value: activeData?.lastHotel || "—" }
    ];
    if (activeData?.totalCities) progress = Math.round((activeData.processedCities / activeData.totalCities) * 100);
  } else {
    stats = [
      { label: "Total Cities", value: activeData?.totalCities?.toLocaleString() || "0" },
      { label: "Cities Processed", value: activeData?.processedCities?.toLocaleString() || "0", highlight: true },
      { label: "Hotels Saved", value: activeData?.totalHotelsSaved?.toLocaleString() || "0" },
      { label: "Last Active City", value: activeData?.lastCity || "—" }
    ];
    if (activeData?.totalCities) progress = Math.round((activeData.processedCities / activeData.totalCities) * 100);
  }

  let displayStatus = "Stopped";
  let statusColor = "slate";
  if (isSyncing) {
    if (isPaused) {
      displayStatus = "Paused";
      statusColor = "amber";
    } else {
      displayStatus = "Running";
      statusColor = "emerald";
    }
  }

  const modalContent = (
    <>
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        style={{
          backgroundColor: "rgba(15,23,42,0.65)",
          backdropFilter: "blur(4px)",
        }}
        onClick={onClose}
      >
        <div
          className="bg-white w-full max-w-6xl rounded-2xl shadow-2xl flex flex-col animate-fadeIn overflow-hidden"
          style={{ maxHeight: "90vh" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* HEADER */}
          <div
            className="bg-gradient-to-r from-[#003399] via-[#000d26] to-[#1a0a00] px-6 py-5 flex items-center justify-between text-white shrink-0"
            style={{ borderBottom: "2px solid #d97706" }}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
                 <FiDatabase size={24} className={isSyncing && !isPaused ? "animate-pulse text-[#d97706]" : "text-white"} />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight flex items-center gap-3">
                  TBO API Synchronization
                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                      statusColor === "emerald"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse"
                        : statusColor === "amber"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-slate-500/20 text-slate-300 border border-slate-500/30"
                    }`}
                  >
                    {displayStatus}
                  </span>
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                    Master Inventory Management
                  </span>
                  <span className="w-1 h-1 rounded-full bg-white/30"></span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/70 flex items-center gap-1">
                    <FiActivity size={10} className={loading ? "animate-spin" : ""} />
                    {loading ? "Processing..." : "Idle"}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => { fetchStatus(); fetchLogs(); }}
                disabled={loading}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg text-xs font-black uppercase tracking-widest transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <FiRefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh Status
              </button>
              <div className="w-px h-8 bg-white/20 mx-1"></div>
              <button
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-colors"
              >
                <FiX size={18} />
              </button>
            </div>
          </div>

          {/* TABS */}
          <div className="flex border-b border-slate-200 bg-white px-8 pt-4 shrink-0">
            <button
              onClick={() => setActiveTab("controls")}
              className={`pb-4 px-2 font-bold text-sm tracking-wide border-b-2 transition-colors ${
                activeTab === "controls"
                  ? "border-[#003399] text-[#003399]"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              Sync Controls
            </button>
            <button
              onClick={() => setActiveTab("logs")}
              className={`pb-4 px-6 ml-4 font-bold text-sm tracking-wide border-b-2 transition-colors ${
                activeTab === "logs"
                  ? "border-[#003399] text-[#003399]"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              Sync Logs
            </button>
          </div>

          {/* BODY */}
          {activeTab === "controls" ? (
            <div className="flex-1 overflow-y-auto p-8 bg-slate-50 custom-scrollbar flex flex-col gap-10">
            
            <Section title="Current Sync Status" color="navy">
              <div className="col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                {syncStatus ? (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                      {stats.map((stat, idx) => (
                        <Item key={idx} label={stat.label} value={stat.value} highlight={stat.highlight} />
                      ))}
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cardTitle}</span>
                        <span className="text-sm font-black text-[#003399]">{progress}%</span>
                      </div>
                      <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                        <div 
                          className="h-full bg-gradient-to-r from-[#003399] to-[#d97706] transition-all duration-[800ms] ease-out"
                          style={{ width: `${progress}%` }} 
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-8 text-center text-xs font-bold uppercase tracking-widest text-slate-400">
                    Loading synchronization metrics...
                  </div>
                )}
              </div>
            </Section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <Section title="Core Master Data Sync" color="gold">
                <div className="col-span-2 flex flex-col gap-4">
                  <ActionCard
                    title="Sync Countries"
                    desc="Fetches and updates the master list of countries from TBO API."
                    btnLabel="Sync Countries"
                    btnIcon={<FiServer size={14} />}
                    onClick={() => handleAction("syncCountries")}
                    disabled={loading || fullStatus?.countrySync?.isSyncing}
                    theme="navy"
                  />
                  <ActionCard
                    title="Sync Cities"
                    desc="Fetches and updates the master list of cities from TBO API."
                    btnLabel="Sync Cities"
                    btnIcon={<FiServer size={14} />}
                    onClick={() => handleAction("syncCities")}
                    disabled={loading || fullStatus?.citySync?.isSyncing}
                    theme="navy"
                  />
                  <ActionCard
                    title="Sync Hotel Details"
                    desc="Fetches and updates detailed information for all previously stored hotels."
                    btnLabel="Sync Details"
                    btnIcon={<FiServer size={14} />}
                    onClick={() => handleAction("syncHotelDetails")}
                    disabled={loading || fullStatus?.hotelDetailsSync?.isSyncing}
                    theme="navy"
                  />
                  <ActionCard
                    title="Sync TBO Hotel Code List"
                    desc="Fetches the master list of hotel codes from TBO API and stores them locally."
                    btnLabel="Sync Hotel Code"
                    btnIcon={<FiServer size={14} />}
                    onClick={() => handleAction("syncTBOHotelCodeList")}
                    disabled={loading || fullStatus?.hotelSync?.isSyncing}
                    theme="navy"
                  />
                </div>
              </Section>

              <Section title="Hotel Inventory Sync Controls" color="navy">
                <div className="col-span-2 flex flex-col gap-4">
                  <ActionCard
                    title="Pause Execution"
                    desc="Temporarily halts the Hotel Sync process at its current position. Progress is safely preserved."
                    btnLabel="Pause Sync"
                    btnIcon={<FiPause size={14} />}
                    onClick={() => handleAction("pause")}
                    disabled={loading || !fullStatus?.hotelSync?.isSyncing || fullStatus?.hotelSync?.isPaused}
                    theme="amber"
                  />
                  <ActionCard
                    title="Resume Execution"
                    desc="Continues the Hotel Sync process from the exact point it was last paused."
                    btnLabel="Resume Sync"
                    btnIcon={<FiPlay size={14} />}
                    onClick={() => handleAction("resume")}
                    disabled={loading || !fullStatus?.hotelSync?.isSyncing || !fullStatus?.hotelSync?.isPaused}
                    theme="navy"
                  />
                  <ActionCard
                    title="Abort Sync"
                    desc="Gracefully aborts the Hotel Sync. A full restart from the beginning will be required next time."
                    btnLabel="Cancel Sync"
                    btnIcon={<FiSquare size={14} />}
                    onClick={() => handleAction("cancel")}
                    disabled={loading || !fullStatus?.hotelSync?.isSyncing}
                    theme="red"
                  />
                </div>
              </Section>
            </div>
            
          </div>
          ) : (
            <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
              <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar p-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-w-[700px]">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest w-32">Type</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest w-48">Timestamp</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest w-56">Active APIs</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Message</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {logs.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="py-12 text-center text-xs font-bold uppercase tracking-widest text-slate-400">
                            No logs available
                          </td>
                        </tr>
                      ) : (
                        paginatedLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${
                                log.type === "START" ? "bg-blue-100 text-blue-700" :
                                log.type === "COMPLETE" ? "bg-emerald-100 text-emerald-700" :
                                log.type === "ERROR" ? "bg-red-100 text-red-700" :
                                log.type === "PAUSE" ? "bg-amber-100 text-amber-700" :
                                log.type === "RESUME" ? "bg-teal-100 text-teal-700" :
                                log.type === "CANCEL" ? "bg-slate-100 text-slate-700" :
                                "bg-slate-100 text-slate-700"
                              }`}>
                                {log.type}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-500">
                              {new Date(log.timestamp).toLocaleString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit"
                              })}
                            </td>
                            <td className="px-6 py-4">
                              {log.affectedSyncs && log.affectedSyncs.length > 0 ? (
                                <div className="flex gap-1.5 flex-wrap">
                                  {log.affectedSyncs.map((api, i) => (
                                    <span key={i} className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[9px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                                      {api}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-xs font-semibold text-slate-700">
                              {log.message}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              {logs.length > 0 && (
                <div className="flex flex-wrap gap-3 items-center justify-between px-8 py-4 border-t border-slate-200 bg-white shrink-0">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Page {logPage} of {totalLogPages}
                  </span>
                  <Pagination
                    currentPage={logPage}
                    totalPages={totalLogPages}
                    onPageChange={handlePageChange}
                    showFirstLast
                  />
                </div>
              )}
            </div>
          )}
        </div>

      </div>
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f8fafc;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </>
  );

  return ReactDOM.createPortal(modalContent, document.body);
}

/* -------- UI HELPERS -------- */

const Section = ({ title, children, color = "navy" }) => {
  const isGold = color === "gold";
  return (
    <div>
      <h3
        className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-3"
        style={{ color: isGold ? "#d97706" : "#003399" }}
      >
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: isGold ? "#d97706" : "#003399" }}
        />
        {title}
        <div
          className="flex-1 h-px"
          style={{
            background: isGold
              ? "linear-gradient(to right, #d97706/30, transparent)"
              : "linear-gradient(to right, #003399/20, transparent)",
            opacity: 0.3,
          }}
        />
      </h3>
      <div className="grid grid-cols-2 gap-x-6 gap-y-5">{children}</div>
    </div>
  );
};

const Item = ({ label, value, highlight }) => (
  <div>
    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
      {label}
    </p>
    <p className={`text-[15px] font-black break-words ${highlight ? 'text-[#d97706]' : 'text-slate-800'}`}>
      {value || "—"}
    </p>
  </div>
);

const ActionCard = ({ title, desc, btnLabel, btnIcon, onClick, disabled, theme }) => {
  let themeClasses = "";
  if (theme === "emerald") {
    themeClasses = "bg-emerald-500 hover:bg-emerald-400 text-emerald-950 border-emerald-500/30";
  } else if (theme === "amber") {
    themeClasses = "bg-[#d97706] hover:bg-amber-500 text-white border-[#d97706]/30";
  } else if (theme === "red") {
    themeClasses = "bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200";
  } else {
    themeClasses = "bg-[#003399] hover:bg-blue-800 text-white border-[#003399]/30";
  }

  return (
    <div className={`p-4 rounded-xl border bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all shadow-sm ${disabled ? 'opacity-60 grayscale-[30%]' : 'hover:border-[#003399]/30 hover:shadow-md'} border-slate-200`}>
      <div className="flex-1 pr-4">
        <h4 className="text-[13px] font-black text-slate-800 mb-1">{title}</h4>
        <p className="text-[11px] font-medium text-slate-500 leading-relaxed">{desc}</p>
      </div>
      <button
        onClick={onClick}
        disabled={disabled}
        className={`px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2 shrink-0 border shadow-sm ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} ${themeClasses}`}
      >
        {btnIcon} {btnLabel}
      </button>
    </div>
  );
};