import React, { useEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiRefreshCw,
  FiSend,
  FiUser,
  FiX,
  FiXCircle,
  FiAlertCircle,
  FiBriefcase,
  FiInfo,
  FiChevronLeft,
  FiChevronRight,
  FiMap,
  FiCreditCard,
  FiActivity,
  FiFileText,
  FiCalendar,
  FiSettings,
  FiChevronDown,
  FiDollarSign
} from "react-icons/fi";
import { FaPlane } from "react-icons/fa";
import { toast } from "react-toastify";
import axios from "../../API/axios";
import {
  generateReissueTicket,
  reassignReissueRequest,
  updateReissueStatus,
} from "../../Redux/Actions/reissueThunks";
import {
  resetReissueState,
  setCurrentReissueRequest,
} from "../../Redux/Slice/reissueSlice";
import {
  formatDate,
  formatDateTime,
  getAllowedOpsTransitions,
  getJourneyLabel,
  getStatusTone,
  prettifyLabel,
} from "./reissueUi";

const PLACEHOLDER = "--";

const formatMoney = (value, currency = "INR") => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return PLACEHOLDER;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 2,
  }).format(amount);
};

function Card({ label, value, accent }) {
  return (
    <div className="bg-white border border-[#EAE4D9] rounded-2xl p-4 shadow-sm flex flex-col justify-center">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
        {label}
      </p>
      <p className={`text-sm font-bold ${accent || "text-[#1A1714]"}`}>
        {value || PLACEHOLDER}
      </p>
    </div>
  );
}

function getSegmentRoute(segment = {}) {
  return `${segment.origin || PLACEHOLDER} -> ${segment.destination || PLACEHOLDER}`;
}

function getTimelineIcon(item = {}) {
  if (item.status === "COMPLETED" || item.eventType === "DOWNLOAD_READY") {
    return <FiCheckCircle size={14} className="text-emerald-600" />;
  }
  if (item.status === "WAITING_AIRLINE") {
    return <FiClock size={14} className="text-amber-600" />;
  }
  return <FiSend size={14} className="text-[#003399]" />;
}

