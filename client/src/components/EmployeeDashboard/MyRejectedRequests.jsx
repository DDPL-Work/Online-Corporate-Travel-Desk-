// client/src/components/EmployeeDashboard/MyRejectedRequests.jsx
import React, { useState, useEffect, useMemo } from "react";
import { FaPlane, FaHotel, FaRupeeSign } from "react-icons/fa";
import {
  FiSearch,
  FiCalendar,
  FiFilter,
  FiEye,
  FiRefreshCw,
  FiArrowRight,
  FiX,
  FiList,
  FiXCircle,
} from "react-icons/fi";
import { MdHotel, MdFlightTakeoff } from "react-icons/md";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchMyRejectedRequests } from "../../Redux/Actions/booking.thunks";
import { fetchRejectedHotelRequests } from "../../Redux/Actions/hotelBooking.thunks";
import { selectMyRejectedRequests } from "../../Redux/Slice/booking.slice";
import { selectMyRejectedHotelRequests } from "../../Redux/Slice/hotelBooking.slice";
import { airlineLogo, formatDate, formatTime } from "../../utils/formatter";
import {
  LabeledField,
  StatCard,
  StatusBadge,
  dateCls,
  IdCell,
  SearchBar,
  Th,
  CustomDropdown,
} from "../TravelAdminTabs/Shared/CommonComponents";
import ResponsiveDataTable from "../TravelAdminTabs/Shared/ResponsiveDataTable";
import { Pagination } from "../TravelAdminTabs/Shared/Pagination";
import { C } from "../Shared/color";

/* ─── helpers ─── */
function fmtDate(d, opts = { day: "2-digit", month: "short", year: "numeric" }) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", opts);
}

