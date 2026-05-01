//client\src\components\EmployeeDashboard\MyRejectedRequests.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchMyRejectedRequests } from "../../Redux/Actions/booking.thunks";
import { selectMyRejectedRequests } from "../../Redux/Slice/booking.slice";
import {
  FiFilter,
  FiXCircle,
  FiMapPin,
  FiCalendar,
  FiMessageCircle,
  FiEye,
  FiX,
  FiSearch,
  FiArrowLeft,
  FiClock,
  FiAlertCircle,
  FiUser,
} from "react-icons/fi";
import { FaPlane } from "react-icons/fa";
import { MdHotel, MdFlightTakeoff, MdLocationOn, MdKingBed } from "react-icons/md";
import {
  formatDate,
  formatTime,
  formatDuration,
  getDateInIST,
  getCabinClassLabel,
} from "../../utils/formatter";
import { fetchRejectedHotelRequests } from "../../Redux/Actions/hotelBooking.thunks";
import { selectMyRejectedHotelRequests } from "../../Redux/Slice/hotelBooking.slice";
import { useNavigate } from "react-router-dom";

/* ─────────────────────────────────────────────────────────────── */
/*  Helpers                                                        */
/* ─────────────────────────────────────────────────────────────── */
const calculateNights = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;
  return Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
};

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "N/A";

