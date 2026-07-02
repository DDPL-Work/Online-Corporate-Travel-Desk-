import React, { useState, useEffect, useRef } from "react";
import api from "../../API/axios";
import {
  FiX,
  FiClock,
  FiBriefcase,
  FiDollarSign,
  FiUser,
  FiAlertCircle,
  FiCheckCircle,
  FiXCircle,
  FiChevronLeft,
  FiChevronRight,
  FiMapPin,
} from "react-icons/fi";
import { FaPlane, FaHotel } from "react-icons/fa";
import { createPortal } from "react-dom";

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const formatDateTime = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

// ─────────────────────────────────────────────
// SHARED COMPONENTS
// ─────────────────────────────────────────────

const SectionLabel = ({ icon, title }) => (
  <div className="flex items-center gap-2 mb-6">
    <div className="w-8 h-8 rounded-full bg-[#FAF8F4] flex items-center justify-center text-[#B5862A] border border-[#EAE4D9]">
      {icon}
    </div>
    <h3 className="text-sm font-black text-[#1A1714] uppercase tracking-widest">
      {title}
    </h3>
  </div>
);

const TravellerField = ({ icon, label, value }) => (
  <div className="min-w-0">
    <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1 mb-0.5 truncate">
      {icon} {label}
    </p>
    <p className="text-xs font-semibold text-slate-700 truncate">
      {value || "—"}
    </p>
  </div>
);

