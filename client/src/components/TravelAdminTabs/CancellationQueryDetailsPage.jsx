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

/* ─── helpers ─── */
const fmt = (dt) =>
  dt
    ? new Date(dt).toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "—";

const fmtDate = (dt) =>
  dt ? new Date(dt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const fmtTime = (dt) =>
  dt ? new Date(dt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—";

const fmtDuration = (mins) => {
  if (!mins) return "—";
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

/* ─── sub-components ─── */
function StatusPill({ status }) {
  const map = {
    OPEN: "bg-blue-100 text-blue-800",
    IN_PROGRESS: "bg-amber-100 text-amber-800",
    RESOLVED: "bg-green-100 text-green-800",
    CLOSED: "bg-gray-100 text-gray-700",
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
      <span className={`text-[13px] font-semibold text-gray-800 ${mono ? "font-mono tracking-wide" : ""}`}>
        {value ?? "—"}
      </span>
    </div>
  );
}

function SectionCard({ title, icon, children }) {
  return (
    <div className="bg-[#F5F0E8] rounded-2xl border border-[#E0D8C8] overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[#E0D8C8]">
        <span className="text-[#A07840]">{icon}</span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#8B7355]">{title}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function SegmentRow({ seg, pnr }) {
  return (
    <div className="bg-white rounded-xl border border-[#E0D8C8] p-4 mb-3 last:mb-0">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-[#0A4D68]/10 flex items-center justify-center text-[#0A4D68] font-black text-sm">
            {seg.airlineCode}
          </span>
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
        <span className="text-[10px] font-bold text-[#8B7355] bg-[#8B7355]/10 px-2 py-0.5 rounded-full">
          Check-in: {seg.baggage?.checkIn}
        </span>
        <span className="text-[10px] font-bold text-[#8B7355] bg-[#8B7355]/10 px-2 py-0.5 rounded-full">
          Cabin: {seg.baggage?.cabin}
        </span>
        <span className="text-[10px] font-bold text-[#8B7355] bg-[#8B7355]/10 px-2 py-0.5 rounded-full">
          Fare: {seg.fareClass}
        </span>
      </div>
    </div>
  );
}

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
      <div className={`absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center z-10 border ${colorMap[color]}`}>
        {icon}
      </div>
      <div>
        <div className="flex flex-wrap items-center gap-3 mb-1.5">
          <h4 className="text-sm font-bold text-gray-800">{title}</h4>
          {time && (
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
              {fmt(time)}
            </span>
          )}
        </div>
        <div className="text-sm text-gray-500 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

/* ─── main component ─── */
export default function CancellationQueryDetailsPage({ queryId, onBack }) {
  const dispatch = useDispatch();
  const { currentQuery, currentQueryLoading } = useSelector((s) => s.amendment);
  const { user } = useSelector((s) => s.auth);
  const userRole = user?.role || user?.userRole;
  const isAdmin = userRole === "travel-admin" || userRole === "ops-member";

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <FiArrowLeft size={16} /> Back
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 font-mono">{currentQuery.queryId}</span>
            <StatusPill status={currentQuery.status} />
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-5 py-8 pb-24 space-y-6">
        {/* Page heading */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#8B7355] mb-2">
              Cancellation Request
            </p>
            <h1 className="text-[32px] font-black text-gray-900 tracking-tight leading-none mb-2">
              {currentQuery.status === "RESOLVED" ? "Request Resolved." : "Request in Progress."}
            </h1>
            <p className="text-sm text-gray-500">
              Booking Ref: <span className="font-mono font-bold">{bd.bookingReference}</span>
              {pnr && <> · PNR: <span className="font-mono font-bold">{pnr}</span></>}
            </p>
          </div>
          {isAdmin && currentQuery.status !== "RESOLVED" && (
            <div className="flex gap-3">
              <button
                onClick={() => handleStatusUpdate("IN_PROGRESS")}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold transition shadow-sm"
              >
                Set In-Progress
              </button>
              <button
                onClick={() => handleStatusUpdate("RESOLVED")}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition shadow-sm"
              >
                Mark Resolved
              </button>
            </div>
          )}
        </div>

        {/* ── Flight Segments ── */}
        {segments.length > 0 && (
          <SectionCard title="Flight Itinerary" icon={<span className="text-sm">✈</span>}>
            {segments.map((seg, i) => (
              <SegmentRow key={i} seg={seg} pnr={i === 0 ? pnr : null} />
            ))}
          </SectionCard>
        )}

        {/* ── Two-column: Fare + Passengers ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Fare breakdown */}
          <SectionCard title="Fare Summary" icon={<FiDollarSign size={14} />}>
            <InfoRow label="Base Fare" value={`₹ ${fareSnap.baseFare || fare.BaseFare || 0}`} />
            <InfoRow label="Taxes & Fees" value={`₹ ${fareSnap.tax || fare.Tax || 0}`} />
            <InfoRow label="Other Charges" value={`₹ ${fare.OtherCharges || 0}`} />
            <div className="flex justify-between items-center pt-3 mt-1 border-t border-[#C8B898]">
              <span className="text-sm font-black text-gray-800">Total Paid</span>
              <span className="text-lg font-black text-[#0A4D68]">
                ₹ {fareSnap.publishedFare || fare.PublishedFare || bd.pricingSnapshot?.totalAmount || 0}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${fareSnap.refundable ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {fareSnap.refundable ? "Refundable" : "Non-Refundable"}
              </span>
              <span className="text-[10px] font-bold bg-[#8B7355]/10 text-[#8B7355] px-2 py-0.5 rounded-full">
                {fareSnap.fareType || "RegularFare"}
              </span>
            </div>
          </SectionCard>

          {/* Passengers */}
          <SectionCard title={`Passengers · ${travellers.length || currentQuery.passengers?.length || 1}`} icon={<FiUser size={14} />}>
            {(travellers.length ? travellers : currentQuery.passengers || []).map((t, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
                <div className="w-9 h-9 rounded-full bg-[#0A4D68]/10 text-[#0A4D68] flex items-center justify-center font-black text-xs">
                  {(t.firstName || t.name || "?")[0]}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800 uppercase">
                    {t.title} {t.firstName} {t.lastName || t.name}
                  </p>
                  <p className="text-[10px] text-gray-400 font-medium">{t.paxType || "ADULT"} · {t.email || ""}</p>
                </div>
              </div>
            ))}
          </SectionCard>
        </div>

        {/* ── Cancellation Policy / Mini-fare rules ── */}
        {miniRules.length > 0 && (
          <SectionCard title="Cancellation & Reissue Policy" icon={<FiShield size={14} />}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="text-[10px] font-bold text-[#8B7355] uppercase tracking-widest pb-2 pr-4">Type</th>
                    <th className="text-[10px] font-bold text-[#8B7355] uppercase tracking-widest pb-2 pr-4">Window</th>
                    <th className="text-[10px] font-bold text-[#8B7355] uppercase tracking-widest pb-2">Charge</th>
                  </tr>
                </thead>
                <tbody>
                  {miniRules.map((r, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="py-2 pr-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.Type === "Cancellation" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}>
                          {r.Type}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-xs text-gray-600">
                        {r.From && r.To ? `${r.From} – ${r.To} ${r.Unit}` : `After ${r.From} ${r.Unit}`}
                      </td>
                      <td className="py-2 text-xs font-bold text-gray-800">{r.Details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}

        {/* ── Booking Response / Provider Data ── */}
        {itinerary && (
          <SectionCard title="Booking Response" icon={<FiFileText size={14} />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              <InfoRow label="TBO Confirmation" value={itinerary.TBOConfNo} mono />
              <InfoRow label="Invoice No." value={invoice.InvoiceNo} mono />
              <InfoRow label="Booking ID" value={itinerary.BookingId} mono />
              <InfoRow label="Invoice Amount" value={invoice.InvoiceAmount ? `₹ ${invoice.InvoiceAmount}` : "—"} />
              <InfoRow label="Is LCC" value={itinerary.IsLCC ? "Yes" : "No"} />
              <InfoRow label="Journey Type" value={itinerary.JourneyType === 1 ? "One-Way" : "Round Trip"} />
              <InfoRow label="Origin" value={itinerary.Origin} />
              <InfoRow label="Destination" value={itinerary.Destination} />
              <InfoRow label="Non-Refundable" value={itinerary.NonRefundable ? "Yes" : "No"} />
              <InfoRow label="Issuance" value={itinerary.IssuancePcc} mono />
            </div>
          </SectionCard>
        )}

        {/* ── Cancellation Result ── */}
        {ticketCR?.ChangeRequestId && (
          <SectionCard title="Cancellation Result" icon={<FiAlertCircle size={14} />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              <InfoRow label="Change Request ID" value={ticketCR.ChangeRequestId} mono />
              <InfoRow label="Credit Note No." value={ticketCR.CreditNoteNo} mono />
              <InfoRow label="Cancellation Charge" value={ticketCR.CancellationCharge ? `₹ ${ticketCR.CancellationCharge}` : "—"} />
              <InfoRow label="Refunded Amount" value={ticketCR.RefundedAmount ? `₹ ${ticketCR.RefundedAmount}` : "—"} />
              <InfoRow label="Credit Note Date" value={fmtDate(ticketCR.CreditNoteCreatedOn)} />
              <InfoRow label="Status" value={ticketCR.Remarks} />
            </div>
          </SectionCard>
        )}

        {/* ── Request Journey Timeline ── */}
        <SectionCard title="Request Journey" icon={<FiActivity size={14} />}>
          <div className="py-2">
            <TimelineStep
              icon={<FiMessageSquare size={14} />}
              title="Request Submitted"
              time={currentQuery.requestedAt}
              color="blue"
            >
              <div className="bg-white border border-gray-100 rounded-xl p-3 mt-2 italic text-gray-500">
                "{currentQuery.remarks || "No remarks provided."}"
              </div>
            </TimelineStep>

            {logs.filter(l => l.action !== "CREATED").map((log, i) => (
              <TimelineStep
                key={i}
                icon={<FiActivity size={14} />}
                title={log.message || "Status Update"}
                time={log.at}
                color={log.action?.includes("REJECTED") ? "rose" : "amber"}
              >
                <span className="text-[11px] font-bold text-[#0A4D68]">By: {log.by || "SYSTEM"}</span>
              </TimelineStep>
            ))}

            <TimelineStep
              icon={currentQuery.status === "RESOLVED" ? <FiCheckCircle size={14} /> : <FiClock size={14} />}
              title={currentQuery.status === "RESOLVED" ? "Request Resolved" : "Awaiting Resolution"}
              time={resolution.resolvedAt}
              color={currentQuery.status === "RESOLVED" ? "emerald" : "slate"}
              isLast
            >
              {currentQuery.status === "RESOLVED" ? (
                <div className="flex gap-4 mt-2 flex-wrap">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5">
                    <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-0.5">Refund</p>
                    <p className="text-base font-black text-emerald-700">₹ {resolution.refundAmount || 0}</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">
                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-0.5">Credit Note</p>
                    <p className="text-base font-black text-blue-700">{resolution.creditNoteNo || "Not Issued"}</p>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-dashed border-amber-200 rounded-xl p-3 mt-2 text-xs text-amber-700">
                  Our travel desk is reviewing your request. You will be notified once resolved.
                </div>
              )}
            </TimelineStep>
          </div>
        </SectionCard>

        {/* ── GST Details ── */}
        {bd.gstDetails?.gstin && (
          <SectionCard title="GST Details" icon={<FiInfo size={14} />}>
            <InfoRow label="GSTIN" value={bd.gstDetails.gstin} mono />
            <InfoRow label="Legal Name" value={bd.gstDetails.legalName} />
            <InfoRow label="Address" value={bd.gstDetails.address} />
          </SectionCard>
        )}

        {/* ── Payment ── */}
        {bd.payment && (
          <SectionCard title="Payment" icon={<FiDollarSign size={14} />}>
            <InfoRow label="Method" value={bd.payment.method?.toUpperCase()} />
            <InfoRow label="Amount" value={`₹ ${bd.payment.amount}`} />
            <InfoRow label="Status" value={bd.payment.status} />
            <InfoRow label="Paid At" value={fmt(bd.payment.paidAt)} />
            <InfoRow label="Transaction ID" value={bd.payment.transactionId} mono />
          </SectionCard>
        )}
      </main>
    </div>
  );
}
