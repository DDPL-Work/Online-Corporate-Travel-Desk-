import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { 
  FiX, 
  FiClock, 
  FiCheckCircle, 
  FiMessageSquare, 
  FiUser, 
  FiCalendar,
  FiMapPin,
  FiRefreshCw,
  FiAlertCircle,
  FiArrowRight,
  FiDollarSign,
  FiFileText,
  FiCornerDownRight,
  FiActivity,
  FiHash,
  FiTag
} from "react-icons/fi";
import { fetchCancellationQueries, fetchCancellationQueryDetails, updateCancellationQueryStatus } from "../../../Redux/Actions/amendmentThunks";
import { toast } from "react-toastify";

const JourneyStep = ({ icon, title, time, children, isLast = false, color = "blue" }) => (
  <div className="relative pl-10 pb-8 last:pb-2 group">
    {!isLast && (
      <div className="absolute left-[15px] top-[30px] bottom-0 w-0.5 bg-slate-100 group-hover:bg-slate-200 transition-colors" />
    )}
    <div className={`absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center z-10 shadow-sm border transition-all duration-300 ${
      color === "blue" ? "bg-blue-50 text-blue-600 border-blue-100" :
      color === "amber" ? "bg-amber-50 text-amber-600 border-amber-100" :
      color === "emerald" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
      color === "rose" ? "bg-rose-50 text-rose-600 border-rose-100" :
      "bg-slate-50 text-slate-400 border-slate-100"
    }`}>
      {icon}
    </div>
    <div className="pt-1">
      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mb-2">
        <h4 className="text-sm font-black text-slate-800 tracking-tight">{title}</h4>
        {time && (
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded">
            {new Date(time).toLocaleString("en-IN", {
              day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
            })}
          </span>
        )}
      </div>
      <div className="text-sm text-slate-500 leading-relaxed">
        {children}
      </div>
    </div>
  </div>
);

const InfoBox = ({ icon, label, value }) => (
  <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-3">
    <div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center shrink-0">
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
      <p className="text-[12px] font-bold text-slate-800 truncate">{value || "—"}</p>
    </div>
  </div>
);