export default function ReissueOpsDetailModal({
  request,
  onClose,
  canReassign = false,
  opsMembers = [],
}) {
  const dispatch = useDispatch();
  const { currentRequest, actionLoading, error } = useSelector((state) => state.reissue);
  const [activeTab, setActiveTab] = useState("details");
  const tabsRef = useRef(null);
  
  const [message, setMessage] = useState("");
  const [reassignTo, setReassignTo] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeRequest = currentRequest || request;
  const selectedFlight =
    activeRequest?.selectedFlight || activeRequest?.preferredJourney || null;
  const selectedSegments = useMemo(() => {
    if (Array.isArray(activeRequest?.selectedSegments) && activeRequest.selectedSegments.length) {
      return activeRequest.selectedSegments;
    }
    return Array.isArray(selectedFlight?.segments) ? selectedFlight.segments : [];
  }, [activeRequest?.selectedSegments, selectedFlight?.segments]);
  const pricingSnapshot = activeRequest?.reissuePricingSnapshot || null;
  const pricingCurrency =
    activeRequest?.currency ||
    pricingSnapshot?.currency ||
    selectedFlight?.currency ||
    "INR";
  const transitions = useMemo(
    () => getAllowedOpsTransitions(activeRequest?.status),
    [activeRequest?.status],
  );
  const ticketUrl =
    activeRequest?.generatedTicketUrl || activeRequest?.revisedTicketUrl || null;
  const canDownloadTicket = ["TICKET_GENERATED", "COMPLETED"].includes(activeRequest?.status);
  const corporateName =
    activeRequest?.displayInfo?.corporateName ||
    activeRequest?.corporateId?.corporateName ||
    activeRequest?.companyId?.corporateName ||
    activeRequest?.metadata?.corporateName ||
    "N/A";

  useEffect(() => {
    dispatch(setCurrentReissueRequest(request));
    setReassignTo(request?.assignedOpsMember?._id || request?.assignedTo?._id || "");
    return () => {
      dispatch(setCurrentReissueRequest(null));
      dispatch(resetReissueState());
    };
  }, [dispatch, request]);

  useEffect(() => {
    if (!activeRequest) return;
    setReassignTo(
      activeRequest?.assignedOpsMember?._id ||
        activeRequest?.assignedTo?._id ||
        "",
    );
  }, [activeRequest]);

  useEffect(() => {
    if (!error) return;
    toast.error(error);
    dispatch(resetReissueState());
  }, [dispatch, error]);

  const scrollTabs = (direction) => {
    if (tabsRef.current) {
      const scrollAmount = 200;
      tabsRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const clearMessage = () => setMessage("");

  const handleStatusUpdate = async (status) => {
    try {
      await dispatch(
        updateReissueStatus({
          requestId: activeRequest.id,
          status,
          message: message.trim() || undefined,
        }),
      ).unwrap();
      toast.success(`Status moved to ${prettifyLabel(status)}`);
      clearMessage();
    } catch (err) {
      toast.error(err || "Failed to update status");
    }
  };

  const handleGenerateTicket = async () => {
    if (!selectedFlight) {
      toast.error("A selected replacement flight is required before ticket generation.");
      return;
    }

    try {
      await dispatch(
        generateReissueTicket({
          requestId: activeRequest.id,
          message: message.trim() || undefined,
        }),
      ).unwrap();
      toast.success("Reissued ticket generated successfully.");
      clearMessage();
    } catch (err) {
      toast.error(err || "Failed to generate revised ticket");
    }
  };

  const handleReassign = async () => {
    if (!reassignTo) {
      toast.error("Please choose an OPS member to reassign this request.");
      return;
    }

    if (
      String(reassignTo) ===
      String(activeRequest?.assignedOpsMember?._id || activeRequest?.assignedTo?._id || "")
    ) {
      toast.error("This request is already assigned to the selected OPS member.");
      return;
    }

    try {
      await dispatch(
        reassignReissueRequest({
          requestId: activeRequest.id,
          assignedTo: reassignTo,
          message: message.trim() || undefined,
        }),
      ).unwrap();
      toast.success("Offline reissue request reassigned.");
      clearMessage();
    } catch (err) {
      toast.error(err || "Failed to reassign request");
    }
  };

  const handleDownload = async () => {
    try {
      const response = await axios.get(
        `/reissue/offline/${activeRequest.id}/download-ticket`,
        { responseType: "blob" },
      );
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${activeRequest.requestId || "reissued-ticket"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(
        `${axios.defaults.baseURL}/reissue/offline/${activeRequest.id}/download-ticket`,
        "_blank",
        "noopener,noreferrer",
      );
    }
  };

  if (!activeRequest) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-[#1A1C20]/60 backdrop-blur-md overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[1440px] my-2 overflow-hidden flex flex-col h-[96vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#003399] to-[#000d26] px-6 py-4 text-white flex justify-between items-center shrink-0 shadow-lg relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#C9A84C]/20 rounded-lg text-[#C9A84C]">
              <FaPlane size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight uppercase">
                Offline Reissue Workspace
              </h2>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5 tracking-widest">
                Req ID: {activeRequest?.requestId}
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
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border uppercase tracking-tighter ${
              activeRequest?.status === "COMPLETED" 
                ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                : activeRequest?.status === "REJECTED" 
                  ? "bg-red-50 text-red-700 border-red-100" 
                  : "bg-[#003399]/10 text-[#003399] border-[#003399]/20"
            }`}>
              {activeRequest?.status === "COMPLETED" ? <FiCheckCircle size={12} /> : activeRequest?.status === "REJECTED" ? <FiXCircle size={12} /> : <span className="w-1.5 h-1.5 rounded-full bg-[#003399] animate-pulse" />}
              {prettifyLabel(activeRequest?.status)}
            </div>

            {activeRequest?.overdue && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-100 uppercase tracking-tighter">
                <FiAlertCircle size={12} /> Overdue
              </div>
            )}
            
            {activeRequest?.breached && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 rounded-full border border-rose-100 uppercase tracking-tighter">
                <FiAlertCircle size={12} /> SLA Breached
              </div>
            )}

            <div className="flex items-center gap-1.5 text-slate-500 border-l border-[#EAE4D9] pl-4">
              <FiClock className="text-slate-400" />
              <span>SLA: {formatDateTime(activeRequest?.slaDeadline)}</span>
            </div>
            
            <div className="flex items-center gap-1.5 text-slate-500 border-l border-[#EAE4D9] pl-4">
              <FiBriefcase className="text-slate-400" />
              <span>{corporateName}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
             {ticketUrl && canDownloadTicket && (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-4 py-2 border border-[#B5862A] text-[#B5862A] font-black text-[11px] rounded-xl transition-all uppercase tracking-tight hover:bg-[#B5862A]/5 flex items-center gap-2"
                >
                  <FiDownload size={14} />
                  Download Ticket
                </button>
              )}
              <button
                type="button"
                onClick={handleGenerateTicket}
                disabled={actionLoading || !selectedFlight}
                className={`px-4 py-2 font-black text-[11px] rounded-xl transition-all flex items-center gap-2 uppercase tracking-tight border ${
                  actionLoading || !selectedFlight 
                    ? "bg-slate-100 border-[#EAE4D9] text-slate-400 cursor-not-allowed"
                    : "bg-[#003399] text-white border-[#003399] hover:bg-[#002266] shadow-lg shadow-[#003399]/20"
                }`}
              >
                <FiRefreshCw size={14} className={actionLoading ? "animate-spin" : ""} />
                {ticketUrl ? "Regen Ticket" : "Generate Ticket"}
              </button>
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
              { id: "details", label: "Reissue Details", icon: <FiMap /> },
              { id: "financials", label: "Financials", icon: <FiCreditCard /> },
              { id: "ops", label: "Ops & Assignment", icon: <FiSettings /> },
              { id: "timeline", label: "Timeline", icon: <FiActivity /> },
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
                <span className={activeTab === tab.id ? "text-[#B5862A]" : "text-slate-300"}>
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
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth bg-[#FAF8F4]/30">
          <div className="w-full mx-auto space-y-6">
            
            {activeTab === "details" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                
                {/* 1. New Flight Itinerary + Fare Snapshot (Top) */}
                <div>
                  <div className="flex items-center gap-2 mb-4 pl-2">
                    <FaPlane className="text-[#B5862A]" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-[#1A1714]">Flight Itinerary</h3>
                  </div>
                  
                  <div className="flex flex-col xl:flex-row gap-6">
                    {/* Left: Flight Card */}
                    <div className="flex-1 bg-white border border-[#EAE4D9] rounded-[2.5rem] p-8 shadow-sm relative flex flex-col justify-between">
                      {(() => {
                        const formatTimeOnly = (d) => {
                          if (!d) return "--:--";
                          try { return new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase(); } catch { return "--:--"; }
                        };
                        const formatDateOnly = (d) => {
                          if (!d) return "--";
                          try { return new Date(d).toLocaleDateString("en-US", { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase(); } catch { return "--"; }
                        };

                        const originSegments = selectedSegments.length > 0 ? selectedSegments[0] : selectedFlight;
                        const destSegments = selectedSegments.length > 0 ? selectedSegments[selectedSegments.length - 1] : selectedFlight;
                        const cabinClassLabel = activeRequest?.preferredJourney?.cabinClass ? { 1: "All", 2: "Economy", 3: "Premium Economy", 4: "Business", 5: "Premium Business", 6: "First Class" }[activeRequest?.preferredJourney?.cabinClass] : "Economy";
                        
                        return (
                          <>
                            <div className="flex items-center justify-between mb-8">
                              <div className="flex items-center gap-3">
                                <span className="bg-[#B5862A] text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                  Departure Flight
                                </span>
                                <span className="text-xs font-black italic text-[#1A1714] uppercase tracking-tighter">
                                  {selectedFlight?.airlineName || selectedFlight?.airlineCode || (typeof activeRequest?.airline === 'object' ? activeRequest.airline?.code || activeRequest.airline?.name : activeRequest?.airline) || "Airline"} - {selectedFlight?.flightNumber || ""} - {activeRequest?.preferredJourney?.pricingSnapshot?.matchedRule?.Type === 1 ? "SAVER" : "REGULAR"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                  {cabinClassLabel}
                                </span>
                                <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                                  <FiCheckCircle size={10} /> Refundable
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between relative z-10 my-4">
                              {/* Origin */}
                              <div className="flex flex-col">
                                <h4 className="text-4xl font-black italic text-[#1A1714] uppercase leading-none tracking-tighter">
                                  {originSegments?.origin?.code || originSegments?.origin}
                                </h4>
                                <p className="text-[10px] font-black text-[#1A1714] uppercase tracking-widest mt-2">{originSegments?.originAirport?.name || originSegments?.originAirport || originSegments?.origin?.name || originSegments?.origin?.code || originSegments?.origin}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">{originSegments?.originCity?.name || originSegments?.originCity || originSegments?.origin?.city || originSegments?.origin?.code || originSegments?.origin}</p>
                                <div className="mt-4">
                                  <p className="text-lg font-black text-[#B5862A] leading-none">{formatTimeOnly(originSegments?.departureTime || originSegments?.departureDate)}</p>
                                  <p className="text-[10px] font-black italic text-[#1A1714] uppercase tracking-tighter mt-1">{formatDateOnly(originSegments?.departureTime || originSegments?.departureDate)}</p>
                                </div>
                              </div>

                              {/* Center Duration */}
                              <div className="flex-1 px-8 flex flex-col items-center justify-center relative mt-[-20px]">
                                <span className="text-[10px] font-bold text-slate-400 mb-2 uppercase">{selectedFlight?.duration || originSegments?.duration || PLACEHOLDER}</span>
                                <div className="w-full flex items-center">
                                  <div className="w-1.5 h-1.5 rounded-full bg-[#B5862A]" />
                                  <div className="flex-1 border-t-2 border-dashed border-[#EAE4D9] relative">
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 py-1 rounded-full border border-[#EAE4D9]">
                                      <FaPlane className="text-[#B5862A] rotate-90" size={10} />
                                    </div>
                                  </div>
                                  <div className="w-1.5 h-1.5 rounded-full bg-[#B5862A]" />
                                </div>
                                <span className="mt-4 px-3 py-0.5 bg-[#F8FAFC] border border-[#E1E7EF] text-slate-400 text-[8px] font-black tracking-widest uppercase rounded-full">
                                  REGULARFARE
                                </span>
                              </div>

                              {/* Destination */}
                              <div className="flex flex-col text-right items-end">
                                <h4 className="text-4xl font-black italic text-[#1A1714] uppercase leading-none tracking-tighter">
                                  {destSegments?.destination?.code || destSegments?.destination}
                                </h4>
                                <p className="text-[10px] font-black text-[#1A1714] uppercase tracking-widest mt-2">{destSegments?.destinationAirport?.name || destSegments?.destinationAirport || destSegments?.destination?.name || destSegments?.destination?.code || destSegments?.destination}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">{destSegments?.destinationCity?.name || destSegments?.destinationCity || destSegments?.destination?.city || destSegments?.destination?.code || destSegments?.destination}</p>
                                <div className="mt-4 text-right">
                                  <p className="text-lg font-black text-[#B5862A] leading-none">{formatTimeOnly(destSegments?.arrivalTime || destSegments?.arrivalDate)}</p>
                                  <p className="text-[10px] font-black italic text-[#1A1714] uppercase tracking-tighter mt-1">{formatDateOnly(destSegments?.arrivalTime || destSegments?.arrivalDate)}</p>
                                </div>
                              </div>
                            </div>

                            {/* Bottom Amenities */}
                            <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-50">
                              <div>
                                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                                  <FiBriefcase size={10} />
                                  <span className="text-[9px] uppercase tracking-widest font-bold">Check-in Baggage</span>
                                </div>
                                <p className="text-xs font-bold text-[#1A1714] uppercase">{activeRequest?.preferredJourney?.segments?.[0]?.baggage?.checkIn || "15 KG"}</p>
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                                  <FiBriefcase size={10} />
                                  <span className="text-[9px] uppercase tracking-widest font-bold">Cabin Baggage</span>
                                </div>
                                <p className="text-xs font-bold text-[#1A1714] uppercase">{activeRequest?.preferredJourney?.segments?.[0]?.baggage?.cabin || "7 KG"}</p>
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                                  <FiInfo size={10} />
                                  <span className="text-[9px] uppercase tracking-widest font-bold">Supplier Fare Class</span>
                                </div>
                                <p className="text-xs font-bold text-[#1A1714] uppercase">{activeRequest?.preferredJourney?.segments?.[0]?.fareClass || "Regular"}</p>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* 2. Primary Info & Passenger Remarks */}
                <div className="grid lg:grid-cols-[2fr_1fr] gap-6">
                  <div className="bg-white border border-[#EAE4D9] rounded-3xl p-6 shadow-sm flex flex-col justify-center">
                     <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-50">
                        <FiInfo className="text-[#B5862A]" />
                        <h3 className="text-sm font-black uppercase tracking-widest text-[#1A1714]">Primary Info</h3>
                     </div>
                     <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                       <Card label="Passenger" value={activeRequest?.metadata?.employeeName} />
                       <Card label="Email" value={activeRequest?.metadata?.employeeEmail} />
                       <Card label="Booking ID" value={activeRequest?.bookingId} />
                       <Card label="Original PNR" value={activeRequest?.originalPnr} />
                       <Card label="Route" value={getJourneyLabel(selectedFlight)} />
                       <Card label="Generated At" value={formatDateTime(activeRequest?.generatedAt)} />
                     </div>
                  </div>
                  
                  <div className="h-full">
                    {activeRequest?.remarks ? (
                      <div className="p-6 bg-amber-50/50 border border-amber-100 rounded-3xl h-full flex flex-col justify-center">
                         <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-2">Passenger Remarks</p>
                         <p className="text-sm text-slate-700 italic">{activeRequest?.remarks}</p>
                      </div>
                    ) : (
                      <div className="p-6 bg-slate-50/50 border border-slate-100 rounded-3xl h-full flex flex-col justify-center items-center text-center">
                         <FiInfo className="text-slate-300 mb-2" size={24} />
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No Remarks</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Segments */}
                <div className="bg-white border border-[#EAE4D9] rounded-3xl p-6 shadow-sm flex flex-col">
                   <div className="flex items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-50 shrink-0">
                     <div className="flex items-center gap-2">
                       <FiMap className="text-[#B5862A]" />
                       <h3 className="text-sm font-black uppercase tracking-widest text-[#1A1714]">Segments</h3>
                     </div>
                     <span className="text-xs font-bold text-[#B5862A] bg-[#B5862A]/10 px-2 py-1 rounded-lg">
                       {selectedSegments.length} segment(s)
                     </span>
                   </div>
                   
                   <div className="space-y-3 flex-1 overflow-y-auto pr-2 no-scrollbar max-h-[300px]">
                     {selectedSegments.length ? (
                       selectedSegments.map((segment, index) => (
                         <div
                           key={`${segment.origin || "segment"}-${segment.destination || index}-${index}`}
                           className="rounded-2xl border border-[#EAE4D9] bg-[#FAF8F4] p-4 flex flex-col gap-2 relative overflow-hidden"
                         >
                           <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#003399]" />
                           <p className="text-sm font-black text-[#1A1714] uppercase tracking-tighter">
                             {getSegmentRoute(segment)}
                           </p>
                           <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                             <FiClock className="text-slate-400" />
                             {formatDateTime(segment.departureTime)} — {formatDateTime(segment.arrivalTime)}
                           </div>
                           <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                             {segment.airlineName || segment.airlineCode || selectedFlight?.airlineName || "Airline"}
                             {segment.flightNumber ? ` | ${segment.flightNumber}` : ""}
                           </p>
                         </div>
                       ))
                     ) : (
                       <div className="rounded-2xl border border-dashed border-[#EAE4D9] p-6 text-center text-sm text-slate-400 font-medium h-full flex items-center justify-center">
                         No segment details available.
                       </div>
                     )}
                   </div>
                </div>

              </div>
            )}

            {activeTab === "financials" && (() => {
              const bd = activeRequest?.reissuePricingSnapshot?.breakdown || activeRequest?.preferredJourney?.pricingBreakdown || {};
              const isRefund = bd.isRefund || false;
              const refundDue = bd.refundDue || 0;
              const netPayable = bd.netAdditionalCollection || activeRequest?.displayInfo?.totalEstimate || activeRequest?.totalEstimate || 0;
              
              return (
              <div className="flex animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Fare Snapshot */}
                <div className="w-full space-y-6">
                  <div className="bg-gradient-to-br from-[#003399] to-[#000d26] text-white rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                    <div className="flex items-center gap-3 relative z-10">
                      <div className="p-2 bg-white/10 rounded-lg text-[#C9A84C]">
                        <FiDollarSign size={20} />
                      </div>
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-white/70">Fare Snapshot</h3>
                    </div>
                    
                    <div className="mt-8 flex flex-col lg:flex-row items-center justify-between gap-10 relative z-10 w-full">
                      <div className="flex-shrink-0 w-full lg:w-1/3">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3">
                          Total Payable Amount
                        </p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold text-slate-500 italic">
                            INR
                          </span>
                          <h4 className="text-6xl font-black text-[#C9A84C] tracking-tighter italic tabular-nums">
                            {Math.ceil(isRefund ? 0 : netPayable).toLocaleString()}
                          </h4>
                        </div>
                      </div>
                      
                      <div className="w-full lg:w-2/3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                             <>
                                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                                  <span className="text-slate-400">Previously Paid</span>
                                  <span className="text-slate-100">₹{Math.ceil(bd.previouslyPaid || activeRequest?.oldFare || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                                  <span className="text-slate-400">New Flight Fare</span>
                                  <span className="text-slate-100">₹{Math.ceil(bd.newFlightFare || activeRequest?.newFare || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                                  <span className="text-slate-400">Flight Adjustment</span>
                                  <span className="text-slate-100">₹{Math.ceil(bd.flightAdjustment || activeRequest?.fareDifference || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                                  <span className="text-slate-400">Reissue Penalty</span>
                                  <span className="text-red-400">₹{Math.ceil(bd.airlineReissuePenalty || activeRequest?.reissueCharge || 0).toLocaleString()}</span>
                                </div>
                                {bd.newSSRTotal > 0 && (
                                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                                    <span className="text-slate-400">SSR Add-ons</span>
                                    <span className="text-[#C9A84C]">₹{Math.ceil(bd.newSSRTotal).toLocaleString()}</span>
                                  </div>
                                )}
                                {bd.airlineDateChangeFee > 0 && (
                                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                                    <span className="text-slate-400">Date Change Fee</span>
                                    <span className="text-red-400">₹{Math.ceil(bd.airlineDateChangeFee).toLocaleString()}</span>
                                  </div>
                                )}
                                <div className="sm:col-span-2 pt-4 border-t border-white/10 flex justify-between items-center mt-2">
                                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                    {isRefund ? "Refund Due" : "Net Payable"}
                                  </span>
                                  <span className={`text-2xl font-black italic tracking-tighter ${isRefund ? 'text-emerald-400' : 'text-white'}`}>
                                    ₹{Math.ceil(isRefund ? refundDue : netPayable).toLocaleString()}
                                  </span>
                                </div>
                             </>
                      </div>
                    </div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
                  </div>
                </div>
              </div>
              );
            })()}

            {activeTab === "ops" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                
                <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
                  {/* Assignment */}
                  <div className="bg-white border border-[#EAE4D9] rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-50">
                      <FiUser className="text-[#B5862A]" />
                      <h3 className="text-sm font-black uppercase tracking-widest text-[#1A1714]">Assignment</h3>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 mb-6">
                      <Card
                        label="Assigned OPS"
                        value={
                          activeRequest?.assignedOpsMember?.name ||
                          activeRequest?.assignedTo?.name ||
                          "Auto round robin"
                        }
                      />
                      <Card
                        label="Assignment Method"
                        value={prettifyLabel(activeRequest?.assignmentMode || "ROUND_ROBIN")}
                      />
                      <Card label="Assigned At" value={formatDateTime(activeRequest?.assignedAt)} />
                      <Card
                        label="Generated By"
                        value={
                          activeRequest?.generatedBy?.name ||
                          activeRequest?.generatedBy?.email ||
                          PLACEHOLDER
                        }
                      />
                    </div>

                    {canReassign && (
                      <div className="p-4 bg-[#FAF8F4] border border-[#EAE4D9] rounded-2xl">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Reassign Request</p>
                        <div className="flex gap-3">
                          <div className="relative flex-1" ref={dropdownRef}>
                            <div
                              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                              className={`flex items-center justify-between rounded-[14px] border bg-white px-4 py-2.5 text-sm font-semibold cursor-pointer transition-all ${
                                isDropdownOpen 
                                  ? "border-[#B5862A] ring-1 ring-[#B5862A] text-[#1A1714]" 
                                  : "border-[#EAE4D9] hover:border-slate-300 text-slate-700"
                              }`}
                            >
                              <span>
                                {reassignTo 
                                  ? (opsMembers.find(m => m._id === reassignTo)?.name || "Select OPS member...").toUpperCase()
                                  : "Select OPS member..."}
                              </span>
                              <FiChevronDown className={`text-slate-500 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
                            </div>
                            
                            {isDropdownOpen && (
                              <div className="absolute z-50 mt-1 w-full rounded-md border border-slate-300 bg-white shadow-xl overflow-hidden py-1">
                                <div
                                  onClick={() => {
                                    setReassignTo("");
                                    setIsDropdownOpen(false);
                                  }}
                                  className="px-4 py-2 text-sm text-slate-500 hover:bg-[#1877F2] hover:text-white cursor-pointer"
                                >
                                  Select OPS member...
                                </div>
                                {opsMembers.map((member) => (
                                  <div
                                    key={member._id}
                                    onClick={() => {
                                      setReassignTo(member._id);
                                      setIsDropdownOpen(false);
                                    }}
                                    className={`px-4 py-2 text-sm cursor-pointer transition-colors ${
                                      reassignTo === member._id
                                        ? "bg-[#1877F2] text-white"
                                        : "text-[#1A1714] hover:bg-[#1877F2] hover:text-white"
                                    }`}
                                  >
                                    {member.name.toUpperCase()}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={handleReassign}
                            disabled={actionLoading || !reassignTo}
                            className={`px-4 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-tight transition-all flex items-center gap-2 border ${
                              actionLoading || !reassignTo
                                ? "bg-slate-100 border-[#EAE4D9] text-slate-400 cursor-not-allowed"
                                : "bg-white border-[#EAE4D9] text-[#1A1714] hover:bg-slate-50 hover:border-slate-300 shadow-sm"
                            }`}
                          >
                            <FiSend size={14} />
                            Reassign
                          </button>
                        </div>
                      </div>
                    )}

                    {Array.isArray(activeRequest?.assignmentHistory) &&
                      activeRequest.assignmentHistory.length > 0 && (
                        <div className="mt-6">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Assignment History</p>
                          <div className="space-y-3 max-h-[200px] overflow-y-auto no-scrollbar pr-2">
                            {activeRequest.assignmentHistory.map((item, index) => (
                              <div
                                key={`${item.assignedAt || index}-${index}`}
                                className="rounded-2xl border border-[#EAE4D9] bg-white p-3 flex justify-between items-center"
                              >
                                <div>
                                  <div>
                                    {(() => {
                                      const targetId = typeof item.assignedTo === "object" ? item.assignedTo?._id : item.assignedTo;
                                      const opsMember = opsMembers?.find(m => m._id === targetId);
                                      const name = item.assignedTo?.name || opsMember?.name || targetId || "OPS member";
                                      const email = item.assignedTo?.email || opsMember?.email;
                                      return (
                                        <>
                                          <p className="text-sm font-bold text-[#1A1714]">{name}</p>
                                          {email && (
                                            <p className="text-[11px] font-medium text-slate-500">{email}</p>
                                          )}
                                        </>
                                      );
                                    })()}
                                  </div>
                                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                    {prettifyLabel(item.mode)}
                                  </p>
                                  {item.remarks && (
                                    <p className="mt-1 text-xs font-medium text-slate-500 italic">{item.remarks}</p>
                                  )}
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 shrink-0">
                                  {formatDateTime(item.assignedAt)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>

                  {/* Actions & Notes */}
                  <div className="space-y-6">
                    <div className="bg-white border border-[#EAE4D9] rounded-3xl p-6 shadow-sm">
                      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-50">
                        <FiFileText className="text-[#B5862A]" />
                        <h3 className="text-sm font-black uppercase tracking-widest text-[#1A1714]">Ops Note & Next Actions</h3>
                      </div>
                      
                      <textarea
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        rows={4}
                        placeholder="Add a servicing note for the next status update, reassignment, or ticket generation..."
                        className="w-full rounded-2xl border border-[#EAE4D9] bg-[#FAF8F4] px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-[#B5862A] focus:ring-1 focus:ring-[#B5862A] resize-none"
                      />

                      <div className="mt-6 pt-6 border-t border-slate-50">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Update Status</p>
                        <div className="flex flex-wrap gap-2">
                          {transitions.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-[#EAE4D9] p-4 text-center text-sm font-medium text-slate-400 w-full">
                              No additional status transitions are available.
                            </div>
                          ) : (
                            transitions.map((status) => (
                              <button
                                key={status}
                                type="button"
                                onClick={() => handleStatusUpdate(status)}
                                disabled={actionLoading}
                                className="px-4 py-2.5 bg-[#003399] text-white font-black text-[11px] rounded-xl shadow-lg shadow-[#003399]/20 transition-all uppercase tracking-tight hover:bg-[#002266] disabled:opacity-50 disabled:shadow-none"
                              >
                                {actionLoading ? "Updating..." : prettifyLabel(status)}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    {Array.isArray(activeRequest?.opsRemarks) && activeRequest.opsRemarks.length > 0 && (
                      <div className="bg-white border border-[#EAE4D9] rounded-3xl p-6 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Remarks History</p>
                        <div className="space-y-3 max-h-[300px] overflow-y-auto no-scrollbar pr-2">
                          {activeRequest.opsRemarks.map((item, index) => (
                            <div
                              key={`${item.at || index}-${index}`}
                              className="rounded-2xl border border-[#EAE4D9] bg-[#FAF8F4] p-4 relative"
                            >
                              <div className="absolute top-4 left-0 w-1 h-8 bg-[#B5862A] rounded-r-md" />
                              <p className="text-sm font-bold text-[#1A1714] pl-2">
                                {item.message || PLACEHOLDER}
                              </p>
                              <div className="mt-2 pl-2 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                                <span>{prettifyLabel(item.byRole)}</span>
                                <span>{formatDateTime(item.at)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "timeline" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white border border-[#EAE4D9] rounded-3xl p-8 shadow-sm">
                  <div className="flex items-center gap-2 mb-8 pb-4 border-b border-slate-50">
                    <FiActivity className="text-[#B5862A]" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-[#1A1714]">Activity Timeline</h3>
                  </div>
                  
                  <div className="relative pl-6 border-l-2 border-[#EAE4D9] space-y-8 ml-2">
                    {[...(activeRequest?.timeline || [])]
                      .sort((left, right) => new Date(left.at) - new Date(right.at))
                      .map((item, index) => (
                        <div key={`${item.at || index}-${index}`} className="relative group">
                          {/* Timeline Dot */}
                          <div className="absolute -left-[33px] top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white border-2 border-[#EAE4D9] group-hover:border-[#B5862A] transition-colors shadow-sm">
                            {getTimelineIcon(item)}
                          </div>
                          
                          <div className="bg-[#FAF8F4] border border-[#EAE4D9] rounded-2xl p-4 shadow-sm group-hover:shadow-md transition-shadow">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-black text-[#1A1714] uppercase tracking-tighter">{item.title}</p>
                                <p className="mt-1 text-xs font-medium text-slate-600">
                                  {item.description || "No additional notes"}
                                </p>
                              </div>
                              <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-100 shadow-sm shrink-0 uppercase tracking-widest">
                                {formatDateTime(item.at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                  
                  {(!activeRequest?.timeline || activeRequest.timeline.length === 0) && (
                    <div className="py-12 text-center border border-dashed border-[#EAE4D9] rounded-2xl">
                      <p className="text-sm font-medium text-slate-400">No timeline events recorded.</p>
                    </div>
                  )}
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