/* ─────────────────────────────────────────────────────────────── */
/*  Summary Stats                                                  */
/* ─────────────────────────────────────────────────────────────── */
function SummaryStats({ flightData, hotelData, activeTab }) {
  const data = activeTab === "flight" ? flightData : hotelData;
  const total = data.length;
  const thisWeek = data.filter((r) => {
    const d = new Date(r.rejectedDate);
    const now = new Date();
    return (now - d) / (1000 * 60 * 60 * 24) <= 7;
  }).length;
  const withReason = data.filter(
    (r) => r.reason && r.reason !== "No reason provided",
  ).length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">
          Total Rejected
        </p>
        <p className="text-2xl font-black text-slate-800">{total}</p>
      </div>
      <div className="bg-red-50 rounded-xl border border-red-100 p-4">
        <p className="text-[10px] uppercase tracking-widest text-red-400 font-bold mb-1">
          Flights Rejected
        </p>
        <p className="text-2xl font-black text-red-600">{flightData.length}</p>
      </div>
      <div className="bg-orange-50 rounded-xl border border-orange-100 p-4">
        <p className="text-[10px] uppercase tracking-widest text-orange-500 font-bold mb-1">
          Hotels Rejected
        </p>
        <p className="text-2xl font-black text-orange-600">{hotelData.length}</p>
      </div>
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">
          This Week
        </p>
        <p className="text-2xl font-black text-slate-700">{thisWeek}</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Rejected Flight Card                                           */
/* ─────────────────────────────────────────────────────────────── */
function RejectedFlightCard({ req, onViewDetails }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="h-[5px] bg-red-500" />
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <MdFlightTakeoff size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-slate-800 leading-tight">
                Flight Request
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                #{req.id?.slice(-8).toUpperCase()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-100 rounded-full px-2.5 py-1 text-[11px] font-semibold shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Rejected
          </div>
        </div>

        {/* Destination */}
        <div className="flex items-center gap-2 mb-3">
          <FiMapPin size={12} className="text-slate-400 shrink-0" />
          <p className="text-[15px] font-bold text-slate-800">{req.destination}</p>
        </div>

        {/* Meta */}
        <div className="space-y-1.5 mb-4">
          {req.startDate && (
            <div className="flex items-center gap-2 text-[12px] text-slate-500">
              <FiCalendar size={12} className="text-slate-400 shrink-0" />
              <span>
                Travel:{" "}
                <span className="font-medium text-slate-700">
                  {fmtDate(req.startDate)}
                  {req.endDate && req.endDate !== req.startDate
                    ? ` → ${fmtDate(req.endDate)}`
                    : ""}
                </span>
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 text-[12px] text-red-600">
            <FiAlertCircle size={12} className="shrink-0" />
            <span>
              Rejected on {fmtDate(req.rejectedDate)} ·{" "}
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                by {req.rejectedBy}
              </span>
            </span>
          </div>
        </div>

        {/* Reason strip */}
        <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-4">
          <FiMessageCircle size={13} className="text-red-400 mt-0.5 shrink-0" />
          <span className="text-[11px] font-semibold text-red-700 leading-snug line-clamp-2">
            {req.reason}
          </span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-slate-100">
          <button
            onClick={() => onViewDetails(req)}
            className="flex items-center gap-2 bg-[#0A4D68] hover:bg-[#083d52] active:scale-[0.98] text-white text-[12px] font-semibold px-4 py-2 rounded-2xl transition-all duration-150 cursor-pointer border-none"
          >
            <FiEye size={13} />
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Rejected Hotel Card                                            */
/* ─────────────────────────────────────────────────────────────── */
function RejectedHotelCard({ req, onViewDetails }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="h-[5px] bg-red-500" />
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
              <MdHotel size={18} className="text-teal-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-slate-800 leading-tight truncate max-w-[170px]">
                {req.hotelName || "Hotel Request"}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                #{req.id?.slice(-8).toUpperCase()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-100 rounded-full px-2.5 py-1 text-[11px] font-semibold shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Rejected
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center gap-1.5 text-[12px] text-slate-500 mb-3">
          <MdLocationOn size={13} className="text-slate-400 shrink-0" />
          <span className="truncate">{req.address || "N/A"}</span>
        </div>

        {/* Stay connector */}
        {(req.startDate || req.endDate) && (
          <div className="flex items-center gap-3 mb-3">
            <div className="text-center min-w-[60px]">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Check-in</p>
              <p className="text-[14px] font-bold text-slate-800 leading-tight">
                {req.startDate
                  ? new Date(req.startDate).toLocaleDateString("en-GB").slice(0, 5)
                  : "—"}
              </p>
            </div>
            <div className="flex-1 flex flex-col items-center gap-0.5">
              <div className="flex items-center w-full gap-1">
                <div className="flex-1 border-t border-dashed border-slate-200" />
                <span className="text-xs">🏨</span>
                <div className="flex-1 border-t border-dashed border-slate-200" />
              </div>
              {req.nights > 0 && (
                <span className="text-[10px] text-slate-400 font-medium">
                  {req.nights} Night{req.nights !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="text-center min-w-[60px]">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Check-out</p>
              <p className="text-[14px] font-bold text-slate-800 leading-tight">
                {req.endDate
                  ? new Date(req.endDate).toLocaleDateString("en-GB").slice(0, 5)
                  : "—"}
              </p>
            </div>
          </div>
        )}

        {/* Chips */}
        {(req.rooms || req.mealType || req.refundable !== undefined) && (
          <div className="flex gap-2 mb-4 flex-wrap">
            {req.rooms && (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full">
                <MdKingBed size={11} className="text-slate-400" />
                {req.rooms} Room{req.rooms !== 1 ? "s" : ""}
              </span>
            )}
            {req.mealType && (
              <span className="inline-flex items-center gap-1 text-[11px] text-teal-700 bg-teal-50 border border-teal-100 px-2.5 py-1 rounded-full">
                {req.mealType}
              </span>
            )}
            {req.refundable !== undefined && (
              <span className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border ${req.refundable ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-600 border-red-100"}`}>
                {req.refundable ? "Refundable" : "Non-refundable"}
              </span>
            )}
          </div>
        )}

        {/* Meta */}
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-2 text-[12px] text-red-600">
            <FiAlertCircle size={12} className="shrink-0" />
            <span>
              Rejected on {fmtDate(req.rejectedDate)} ·{" "}
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                by {req.rejectedBy}
              </span>
            </span>
          </div>
        </div>

        {/* Reason strip */}
        <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-4">
          <FiMessageCircle size={13} className="text-red-400 mt-0.5 shrink-0" />
          <span className="text-[11px] font-semibold text-red-700 leading-snug line-clamp-2">
            {req.reason}
          </span>
        </div>

        {/* Footer */}
        <div className="flex items-end justify-end pt-3 border-t border-slate-100">
          {/* <div>
            {req.price && (
              <>
                <p className="text-[11px] text-slate-400 mb-0.5">Est. fare</p>
                <p className="text-[17px] font-bold text-slate-800">
                  ₹{Number(req.price).toLocaleString("en-IN")}
                </p>
              </>
            )}
          </div> */}
          <button
            onClick={() => onViewDetails(req)}
            className="flex items-center gap-2 bg-[#0A4D68] hover:bg-[#083d52] active:scale-[0.98] text-white text-[12px] font-semibold px-4 py-2 rounded-2xl transition-all duration-150 cursor-pointer border-none"
          >
            <FiEye size={13} />
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Detail Modal                                                   */
/* ─────────────────────────────────────────────────────────────── */
function DetailModal({ request, onClose }) {
  if (!request) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl mx-4 max-h-[90vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${request.type === "Hotel" ? "bg-teal-50" : "bg-blue-50"}`}>
              {request.type === "Hotel"
                ? <MdHotel size={18} className="text-teal-600" />
                : <MdFlightTakeoff size={18} className="text-blue-600" />}
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-slate-900">
                {request.destination || request.hotelName}
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                #{request.id?.slice(-8).toUpperCase()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors border-none cursor-pointer"
          >
            <FiX size={16} className="text-slate-600" />
          </button>
        </div>

        <div className="p-6 space-y-6 text-sm text-gray-700">
          {/* Rejection summary strip */}
          <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <FiXCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-[12px] font-bold text-red-700 mb-0.5">
                Rejected by {request.rejectedBy}
                {request.rejectedDate && (
                  <> on {formatDate(getDateInIST(request.rejectedDate))}, {formatTime(getDateInIST(request.rejectedDate))}</>
                )}
              </p>
              <p className="text-[12px] text-red-600">{request.reason}</p>
            </div>
          </div>

          {/* Overview grid */}
          <div>
            <h3 className="text-[13px] font-bold text-slate-700 uppercase tracking-widest mb-3">
              Overview
            </h3>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: "Type", value: request.type },
                { label: "Destination", value: request.destination },
                {
                  label: "Start Date",
                  value: request.startDate
                    ? `${formatDate(getDateInIST(request.startDate))}, ${formatTime(getDateInIST(request.startDate))}`
                    : "N/A",
                },
                {
                  label: "End Date",
                  value: request.endDate
                    ? `${formatDate(getDateInIST(request.endDate))}, ${formatTime(getDateInIST(request.endDate))}`
                    : "N/A",
                },
                { label: "Rejected By", value: request.rejectedBy },
                { label: "Reason", value: request.reason },
              ].map((item, i) => (
                <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wide mb-1">
                    {item.label}
                  </p>
                  <p className="text-[13px] text-slate-800 font-medium">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Flight segments */}
          {request.raw?.flightRequest?.segments?.length > 0 && (
            <div>
              <h3 className="text-[13px] font-bold text-slate-700 uppercase tracking-widest mb-3">
                Flight Details
              </h3>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-[#0A4D68] text-white">
                    <tr>
                      {["Flight", "Airline", "Cabin", "Departure", "Arrival", "Duration"].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {request.raw.flightRequest.segments.map((seg, i) => (
                      <tr key={i} className="hover:bg-blue-50 transition-colors">
                        <td className="px-4 py-3 font-medium">{seg.origin.city} → {seg.destination.city}</td>
                        <td className="px-4 py-3">{seg.airlineName} ({seg.airlineCode}-{seg.flightNumber})</td>
                        <td className="px-4 py-3">{getCabinClassLabel(seg.cabinClass)}</td>
                        <td className="px-4 py-3">{formatDate(getDateInIST(seg.departureDateTime))} {formatTime(getDateInIST(seg.departureDateTime))}</td>
                        <td className="px-4 py-3">{formatDate(getDateInIST(seg.arrivalDateTime))} {formatTime(getDateInIST(seg.arrivalDateTime))}</td>
                        <td className="px-4 py-3">{formatDuration(seg.durationMinutes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Hotel details */}
          {request.type === "Hotel" && (
            <div className="space-y-4">
              <h3 className="text-[13px] font-bold text-slate-700 uppercase tracking-widest">
                Hotel Details
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide mb-2">Property</p>
                  <p className="font-semibold text-slate-800">
                    {request.raw?.hotelRequest?.selectedHotel?.hotelName}
                  </p>
                  <p className="text-[12px] text-slate-500 mt-1">
                    {request.raw?.hotelRequest?.selectedHotel?.address}
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide mb-2">Room Info</p>
                  <div className="space-y-1 text-[13px] text-slate-700">
                    <p>{request.mealType}</p>
                    <p>{request.refundable ? "✓ Refundable" : "✗ Non-refundable"}</p>
                    <p>{request.rooms} Room(s)</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide mb-2">Pricing</p>
                <div className="flex gap-6 text-[13px]">
                  <span className="text-slate-700">Total: <strong className="text-slate-900">₹{request.price?.toLocaleString("en-IN")}</strong></span>
                  <span className="text-slate-700">Tax: <strong className="text-slate-900">₹{request.tax?.toLocaleString("en-IN")}</strong></span>
                </div>
              </div>

              {request.travellers?.length > 0 && (
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide mb-2">Travellers</p>
                  <div className="space-y-2">
                    {request.travellers.map((t, i) => (
                      <div key={i} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[12px] text-slate-700">
                        <FiUser size={12} className="text-slate-400" />
                        {t.title} {t.firstName} {t.lastName}
                        <span className="ml-auto text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full font-semibold">
                          {t.paxType}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {request.raw?.hotelRequest?.selectedRoom?.cancelPolicies?.length > 0 && (
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide mb-2">
                    Cancellation Policy
                  </p>
                  <div className="space-y-2">
                    {request.raw.hotelRequest.selectedRoom.cancelPolicies.map((c, i) => (
                      <div key={i} className="bg-orange-50 border border-orange-100 rounded-xl px-3 py-2 text-[12px] text-orange-800">
                        From: {c.FromDate} · Charge: {c.CancellationCharge} {c.ChargeType}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Main Page                                                      */
/* ─────────────────────────────────────────────────────────────── */
export default function MyRejectedRequests() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const rejectedRequests = useSelector(selectMyRejectedRequests);
  const loading = useSelector((state) => state.bookings.loading);
  const rejectedHotelRequests = useSelector(selectMyRejectedHotelRequests);

  const [activeTab, setActiveTab] = useState("flight");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    dispatch(fetchMyRejectedRequests());
    dispatch(fetchRejectedHotelRequests());
  }, [dispatch]);

  /* ── Normalise flight data ── */
  const flightFiltered = useMemo(() => {
    return rejectedRequests
      .map((r) => {
        const segments = r.flightRequest?.segments || [];
        const first = segments[0];
        const last = segments[segments.length - 1];
        return {
          id: r._id,
          raw: r,
          type: "Flight",
          status: "Rejected",
          destination: segments.length
            ? `${first?.origin?.city || "N/A"} → ${last?.destination?.city || "N/A"}`
            : "N/A",
          startDate: first?.departureDateTime,
          endDate: last?.arrivalDateTime,
          rejectedBy: r.rejectedBy?.name
            ? `${r.rejectedBy.name.firstName} ${r.rejectedBy.name.lastName}`
            : "Admin",
          rejectedDate: r.rejectedAt || r.updatedAt,
          reason: r.approverComments || "No reason provided",
          createdAt: r.createdAt,
        };
      })
      .filter((req) =>
        req.destination.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      .filter((req) => {
        const date = req.rejectedDate ? new Date(req.rejectedDate) : null;
        return (
          (!startDate || date >= new Date(startDate)) &&
          (!endDate || date <= new Date(endDate))
        );
      })
      .sort((a, b) => new Date(b.rejectedDate) - new Date(a.rejectedDate));
  }, [rejectedRequests, searchTerm, startDate, endDate]);

  /* ── Normalise hotel data ── */
  const hotelFiltered = useMemo(() => {
    return rejectedHotelRequests
      .map((r) => {
        const hotel = r.hotelRequest || {};
        const room = hotel.selectedRoom || {};
        return {
          id: r._id,
          raw: r,
          type: "Hotel",
          status: "Rejected",
          hotelName: hotel.selectedHotel?.hotelName || "N/A",
          address: hotel.selectedHotel?.address || "N/A",
          destination: hotel.selectedHotel?.hotelName || "N/A",
          startDate: hotel.checkInDate,
          endDate: hotel.checkOutDate,
          nights: calculateNights(hotel.checkInDate, hotel.checkOutDate),
          rooms: hotel.noOfRooms,
          price: room.totalFare,
          tax: room.totalTax,
          currency: room.currency,
          mealType: room.mealType,
          refundable: room.isRefundable,
          travellers: r.travellers || [],
          rejectedBy: r.rejectedBy?.name
            ? `${r.rejectedBy.name.firstName} ${r.rejectedBy.name.lastName}`
            : "Admin",
          rejectedDate: r.rejectedAt || r.updatedAt,
          reason: r.approverComments || "No reason provided",
        };
      })
      .filter((req) =>
        req.destination.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      .filter((req) => {
        const date = req.rejectedDate ? new Date(req.rejectedDate) : null;
        return (
          (!startDate || date >= new Date(startDate)) &&
          (!endDate || date <= new Date(endDate))
        );
      })
      .sort((a, b) => new Date(b.rejectedDate) - new Date(a.rejectedDate));
  }, [rejectedHotelRequests, searchTerm, startDate, endDate]);

  const activeData = activeTab === "flight" ? flightFiltered : hotelFiltered;

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
  };

  const hasFilters = searchTerm || startDate || endDate;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 h-[60px] px-6 flex items-center gap-4 shadow-sm">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-teal-600 hover:text-teal-700 text-sm font-semibold transition-colors bg-transparent border-none p-0 cursor-pointer"
        >
          <FiArrowLeft size={15} /> Back
        </button>

        <span className="w-px h-5 bg-slate-200" />
        <h1 className="text-[15px] font-bold text-slate-900">Rejected Requests</h1>

        {/* Tab toggle */}
        <div className="flex items-center gap-1 ml-4 bg-slate-100 rounded-xl p-1">
          <button
            onClick={() => handleTabChange("flight")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-150 cursor-pointer border-none ${
              activeTab === "flight"
                ? "bg-white text-[#0A4D68] shadow-sm"
                : "bg-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <FaPlane size={12} />
            Flights
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === "flight" ? "bg-red-100 text-red-600" : "bg-slate-200 text-slate-500"}`}>
              {flightFiltered.length}
            </span>
          </button>
          <button
            onClick={() => handleTabChange("hotel")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-150 cursor-pointer border-none ${
              activeTab === "hotel"
                ? "bg-white text-[#0A4D68] shadow-sm"
                : "bg-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <MdHotel size={14} />
            Hotels
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === "hotel" ? "bg-red-100 text-red-600" : "bg-slate-200 text-slate-500"}`}>
              {hotelFiltered.length}
            </span>
          </button>
        </div>

        <div className="ml-auto">
          <span className="bg-red-100 text-red-700 text-[11px] font-bold px-2.5 py-1 rounded-full">
            {activeData.length} rejected
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 py-8 pb-24">
        {/* Page title */}
        <div className="mb-6 flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${activeTab === "flight" ? "bg-blue-50" : "bg-teal-50"}`}>
            {activeTab === "flight"
              ? <FaPlane size={16} className="text-blue-600" />
              : <MdHotel size={18} className="text-teal-600" />}
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 leading-tight">
              Rejected {activeTab === "flight" ? "Flights" : "Hotels"}
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Review your rejected {activeTab === "flight" ? "flight" : "hotel"} booking requests and rejection reasons
            </p>
          </div>
        </div>

        {/* Summary Stats */}
        {!loading && (
          <SummaryStats
            flightData={flightFiltered}
            hotelData={hotelFiltered}
            activeTab={activeTab}
          />
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-cyan-50 rounded-lg p-1.5">
              <FiFilter size={13} className="text-teal-600" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Filter Requests
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Search */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Search</label>
              <div className="relative">
                <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={activeTab === "flight" ? "Search destination, route…" : "Search hotel, city…"}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-[13px] border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition text-slate-500"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition text-slate-500"
              />
            </div>
          </div>

          {hasFilters && (
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => { setSearchTerm(""); setStartDate(""); setEndDate(""); }}
                className="text-[12px] text-teal-600 hover:underline font-medium bg-transparent border-none cursor-pointer"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-10 h-10 rounded-full border-2 border-slate-200 border-t-teal-500 animate-spin mb-4" />
            <p className="text-slate-400 text-sm">Loading rejected requests…</p>
          </div>
        ) : (
          <>
            <p className="text-[13px] text-slate-500 mb-4">
              Showing{" "}
              <strong className="text-slate-700">{activeData.length} rejected</strong>{" "}
              {activeTab === "flight" ? "flight" : "hotel"}
              {activeData.length !== 1 ? "s" : ""}
            </p>

            {activeData.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {activeData.map((req) =>
                  activeTab === "flight" ? (
                    <RejectedFlightCard key={req.id} req={req} onViewDetails={setSelectedRequest} />
                  ) : (
                    <RejectedHotelCard key={req.id} req={req} onViewDetails={setSelectedRequest} />
                  ),
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                  {activeTab === "flight"
                    ? <FaPlane size={24} className="text-slate-300" />
                    : <MdHotel size={28} className="text-slate-300" />}
                </div>
                <p className="text-slate-500 font-semibold mb-1">
                  No rejected {activeTab === "flight" ? "flights" : "hotels"} found
                </p>
                <p className="text-sm text-slate-400">Try adjusting your filters</p>
                {hasFilters && (
                  <button
                    onClick={() => { setSearchTerm(""); setStartDate(""); setEndDate(""); }}
                    className="mt-4 text-sm text-teal-600 hover:underline font-medium bg-transparent border-none cursor-pointer"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Detail Modal */}
      <DetailModal request={selectedRequest} onClose={() => setSelectedRequest(null)} />
    </div>
  );
}