import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  FiArrowLeft, FiCheckCircle, FiClock, FiAlertCircle,
  FiUser, FiTag, FiFileText, FiCalendar, FiRefreshCw,
  FiMessageSquare, FiActivity, FiDollarSign, FiShield,
  FiArrowRight, FiMapPin, FiPackage, FiInfo,
} from "react-icons/fi";
import {
  fetchCancellationQueryDetails,
  fetchCancellationQueries,
  updateCancellationQueryStatus,
} from "../../Redux/Actions/amendmentThunks";

const TABS = [
  { key: "booking-details", label: "Booking Details" },
  { key: "cancellation-summary", label: "Cancellation Summary" },
  { key: "approval-history", label: "Approval History" },
  { key: "ops-notes", label: "Ops Notes" },
  { key: "financial-settlement", label: "Financial Settlement" },
];

const fmt = (dt) =>
  dt ? new Date(dt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const fmtDate = (dt) =>
  dt ? new Date(dt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

function StatusPill({ status }) {
  const map = {
    OPEN: "bg-blue-100 text-blue-800",
    IN_PROGRESS: "bg-amber-100 text-amber-800",
    RESOLVED: "bg-green-100 text-green-800",
  };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase ${map[status] || map.OPEN}`}>
      {status?.replace("_", " ")}
    </span>
  );
}

function InfoRow({ label, value, mono }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500 font-medium">{label}</span>
      <span className={`text-[13px] font-semibold text-gray-800 ${mono ? "font-mono tracking-wide" : ""}`}>{value ?? "—"}</span>
    </div>
  );
}

function SectionCard({ title, icon, children }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E0D8C8] overflow-hidden shadow-sm">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[#E0D8C8] bg-[#F5F0E8]/50">
        <span className="text-[#A07840]">{icon}</span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#8B7355]">{title}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function CancellationQueryDetailsPage({ queryId, onBack }) {
  const dispatch = useDispatch();
  const { currentQuery, currentQueryLoading } = useSelector((s) => s.amendment);
  const { user } = useSelector((s) => s.auth);
  const userRole = user?.role || user?.userRole;
  const isAdmin = userRole === "travel-admin" || userRole === "ops-member";
  const [activeTab, setActiveTab] = useState("booking-details");
  const [opsNote, setOpsNote] = useState("");

  useEffect(() => {
    if (queryId) dispatch(fetchCancellationQueryDetails(queryId));
  }, [queryId, dispatch]);

  const handleStatusUpdate = async (status) => {
    const remarks = prompt(`Enter remarks for marking as ${status}:`);
    if (remarks === null) return;
    try {
      await dispatch(updateCancellationQueryStatus({ id: queryId, status, remarks })).unwrap();
      toast.success("Query updated successfully");
      dispatch(fetchCancellationQueryDetails(queryId));
      dispatch(fetchCancellationQueries());
    } catch (err) {
      toast.error(err || "Failed to update status");
    }
  };

  if (currentQueryLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-[#0A4D68] rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentQuery) return null;

  const bd = currentQuery.bookingDetails || {};
  const segments = bd.flightRequest?.segments || [];
  const travellers = bd.travellers || [];
  const fareSnap = bd.flightRequest?.fareSnapshot || {};
  const fare = bd.flightRequest?.fareQuote?.Results?.[0]?.Fare || {};
  const pnr = bd.bookingResult?.pnr || bd.pnr;
  const logs = currentQuery.logs || [];
  const resolution = currentQuery.resolution || {};
  const miniRules = (fareSnap.miniFareRules || []).flat();
  const provResult = bd.bookingResult?.providerResponse?.Response?.Response;
  const itinerary = provResult?.FlightItinerary;
  const invoice = itinerary?.Invoice?.[0] || {};
  const cancellationInfo = itinerary?.MiniFareRules || [];
  const ticketCR = (bd.amendment?.raw?.[0]?.response?.Response?.TicketCRInfo || [])[0] || {};
  const approvalAudit = currentQuery.approvalAudit || [];
  const employeeName = currentQuery.corporate?.employeeName || currentQuery.user?.name || "Unknown";
  const employeeEmail = currentQuery.corporate?.employeeEmail || currentQuery.user?.email || "";

  const handleAddOpsNote = async () => {
    if (!opsNote.trim()) return;
    try {
      await dispatch(updateCancellationQueryStatus({
        id: queryId,
        status: currentQuery.status,
        remarks: opsNote.trim(),
      })).unwrap();
      toast.success("Ops note added");
      setOpsNote("");
      dispatch(fetchCancellationQueryDetails(queryId));
    } catch (err) {
      toast.error(err || "Failed to add note");
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "booking-details":
        return (
          <div className="space-y-6">
            {segments.length > 0 && (
              <SectionCard title="Flight Itinerary" icon={<span className="text-sm">✈</span>}>
                {segments.map((seg, i) => (
                  <SegmentRow key={i} seg={seg} pnr={i === 0 ? pnr : null} />
                ))}
              </SectionCard>
            )}

            <SectionCard title={`Passengers · ${travellers.length || currentQuery.passengers?.length || 1}`} icon={<FiUser size={14} />}>
              {(travellers.length ? travellers : currentQuery.passengers || []).map((t, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
                  <div className="w-9 h-9 rounded-full bg-[#0A4D68]/10 text-[#0A4D68] flex items-center justify-center font-black text-xs">
                    {(t.firstName || t.name || "?")[0]}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800 uppercase">{t.title} {t.firstName} {t.lastName || t.name}</p>
                    <p className="text-[10px] text-gray-400 font-medium">{t.paxType || "ADULT"} · {t.email || ""}</p>
                  </div>
                </div>
              ))}
            </SectionCard>

            {itinerary && (
              <SectionCard title="Supplier Information" icon={<FiFileText size={14} />}>
                <InfoRow label="TBO Confirmation" value={itinerary.TBOConfNo} mono />
                <InfoRow label="Invoice No." value={invoice.InvoiceNo} mono />
                <InfoRow label="Booking ID" value={itinerary.BookingId} mono />
                <InfoRow label="Invoice Amount" value={invoice.InvoiceAmount ? `₹ ${invoice.InvoiceAmount}` : "—"} />
                <InfoRow label="Origin" value={itinerary.Origin} />
                <InfoRow label="Destination" value={itinerary.Destination} />
                <InfoRow label="Journey Type" value={itinerary.JourneyType === 1 ? "One-Way" : "Round Trip"} />
                <InfoRow label="Is LCC" value={itinerary.IsLCC ? "Yes" : "No"} />
              </SectionCard>
            )}

            <SectionCard title="Requester Details" icon={<FiUser size={14} />}>
              <InfoRow label="Name" value={employeeName} />
              <InfoRow label="Email" value={employeeEmail} />
              <InfoRow label="User ID" value={currentQuery.user?.id || "—"} mono />
            </SectionCard>
          </div>
        );

      case "cancellation-summary":
        return (
          <div className="space-y-6">
            <SectionCard title="Query Information" icon={<FiInfo size={14} />}>
              <InfoRow label="Query ID" value={currentQuery.queryId || "—"} mono />
              <InfoRow label="Booking Reference" value={bd.bookingReference || bd.orderId || "—"} mono />
              <InfoRow label="PNR" value={pnr || "—"} mono />
              <InfoRow label="Cancellation Type" value={currentQuery.cancellationType || "Full"} />
              <InfoRow label="Priority" value={currentQuery.priority || "MEDIUM"} />
              <InfoRow label="Status" value={currentQuery.status || "—"} />
              <InfoRow label="Submission Date" value={fmt(currentQuery.requestedAt)} />
            </SectionCard>

            {currentQuery.remarks && (
              <SectionCard title="Request Reason" icon={<FiMessageSquare size={14} />}>
                <p className="text-sm text-gray-700 italic leading-relaxed">&ldquo;{currentQuery.remarks}&rdquo;</p>
              </SectionCard>
            )}

            {ticketCR?.ChangeRequestId && (
              <SectionCard title="Provider Cancellation Result" icon={<FiFileText size={14} />}>
                <InfoRow label="Change Request ID" value={ticketCR.ChangeRequestId} mono />
                <InfoRow label="Credit Note No." value={ticketCR.CreditNoteNo || "—"} mono />
                <InfoRow label="Cancellation Charge" value={ticketCR.CancellationCharge ? `₹ ${ticketCR.CancellationCharge}` : "—"} />
                <InfoRow label="Refunded Amount" value={ticketCR.RefundedAmount ? `₹ ${ticketCR.RefundedAmount}` : "—"} />
                <InfoRow label="Credit Note Date" value={fmtDate(ticketCR.CreditNoteCreatedOn)} />
                <InfoRow label="Remarks" value={ticketCR.Remarks || "—"} />
              </SectionCard>
            )}
          </div>
        );

      case "approval-history":
        return (
          <SectionCard title="Approval Journey" icon={<FiActivity size={14} />}>
            <div className="py-2">
              <TimelineStep icon={<FiMessageSquare size={14} />} title="Request Submitted" time={currentQuery.requestedAt} color="blue" isLast={!approvalAudit.length && !logs.length}>
                {currentQuery.remarks && (
                  <div className="bg-white border border-gray-100 rounded-xl p-3 mt-2 italic text-gray-500">&ldquo;{currentQuery.remarks}&rdquo;</div>
                )}
              </TimelineStep>

              {approvalAudit.map((entry, i) => {
                const isLast = i === approvalAudit.length - 1 && logs.filter(l => l.action !== "CREATED").length === 0;
                const stageColor = entry.action?.includes("APPROVED") ? "emerald" : entry.action?.includes("REJECTED") ? "rose" : "amber";
                return (
                  <TimelineStep key={i} icon={<FiCheckCircle size={14} />} title={entry.action?.replace(/_/g, " ") || "Status Update"} time={entry.timestamp} color={stageColor} isLast={isLast}>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                      {entry.role && <span className="text-[11px] font-bold text-gray-500">Role: {entry.role}</span>}
                      {entry.user && <span className="text-[11px] font-bold text-[#0A4D68]">User: {entry.user}</span>}
                      {entry.remarks && <span className="text-[11px] text-gray-500 italic w-full">&ldquo;{entry.remarks}&rdquo;</span>}
                    </div>
                  </TimelineStep>
                );
              })}

              {logs.filter(l => l.action !== "CREATED").map((log, i) => {
                const filteredLogs = logs.filter(l => l.action !== "CREATED");
                const isLast = i === filteredLogs.length - 1;
                return (
                  <TimelineStep key={i} icon={<FiActivity size={14} />} title={log.message || "Status Update"} time={log.at} color={log.action?.includes("REJECTED") ? "rose" : "amber"} isLast={isLast}>
                    <span className="text-[11px] font-bold text-[#0A4D68]">By: {log.by || "SYSTEM"}</span>
                  </TimelineStep>
                );
              })}

              {currentQuery.status !== "RESOLVED" && (
                <TimelineStep icon={<FiClock size={14} />} title="Awaiting Resolution" color="slate" isLast>
                  <div className="bg-amber-50 border border-dashed border-amber-200 rounded-xl p-3 mt-2 text-xs text-amber-700">
                    Our travel desk is reviewing your request. You will be notified once resolved.
                  </div>
                </TimelineStep>
              )}
            </div>
          </SectionCard>
        );

      case "ops-notes":
        return (
          <div className="space-y-6">
            {currentQuery.status === "RESOLVED" ? (
              <SectionCard title="Resolution Details" icon={<FiCheckCircle size={14} />}>
                <InfoRow label="Status" value="Resolved" />
                <InfoRow label="Closure Timestamp" value={fmt(resolution.resolvedAt)} />
                {resolution.refundAmount && <InfoRow label="Refund Amount" value={`₹ ${resolution.refundAmount}`} />}
                {resolution.creditNoteNo && <InfoRow label="Credit Note" value={resolution.creditNoteNo} mono />}
                {resolution.adminRemarks && (
                  <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Closure Remarks</p>
                    <p className="text-sm text-emerald-800">&ldquo;{resolution.adminRemarks}&rdquo;</p>
                  </div>
                )}
              </SectionCard>
            ) : (
              <div className="bg-amber-50 border border-dashed border-amber-200 rounded-2xl p-8 text-center">
                <FiClock size={32} className="mx-auto text-amber-300 mb-3" />
                <p className="text-sm font-bold text-amber-700">Query not yet resolved</p>
                <p className="text-xs text-amber-500 mt-1">Resolution details will appear once the query is closed.</p>
              </div>
            )}

            <SectionCard title="Activity Log" icon={<FiActivity size={14} />}>
              {logs.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No ops notes recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {logs.map((log, i) => (
                    <div key={i} className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
                      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                        <FiMessageSquare size={12} className="text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{log.message || "Note"}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {log.by || "SYSTEM"} · {fmt(log.at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {isAdmin && (
              <SectionCard title="Add Note" icon={<FiMessageSquare size={14} />}>
                <textarea
                  value={opsNote}
                  onChange={(e) => setOpsNote(e.target.value)}
                  placeholder="Type your ops note here..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-[#A07840] focus:ring-1 focus:ring-[#A07840]/30 resize-none"
                />
                <button
                  onClick={handleAddOpsNote}
                  disabled={!opsNote.trim()}
                  className="mt-3 px-5 py-2.5 bg-[#0A4D68] hover:bg-[#083d54] text-white rounded-xl text-sm font-bold transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Add Note
                </button>
              </SectionCard>
            )}
          </div>
        );

      case "financial-settlement":
        return (
          <div className="space-y-6">
            {fareSnap.baseFare || fare.BaseFare ? (
              <SectionCard title="Fare Breakdown" icon={<FiDollarSign size={14} />}>
                <InfoRow label="Base Fare" value={`₹ ${fareSnap.baseFare || fare.BaseFare || 0}`} />
                <InfoRow label="Taxes & Fees" value={`₹ ${fareSnap.tax || fare.Tax || 0}`} />
                <InfoRow label="Other Charges" value={`₹ ${fare.OtherCharges || 0}`} />
                <div className="flex justify-between items-center pt-3 mt-1 border-t border-[#C8B898]">
                  <span className="text-sm font-black text-gray-800">Total Paid</span>
                  <span className="text-lg font-black text-[#0A4D68]">₹ {fareSnap.publishedFare || fare.PublishedFare || bd.pricingSnapshot?.totalAmount || 0}</span>
                </div>
              </SectionCard>
            ) : null}

            {resolution.refundAmount || resolution.creditNoteNo ? (
              <SectionCard title="Settlement Summary" icon={<FiCheckCircle size={14} />}>
                <InfoRow label="Refund Amount" value={`₹ ${resolution.refundAmount || 0}`} />
                <InfoRow label="Credit Note" value={resolution.creditNoteNo || "Not Issued"} mono />
              </SectionCard>
            ) : null}

            {!fareSnap.baseFare && !fare.BaseFare && !resolution.refundAmount && !resolution.creditNoteNo && (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-12 text-center">
                <FiDollarSign size={36} className="mx-auto text-slate-300 mb-3" />
                <p className="text-sm font-bold text-slate-600">No financial data available</p>
                <p className="text-xs text-slate-400 mt-1">Fare and settlement information will appear once processed.</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-gray-50 min-h-full">
      {/* Top nav bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 md:px-8 h-12 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
            <FiArrowLeft size={16} /> Back to Queries
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 font-mono hidden sm:block">{currentQuery.queryId}</span>
            <StatusPill status={currentQuery.status} />
          </div>
        </div>
      </div>

      <main className="px-4 md:px-8 py-6 pb-16 max-w-7xl mx-auto space-y-6">
        {/* Page heading */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#8B7355] mb-2">Cancellation Request</p>
            <h1 className="text-[32px] font-black text-gray-900 tracking-tight leading-none mb-2">
              {currentQuery.status === "RESOLVED" ? "Request Resolved" : "Request in Progress"}
            </h1>
            <p className="text-sm text-gray-500">
              Order ID: <span className="font-mono font-bold">{bd.orderId || bd.bookingReference}</span>
              {pnr && <> · PNR: <span className="font-mono font-bold">{pnr}</span></>}
            </p>
          </div>
          {isAdmin && currentQuery.status !== "RESOLVED" && (
            <div className="flex gap-3">
              <button onClick={() => handleStatusUpdate("IN_PROGRESS")}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold transition shadow-sm">
                Set In-Progress
              </button>
              <button onClick={() => handleStatusUpdate("RESOLVED")}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition shadow-sm">
                Mark Resolved
              </button>
            </div>
          )}
        </div>

        {/* Tab navigation */}
        <div className="border-b border-gray-200 bg-white rounded-t-2xl shadow-sm">
          <nav className="flex overflow-x-auto px-4">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-3.5 text-[11px] font-black uppercase tracking-widest border-b-2 transition whitespace-nowrap ${
                  activeTab === tab.key
                    ? "border-[#A07840] text-[#A07840]"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab content */}
        <div className="bg-white rounded-b-2xl border border-t-0 border-[#E0D8C8] p-6 shadow-sm">
          {renderTabContent()}
        </div>
      </main>
    </div>
  );
}

/* ─── shared sub-components ─── */

function TimelineStep({ icon, title, time, color = "blue", isLast, children }) {
  const colorMap = {
    blue: "bg-blue-100 text-blue-600 border-blue-200",
    amber: "bg-amber-100 text-amber-600 border-amber-200",
    emerald: "bg-emerald-100 text-emerald-600 border-emerald-200",
    rose: "bg-rose-100 text-rose-600 border-rose-200",
    slate: "bg-slate-100 text-slate-500 border-slate-200",
  };
  return (
    <div className="relative pl-10 pb-7 last:pb-0">
      {!isLast && <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-gray-100" />}
      <div className={`absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center z-10 border ${colorMap[color]}`}>{icon}</div>
      <div>
        <div className="flex flex-wrap items-center gap-3 mb-1.5">
          <h4 className="text-sm font-bold text-gray-800">{title}</h4>
          {time && <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">{fmt(time)}</span>}
        </div>
        <div className="text-sm text-gray-500 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

function SegmentRow({ seg, pnr }) {
  const fmtTime = (dt) => dt ? new Date(dt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—";
  const fmtDuration = (mins) => {
    if (!mins) return "—";
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };
  return (
    <div className="bg-white rounded-xl border border-[#E0D8C8] p-4 mb-3 last:mb-0">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-[#0A4D68]/10 flex items-center justify-center text-[#0A4D68] font-black text-sm">{seg.airlineCode}</span>
          <div>
            <p className="text-sm font-bold text-gray-800">{seg.airlineName}</p>
            <p className="text-[10px] text-gray-400 font-medium">{seg.airlineCode}-{seg.flightNumber} · {seg.aircraft}</p>
          </div>
        </div>
        {pnr && (
          <span className="inline-flex items-center gap-1.5 bg-gray-900 text-white rounded-full px-3 py-1">
            <span className="text-[9px] font-bold uppercase tracking-widest opacity-50">PNR</span>
            <span className="font-mono text-[12px] font-bold">{pnr}</span>
          </span>
        )}
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div>
          <p className="text-[22px] font-black text-gray-900 leading-none">{seg.origin?.airportCode}</p>
          <p className="text-[11px] text-[#8B7355] font-semibold mt-0.5">{seg.origin?.city}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{fmtTime(seg.departureDateTime)}</p>
        </div>
        <div className="flex flex-col items-center gap-1 px-4">
          <span className="text-[11px] font-semibold text-[#8B7355]">{fmtDuration(seg.durationMinutes)}</span>
          <div className="flex items-center w-full gap-1">
            <div className="flex-1 border-t-[1.5px] border-dashed border-[#C8B898]" />
            <span className="text-[#A07840] text-sm">✈</span>
            <div className="flex-1 border-t-[1.5px] border-dashed border-[#C8B898]" />
          </div>
          <span className="text-[10px] font-semibold text-[#8B7355] uppercase tracking-wide">Non-stop</span>
        </div>
        <div className="text-right">
          <p className="text-[22px] font-black text-gray-900 leading-none">{seg.destination?.airportCode}</p>
          <p className="text-[11px] text-[#8B7355] font-semibold mt-0.5">{seg.destination?.city}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{fmtTime(seg.arrivalDateTime)}</p>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-[#E0D8C8] flex flex-wrap gap-3">
        <span className="text-[10px] font-bold text-[#8B7355] bg-[#8B7355]/10 px-2 py-0.5 rounded-full">Check-in: {seg.baggage?.checkIn}</span>
        <span className="text-[10px] font-bold text-[#8B7355] bg-[#8B7355]/10 px-2 py-0.5 rounded-full">Cabin: {seg.baggage?.cabin}</span>
        <span className="text-[10px] font-bold text-[#8B7355] bg-[#8B7355]/10 px-2 py-0.5 rounded-full">Fare: {seg.fareClass}</span>
      </div>
    </div>
  );
}