const CancellationQueryDetailsModal = ({ queryId, isOpen, onClose }) => {
  const dispatch = useDispatch();
  const { currentQuery, currentQueryLoading, currentQueryError } = useSelector((state) => state.amendment);
  const { user } = useSelector((state) => state.auth);
  const userRole = user?.role || user?.userRole;

  const [activeView, setActiveView] = React.useState("journey"); // "journey" | "technical"

  useEffect(() => {
    if (isOpen && queryId) {
      dispatch(fetchCancellationQueryDetails(queryId));
    }
  }, [isOpen, queryId, dispatch]);

  const handleStatusUpdate = async (status) => {
    const remarks = prompt(`Please enter resolution remarks for marking as ${status}:`);
    if (remarks === null) return;

    try {
      await dispatch(updateCancellationQueryStatus({ 
        id: queryId, 
        status, 
        remarks 
      })).unwrap();
      toast.success(`Query updated successfully`);
      dispatch(fetchCancellationQueryDetails(queryId));
      dispatch(fetchCancellationQueries());
    } catch (err) {
      toast.error(err || "Failed to update status");
    }
  };

  if (!isOpen) return null;

  const logs = currentQuery?.logs || [];
  const resolution = currentQuery?.resolution || {};
  const bd = currentQuery?.bookingDetails || {};
  const flightReq = bd.flightRequest || {};
  const fare = flightReq.fareQuote?.Results?.[0]?.Fare || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-slate-50 w-full max-w-6xl max-h-[90vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in duration-300 border border-white/20">
        
        {/* LEFT PANEL: BOOKING SUMMARY */}
        <div className="w-full md:w-80 bg-white border-r border-slate-200 flex flex-col p-6 overflow-y-auto shrink-0">
          <div className="mb-8">
            <span className="text-[10px] font-black text-[#0A4D68] bg-[#0A4D68]/5 px-3 py-1 rounded-full uppercase tracking-widest mb-3 inline-block">
              Request Info
            </span>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-tight">
              Booking <br /> Overview
            </h2>
          </div>

          <div className="space-y-3">
             <InfoBox 
               icon={<FiHash size={16} />} 
               label="Query ID" 
               value={`#${currentQuery?.queryId || "..."}`} 
             />
             <InfoBox 
               icon={<FiTag size={16} />} 
               label="PNR" 
               value={bd.bookingResult?.pnr || bd.bookingSnapshot?.pnr || "—"} 
             />
             <InfoBox 
               icon={<FiUser size={16} />} 
               label="Lead Passenger" 
               value={currentQuery?.passengers?.[0]?.name || bd.travellers?.[0]?.firstName + " " + bd.travellers?.[0]?.lastName} 
             />
          </div>

          <div className="mt-8 bg-slate-50 rounded-3xl p-5 border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Journey Route</p>
            {bd.bookingSnapshot?.sectors?.map((sector, idx) => {
              // sector might be string "DEL-CCU" or object
              const parts = typeof sector === 'string' ? sector.split('-') : [sector.origin, sector.destination];
              return (
                <div key={idx} className="flex flex-col gap-3 mb-4 last:mb-0">
                  <div className="flex items-center justify-between">
                    <div className="text-center">
                      <p className="text-lg font-black text-slate-800 leading-none">{parts[0]}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Origin</p>
                    </div>
                    <div className="flex-1 px-4 flex flex-col items-center">
                      <div className="w-full h-px bg-slate-300 relative">
                        <FiArrowRight className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-black text-slate-800 leading-none">{parts[parts.length - 1]}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Dest.</p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between">
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Travel Date</span>
               <span className="text-[11px] font-black text-[#0A4D68]">
                 {bd.bookingSnapshot?.travelDate ? new Date(bd.bookingSnapshot.travelDate).toLocaleDateString() : "N/A"}
               </span>
            </div>
          </div>

          <div className="mt-auto pt-8">
            <button 
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-slate-100 text-slate-600 text-sm font-bold hover:bg-slate-200 transition-all"
            >
              Close Details
            </button>
          </div>
        </div>

        {/* RIGHT PANEL: TABS & CONTENT */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
          {/* TOP BAR WITH TABS */}
          <div className="px-8 py-4 bg-white border-b border-slate-100 sticky top-0 z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
               <button 
                 onClick={() => setActiveView("journey")}
                 className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                   activeView === "journey" ? "bg-white text-[#0A4D68] shadow-sm" : "text-slate-500 hover:text-slate-800"
                 }`}
               >
                 Journey Timeline
               </button>
               <button 
                 onClick={() => setActiveView("technical")}
                 className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                   activeView === "technical" ? "bg-white text-[#0A4D68] shadow-sm" : "text-slate-500 hover:text-slate-800"
                 }`}
               >
                 Technical Details
               </button>
            </div>

            <div className="flex items-center gap-2">
               <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm border ${
                 currentQuery?.status === 'OPEN' ? 'bg-blue-500 text-white border-blue-400' :
                 currentQuery?.status === 'IN_PROGRESS' ? 'bg-amber-500 text-white border-amber-400' :
                 currentQuery?.status === 'RESOLVED' ? 'bg-emerald-500 text-white border-emerald-400' :
                 'bg-slate-500 text-white border-slate-400'
               }`}>
                 {currentQuery?.status || "Processing..."}
               </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8">
            {currentQueryLoading ? (
               <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <FiRefreshCw size={32} className="text-[#0A4D68] animate-spin opacity-30" />
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Loading associated data...</p>
               </div>
            ) : currentQuery ? (
              activeView === "journey" ? (
                /* JOURNEY VIEW (Timeline) */
                <div className="max-w-2xl mx-auto py-4">
                   <JourneyStep 
                    icon={<FiMessageSquare size={16} />} 
                    title="Request Initiated" 
                    time={currentQuery.requestedAt}
                    color="blue"
                  >
                    <p className="mb-3">Cancellation request submitted via offline portal.</p>
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm italic relative">
                      <FiCornerDownRight className="absolute -left-6 top-4 text-slate-200" size={20} />
                      "{currentQuery.remarks || "No additional notes provided."}"
                    </div>
                  </JourneyStep>

                  {logs.filter(l => l.action !== "CREATED").map((log, idx) => (
                    <JourneyStep 
                      key={idx}
                      icon={<FiActivity size={16} />}
                      title={log.message || "Progress Update"}
                      time={log.at}
                      color={log.action.includes("REJECTED") ? "rose" : "amber"}
                    >
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Update By:</span>
                        <span className="text-[11px] font-bold text-[#0A4D68]">{log.by || "SYSTEM"}</span>
                      </div>
                    </JourneyStep>
                  ))}

                  <JourneyStep 
                    icon={currentQuery.status === 'RESOLVED' ? <FiCheckCircle size={16} /> : <FiClock size={16} />} 
                    title={currentQuery.status === 'RESOLVED' ? "Final Outcome" : "Currently Processing"} 
                    time={currentQuery.status === 'RESOLVED' ? resolution.resolvedAt : null}
                    color={currentQuery.status === 'RESOLVED' ? "emerald" : "slate"}
                    isLast={true}
                  >
                    {currentQuery.status === 'RESOLVED' ? (
                      <div className="space-y-4">
                        <p>The request has been successfully processed.</p>
                        <div className="grid grid-cols-2 gap-3">
                           <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                              <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Refund Amount</p>
                              <div className="flex items-center gap-1 text-emerald-700">
                                 <FiDollarSign size={14} />
                                 <span className="text-lg font-black">{resolution.refundAmount || 0}</span>
                              </div>
                           </div>
                           <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                              <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">Credit Note</p>
                              <div className="flex items-center gap-1 text-blue-700">
                                 <FiFileText size={14} />
                                 <span className="text-[13px] font-black">{resolution.creditNoteNo || "Not Issued"}</span>
                              </div>
                           </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 border-dashed">
                         <p className="text-amber-800 font-bold mb-1 flex items-center gap-2">
                           <FiRefreshCw size={14} className="animate-spin" />
                           Action Required
                         </p>
                         <p className="text-xs text-amber-700/80 leading-relaxed">
                           Our travel operations team is currently reviewing your request. Please wait while we coordinate with the carrier.
                         </p>
                      </div>
                    )}
                  </JourneyStep>
                </div>
              ) : (
                /* TECHNICAL VIEW (Advanced Data) */
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  
                  {/* AIRLINE & SEGMENTS */}
                  <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                       <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                         <FiActivity className="text-[#0A4D68]" /> Flight Segments & Carrier
                       </h3>
                    </div>
                    <div className="p-6">
                       {flightReq.segments?.map((seg, idx) => (
                         <div key={idx} className="flex flex-col md:flex-row gap-6 items-center justify-between border-b border-dashed border-slate-100 pb-6 mb-6 last:mb-0 last:pb-0 last:border-0">
                           <div className="flex items-center gap-4">
                             <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 font-black text-lg">
                               {seg.airlineCode || seg.airlineName?.[0]}
                             </div>
                             <div>
                               <p className="text-sm font-black text-slate-800">{seg.airlineName} ({seg.airlineCode}-{seg.flightNumber})</p>
                               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{seg.aircraft || "Aircraft Info N/A"}</p>
                             </div>
                           </div>
                           <div className="flex items-center gap-10">
                              <div className="text-center">
                                 <p className="text-lg font-black text-slate-800">{seg.origin?.airportCode}</p>
                                 <p className="text-[10px] text-slate-400 font-bold">{new Date(seg.departureDateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                              </div>
                              <div className="w-20 h-px bg-slate-200 relative">
                                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2 bg-white text-[10px] font-black text-slate-300">
                                   {seg.durationMinutes}m
                                 </div>
                              </div>
                              <div className="text-center">
                                 <p className="text-lg font-black text-slate-800">{seg.destination?.airportCode}</p>
                                 <p className="text-[10px] text-slate-400 font-bold">{new Date(seg.arrivalDateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                              </div>
                           </div>
                           <div className="text-right">
                              <p className="text-xs font-bold text-slate-600">Baggage: {seg.baggage?.checkIn || "Included"}</p>
                              <p className="text-[10px] text-[#0A4D68] font-black uppercase tracking-tighter bg-[#0A4D68]/5 px-2 py-0.5 rounded mt-1 inline-block">
                                Class: {seg.cabinClass === 3 ? "Premium Economy" : seg.cabinClass === 1 ? "Economy" : "Business"}
                              </p>
                           </div>
                         </div>
                       ))}
                    </div>
                  </div>

                  {/* FARE BREAKDOWN */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                     <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                           <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                             <FiDollarSign className="text-emerald-600" /> Fare Breakdown
                           </h3>
                           <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                             {fare.Currency || "INR"}
                           </span>
                        </div>
                        <div className="p-6 space-y-3">
                           <div className="flex justify-between items-center text-sm">
                              <span className="text-slate-400 font-bold">Base Fare</span>
                              <span className="text-slate-700 font-black">{fare.BaseFare || 0}</span>
                           </div>
                           <div className="flex justify-between items-center text-sm">
                              <span className="text-slate-400 font-bold">Taxes & Fees</span>
                              <span className="text-slate-700 font-black">{fare.Tax || 0}</span>
                           </div>
                           <div className="flex justify-between items-center text-sm">
                              <span className="text-slate-400 font-bold">Service Fee</span>
                              <span className="text-slate-700 font-black">{fare.ServiceFee || 0}</span>
                           </div>
                           <div className="pt-3 mt-3 border-t border-slate-100 flex justify-between items-center">
                              <span className="text-slate-800 font-black">Total Paid</span>
                              <span className="text-lg font-black text-[#0A4D68]">{fare.PublishedFare || bd.pricingSnapshot?.totalAmount || 0}</span>
                           </div>
                        </div>
                     </div>

                     <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                           <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                             <FiUser className="text-blue-600" /> Passenger Information
                           </h3>
                        </div>
                        <div className="p-6">
                           {bd.travellers?.map((trav, idx) => (
                             <div key={idx} className="flex items-center gap-4 mb-4 last:mb-0">
                                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs">
                                   {trav.firstName?.[0]}{trav.lastName?.[0]}
                                </div>
                                <div>
                                   <p className="text-sm font-black text-slate-800 uppercase">{trav.title} {trav.firstName} {trav.lastName}</p>
                                   <p className="text-[10px] text-slate-400 font-bold">{trav.email} | {trav.paxType}</p>
                                </div>
                             </div>
                           ))}
                        </div>
                     </div>
                  </div>

                  {/* CANCELLATION DETAILS (from query) */}
                  <div className="bg-slate-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden group">
                     <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform duration-700">
                        <FiAlertCircle size={120} />
                     </div>
                     <div className="relative z-10">
                        <h4 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Request Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                           <div>
                              <p className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-tighter">Cancellation Reason</p>
                              <p className="text-sm font-bold leading-relaxed">
                                {currentQuery.remarks || "No specific reason provided."}
                              </p>
                           </div>
                           <div>
                              <p className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-tighter">Operational Status</p>
                              <p className="text-sm font-bold flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${currentQuery.status === 'RESOLVED' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                {currentQuery.status}
                              </p>
                           </div>
                           <div>
                              <p className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-tighter">Assigned Team</p>
                              <p className="text-sm font-bold">Offline Desk (Support)</p>
                           </div>
                        </div>
                     </div>
                  </div>
                </div>
              )
            ) : null}
          </div>

          {/* ADMIN ACTION BAR */}
          {(userRole === "travel-admin" || userRole === "ops-member") && currentQuery?.status !== "RESOLVED" && (
            <div className="px-8 py-6 bg-white border-t border-slate-100 flex items-center justify-center gap-4 shrink-0">
               <button 
                onClick={() => handleStatusUpdate("IN_PROGRESS")}
                className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-[13px] font-black transition-all shadow-xl shadow-amber-500/10 active:scale-95"
              >
                Set to In-Progress
              </button>
              <button 
                onClick={() => handleStatusUpdate("RESOLVED")}
                className="px-10 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[13px] font-black transition-all shadow-xl shadow-emerald-500/10 active:scale-95"
              >
                Resolve Query
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CancellationQueryDetailsModal;