function DetailModal({ request, onClose }) {
  if (!request) return null;
  return (
    <div className="fixed inset-0 bg-[#000D26]/60 backdrop-blur-md flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-300" onClick={onClose}>
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden relative flex flex-col animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-[#003399] to-[#000d26] px-8 py-6 flex items-center justify-between text-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/20">
              {request.type === "Hotel" ? <MdHotel size={24} /> : <MdFlightTakeoff size={24} />}
            </div>
            <div>
              <h2 className="text-xl font-black">{request.destination}</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">#{request.id?.slice(-12).toUpperCase()}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 rounded-xl hover:bg-white/10 transition-all border border-white/10 text-white"><FiX size={24} /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10"><FiXCircle size={64} className="text-[#003399]" /></div>
             <p className="text-[10px] font-black uppercase tracking-[2px] text-[#003399] mb-2">Rejection Verdict</p>
             <p className="text-sm font-bold text-[#000D26] leading-relaxed italic">"{request.reason}"</p>
             <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-[#003399]">{(request.rejectedBy || "A")[0]}</div>
                <p className="text-xs font-bold text-slate-500">Rejected by {request.rejectedBy} on {fmtDate(request.rejectedDate)}</p>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {[
              { label: "Request Type", value: request.type, icon: FiList },
              { label: "Planned Deployment", value: fmtDate(request.startDate), icon: FiCalendar },
            ].map((item, i) => (
              <div key={i} className="p-4 rounded-2xl border border-slate-100 bg-slate-50 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 shadow-sm border border-slate-100"><item.icon size={18} /></div>
                <div>
                   <p className="text-[9px] uppercase font-bold tracking-widest text-slate-400">{item.label}</p>
                   <p className="text-sm font-black text-[#000D26]">{item.value}</p>
                </div>
              </div>
            ))}
          </div>

          {request.raw?.flightRequest?.segments?.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[2px] text-slate-400">Flight Configuration</h3>
              <div className="overflow-hidden rounded-2xl border border-slate-100 shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-500 border-b">
                    <tr>
                      <th className="px-5 py-4">Sector</th>
                      <th className="px-5 py-4">Flight</th>
                      <th className="px-5 py-4">Timing</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs">
                    {request.raw.flightRequest.segments.map((seg, i) => (
                      <tr key={i}>
                        <td className="px-5 py-4 font-black text-[#003399] uppercase">{seg.origin.city} → {seg.destination.city}</td>
                        <td className="px-5 py-4 font-bold text-slate-600">{seg.airlineName} <span className="text-[10px] text-slate-400">({seg.airlineCode}-{seg.flightNumber})</span></td>
                        <td className="px-5 py-4 text-slate-500">{formatDate(seg.departureDateTime)} {formatTime(seg.departureDateTime)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FlightSection({ onSelect }) {
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  const dispatch = useDispatch();
  const rejectedFlights = useSelector(selectMyRejectedRequests);

  useEffect(() => { dispatch(fetchMyRejectedRequests()); }, [dispatch]);

  const mapped = useMemo(() => {
    return (rejectedFlights || []).map(r => {
      const segments = r.flightRequest?.segments || [];
      return {
        id: r._id, raw: r, type: "Flight",
        destination: segments.length ? `${segments[0].origin.city} → ${segments[segments.length-1].destination.city}` : "N/A",
        startDate: segments[0]?.departureDateTime,
        rejectedBy: r.rejectedBy?.name ? `${r.rejectedBy.name.firstName} ${r.rejectedBy.name.lastName}` : "Admin",
        rejectedDate: r.rejectedAt || r.updatedAt,
        reason: r.approverComments || "No reason provided",
        airlineCode: segments[0]?.airlineCode || "",
        airlineName: segments[0]?.airlineName || "Flight",
      };
    }).sort((a, b) => new Date(b.rejectedDate) - new Date(a.rejectedDate));
  }, [rejectedFlights]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mapped.filter(b => {
      const rej = b.rejectedDate ? new Date(b.rejectedDate).toISOString().slice(0, 10) : "";
      return (!q || b.destination.toLowerCase().includes(q) || b.id.toLowerCase().includes(q)) &&
             (!startDate || rej >= startDate) && (!endDate || rej <= endDate);
    });
  }, [search, startDate, endDate, mapped]);

  const paginated = useMemo(() => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [filtered, currentPage]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Rejected Flights" value={filtered.length} Icon={FiXCircle} borderCls="border-[#003399]" iconBgCls="bg-slate-50" iconColorCls="text-[#003399]" />
        <StatCard label="Awaiting Revision" value={filtered.length} Icon={FiRefreshCw} borderCls="border-amber-500" iconBgCls="bg-amber-50" iconColorCls="text-amber-600" />
        <StatCard label="Policy Violations" value={filtered.length} Icon={FiFilter} borderCls="border-slate-500" iconBgCls="bg-slate-50" iconColorCls="text-slate-600" />
        <StatCard label="Rejected Assets" value={filtered.length} Icon={FiList} borderCls="border-violet-500" iconBgCls="bg-violet-50" iconColorCls="text-violet-600" />
      </div>

      <div className="bg-white rounded-2xl p-6 border shadow-sm" style={{ borderColor: C.border }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
          <LabeledField label={<><FiSearch size={10} /> Search Rejections</>} className="lg:col-span-4">
            <SearchBar value={search} onChange={setSearch} placeholder="Destination, ID..." />
          </LabeledField>
          <LabeledField label="Rejection Date" className="lg:col-span-6">
             <div className="flex items-center gap-2">
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={dateCls} style={{ borderColor: C.border }} />
                <span className="text-slate-300">to</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={dateCls} style={{ borderColor: C.border }} />
             </div>
          </LabeledField>
          <div className="flex items-end lg:col-span-2">
             <button onClick={() => { setSearch(""); setStartDate(""); setEndDate(""); }} className="w-full py-2.5 rounded-xl font-black text-[11px] flex items-center justify-center gap-2 border shadow-sm transition-all hover:bg-slate-50 uppercase tracking-widest" style={{ background: C.white, borderColor: C.border, color: C.muted }}><FiX /> Reset</button>
          </div>
        </div>
      </div>

      <ResponsiveDataTable title="Rejection Ledger" subtitle={`${filtered.length} denied authorizations`} onExport={() => {}} wrapperClass="!border-none !shadow-none" pagination={<Pagination currentPage={currentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />}>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-[#003399] to-[#000d26] text-white">
              <Th className="!px-6 !py-5">Request ID</Th>
              <Th className="!px-6 !py-5">Destination</Th>
              <Th className="!px-6 !py-5">Rejection Date</Th>
              <Th className="!px-6 !py-5">Reason</Th>
              <Th className="!px-6 !py-5">Status</Th>
              <Th className="!px-6 !py-5 !text-left">Action</Th>
            </tr>
          </thead>
          <tbody>
            {paginated.length > 0 ? paginated.map((b, i) => (
              <tr key={b.id} className="hover:bg-slate-100 transition-colors" style={{ background: i % 2 === 0 ? C.white : C.lightGray }}>
                <td className="!px-6 !py-5"><IdCell id={b.id} /></td>
                <td className="!px-6 !py-5">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white border border-slate-100 flex items-center justify-center p-1.5 shadow-sm overflow-hidden">
                         <img src={airlineLogo(b.airlineCode)} alt={b.airlineName} className="w-full h-full object-contain" loading="eager" onError={(e) => { e.target.onerror = null; e.target.src = "https://cdn-icons-png.flaticon.com/512/3114/3114883.png"; }} />
                      </div>
                      <div>
                         <p className="text-xs font-black uppercase tracking-tight" style={{ color: C.navy }}>{b.destination}</p>
                         <p className="text-[10px] font-bold text-slate-400 uppercase">{b.airlineName} Request</p>
                      </div>
                   </div>
                </td>
                <td className="!px-6 !py-5 text-[11px] font-bold text-[#003399] uppercase">{fmtDate(b.rejectedDate)}</td>
                <td className="!px-6 !py-5 text-[10px] text-slate-500 italic font-medium max-w-[200px] truncate leading-relaxed">"{b.reason}"</td>
                <td className="!px-6 !py-5"><StatusBadge status="rejected" /></td>
                <td className="!px-6 !py-5 !text-left">
                    <button onClick={() => onSelect(b)} className="p-3 rounded-xl transition-all shadow-sm hover:shadow-md bg-gradient-to-br from-[#003399] to-[#000d26] hover:bg-white hover:from-white hover:to-white group">
                      <FiEye size={18} className="text-[#E7C695] group-hover:text-[#000d26] transition-colors" />
                    </button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={6} className="!px-6 !py-20 text-center"><div className="flex flex-col items-center gap-3"><div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300"><FiXCircle size={32} /></div><p className="text-sm font-bold text-slate-400">No rejected flights found.</p></div></td></tr>
            )}
          </tbody>
        </table>
      </ResponsiveDataTable>
    </div>
  );
}

function HotelSection({ onSelect }) {
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  const dispatch = useDispatch();
  const rejectedHotels = useSelector(selectMyRejectedHotelRequests);

  useEffect(() => { dispatch(fetchRejectedHotelRequests()); }, [dispatch]);

  const mapped = useMemo(() => {
    return (rejectedHotels || []).map(r => {
      const hotel = r.hotelRequest || {};
      return {
        id: r._id, raw: r, type: "Hotel",
        destination: hotel.selectedHotel?.hotelName || "Hotel",
        city: hotel.selectedHotel?.city || "—",
        startDate: hotel.checkInDate,
        rejectedBy: r.rejectedBy?.name ? `${r.rejectedBy.name.firstName} ${r.rejectedBy.name.lastName}` : "Admin",
        rejectedDate: r.rejectedAt || r.updatedAt,
        reason: r.approverComments || "No reason provided",
      };
    }).sort((a, b) => new Date(b.rejectedDate) - new Date(a.rejectedDate));
  }, [rejectedHotels]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mapped.filter(b => {
      const rej = b.rejectedDate ? new Date(b.rejectedDate).toISOString().slice(0, 10) : "";
      return (!q || b.destination.toLowerCase().includes(q) || b.id.toLowerCase().includes(q)) &&
             (!startDate || rej >= startDate) && (!endDate || rej <= endDate);
    });
  }, [search, startDate, endDate, mapped]);

  const paginated = useMemo(() => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [filtered, currentPage]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Rejected Stays" value={filtered.length} Icon={FiXCircle} borderCls="border-[#003399]" iconBgCls="bg-slate-50" iconColorCls="text-[#003399]" />
        <StatCard label="Awaiting Revision" value={filtered.length} Icon={FiRefreshCw} borderCls="border-amber-500" iconBgCls="bg-amber-50" iconColorCls="text-amber-600" />
        <StatCard label="Policy Violations" value={filtered.length} Icon={FiFilter} borderCls="border-slate-500" iconBgCls="bg-slate-50" iconColorCls="text-slate-600" />
        <StatCard label="Rejected Assets" value={filtered.length} Icon={FiList} borderCls="border-violet-500" iconBgCls="bg-violet-50" iconColorCls="text-violet-600" />
      </div>

      <div className="bg-white rounded-2xl p-6 border shadow-sm" style={{ borderColor: C.border }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
          <LabeledField label={<><FiSearch size={10} /> Search Rejections</>} className="lg:col-span-4">
            <SearchBar value={search} onChange={setSearch} placeholder="Hotel Name, ID..." />
          </LabeledField>
          <LabeledField label="Rejection Date" className="lg:col-span-6">
             <div className="flex items-center gap-2">
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={dateCls} style={{ borderColor: C.border }} />
                <span className="text-slate-300">to</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={dateCls} style={{ borderColor: C.border }} />
             </div>
          </LabeledField>
          <div className="flex items-end lg:col-span-2">
             <button onClick={() => { setSearch(""); setStartDate(""); setEndDate(""); }} className="w-full py-2.5 rounded-xl font-black text-[11px] flex items-center justify-center gap-2 border shadow-sm transition-all hover:bg-slate-50 uppercase tracking-widest" style={{ background: C.white, borderColor: C.border, color: C.muted }}><FiX /> Reset</button>
          </div>
        </div>
      </div>

      <ResponsiveDataTable title="Hotel Rejection Ledger" subtitle={`${filtered.length} denied authorizations`} onExport={() => {}} wrapperClass="!border-none !shadow-none" pagination={<Pagination currentPage={currentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />}>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-[#003399] to-[#000d26] text-white">
              <Th className="!px-6 !py-5">Request ID</Th>
              <Th className="!px-6 !py-5">Hotel Detail</Th>
              <Th className="!px-6 !py-5">Rejection Date</Th>
              <Th className="!px-6 !py-5">Reason</Th>
              <Th className="!px-6 !py-5">Status</Th>
              <Th className="!px-6 !py-5 !text-left">Action</Th>
            </tr>
          </thead>
          <tbody>
            {paginated.length > 0 ? paginated.map((b, i) => (
              <tr key={b.id} className="hover:bg-slate-100 transition-colors" style={{ background: i % 2 === 0 ? C.white : C.lightGray }}>
                <td className="!px-6 !py-5"><IdCell id={b.id} /></td>
                <td className="!px-6 !py-5">
                   <p className="text-xs font-black uppercase tracking-tight" style={{ color: C.navy }}>{b.destination}</p>
                   <p className="text-[10px] font-bold text-gold uppercase">{b.city}</p>
                </td>
                <td className="!px-6 !py-5 text-[11px] font-bold text-[#003399] uppercase">{fmtDate(b.rejectedDate)}</td>
                <td className="!px-6 !py-5 text-[10px] text-slate-500 italic font-medium max-w-[200px] truncate leading-relaxed">"{b.reason}"</td>
                <td className="!px-6 !py-5"><StatusBadge status="rejected" /></td>
                <td className="!px-6 !py-5 !text-left">
                    <button onClick={() => onSelect(b)} className="p-3 rounded-xl transition-all shadow-sm hover:shadow-md bg-gradient-to-br from-[#003399] to-[#000d26] hover:bg-white hover:from-white hover:to-white group">
                      <FiEye size={18} className="text-[#E7C695] group-hover:text-[#000d26] transition-colors" />
                    </button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={6} className="!px-6 !py-20 text-center"><div className="flex flex-col items-center gap-3"><div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300"><FiXCircle size={32} /></div><p className="text-sm font-bold text-slate-400">No rejected stays found.</p></div></td></tr>
            )}
          </tbody>
        </table>
      </ResponsiveDataTable>
    </div>
  );
}

export default function MyRejectedRequests() {
  const [activeTab, setActiveTab] = useState("flight");
  const [activeRequest, setActiveRequest] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const typeQuery = searchParams.get("type");
  const loading = useSelector((s) => s.bookings.loading);

  useEffect(() => { if (typeQuery) setActiveTab(typeQuery === "hotel" ? "hotel" : "flight"); }, [typeQuery]);

  return (
    <div className="min-h-screen font-sans pb-20 -mt-6 -mx-4 md:-mx-6" style={{ background: C.offWhite }}>
      <DetailModal request={activeRequest} onClose={() => setActiveRequest(null)} />
      
      <div className="w-full bg-gradient-to-br from-[#003399] to-[#000d26] text-white pt-8 pb-20 px-6 md:px-10">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-3">
               <button onClick={() => navigate(-1)} className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10"><FiArrowRight className="rotate-180" size={20} /></button>
               <div className={`p-3 rounded-xl bg-white/10 border border-white/10 ${loading ? "animate-spin" : ""}`}>
                  <FiRefreshCw size={20} />
               </div>
             </div>
             <div className="h-12 w-[1px] bg-white/10 mx-2 hidden md:block" />
             <div className="flex items-center gap-5">
               <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl text-white border border-white/10 bg-white/10"><FiXCircle size={28} /></div>
               <div>
                 <h1 className="text-3xl font-black tracking-tight leading-none">Rejected Requests</h1>
                 <p className="text-[10px] mt-2 font-bold uppercase tracking-[2px] opacity-60">Archive of Denied Authorizations and Compliance Feedback Ledger</p>
               </div>
             </div>
          </div>
        </div>
      </div>
      <div className="w-full px-4 md:px-10 -mt-10 space-y-10">
        <div className="flex gap-2 p-1.5 bg-white border border-slate-200/60 shadow-xl rounded-2xl w-fit">
           {[["flight", "Flight Rejections", FaPlane], ["hotel", "Hotel Rejections", FaHotel]].map(([k, lbl, Icon]) => (
             <button key={k} onClick={() => setActiveTab(k)} className={`px-8 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all ${activeTab === k ? "bg-[#003399] text-white shadow-lg scale-[1.02]" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}>
                <Icon size={14} /> {lbl}
             </button>
           ))}
        </div>
        {activeTab === "flight" ? <FlightSection onSelect={setActiveRequest} /> : <HotelSection onSelect={setActiveRequest} />}
      </div>
    </div>
  );
}