const TimelineItem = ({
  title,
  time,
  status,
  description,
  active,
  horizontal,
  by
}) => (
  <div
    className={`flex ${horizontal ? "flex-col items-center text-center flex-1" : "gap-8"} relative group`}
  >
    <div
      className={`flex relative ${horizontal ? "w-full items-center mb-4" : "flex-col items-center mt-1"}`}
    >
      {horizontal && (
        <div className="flex-1 h-0.5 bg-[#EAE4D9] group-first:bg-transparent" />
      )}
      <div
        className={`w-6 h-6 rounded-full border-[3px] z-10 transition-all duration-300 shadow-sm shrink-0 flex items-center justify-center ${
          status === "completed"
            ? "bg-emerald-500 border-white ring-4 ring-emerald-50 text-white"
            : status === "rejected"
              ? "bg-rose-500 border-white ring-4 ring-rose-50 text-white"
              : active
                ? "bg-[#B5862A] border-white ring-4 ring-amber-50 animate-pulse text-white"
                : "bg-slate-200 border-white text-transparent"
        }`}
      >
        {status === "completed" && <FiCheckCircle size={12} />}
        {status === "rejected" && <FiXCircle size={12} />}
        {active && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
      </div>
      {horizontal && (
        <div className="flex-1 h-0.5 bg-[#EAE4D9] group-last:bg-transparent" />
      )}
      {!horizontal && (
        <div className="w-0.5 h-full absolute top-6 bg-[#EAE4D9] group-last:hidden -z-0" />
      )}
    </div>
    <div className={`${horizontal ? "px-4" : "pb-10 pt-0.5"} w-full`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1 flex flex-wrap items-center gap-4">
          <p
            className={`text-sm font-black uppercase tracking-tight ${active ? "text-[#1A1714]" : "text-slate-600"}`}
          >
            {title}
          </p>
          {by && (
            <>
              <span className="text-slate-300 font-bold hidden sm:inline">•</span>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-[#1A1714] text-[#C9A84C] flex items-center justify-center text-[10px] font-bold uppercase shrink-0">
                  {by.charAt(0)}
                </div>
                <p className="text-[11px] font-bold text-slate-500 uppercase">
                  Action by <span className="text-[#1A1714]">{by}</span>
                </p>
              </div>
            </>
          )}
        </div>
        <div className="shrink-0 text-right mt-2 sm:mt-0">
          <p className="text-[10px] text-[#B5862A] font-mono font-black uppercase tracking-widest bg-[#FAF8F4] px-3 py-1.5 rounded-lg border border-[#EAE4D9] inline-block shadow-sm">
            {time}
          </p>
        </div>
      </div>
      {description && (
        <p className={`text-xs text-slate-500 mt-2 leading-relaxed font-medium ${horizontal ? "mx-auto max-w-[180px]" : "max-w-xl"}`}>
          {description}
        </p>
      )}
    </div>
  </div>
);

function LabeledInput({ label, children }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-black text-[#65758B] uppercase tracking-widest">
        {label}
      </label>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

const QUERY_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "REJECTED"];

export default function QueryDetailModal({ query: initialQuery, onClose, onStatusChange }) {
  const [activeTab, setActiveTab] = useState("details");
  const tabsRef = useRef(null);
  
  const [query, setQuery] = useState(initialQuery);
  const [isLoading, setIsLoading] = useState(true);
  
  const [status, setStatus] = useState(initialQuery.status || "OPEN");
  const [resolutionMsg, setResolutionMsg] = useState(initialQuery.resolution?.message || "");
  const [refundAmount, setRefundAmount] = useState(initialQuery.resolution?.refundAmount || "");
  const [cancelCharge, setCancelCharge] = useState(initialQuery.resolution?.cancellationCharge || "");
  const [creditNoteNo, setCreditNoteNo] = useState(initialQuery.resolution?.creditNoteNo || "");
  const [saving, setSaving] = useState(false);

  const [eligibleOpsMembers, setEligibleOpsMembers] = useState([]);
  const [selectedOpsMember, setSelectedOpsMember] = useState("");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    const fetchQueryDetails = async () => {
      try {
        const id = initialQuery.bookingId || initialQuery._id;
        if (!id) {
          setIsLoading(false);
          return;
        }
        
        const response = await api.get(`/corporate-related/cancellations/query/${id}`);
        if (response.data?.success) {
          const fullQuery = response.data.data;
          setQuery(fullQuery);
          setStatus(fullQuery.status || "OPEN");
          setResolutionMsg(fullQuery.resolution?.message || "");
          setRefundAmount(fullQuery.resolution?.refundAmount || "");
          setCancelCharge(fullQuery.resolution?.cancellationCharge || "");
          setCreditNoteNo(fullQuery.resolution?.creditNoteNo || "");
        }
      } catch (error) {
        console.error("Failed to fetch query details:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    const fetchEligibleOps = async () => {
      try {
        const res = await api.get("/corporate-related/cancellations/eligible-ops");
        if (res.data?.success) {
          setEligibleOpsMembers(res.data.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch ops members:", error);
      }
    };
    
    fetchQueryDetails();
    fetchEligibleOps();
  }, [initialQuery]);

  const handleAssign = async () => {
    if (!selectedOpsMember) return;
    try {
      setAssigning(true);
      const id = query.bookingId || query._id;
      const res = await api.put(`/corporate-related/cancellation-queries/${id}/assign`, {
        opsMemberId: selectedOpsMember
      });
      if (res.data?.success) {
        // Optimistically update the UI by adding the log
        const newLog = res.data.data.log;
        const assignedUser = res.data.data.assignedTo;
        setQuery(prev => ({
          ...prev,
          amendment: {
            ...prev.amendment,
            assignedTo: assignedUser._id,
            assignedAt: newLog.createdAt
          },
          logs: [...(prev.logs || []), newLog]
        }));
        setSelectedOpsMember("");
        // Show success message if we had a toast library (assume we don't or not standard here)
      }
    } catch (error) {
      console.error("Failed to assign query:", error);
    } finally {
      setAssigning(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await onStatusChange(query._id || query.queryId, {
        status,
        remarks: query.remarks,
        resolution: {
          message: resolutionMsg,
          refundAmount: Number(refundAmount) || 0,
          cancellationCharge: Number(cancelCharge) || 0,
          creditNoteNo,
          resolvedAt: status === "RESOLVED" ? new Date().toISOString() : undefined,
        },
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const scrollTabs = (direction) => {
    if (tabsRef.current) {
      const scrollAmount = 200;
      tabsRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const isHotel = !!query.bookingSnapshot?.hotelName;
  const snap = query.bookingSnapshot || {};
  const corp = query.corporate || {};
  const pax = query.passengers || [];

  const timelineEvents = React.useMemo(() => {
    let events = [];
    
    // Initial Booking Creation
    if (query.bookingSnapshot?.createdAt || query.bookingSnapshot?.bookingDate || query.createdAt) {
      events.push({
        message: "Flight Booking Initiated",
        at: query.bookingSnapshot?.createdAt || query.bookingSnapshot?.bookingDate || query.createdAt,
        by: query.corporate?.employeeName || "Corporate Employee",
      });
    }

    // Amendment Request
    if (query.createdAt) {
      const type = (query.amendment?.type || "Cancellation").replace(/_/g, " ");
      const userName = query.requesterDetails?.name || query.corporate?.employeeName || query.userId?.name?.firstName || "User";
      events.push({
        message: `${type} Request Submitted`,
        at: query.requestedAt || query.createdAt,
        by: userName,
      });
    }

    // Add Assignment Event from top-level if it's there
    if (query.amendment?.assignedTo && query.amendment?.assignedAt) {
      const agentName = query.amendment.assignedTo?.name || (typeof query.amendment.assignedTo === 'string' ? "Ops Member" : "Agent");
      events.push({
        message: `Assigned to ${agentName}`,
        at: query.amendment.assignedAt,
        by: "System",
      });
    }
    
    // Parse the actual history logs from amendmentHistory (query.logs)
    if (query.logs && query.logs.length > 0) {
      query.logs.forEach(log => {
        // Extract message from nested response if present
        let msg = log.message || log.action;
        let actor = log.by || log.actionBy;
        
        if (log.response) {
            msg = log.response.action || log.response.message || msg;
            actor = log.response.by || actor;
        }

        // If it's a generic status update log
        if (!msg && log.status) {
            msg = `Status updated to ${log.status.replace(/_/g, " ")}`;
        }

        if (msg) {
          events.push({
            message: msg,
            at: log.at || log.createdAt,
            by: actor || "System",
          });
        }
      });
    }

    // Ensure uniqueness by a simple key to prevent exact duplicates (e.g. if assignment is in both places)
    const uniqueEvents = [];
    const seenKeys = new Set();
    events.forEach(evt => {
      // Create a unique fingerprint for the event
      const msgKey = evt.message.split(' ').slice(0, 3).join(' ').toLowerCase();
      const timeKey = new Date(evt.at).getTime();
      const key = `${msgKey}-${timeKey}`;
      
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueEvents.push(evt);
      }
    });

    return uniqueEvents.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }, [query]);

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-[#1A1C20]/60 backdrop-blur-md overflow-y-auto">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-[1440px] my-2 overflow-hidden flex flex-col h-[96vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#003399] to-[#000d26] px-6 py-4 text-white flex justify-between items-center shrink-0 shadow-lg relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#C9A84C]/20 rounded-lg text-[#C9A84C]">
              {isHotel ? <FaHotel size={20} /> : <FaPlane size={20} />}
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight uppercase italic">
                {isHotel ? "Hotel" : "Flight"} {(query.amendment?.type || "Cancellation Query").replace(/_/g, " ")}
              </h2>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5 tracking-widest">
                Query ID: {query.queryId || query._id || "—"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white/10 p-2 rounded-full transition-colors text-slate-400"
          >
            <FiX size={22} />
          </button>
        </div>

        {/* Sticky Action Bar */}
        <div className="sticky top-0 z-20 bg-white border-b border-[#EAE4D9] px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border uppercase tracking-tighter ${
                query.status === "RESOLVED"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                  : query.status === "REJECTED"
                  ? "bg-red-50 text-red-700 border-red-100"
                  : query.status === "IN_PROGRESS"
                  ? "bg-blue-50 text-blue-700 border-blue-100"
                  : "bg-amber-50 text-amber-700 border-amber-100"
              }`}
            >
              {query.status === "RESOLVED" ? (
                <FiCheckCircle size={12} />
              ) : query.status === "REJECTED" ? (
                <FiXCircle size={12} />
              ) : query.status === "IN_PROGRESS" ? (
                <FiClock size={12} />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              )}
              {query.status || "OPEN"}
            </div>

            <div className="flex items-center gap-1.5 text-slate-500 border-l border-[#EAE4D9] pl-4 font-mono font-black uppercase tracking-widest">
              {isHotel ? "Booking Ref: " : "PNR: "}
              {isHotel ? query.bookingReference || "N/A" : snap.pnr || "N/A"}
            </div>
            <div className="flex items-center gap-1.5 text-slate-500 border-l border-[#EAE4D9] pl-4">
              <FiClock className="text-slate-400" />
              <span>Submitted: {formatDateTime(query.requestedAt)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500 border-l border-[#EAE4D9] pl-4">
              <FiBriefcase className="text-slate-400" />
              <span>{corp.companyName || "N/A"}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex flex-wrap items-center gap-3 ml-auto shrink-0 w-full justify-end">
              <span className="text-[11px] font-black uppercase text-slate-400 tracking-tight">
                Proceed to Update Status tab to resolve
              </span>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="relative bg-white border-b border-[#EAE4D9] flex items-center shrink-0 group">
          <button
            onClick={() => scrollTabs("left")}
            className="md:hidden flex items-center justify-center w-10 h-14 bg-white border-r border-[#EAE4D9] text-slate-400 hover:text-[#B5862A] z-10 transition-colors"
          >
            <FiChevronLeft size={18} />
          </button>

          <div
            ref={tabsRef}
            className="flex-1 px-6 flex items-center gap-8 overflow-x-auto no-scrollbar scroll-smooth"
          >
            {[
              { id: "details", label: isHotel ? "Hotel Details" : "Flight Details", icon: isHotel ? <FaHotel /> : <FaPlane /> },
              { id: "project", label: "Corporate Info", icon: <FiBriefcase /> },
              { id: "charges", label: "Fare Breakdown", icon: <FiDollarSign /> },
              { id: "history", label: "Activity Logs", icon: <FiClock /> },
              { id: "status", label: "Update Status", icon: <FiAlertCircle /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 text-[11px] font-black uppercase tracking-widest transition-all relative shrink-0 ${
                  activeTab === tab.id
                    ? "text-[#B5862A]"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <span
                  className={
                    activeTab === tab.id ? "text-[#B5862A]" : "text-slate-300"
                  }
                >
                  {tab.icon}
                </span>
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#B5862A] rounded-full" />
                )}
              </button>
            ))}
          </div>

          <button
            onClick={() => scrollTabs("right")}
            className="md:hidden flex items-center justify-center w-10 h-14 bg-white border-l border-[#EAE4D9] text-slate-400 hover:text-[#B5862A] z-10 transition-colors"
          >
            <FiChevronRight size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth bg-[#FAF8F4]/30 relative">
          {isLoading && (
             <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-sm">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B5862A]"></div>
             </div>
          )}
          <div className="max-w-7xl mx-auto">
            {activeTab === "details" && (
              <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex-1 space-y-6">
                  <div className="space-y-4">                   
                    
                    {isHotel ? (
                      <div className="bg-white border border-[#EAE4D9] rounded-3xl p-6 shadow-sm space-y-6">
                         <div className="flex items-center justify-between border-b border-slate-50 pb-5">
                            <h3 className="text-2xl font-black text-[#1A1714] leading-tight tracking-tighter uppercase italic">
                              {snap.hotelName || "Unknown Hotel"}
                            </h3>
                            <span className="text-[10px] font-black bg-[#FAF8F4] text-[#B5862A] px-3 py-1 rounded-full border border-blue-100 uppercase tracking-widest">
                              {snap.roomType || "Standard Room"}
                            </span>
                         </div>
                         <div className="grid grid-cols-2 gap-8 py-4">
                            <div className="flex flex-col">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Check-in</p>
                              <p className="text-xl font-black text-[#B5862A] leading-none">{formatDate(snap.checkInDate)}</p>
                            </div>
                            <div className="flex flex-col text-right">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Check-out</p>
                              <p className="text-xl font-black text-[#B5862A] leading-none">{formatDate(snap.checkOutDate)}</p>
                            </div>
                         </div>
                      </div>
                    ) : (
                      <>
                        {(query.flightRequest?.segments?.length > 0 ? query.flightRequest.segments : snap.sectors)?.length > 0 ? (
                          (query.flightRequest?.segments?.length > 0 ? query.flightRequest.segments : snap.sectors).map((seg, idx) => {
                            const airlineName = seg.airlineName || seg.airline || "Unknown Airline";
                            const airlineCode = seg.airlineCode || seg.airline || "";
                            const flightNumber = seg.flightNumber || "";
                            const cabinClassMap = { 1: "All", 2: "Economy", 3: "PremiumEconomy", 4: "Business", 5: "PremiumBusiness", 6: "First" };
                            const cabinClassStr = seg.cabinClass ? (cabinClassMap[seg.cabinClass] || "Economy") : "";
                            const fareClass = seg.supplierFareClass || seg.fareClass || snap.journeyType || "Flight";
                            const depTime = seg.departureDateTime || seg.departureTime;
                            const arrTime = seg.arrivalDateTime || seg.arrivalTime;
                            
                            const originCode = seg.origin?.airportCode || seg.origin;
                            const originCity = seg.origin?.city || "";
                            const originName = seg.origin?.airportName || "";
                            const originTerm = seg.origin?.terminal ? `Terminal ${seg.origin.terminal}` : "";
                            
                            const destCode = seg.destination?.airportCode || seg.destination;
                            const destCity = seg.destination?.city || "";
                            const destName = seg.destination?.airportName || "";
                            const destTerm = seg.destination?.terminal ? `Terminal ${seg.destination.terminal}` : "";

                            return (
                            <div key={idx} className="bg-white border border-[#EAE4D9] rounded-3xl p-6 shadow-sm space-y-6">
                              <div className="flex items-center justify-between border-b border-slate-50 pb-5">
                                <div className="flex items-center gap-3">
                                  {airlineCode && (
                                    <img src={`https://images.kiwi.com/airlines/64/${airlineCode}.png`} alt={airlineCode} className="w-8 h-8 rounded-full object-contain bg-slate-50 p-1 border border-slate-100" />
                                  )}
                                  <span className="text-sm font-black text-[#1A1714] tracking-tight uppercase italic flex items-center gap-2">
                                    {airlineName} <span className="text-slate-300">•</span> {flightNumber}
                                  </span>
                                  {cabinClassStr && (
                                    <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-2 py-1 rounded-md uppercase tracking-widest ml-2">
                                      {cabinClassStr}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black bg-[#FAF8F4] text-[#B5862A] px-3 py-1 rounded-full border border-blue-100 uppercase tracking-widest">
                                    {fareClass}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-12 py-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-end gap-2 mb-2">
                                    <h4 className="text-4xl font-black text-[#1A1714] tracking-tighter italic leading-none">
                                      {originCode}
                                    </h4>
                                    {originCity && <span className="text-sm font-black text-slate-400 uppercase tracking-wider mb-1">{originCity}</span>}
                                  </div>
                                  {originName && (
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide truncate mb-4">
                                      {originName}
                                    </p>
                                  )}
                                  <div>
                                    <p className="text-xl font-black text-[#B5862A] leading-none">
                                      {formatTime(depTime) !== "—" ? formatTime(depTime) : "Departure"}
                                    </p>
                                    <p className="text-[11px] font-black text-[#1A1714] uppercase mt-1.5 italic">
                                      {depTime ? formatDate(depTime) : formatDate(snap.travelDate)}
                                    </p>
                                    {originTerm && (
                                      <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">
                                        {originTerm}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex-1 flex flex-col items-center">
                                  <div className="w-full flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-[#B5862A] shadow-lg shadow-indigo-100 shrink-0" />
                                    <div className="flex-1 border-t-2 border-dashed border-[#EAE4D9] relative">
                                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 py-1 rounded-full border border-[#EAE4D9] shadow-sm">
                                        <FaPlane
                                          className="text-[#B5862A] rotate-90"
                                          size={12}
                                        />
                                      </div>
                                    </div>
                                    <div className="w-2 h-2 rounded-full bg-[#B5862A] shadow-lg shadow-indigo-100 shrink-0" />
                                  </div>
                                </div>

                                <div className="flex-1 min-w-0 text-right">
                                  <div className="flex items-end justify-end gap-2 mb-2">
                                    {destCity && <span className="text-sm font-black text-slate-400 uppercase tracking-wider mb-1">{destCity}</span>}
                                    <h4 className="text-4xl font-black text-[#1A1714] tracking-tighter italic leading-none">
                                      {destCode}
                                    </h4>
                                  </div>
                                  {destName && (
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide truncate mb-4">
                                      {destName}
                                    </p>
                                  )}
                                  <div>
                                    <p className="text-xl font-black text-[#B5862A] leading-none">
                                      {formatTime(arrTime) !== "—" ? formatTime(arrTime) : "Arrival"}
                                    </p>
                                    <p className="text-[11px] font-black text-[#1A1714] uppercase mt-1.5 italic">
                                      {arrTime ? formatDate(arrTime) : (depTime ? formatDate(depTime) : formatDate(snap.travelDate))}
                                    </p>
                                    {destTerm && (
                                      <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">
                                        {destTerm}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            );
                          })
                        ) : (
                            <div className="bg-white border border-[#EAE4D9] rounded-3xl p-6 shadow-sm space-y-6">
                              <p className="text-sm font-black text-slate-500 uppercase">No segment data available</p>
                            </div>
                        )}
                      </>
                    )}
                    

                  </div>
                </div>

                {/* Right Column - Fare Snapshot Dummy to maintain layout */}
                <div className="w-full lg:w-96 space-y-6">
                  <div className="bg-gradient-to-br from-[#003399] to-[#000d26] text-white rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                    <SectionLabel
                      icon={<FiDollarSign />}
                      title="Total Paid Ammount"
                    />
                    <div className="mt-8 relative">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-500 italic">
                          INR
                        </span>
                        <h4 className="text-5xl font-black text-[#C9A84C] tracking-tighter italic tabular-nums">
                          {Math.ceil(query.pricingSnapshot?.totalAmount || snap.totalFare || 0)?.toLocaleString()}
                        </h4>
                      </div>
                    </div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#FAF8F4] opacity-10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
                  </div>
                  
                  {query.remarks && (
                    <div className="bg-white border border-[#EAE4D9] rounded-3xl p-6 shadow-sm">
                      <SectionLabel icon={<FiAlertCircle />} title="Remarks" />
                      <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 italic text-sm font-black text-amber-900 leading-relaxed shadow-inner">
                        "{query.remarks}"
                      </div>
                    </div>
                  )}
                </div>
                 
              </div>
            )}

            {activeTab === "project" && (
              <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex-1 space-y-6">
                  <div className="bg-white border border-[#EAE4D9] rounded-3xl p-8 shadow-sm">
                    <SectionLabel
                      icon={<FiBriefcase />}
                      title="Corporate Context"
                    />
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                          Corporate Name
                        </p>
                        <p className="text-base font-black text-[#1A1714] uppercase tracking-tighter">
                          {corp.companyName || query.corporateId?.corporateName || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                          Primary Contact Email
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black text-[#1A1714] uppercase tracking-tighter">
                            {corp.employeeEmail || query.userId?.email || "—"}
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                          Primary Contact Phone
                        </p>
                        <p className="text-base font-black text-slate-700 truncate uppercase">
                          {corp.employeePhone || query.userId?.phone || query.userId?.phoneNumber || "—"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-4 max-w-4xl">
                  <SectionLabel
                    icon={<FiUser />}
                    title={`${isHotel ? "Guests" : "Passengers"} (${pax.length})`}
                  />
                  <div className="grid grid-cols-1 gap-6">
                    {pax.length > 0 ? pax.map((p, idx) => (
                      <div
                        key={idx}
                        className="bg-white border border-[#EAE4D9] rounded-3xl p-8 shadow-sm"
                      >
                        <div className="flex items-center gap-6">
                          <div className="w-16 h-16 rounded-2xl bg-[#1A1C20] text-[#C9A84C] flex items-center justify-center font-black text-2xl shadow-lg uppercase italic">
                            {(p.name || "?").charAt(0)}
                          </div>
                          <div>
                            <p className="text-2xl font-black text-[#1A1714] uppercase tracking-tighter italic">
                              {p.name || "—"}
                            </p>
                            <div className="flex gap-2 mt-2">
                              <span className="text-[10px] font-black bg-[#1A1C20] text-white px-3 py-1 rounded-full uppercase tracking-widest">
                                {p.type || "Adult"}
                              </span>
                            </div>
                          </div>
                        </div>
                        {p.ticketNumber && (
                          <div className="mt-10 pt-8 border-t border-slate-50">
                            <TravellerField
                              icon={<FiBriefcase />}
                              label="Ticket / Ref Number"
                              value={p.ticketNumber}
                            />
                          </div>
                        )}
                      </div>
                    )) : (
                        <div className="bg-white border border-[#EAE4D9] rounded-3xl p-8 shadow-sm text-center text-slate-500 uppercase font-black">
                            No passengers provided
                        </div>
                    )}
                  </div>
                </div>
              </div>
                </div>
              </div>
            )}

            {activeTab === "charges" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-6 max-w-4xl">
                  <div className="bg-white border border-[#EAE4D9] rounded-3xl p-8 shadow-sm">
                    <SectionLabel
                      icon={<FiDollarSign />}
                      title="Fare Breakdown"
                    />
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                      <TravellerField icon={<FiDollarSign />} label="Total Fare" value={`₹${(query.pricingSnapshot?.totalAmount || snap.totalFare || 0).toLocaleString()}`} />
                      <TravellerField icon={<FiDollarSign />} label="Base Fare" value={`₹${(query.bookingSnapshot?.baseFare || snap.baseFare || 0).toLocaleString()}`} />
                      <TravellerField icon={<FiDollarSign />} label="Taxes" value={`₹${(query.bookingSnapshot?.taxes || snap.taxes || 0).toLocaleString()}`} />
                      <TravellerField icon={<FiDollarSign />} label="Service Fee" value={`₹${(query.pricingSnapshot?.serviceFeeDetails?.feeAmount || snap.serviceFee || 0).toLocaleString()}`} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "history" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex justify-center py-10">
                <div className="w-full max-w-6xl">
                  <SectionLabel
                    icon={<FiClock className="text-[#B5862A]" />}
                    title="Activity Timeline"
                  />
                  <div className="mt-16 flex flex-col items-start ml-12">
                    {timelineEvents.length > 0 ? (
                      timelineEvents.map((log, i) => (
                        <TimelineItem
                          key={i}
                          title={log.message || log.action}
                          time={log.at ? new Date(log.at).toLocaleString("en-IN", { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "—"}
                          status={i === timelineEvents.length - 1 ? "completed" : "pending"}
                          active={i === 0}
                          by={log.by}
                        />
                      ))
                    ) : (
                      <div className="py-12 text-center bg-[#FAF8F4] w-full rounded-xl border border-dashed border-[#EAE4D9]">
                        <p className="text-slate-400 text-sm font-black uppercase">No activity logs recorded yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "status" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full space-y-6">
                 
                 <div className="bg-white border border-[#EAE4D9] rounded-3xl p-6 shadow-xl shadow-slate-100/50 w-full">
                  <div className="w-full space-y-5">
                    <SectionLabel icon={<FiUser />} title="Assign Ops Member" />
                    <div className="flex items-end gap-4">
                      <div className="flex-1">
                        <LabeledInput label="Assign To">
                          <select
                            value={selectedOpsMember}
                            onChange={(e) => setSelectedOpsMember(e.target.value)}
                            className="w-full px-4 py-2.5 bg-[#FAF8F4] border border-[#EAE4D9] rounded-xl text-sm font-black outline-none transition-all focus:border-[#B5862A] focus:ring-2 focus:ring-[#B5862A]/20 text-[#1A1714] cursor-pointer"
                          >
                            <option value="">Select Ops Member</option>
                            {eligibleOpsMembers.map(ops => (
                              <option key={ops._id} value={ops._id}>
                                {ops.name} ({ops.designation || ops.role})
                              </option>
                            ))}
                          </select>
                        </LabeledInput>
                      </div>
                      <button
                        onClick={handleAssign}
                        disabled={assigning || !selectedOpsMember}
                        className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-black uppercase shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-60 disabled:hover:scale-100"
                      >
                        {assigning ? "Assigning..." : "Assign Query"}
                      </button>
                    </div>
                  </div>
                 </div>

                 <div className="bg-white border border-[#EAE4D9] rounded-3xl p-6 shadow-xl shadow-slate-100/50 w-full">
                  <div className="w-full space-y-5">
                    <SectionLabel icon={<FiAlertCircle />} title="Resolve Cancellation Query" />
                    
                    <div className="grid grid-cols-4 gap-4">
                      <LabeledInput label="Status">
                        <select
                          value={status}
                          onChange={(e) => setStatus(e.target.value)}
                          className="w-full px-4 py-2.5 bg-[#FAF8F4] border border-[#EAE4D9] rounded-xl text-sm font-black outline-none transition-all focus:border-[#B5862A] focus:ring-2 focus:ring-[#B5862A]/20 text-[#1A1714] cursor-pointer"
                        >
                          {QUERY_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s.replace("_", " ")}
                            </option>
                          ))}
                        </select>
                      </LabeledInput>
                      
                      <LabeledInput label="Credit Note No.">
                        <input
                          type="text"
                          value={creditNoteNo}
                          onChange={(e) => setCreditNoteNo(e.target.value)}
                          placeholder="e.g. CN-2024-001"
                          className="w-full px-4 py-2.5 bg-[#FAF8F4] border border-[#EAE4D9] rounded-xl text-sm font-bold outline-none transition-all focus:border-[#B5862A] focus:ring-2 focus:ring-[#B5862A]/20 text-[#1A1714]"
                        />
                      </LabeledInput>
                      
                      <LabeledInput label="Refund Amount (₹)">
                        <input
                          type="number"
                          value={refundAmount}
                          onChange={(e) => setRefundAmount(e.target.value)}
                          placeholder="0"
                          className="w-full px-4 py-2.5 bg-[#FAF8F4] border border-[#EAE4D9] rounded-xl text-sm font-bold outline-none transition-all focus:border-[#B5862A] focus:ring-2 focus:ring-[#B5862A]/20 text-[#1A1714]"
                        />
                      </LabeledInput>
                      
                      <LabeledInput label="Cancellation Charge (₹)">
                        <input
                          type="number"
                          value={cancelCharge}
                          onChange={(e) => setCancelCharge(e.target.value)}
                          placeholder="0"
                          className="w-full px-4 py-2.5 bg-[#FAF8F4] border border-[#EAE4D9] rounded-xl text-sm font-bold outline-none transition-all focus:border-[#B5862A] focus:ring-2 focus:ring-[#B5862A]/20 text-[#1A1714]"
                        />
                      </LabeledInput>
                    </div>
                    
                    <LabeledInput label="Resolution Message">
                      <textarea
                        value={resolutionMsg}
                        onChange={(e) => setResolutionMsg(e.target.value)}
                        rows={2}
                        placeholder="Describe the resolution or reason for rejection..."
                        className="w-full px-4 py-2.5 bg-[#FAF8F4] border border-[#EAE4D9] rounded-xl text-sm font-bold outline-none transition-all focus:border-[#B5862A] focus:ring-2 focus:ring-[#B5862A]/20 text-[#1A1714] resize-none"
                      />
                    </LabeledInput>

                    <div className="flex justify-end gap-3 pt-4 border-t border-[#EAE4D9]">
                      <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl border border-[#EAE4D9] text-sm font-black uppercase text-slate-500 hover:bg-slate-50 hover:text-[#1A1714] transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-[#B5862A] to-[#966b1e] text-white text-sm font-black uppercase shadow-lg shadow-amber-900/20 hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-60 disabled:hover:scale-100"
                      >
                        {saving ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                    </div>
                 </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
