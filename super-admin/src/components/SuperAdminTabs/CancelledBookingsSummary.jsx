import React, { useEffect, useMemo, useState } from "react";
import {
  FiSearch,
  FiDownload,
  FiEye,
  FiDollarSign,
  FiXCircle,
  FiRotateCcw,
  FiAlertCircle,
  FiTrash2,
  FiFilter,
} from "react-icons/fi";
import { FaPlane, FaHotel } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchFlightCancellations,
  fetchHotelCancellations,
} from "../../Redux/Actions/corporate.related.thunks";
import Pagination from "../Shared/Pagination";
import {
  FlightBookingModal,
  HotelBookingModal,
} from "../Shared/BookingRequestDetailsModal";

const colors = {
  danger: "#BE123C", // Rose-700
  dangerLight: "#FFF1F2",
  dark: "#1E293B",
  light: "#F8FAFC",
};

const normalizeCorpName = (val) => {
  if (!val) return "N/A";
  if (typeof val === "object")
    return (
      val.corporateName || val.name || val.title || val.code || val._id || "N/A"
    );
  return val;
};

const normalizeCorpId = (val) => {
  if (!val) return "—";
  if (typeof val === "object")
    return val._id || val.id || val.code || val.corporateCode || "—";
  return val;
};

const normalizeFlight = (b = {}) => {
  const traveller = (b.travellers && b.travellers[0]) || {};
  const travellerName =
    [traveller.firstName, traveller.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    traveller.email ||
    b.employeeName ||
    "N/A";

  const segments = b.flightRequest?.segments || [];
  const route =
    (segments.length &&
      segments
        .map(
          (s) =>
            `${s?.origin?.airportCode || "?"}-${s?.destination?.airportCode || "?"}`,
        )
        .join(" / ")) ||
    (Array.isArray(b.bookingSnapshot?.sectors)
      ? b.bookingSnapshot.sectors.join(" / ")
      : "") ||
    b.bookingSnapshot?.city ||
    b.destination ||
    "—";

  const travelDt =
    b.bookingSnapshot?.travelDate ||
    segments.find((s) => (s.journeyType || "onward") === "onward")
      ?.departureDateTime ||
    b.travelDate ||
    b.date ||
    b.createdAt ||
    "";

  const cancelDt =
    b.cancelledAt || b.cancellationDate || b.updatedAt || b.createdAt || "";

  const amount =
    Number(
      b.pricingSnapshot?.totalAmount ||
        b.bookingSnapshot?.amount ||
        b.total ||
        b.totalFare ||
        b.price ||
        0,
    ) || 0;

  const amendment = b.amendment || {};
  const lastHistory =
    Array.isArray(b.amendmentHistory) && b.amendmentHistory.length
      ? b.amendmentHistory[b.amendmentHistory.length - 1]
      : {};

  return {
    id: b._id || b.bookingId || "—",
    bookingRef: b.bookingReference || b._id || "—",
    corporate: normalizeCorpName(b.corporateId || b.corporate),
    corpId: normalizeCorpId(b.corporateId || b.corporate),
    employee: b.employeeName || travellerName,
    empId: b.userId || traveller.email || "—",
    type: "Flight",
    date: travelDt,
    cancelDate: cancelDt,
    service: route,
    amount,
    refundStatus: b.refundStatus || "Pending",
    amendmentType: amendment.type || lastHistory.type || "—",
    amendmentStatus: amendment.status || lastHistory.status || "—",
    changeRequestId: amendment.changeRequestId || lastHistory.changeRequestId || "—",
    airline: b.bookingSnapshot?.airline || segments[0]?.airlineName || segments[0]?.airlineCode || "",
  };
};

const normalizeHotel = (b = {}) => {
  const traveller = (b.travellers && b.travellers[0]) || {};
  const guestName =
    b.employeeName ||
    b.guestName ||
    [traveller.firstName, traveller.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    traveller.email ||
    "N/A";

  const cancelDt =
    b.cancelledAt || b.cancellationDate || b.updatedAt || b.createdAt || "";

  const amount =
    Number(
      b.pricingSnapshot?.totalAmount ||
        b.bookingSnapshot?.amount ||
        b.selectedRoom?.Price?.totalFare ||
        b.totalFare ||
        b.amount ||
        0,
    ) || 0;

  const amendment = b.amendment || {};
  const lastHistory =
    Array.isArray(b.amendmentHistory) && b.amendmentHistory.length
      ? b.amendmentHistory[b.amendmentHistory.length - 1]
      : {};

  return {
    id: b._id || b.bookingId || "—",
    bookingRef: b.bookingReference || b._id || "—",
    corporate: normalizeCorpName(b.corporateId || b.corporate),
    corpId: normalizeCorpId(b.corporateId || b.corporate),
    employee: guestName,
    empId: b.userId || traveller.email || "—",
    type: "Hotel",
    cancelDate: cancelDt,
    date: b.bookingSnapshot?.checkInDate || b.hotelRequest?.checkInDate || b.checkIn || b.checkInDate || "",
    service: b.bookingSnapshot?.hotelName || b.hotelRequest?.selectedHotel?.hotelName || b.hotelName || b.property || "—",
    amount,
    refundStatus: b.refundStatus || "Pending",
    amendmentType: amendment.type || lastHistory.type || "—",
    amendmentStatus: amendment.status || lastHistory.status || "—",
    changeRequestId: amendment.changeRequestId || lastHistory.changeRequestId || "—",
  };
};

export default function CancellationDashboard() {
  const dispatch = useDispatch();
  const {
    flightCancellations,
    loadingFlightCancellations,
    hotelCancellations,
    loadingHotelCancellations,
  } = useSelector((state) => state.corporateRelated);

  const [bookingType, setBookingType] = useState("All");
  const [search, setSearch] = useState("");
  const [corporate, setCorporate] = useState("All");
  const [cancelDate, setCancelDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [page, setPage] = useState(1);
  const [selectedBooking, setSelectedBooking] = useState(null);

  // Initial fetch
  useEffect(() => {
    dispatch(fetchFlightCancellations({}));
    dispatch(fetchHotelCancellations({}));
  }, [dispatch]);

  const allRecords = useMemo(() => {
    const flights = (flightCancellations || []).map((b) => ({ ...normalizeFlight(b), _raw: b }));
    const hotels = (hotelCancellations || []).map((b) => ({ ...normalizeHotel(b), _raw: b }));
    return [...flights, ...hotels].sort((a, b) => new Date(b.cancelDate) - new Date(a.cancelDate));
  }, [flightCancellations, hotelCancellations]);

  const corporates = useMemo(() => {
    const names = new Set(allRecords.map((b) => b.corporate).filter(Boolean));
    return ["All", ...Array.from(names)];
  }, [allRecords]);

  const filtered = useMemo(() => {
    return allRecords.filter((b) => {
      const typeMatch = bookingType === "All" || b.type === bookingType;
      const corpMatch = corporate === "All" || b.corporate === corporate;
      const searchMatch =
        !search ||
        (b.employee || "").toLowerCase().includes(search.toLowerCase()) ||
        (b.bookingRef || "").toLowerCase().includes(search.toLowerCase()) ||
        (b.empId || "").toLowerCase().includes(search.toLowerCase()) ||
        (b.service || "").toLowerCase().includes(search.toLowerCase());

      const cDateMatch = !cancelDate || (b.cancelDate || "").slice(0, 10) === cancelDate;

      const dStamp = new Date(b.cancelDate);
      const startOk = !startDate || dStamp >= new Date(startDate);
      const endOk = !endDate || dStamp <= new Date(endDate);

      return typeMatch && corpMatch && searchMatch && cDateMatch && startOk && endOk;
    });
  }, [allRecords, bookingType, corporate, search, cancelDate, startDate, endDate]);

  const totalValue = filtered.reduce((sum, b) => sum + (b.amount || 0), 0);
  const totalPages = Math.max(1, Math.ceil(filtered.length / 10));
  const paginatedData = filtered.slice((page - 1) * 10, page * 10);

  useEffect(() => { setPage(1); }, [bookingType, search, corporate, cancelDate, startDate, endDate]);

  const isLoading = loadingFlightCancellations || loadingHotelCancellations;

  return (
    <div className="min-h-screen p-4 lg:p-6 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-2">
           <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-700 flex items-center justify-center shadow-xl shadow-rose-700/20 text-white">
                <FiXCircle size={28} />
              </div>
              <div className="text-left">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">Cancellation Archive</h1>
                <p className="text-[10px] text-rose-600 font-bold uppercase tracking-widest mt-1.5 opacity-80">Unified Super Admin Monitor</p>
              </div>
           </div>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
             Total Records: <span className="text-slate-900">{filtered.length}</span>
           </p>
        </div>

        {/* SUMMARY STATS (NOW COMPACT) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="Total Cancelled" value={filtered.length} Icon={FiTrash2} color="#BE123C" />
          <StatCard label="Refund Processed" value={filtered.filter(b => b.refundStatus?.toLowerCase().includes("process")).length} Icon={FiRotateCcw} color="#10B981" />
          <StatCard label="Refund Pending" value={filtered.filter(b => b.refundStatus?.toLowerCase().includes("pending")).length} Icon={FiAlertCircle} color="#F59E0B" />
          <StatCard label="Total Loss Value" value={`₹${totalValue.toLocaleString()}`} Icon={FiDollarSign} color="#1E293B" />
        </div>

        {/* UNIFIED FILTER LINE */}
        <div className="bg-white rounded-2xl shadow-sm p-3 border border-slate-100">
           <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px] relative group">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-rose-700 transition-colors" size={14} />
                <input
                  type="text"
                  placeholder="Universal search (ID, Name, Service)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-rose-700/10 transition-all"
                />
              </div>

              <FilterDropdown label="Type" value={bookingType} onChange={setBookingType}>
                 <option value="All">All Voids</option>
                 <option value="Flight">Flights Only</option>
                 <option value="Hotel">Hotels Only</option>
              </FilterDropdown>

              <FilterDropdown label="Corporate" value={corporate} onChange={setCorporate} wide>
                 {corporates.map(c => <option key={c} value={c}>{c}</option>)}
              </FilterDropdown>

              <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-50">
                 <DateFilter label="Cancel Dt" value={cancelDate} onChange={setCancelDate} />
                 <DateFilter label="Start Range" value={startDate} onChange={setStartDate} />
                 <DateFilter label="End Range" value={endDate} onChange={setEndDate} />
              </div>

              <button className="p-2.5 bg-rose-700 text-white rounded-xl shadow-lg shadow-rose-700/20 hover:scale-105 active:scale-95 transition-all">
                 <FiDownload size={16} />
              </button>
           </div>
        </div>

        {/* UNIFIED DATA TABLE */}
        <div className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden">
           <div className="overflow-x-auto min-h-[500px]">
              {isLoading ? (
                <div className="py-20 text-center flex flex-col items-center">
                   <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-700 mb-4"></div>
                   <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Aggregating Global Archive...</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                   <thead>
                      <tr className="bg-slate-900/95 border-b border-slate-800">
                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Service</th>
                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Booking Context</th>
                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Traveller</th>
                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Timeline</th>
                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Refund</th>
                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Value</th>
                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Action</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                      {paginatedData.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50/50 transition-all group">
                           <td className="px-6 py-3">
                              <div className="flex items-center gap-3">
                                 <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${b.type === 'Flight' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                                    {b.type === 'Flight' ? <FaPlane size={14} /> : <FaHotel size={14} />}
                                 </div>
                                 <div className="max-w-[180px]">
                                    <p className="font-black text-[12px] text-slate-800 truncate leading-tight">{b.service}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">{b.type === 'Flight' ? b.airline : 'Hotel Stay'}</p>
                                 </div>
                              </div>
                           </td>
                           <td className="px-6 py-3">
                              <div className="flex flex-col">
                                 <span className="font-black text-[11px] text-slate-800 leading-none">{b.corporate}</span>
                                 <span className="font-mono text-[9px] text-slate-400 mt-1.5">Ref: {b.bookingRef}</span>
                              </div>
                           </td>
                           <td className="px-6 py-3">
                              <div className="flex flex-col">
                                 <span className="font-black text-[11px] text-slate-700 leading-none">{b.employee}</span>
                                 <span className="text-[9px] font-bold text-rose-600 mt-1.5 uppercase tracking-tighter italic">{b.empId}</span>
                              </div>
                           </td>
                           <td className="px-6 py-3">
                              <div className="flex flex-col">
                                 <div className="flex items-center gap-1.5 text-rose-700 font-black text-[10px]">
                                    <FiXCircle size={10} /> {new Date(b.cancelDate).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' })}
                                 </div>
                                 <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 leading-none">Travel: {b.date ? new Date(b.date).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' }) : '—'}</p>
                              </div>
                           </td>
                           <td className="px-6 py-3">
                              <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase w-fit ${
                                 b.refundStatus?.toLowerCase().includes("process") ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-100"
                              }`}>
                                 <div className={`w-1 h-1 rounded-full ${b.refundStatus?.toLowerCase().includes("process") ? 'bg-emerald-700' : 'bg-amber-700'}`} />
                                 {b.refundStatus}
                              </div>
                           </td>
                           <td className="px-6 py-3 text-right">
                              <p className="font-black text-[13px] text-slate-900 leading-none">₹{b.amount.toLocaleString()}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase mt-1.5 tracking-tighter">Gross Refund</p>
                           </td>
                           <td className="px-6 py-3 text-center">
                              <button 
                                 onClick={() => setSelectedBooking(b._raw)}
                                 className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-rose-700 hover:bg-rose-50 hover:border-rose-100 transition-all"
                              >
                                 <FiEye size={16} />
                              </button>
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
              )}
           </div>

           <div className="px-6 py-3 border-t border-slate-50 flex items-center justify-between bg-white">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Pages: {totalPages}</span>
              <Pagination 
                currentPage={page} 
                totalPages={totalPages} 
                onPageChange={setPage} 
                showFirstLast 
              />
           </div>
        </div>
      </div>

      {selectedBooking && bookingType === "Flight" && (
        <FlightBookingModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} />
      )}
      {selectedBooking && bookingType === "Hotel" && (
        <HotelBookingModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} />
      )}
      {/* Fallback for "All" type when modal is needed */}
      {selectedBooking && bookingType === "All" && (
        selectedBooking.flightRequest ? (
          <FlightBookingModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} />
        ) : (
          <HotelBookingModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} />
        )
      )}
    </div>
  );
}

function StatCard({ label, value, Icon, color }) {
  return (
    <div className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-slate-100 hover:border-slate-200 transition-all hover:-translate-y-1 group">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 group-hover:rotate-6 transition-transform" style={{ backgroundColor: `${color}10`, color }}>
        <Icon size={20} />
      </div>
      <div className="text-left">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">{label}</p>
        <p className="text-xl font-black text-slate-900 leading-none tracking-tight">{value}</p>
      </div>
    </div>
  );
}

function FilterDropdown({ label, value, onChange, children, wide }) {
  return (
    <div className={`flex flex-col gap-1.5 ${wide ? 'min-w-[180px]' : 'min-w-[120px]'}`}>
      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer focus:ring-2 focus:ring-rose-700/10 transition-all"
      >
        {children}
      </select>
    </div>
  );
}

function DateFilter({ label, value, onChange }) {
  return (
    <div className="flex flex-col gap-1.5">
       <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">{label}</label>
       <input
         type="date"
         value={value}
         onChange={(e) => onChange(e.target.value)}
         className="px-3 py-1.5 bg-[#fcfcfc] border-none rounded-lg text-[10px] font-bold text-slate-600 outline-none focus:bg-white transition-all w-[110px]"
       />
    </div>
  );
}
