import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlane, FaHotel } from "react-icons/fa";
import {
  FiSearch,
  FiCheckCircle,
  FiStar,
  FiCalendar,
  FiFilter,
  FiList,
  FiEye,
  FiUser,
  FiRefreshCw,
  FiMapPin,
} from "react-icons/fi";
import { pastTripsData } from "../../data/dummyData";
import ResponsiveDataTable from "./Shared/ResponsiveDataTable";
import {
  LabeledField,
  StatCard,
  StatusBadge,
  dateCls,
  IdCell,
  SearchBar,
  selectCls,
  Th,
  RatingStars,
} from "./Shared/CommonComponents";
import { Pagination } from "./Shared/Pagination";
import {
  getTeamExecutedFlightRequests,
  getTeamExecutedHotelRequests,
} from "../../Redux/Actions/manager.thunk";
import { useDispatch, useSelector } from "react-redux";
import { FlightBookingModal } from "./Modal/BookingRequestDetailsModal";

// ── FLIGHT SECTION ────────────────────────────────────────────────────────────
function FlightSection() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [deptFilter, setDept] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const { teamExecutedFlightRequests: flightBookings } = useSelector(
    (state) => state.manager,
  );

  useEffect(() => {
    dispatch(getTeamExecutedFlightRequests());
  }, [dispatch]);

  const today = new Date().toISOString().slice(0, 10);

  const flightTrips = useMemo(() => {
    return (flightBookings || [])
      .map((b) => {
        const segments = b.flightRequest?.segments || [];
        const onward = segments.filter((s) => s.journeyType === "onward");
        const firstSeg = onward[0] || segments[0];
        const departureDate =
          firstSeg?.departureDateTime || b.bookingSnapshot?.travelDate;
        const travelKey = departureDate
          ? new Date(departureDate).toISOString().slice(0, 10)
          : null;

        const exec = (b.executionStatus || "").toLowerCase();
        const req = (b.requestStatus || "").toLowerCase();
        const isAmended =
          b.amendment &&
          (b.amendment.status === "requested" ||
            b.amendment.status === "in_progress");

        const status =
          exec === "cancelled" ||
          exec === "cancel_requested" ||
          req === "cancelled"
            ? "Cancelled"
            : (exec === "ticketed" || exec === "confirmed") &&
                exec !== "failed" &&
                !isAmended
              ? "Completed"
              : "Pending";
        return {
          raw: b,
          id: b._id,
          orderId: b.orderId,
          employee: b.travellers?.[0] ? `${b.travellers[0].firstName || ""} ${b.travellers[0].lastName || ""}`.trim() : b.userId?.email || "N/A",
          employeeId: b.userId?.email || "N/A",
          destination:
            b.bookingSnapshot?.city ||
            firstSeg?.destination?.city ||
            firstSeg?.destination?.airportCode ||
            "N/A",
          departureDate,
          airlineName:
            firstSeg?.airlineName || b.bookingSnapshot?.airline || "N/A",
          flightNumber: firstSeg?.flightNumber || "—",
          status,
          travelKey,
        };
      })
      .filter(
        (t) => t.travelKey && t.travelKey < today && t.status === "Completed",
      );
  }, [flightBookings, today]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return flightTrips.filter((t) => {
      const depDate = new Date(t.departureDate);
      const dateOk =
        (!startDate || depDate >= new Date(startDate)) &&
        (!endDate || depDate <= new Date(endDate));
      const searchOk =
        !q ||
        t.employee.toLowerCase().includes(q) ||
        (t.orderId || "").toLowerCase().includes(q) ||
        t.destination.toLowerCase().includes(q) ||
        t.id.toString().includes(q);
      return dateOk && searchOk;
    });
  }, [search, startDate, endDate, deptFilter, flightTrips]);

  const paginated = useMemo(() => {
    return filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  }, [filtered, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, startDate, endDate]);

  const avgRating =
    filtered.length > 0
      ? (
          filtered.reduce((s, t) => s + (t.rating || 0), 0) / filtered.length
        ).toFixed(1)
      : "—";

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          label="Total Past Flights"
          value={filtered.length}
          Icon={FaPlane}
          borderCls="border-[#0A4D68]"
          iconBgCls="bg-[#0A4D68]/10"
          iconColorCls="text-[#0A4D68]"
        />
        <StatCard
          label="Trips Successfully Completed"
          value={filtered.length}
          Icon={FiCheckCircle}
          borderCls="border-emerald-500"
          iconBgCls="bg-emerald-50"
          iconColorCls="text-emerald-600"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-6 lg:col-span-6">
            <LabeledField label="Search Team History">
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Search by ID, Employee or Destination..."
              />
            </LabeledField>
          </div>
          <div className="md:col-span-3 lg:col-span-3">
            <LabeledField label="From Date">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={dateCls}
              />
            </LabeledField>
          </div>
          <div className="md:col-span-3 lg:col-span-3">
            <LabeledField label="To Date">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={dateCls}
              />
            </LabeledField>
          </div>
        </div>
      </div>

      {/* Table */}
      <ResponsiveDataTable
        title="Flight Travel Records"
        subtitle={`${filtered.length} records found`}
        tableMinWidth="1000px"
        arrowBgClass="bg-cyan-50 border-cyan-200 text-[#0A4D68] hover:bg-cyan-100"
        pagination={
          <Pagination
            currentPage={currentPage}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        }
        footer={
          <div className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            Showing <span className="text-slate-900">{paginated.length}</span> of <span className="text-slate-900">{filtered.length}</span> entries
          </div>
        }
      >
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#0A4D68] text-white">
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Order ID</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Employee</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Destination</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Travel Date</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Airline</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-20 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <FaPlane className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">No Past Trips</h3>
                    <p className="text-slate-500 text-sm mt-1">No completed flight records matching your search.</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((t, i) => (
                <tr
                  key={t.id}
                  className="group hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">
                      {t.orderId || "N/A"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-800 text-[13px]">{t.employee}</span>
                      <span className="text-[11px] text-slate-400 font-bold truncate max-w-[150px]">{t.employeeId}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                        <FiMapPin className="text-slate-400" size={14} />
                      </div>
                      <span className="text-[13px] font-bold text-slate-700">{t.destination}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[13px] font-bold text-slate-500">
                    {t.departureDate
                      ? new Date(t.departureDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-800 text-[13px]">{t.airlineName}</span>
                      <span className="text-[11px] text-slate-400 font-bold">{t.flightNumber}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status="Completed" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <button
                        onClick={() =>
                          navigate(`/manager/team-booking/${t.id}`, {
                            state: { isPastTrip: true },
                          })
                        }
                        className="inline-flex items-center gap-2 px-5 py-2 bg-slate-800 text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-900 transition-all active:scale-95 shadow-md shadow-slate-200"
                      >
                        <FiEye size={12} /> View
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ResponsiveDataTable>
    </div>
  );
}

// ── HOTEL SECTION ─────────────────────────────────────────────────────────────
function HotelSection() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [deptFilter, setDept] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const { teamExecutedHotelRequests: hotelBookings } = useSelector(
    (state) => state.manager,
  );

  useEffect(() => {
    dispatch(getTeamExecutedHotelRequests());
  }, [dispatch]);

  const today = new Date().toISOString().slice(0, 10);

  const hotelTrips = useMemo(() => {
    return (hotelBookings || [])
      .filter((b) => {
        const checkIn =
          b.bookingSnapshot?.checkInDate ||
          b.hotelRequest?.checkInDate ||
          b.checkInDate;

        if (!checkIn) return false;

        const ci = new Date(checkIn).toISOString().slice(0, 10);
        const validStatuses = ["confirmed", "booked", "voucher_generated"];
        const exec = (b.executionStatus || "").toLowerCase();
        const req = (b.requestStatus || "").toLowerCase();
        const isCancelled =
          exec === "cancelled" ||
          exec === "cancel_requested" ||
          req === "cancelled" ||
          (b.amendment &&
            ["requested", "success"].includes(b.amendment?.status)) ||
          b.isCancelled === true;

        const isFailed = exec === "failed";

        const isAmended = b.amendment && (b.amendment.status === "requested" || b.amendment.status === "in_progress");

        return (
          validStatuses.includes(exec) &&
          ci < today &&
          !isCancelled &&
          !isFailed &&
          !isAmended
        );
      })
      .map((b) => ({
        id: b._id,
        orderId: b.orderId,
        raw: b,
        employee:
          `${b.travellers?.[0]?.firstName || ""} ${b.travellers?.[0]?.lastName || ""}`.trim() ||
          b.userId?.email ||
          "N/A",
        employeeId: b.userId?.email || "N/A",
        destination: b.hotelRequest?.selectedHotel?.hotelName || "N/A",
        departureDate:
          b.bookingSnapshot?.checkInDate ||
          b.hotelRequest?.checkInDate ||
          b.checkInDate,
        returnDate:
          b.bookingSnapshot?.checkOutDate ||
          b.hotelRequest?.checkOutDate ||
          b.checkOutDate,
        status: "Completed",
      }));
  }, [hotelBookings]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return hotelTrips.filter((t) => {
      const depDate = new Date(t.departureDate);
      const dateOk =
        (!startDate || depDate >= new Date(startDate)) &&
        (!endDate || depDate <= new Date(endDate));
      const searchOk =
        !q ||
        t.employee.toLowerCase().includes(q) ||
        (t.orderId || "").toLowerCase().includes(q) ||
        t.destination.toLowerCase().includes(q) ||
        t.id.toString().includes(q);
      return dateOk && searchOk;
    });
  }, [search, startDate, endDate, deptFilter, hotelTrips]);

  const paginated = useMemo(() => {
    return filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  }, [filtered, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, startDate, endDate]);

  const avgRating =
    filtered.length > 0
      ? (
          filtered.reduce((s, t) => s + (t.rating || 0), 0) / filtered.length
        ).toFixed(1)
      : "—";

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          label="Total Past Hotels"
          value={filtered.length}
          Icon={FaHotel}
          borderCls="border-[#088395]"
          iconBgCls="bg-[#088395]/10"
          iconColorCls="text-[#088395]"
        />
        <StatCard
          label="Stays Completed"
          value={filtered.length}
          Icon={FiCheckCircle}
          borderCls="border-emerald-500"
          iconBgCls="bg-emerald-50"
          iconColorCls="text-emerald-600"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-6 lg:col-span-6">
            <LabeledField label="Search Team History">
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Search by ID, Employee or Hotel..."
              />
            </LabeledField>
          </div>
          <div className="md:col-span-3 lg:col-span-3">
            <LabeledField label="From Date">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={dateCls}
              />
            </LabeledField>
          </div>
          <div className="md:col-span-3 lg:col-span-3">
            <LabeledField label="To Date">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={dateCls}
              />
            </LabeledField>
          </div>
        </div>
      </div>

      {/* Table */}
      <ResponsiveDataTable
        title="Hotel Stay Records"
        subtitle={`${filtered.length} records found`}
        tableMinWidth="1000px"
        arrowBgClass="bg-teal-50 border-teal-200 text-[#088395] hover:bg-teal-100"
        pagination={
          <Pagination
            currentPage={currentPage}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        }
        footer={
          <div className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            Showing <span className="text-slate-900">{paginated.length}</span> of <span className="text-slate-900">{filtered.length}</span> entries
          </div>
        }
      >
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#088395] text-white">
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Order ID</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Employee</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Hotel / Destination</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Check-In</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Check-Out</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-20 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <FaHotel className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">No Past Hotels</h3>
                    <p className="text-slate-500 text-sm mt-1">No completed hotel stay records found.</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((t, i) => (
                <tr
                  key={t.id}
                  className="group hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded-md border border-teal-100">
                      {t.orderId || "N/A"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-800 text-[13px]">{t.employee}</span>
                      <span className="text-[11px] text-slate-400 font-bold truncate max-w-[150px]">{t.employeeId}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                        <FaHotel className="text-slate-400" size={14} />
                      </div>
                      <span className="text-[13px] font-bold text-slate-700 line-clamp-1 max-w-[200px]">{t.destination}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[13px] font-bold text-slate-500">
                    {t.departureDate
                      ? new Date(t.departureDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </td>
                  <td className="px-6 py-4 text-[13px] font-bold text-slate-500">
                    {t.returnDate
                      ? new Date(t.returnDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status="Completed" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <button
                        onClick={() =>
                          navigate(`/manager/team-hotel-booking/${t.id}`)
                        }
                        className="inline-flex items-center gap-2 px-5 py-2 bg-slate-800 text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-900 transition-all active:scale-95 shadow-md shadow-slate-200"
                      >
                        <FiEye size={12} /> View
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ResponsiveDataTable>
    </div>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function PastTripsForManager() {
  const [activeTab, setActiveTab] = useState("flight");
  const dispatch = useDispatch();
  const loadingFlights = useSelector(
    (state) => state.manager.loadingTeamExecutedFlightRequests,
  );
  const loadingActive = activeTab === "flight" ? loadingFlights : false;

  const handleRefresh = () => {
    if (activeTab === "flight") {
      dispatch(getTeamExecutedFlightRequests());
      return;
    }
    dispatch(getTeamExecutedHotelRequests());
  };

  const tabs = [
    {
      id: "flight",
      label: "Flight Trips",
      Icon: FaPlane,
      activeText: "text-[#0A4D68]",
      activeBorder: "border-b-[#0A4D68]",
    },
    {
      id: "hotel",
      label: "Hotel Trips",
      Icon: FaHotel,
      activeText: "text-[#088395]",
      activeBorder: "border-b-[#088395]",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        
        {/* Header Card */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#0A4D68] to-[#088395] flex items-center justify-center shadow-lg text-white shrink-0">
              <FiList size={24} />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase leading-none truncate">
                Past Trips
              </h1>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 font-bold uppercase tracking-widest truncate">
                View all completed business travel records
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={handleRefresh}
              disabled={loadingActive}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-bold transition-all shadow-sm border bg-cyan-50 border-cyan-200 text-[#0A4D68] hover:bg-cyan-100 active:scale-95 disabled:opacity-50"
            >
              <FiRefreshCw size={14} className={loadingActive ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-slate-200/50 p-1.5 rounded-2xl w-fit shadow-inner">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all
                  ${
                    active
                      ? `bg-white ${tab.activeText} shadow-md`
                      : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                  }
                `}
              >
                <tab.Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === "flight" ? <FlightSection /> : <HotelSection />}
      </div>
    </div>
  );
}
