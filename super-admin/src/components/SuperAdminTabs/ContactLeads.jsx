import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  getAllLeads,
  updateLeadStatus,
} from "../../Redux/Actions/contactLead.thunks";
import {
  FiUsers,
  FiSearch,
  FiRefreshCw,
  FiCheckCircle,
  FiXCircle,
  FiInbox,
  FiClock,
  FiX,
  FiEye,
  FiCreditCard,
  FiArrowLeft,
  FiCalendar,
  FiPower,
  FiPercent,
  FiMail,
  FiPhone,
  FiMessageSquare,
  FiEdit2,
  FiUserPlus,
  FiChevronDown,
  FiCheck,
  FiDownload
} from "react-icons/fi";
import {
  MdVerifiedUser,
  MdBusiness,
  MdAccountBalanceWallet,
  MdOutlineLeaderboard,
  MdToday
} from "react-icons/md";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

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

const Avatar = ({ name = "", isNew = false, status = "" }) => {
  const nameStr = typeof name === "string" ? name : String(name || "");
  const initials = nameStr
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  let bgClass = "bg-gradient-to-br from-slate-500 to-slate-600"; // default
  const statusLower = String(status).toLowerCase();
  if (statusLower === "new") bgClass = "bg-gradient-to-br from-blue-500 to-blue-600";
  else if (statusLower === "converted") bgClass = "bg-gradient-to-br from-emerald-500 to-emerald-600";
  else if (statusLower === "contacted") bgClass = "bg-gradient-to-br from-amber-500 to-amber-600";

  return (
    <div className="relative">
      <div
        className={`w-8 h-8 text-[10px] rounded-full ${bgClass} flex items-center justify-center font-black text-white shrink-0 shadow-sm border border-white/20`}
      >
        {initials || "?"}
      </div>
      {isNew && (
        <span className="absolute -top-0.5 -left-0.5 w-2.5 h-2.5 bg-yellow-400 border border-white rounded-full shadow-sm animate-pulse"></span>
      )}
    </div>
  );
};

const StatCard = ({ label, value, Icon, borderCls, iconBgCls, iconColorCls }) => (
  <div
    className={`bg-white rounded-2xl p-6 border-b-4 ${borderCls} shadow-sm flex items-center justify-between`}
  >
    <div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
        {label}
      </p>
      <h3 className="text-3xl font-black text-slate-800">{value}</h3>
    </div>
    <div
      className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBgCls} ${iconColorCls}`}
    >
      <Icon size={24} />
    </div>
  </div>
);

const StatusBadge = ({ status }) => {
  const statusLower = String(status || "").toLowerCase();
  if (statusLower === "converted") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Converted
      </span>
    );
  }
  if (statusLower === "new") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span> New
      </span>
    );
  }
  if (statusLower === "contacted") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-100">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Contacted
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-50 text-slate-600 border border-slate-200">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span> {status}
    </span>
  );
};

const CustomDropdown = ({ value, options, onChange, icon: Icon, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  return (
    <div className="w-full relative" ref={dropdownRef}>
      {label && (
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
          {Icon && <Icon size={12} />} {label}
        </label>
      )}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-slate-50 hover:bg-white border ${isOpen ? "border-[#003399] ring-2 ring-[#003399]/10" : "border-slate-200"} rounded-xl px-4 py-2.5 text-[13px] font-medium text-slate-700 cursor-pointer flex items-center justify-between transition-all`}
      >
        <span className="truncate">{selectedOption?.label || "Select..."}</span>
        <FiChevronDown className={`transition-transform duration-200 text-slate-400 shrink-0 ml-2 ${isOpen ? "rotate-180" : ""}`} />
      </div>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden py-1 max-h-60 overflow-y-auto">
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`px-4 py-2.5 text-sm font-bold cursor-pointer flex items-center justify-between transition-colors ${value === opt.value ? "bg-indigo-50/50 text-[#003399]" : "text-slate-600 hover:bg-slate-50"}`}
            >
              <span className="truncate">{opt.label}</span>
              {value === opt.value && <FiCheck size={14} className="text-[#003399] shrink-0 ml-2" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function ContactLeads() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const tableScrollRef = useRef(null);

  const { leads, isLoading, pagination, stats } = useSelector(
    (state) => state.contact
  );

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);

  // Modal states
  const [statusModal, setStatusModal] = useState({ isOpen: false, leadId: null, currentStatus: "", newStatus: "", notes: "" });
  const [detailsModal, setDetailsModal] = useState({ isOpen: false, msg: "", notes: "" });

  useEffect(() => {
    dispatch(
      getAllLeads({
        status: filter,
        search,
        fromDate,
        toDate,
      })
    );
  }, [dispatch, filter, search, fromDate, toDate]);

  const handleRefresh = () => {
    dispatch(
      getAllLeads({
        status: filter,
        search,
        fromDate,
        toDate,
      })
    );
  };

  const ITEMS_PER_PAGE = 20;
  const totalPages = Math.ceil((leads?.length || 0) / ITEMS_PER_PAGE) || 1;
  const paginatedLeads = leads?.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE) || [];

  const handleScrollTable = (direction) => {
    if (tableScrollRef.current) {
      tableScrollRef.current.scrollBy({
        left: direction === "left" ? -300 : 300,
        behavior: "smooth",
      });
    }
  };

  const [showScrollButtons, setShowScrollButtons] = useState(false);

  useEffect(() => {
    const checkScroll = () => {
      if (tableScrollRef.current) {
        const { scrollWidth, clientWidth } = tableScrollRef.current;
        setShowScrollButtons(scrollWidth > clientWidth);
      }
    };

    // Check initially and whenever leads change
    checkScroll();
    
    // Add resize listener
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [paginatedLeads, search, filter]);

  const [isExporting, setIsExporting] = useState(false);
  
  const handleExport = async () => {
    if (isLoading || isExporting || !leads?.length) return;
    setIsExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet("Contact Leads");
      
      ws.addRow(["Global Statistics"]);
      ws.getRow(1).font = { size: 14, bold: true };
      ws.addRow(["Total Leads", stats?.total || 0]);
      ws.addRow(["Reviewed Leads", stats?.reviewed || 0]);
      ws.addRow(["New Leads (This Week)", stats?.new || 0]);
      ws.addRow(["Today's Leads", stats?.today || 0]);
      ws.addRow([]);

      ws.addRow(["Applied Filters"]);
      ws.getRow(8).font = { size: 14, bold: true };
      ws.addRow(["Search", search || "None"]);
      ws.addRow(["Status", filter || "All"]);
      ws.addRow(["From Date", fromDate ? new Date(fromDate).toLocaleDateString() : "Any"]);
      ws.addRow(["To Date", toDate ? new Date(toDate).toLocaleDateString() : "Any"]);
      ws.addRow([]);

      ws.addRow(["Company Name", "Contact Name", "Email", "Phone", "Source", "IP Address", "Status", "Date"]);
      ws.getRow(15).font = { bold: true };
      
      leads.forEach(l => {
        ws.addRow([
          l.companyName || "N/A",
          l.fullName || "N/A",
          l.workEmail || "N/A",
          l.phone || "N/A",
          l.source || "Landing Page",
          l.ipAddress || "N/A",
          l.status || "N/A",
          new Date(l.createdAt).toLocaleDateString()
        ]);
      });

      ws.columns.forEach(col => { col.width = 20; });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      saveAs(blob, `Contact_Leads_${new Date().toISOString().split("T")[0]}.xlsx`);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleStatusChange = (id, currentStatus) => {
    setStatusModal({
      isOpen: true,
      leadId: id,
      currentStatus,
      newStatus: currentStatus,
      notes: ""
    });
  };

  const submitStatusChange = () => {
    if (!statusModal.newStatus) return;
    dispatch(
      updateLeadStatus({
        id: statusModal.leadId,
        status: statusModal.newStatus,
        notes: statusModal.notes,
      })
    ).then(() => {
      setStatusModal({ isOpen: false, leadId: null, currentStatus: "", newStatus: "", notes: "" });
      handleRefresh();
    });
  };

  const showMessage = (msg, notes) => {
    setDetailsModal({
      isOpen: true,
      msg,
      notes
    });
  };

  return (
    <div
      className="min-h-screen font-sans pb-20 -mt-6 -mx-4 md:-mx-6"
      style={{ background: C.offWhite }}
    >
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
                className={`p-3 rounded-xl bg-white/10 transition-all border border-white/10 ${
                  isLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-white/20"
                }`}
                disabled={isLoading}
              >
                <div className={isLoading ? "animate-spin" : ""}>
                  <FiRefreshCw size={20} />
                </div>
              </button>
            </div>

            <div className="h-12 w-[1px] bg-white/10 mx-2 hidden md:block" />

            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl text-white border border-white/10 bg-white/10">
                <MdOutlineLeaderboard size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight leading-none">
                  Contact Leads
                </h1>
                <p className="text-[10px] mt-2 font-bold uppercase tracking-[2px] opacity-60">
                  Manage incoming inquiries and prospect tracking
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 md:px-10 -mt-10 space-y-10">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            label="Total Leads"
            value={stats?.total || 0}
            Icon={FiUsers}
            borderCls="border-[#000D26]"
            iconBgCls="bg-slate-100"
            iconColorCls="text-[#000D26]"
          />
          <StatCard
            label="Reviewed Leads"
            value={stats?.reviewed || 0}
            Icon={FiCheckCircle}
            borderCls="border-emerald-500"
            iconBgCls="bg-emerald-50"
            iconColorCls="text-emerald-600"
          />
          <StatCard
            label="New Leads (7d)"
            value={stats?.new || 0}
            Icon={FiUserPlus}
            borderCls="border-amber-500"
            iconBgCls="bg-amber-50"
            iconColorCls="text-amber-600"
          />
          <StatCard
            label="Today's Leads"
            value={stats?.today || 0}
            Icon={MdToday}
            borderCls="border-indigo-500"
            iconBgCls="bg-indigo-50"
            iconColorCls="text-indigo-600"
          />
        </div>

        {/* Filter Section */}
        <div
          className="bg-white rounded-2xl p-6 border shadow-sm"
          style={{ borderColor: C.border }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
            <div className="flex flex-col gap-1.5 lg:col-span-5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <FiSearch size={12} /> Search Leads
              </label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-[13px] font-medium outline-none transition-all focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10 bg-slate-50 hover:bg-white"
                  placeholder="Name, company, or email..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
                <FiSearch
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  size={14}
                />
              </div>
            </div>

            <div className="flex flex-col lg:col-span-3">
              <CustomDropdown
                label="Filter Status"
                icon={FiCheckCircle}
                value={filter}
                onChange={(val) => {
                  setFilter(val);
                  setPage(1);
                }}
                options={[
                  { value: "all", label: "All Leads" },
                  { value: "new", label: "New" },
                  { value: "contacted", label: "Contacted" },
                  { value: "converted", label: "Converted" },
                  { value: "closed", label: "Closed" },
                ]}
              />
            </div>

            <div className="flex flex-col lg:col-span-3">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                <FiCalendar size={12} /> Date Range Filter
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-[12px] font-medium outline-none transition-all focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10 bg-slate-50 hover:bg-white cursor-pointer"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setPage(1);
                  }}
                  title="From Date"
                />
                <span className="text-[10px] font-bold text-slate-400 uppercase">to</span>
                <input
                  type="date"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-[12px] font-medium outline-none transition-all focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10 bg-slate-50 hover:bg-white cursor-pointer"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setPage(1);
                  }}
                  title="To Date"
                />
              </div>
            </div>

            <div className="flex items-end lg:col-span-1">
              <button
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                  setFromDate("");
                  setToDate("");
                  setPage(1);
                }}
                title="Reset Filters"
                className="w-full py-2.5 rounded-xl font-black text-[13px] flex items-center justify-center border shadow-sm transition-all hover:bg-slate-100 hover:text-slate-700 bg-white text-slate-500 border-slate-200"
              >
                <FiX />
              </button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div
          className="bg-white rounded-2xl shadow-sm border overflow-hidden"
          style={{ borderColor: C.border }}
        >
          <div
            className="p-5 border-b flex items-center justify-between gap-3"
            style={{ borderColor: C.border, background: C.white }}
          >
            <div>
              <h2 className="font-black text-slate-800 tracking-tight text-lg">
                Lead Directory
              </h2>
              <p
                className="text-[11px] font-bold uppercase tracking-widest mt-1"
                style={{ color: C.muted }}
              >
                {leads?.length || 0} records found
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExport}
                disabled={isLoading || isExporting || !leads?.length}
                className="flex items-center justify-center space-x-2 px-5 py-1.5 bg-[#000d26] text-white hover:text-white hover:border-[#C9A84C] transition-all shadow-sm rounded-2xl disabled:opacity-50"
              >
                <FiDownload className="w-4 h-4" />
                <span>{isExporting ? "Exporting..." : "Export"}</span>
              </button>

              {showScrollButtons && (
                <>
                  <div className="w-px h-7 bg-slate-200 mx-1" />

                  <button
                    onClick={() => handleScrollTable("left")}
                    title="Scroll table left"
                    className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-[#003399] transition-all shadow-sm"
                  >
                    <FaChevronLeft size={15} />
                  </button>

                  <button
                    onClick={() => handleScrollTable("right")}
                    title="Scroll table right"
                    className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-[#003399] transition-all shadow-sm"
                  >
                    <FaChevronRight size={15} />
                  </button>
                </>
              )}
            </div>
          </div>

          <div ref={tableScrollRef} className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-[#003399] to-[#000d26] text-white">
                  <th className="px-6 py-5 text-[10px] uppercase font-black tracking-widest whitespace-nowrap">
                    Company / Name
                  </th>
                  <th className="px-6 py-5 text-[10px] uppercase font-black tracking-widest whitespace-nowrap">
                    Contact Info
                  </th>
                  <th className="px-6 py-5 text-[10px] uppercase font-black tracking-widest whitespace-nowrap">
                    Source / IPs
                  </th>
                  <th className="px-6 py-5 text-[10px] uppercase font-black tracking-widest whitespace-nowrap">
                    Date
                  </th>
                  <th className="px-6 py-5 text-[10px] uppercase font-black tracking-widest whitespace-nowrap">
                    Status
                  </th>
                  <th className="px-6 py-5 text-[10px] uppercase font-black tracking-widest text-center whitespace-nowrap">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin text-[#003399]">
                          <FiRefreshCw size={32} />
                        </div>
                        <p className="text-sm font-bold text-slate-400">
                          Loading leads...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : paginatedLeads?.length > 0 ? (
                  paginatedLeads.map((c) => {
                    return (
                      <tr
                        key={c._id}
                        className={`transition-colors border-b last:border-0 bg-white hover:bg-slate-50/50`}
                        style={{ borderColor: C.border }}
                      >
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <Avatar 
                              name={c.companyName || c.fullName} 
                              isNew={
                                new Date(c.createdAt).toDateString() === new Date().toDateString() &&
                                !["resolved", "converted", "closed"].includes(String(c.status).toLowerCase())
                              }
                              status={c.status}
                            />
                            <div>
                              <p
                                className="text-xs font-black"
                                style={{ color: C.navy }}
                              >
                                {c.companyName}
                              </p>
                              <p className="text-[9px] font-bold text-slate-400">
                                {c.fullName}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <a
                              href={`mailto:${c.workEmail}`}
                              className="text-xs font-black flex items-center gap-1 hover:text-[#003399]"
                              style={{ color: C.navy }}
                            >
                              <FiMail size={10} className="shrink-0" /> <span className="break-all">{c.workEmail}</span>
                            </a>
                            <a
                              href={`tel:${c.phone}`}
                              className="text-[9px] font-bold text-slate-400 flex items-center gap-1 hover:text-slate-600"
                            >
                              <FiPhone size={10} className="shrink-0" /> {c.phone}
                            </a>
                          </div>
                        </td>

                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-black text-slate-700">
                              {c.source || "Landing Page"}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 mt-0.5">
                              IP: {c.ipAddress || "N/A"}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-black text-slate-700">
                              {new Date(c.createdAt).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 mt-0.5">
                              {new Date(c.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-5 whitespace-nowrap">
                          <StatusBadge status={c.status} />
                        </td>

                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => showMessage(c.message, c.notes)}
                              className="p-2 rounded hover:bg-[#003399]/10 text-[#003399] transition-colors cursor-pointer"
                              title="View Details & Notes"
                            >
                              <FiEye size={16} />
                            </button>
                            <button
                              onClick={() => handleStatusChange(c._id, c.status)}
                              className="p-2 rounded hover:bg-amber-100 text-amber-600 transition-colors cursor-pointer"
                              title="Update Status"
                            >
                              <FiEdit2 size={16} />
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
                        <p className="text-sm font-bold text-slate-400">
                          No leads found matching the criteria.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer Pagination */}
          {totalPages > 1 && (
            <div className="p-5 border-t flex flex-wrap items-center justify-between gap-3 bg-slate-50/50" style={{ borderColor: C.border }}>
              <span className="text-[11px] font-black tracking-widest uppercase text-slate-500 px-2">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm disabled:opacity-50 hover:bg-white bg-slate-100 shadow-sm font-bold text-slate-600 transition-colors"
                >
                  Previous
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm disabled:opacity-50 hover:bg-white bg-slate-100 shadow-sm font-bold text-slate-600 transition-colors"
                >
                  Next Page
                </button>
              </div>
            </div>
          )}
        </div>

        {/* --- CUSTOM MODALS --- */}

        {/* Update Status Modal */}
        {statusModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <h3 className="font-black text-lg text-slate-800">Update Lead Status</h3>
                <button
                  onClick={() => setStatusModal(prev => ({ ...prev, isOpen: false }))}
                  className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <FiX size={20} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <CustomDropdown
                    label="Select New Status"
                    value={statusModal.newStatus}
                    onChange={(val) => setStatusModal(prev => ({ ...prev, newStatus: val }))}
                    options={[
                      { value: "new", label: "New" },
                      { value: "contacted", label: "Contacted" },
                      { value: "converted", label: "Converted" },
                      { value: "closed", label: "Closed" },
                    ]}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 block mb-2">
                    Add Ops Notes (Optional)
                  </label>
                  <textarea
                    value={statusModal.notes}
                    onChange={(e) => setStatusModal(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Type internal notes here..."
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm min-h-[100px] resize-y focus:ring-2 focus:ring-[#003399]/20 focus:border-[#003399] outline-none"
                  />
                </div>
              </div>
              <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                <button
                  onClick={() => setStatusModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitStatusChange}
                  disabled={isLoading}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold bg-[#003399] text-white hover:bg-[#002266] transition-colors shadow-md disabled:opacity-70 flex items-center gap-2"
                >
                  {isLoading && <FiRefreshCw className="animate-spin" />}
                  Save Status
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lead Details Modal */}
        {detailsModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <h3 className="font-black text-lg text-slate-800">Lead Details</h3>
                <button
                  onClick={() => setDetailsModal(prev => ({ ...prev, isOpen: false }))}
                  className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <FiX size={20} />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <p className="font-black text-[11px] uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-2">
                    <FiMessageSquare size={14} /> Client Message
                  </p>
                  <div className="text-slate-700 bg-slate-50 border border-slate-200 p-4 rounded-xl text-sm leading-relaxed whitespace-pre-wrap">
                    {detailsModal.msg || <span className="text-slate-400 italic">No message provided.</span>}
                  </div>
                </div>
                <div>
                  <p className="font-black text-[11px] uppercase tracking-widest text-amber-600 mb-2 flex items-center gap-2">
                    <FiEdit2 size={14} /> Ops Notes
                  </p>
                  <div className="text-slate-800 bg-amber-50 border border-amber-200 p-4 rounded-xl text-sm leading-relaxed whitespace-pre-wrap">
                    {detailsModal.notes || <span className="text-amber-600/60 italic">No internal notes added yet.</span>}
                  </div>
                </div>
              </div>
              <div className="p-5 border-t border-slate-100 flex justify-end bg-slate-50">
                <button
                  onClick={() => setDetailsModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold bg-[#003399] text-white hover:bg-[#002266] transition-colors shadow-md"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
