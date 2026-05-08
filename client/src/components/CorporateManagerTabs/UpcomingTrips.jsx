import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlane, FaHotel } from "react-icons/fa";
import {
  FiSearch,
  FiCheckCircle,
  FiClock,
  FiCalendar,
  FiFilter,
  FiUser,
  FiEye,
  FiRefreshCw,
  FiList,
} from "react-icons/fi";
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
} from "./Shared/CommonComponents";
import {
  getTeamExecutedFlightRequests,
  getTeamExecutedHotelRequests,
} from "../../Redux/Actions/manager.thunk";
import { useDispatch, useSelector } from "react-redux";
import {
  HotelBookingModal,
  FlightBookingModal,
} from "./Modal/BookingRequestDetailsModal";
import { Pagination } from "./Shared/Pagination";

function FlightSection() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [deptFilter, setDept] = useState("All");

  const flightBookings = useSelector(
    (state) => state.manager.teamExecutedFlightRequests,
  );

  useEffect(() => {
    dispatch(getTeamExecutedFlightRequests());
  }, [dispatch]);

  const today = new Date().toISOString().slice(0, 10);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const flightTrips = useMemo(() => {
    return (flightBookings || [])
      .map((b) => {
        const segments = b.flightRequest?.segments || [];
        const onward = segments.filter((s) => s.journeyType === "onward");
        const returns = segments.filter((s) => s.journeyType === "return");
        const firstSeg = onward[0] || segments[0];
        const lastOnward = onward[onward.length - 1] || firstSeg;
        const firstReturn = returns[0];

        const departureDate =
          firstSeg?.departureDateTime || b.bookingSnapshot?.travelDate;
        const returnDate =
          firstReturn?.departureDateTime || b.bookingSnapshot?.returnDate;
        const airlineName =
          firstSeg?.airlineName || b.bookingSnapshot?.airline || "N/A";
        const flightNumber = firstSeg?.flightNumber || "â€”";

        const travelKey = departureDate
          ? new Date(departureDate).toISOString().slice(0, 10)
          : null;
        const exec = (b.executionStatus || "").toLowerCase();
        const req = (b.requestStatus || "").toLowerCase();
        const status =
          exec === "cancel_requested" || req === "cancelled"
            ? "Cancelled"
            : exec === "ticketed" || exec === "confirmed" || req === "approved"
              ? "Confirmed"
              : "Pending";
        const isFailed = exec === "failed";

        return {
          id: b._id,
          orderId: b.orderId,
          employee:
            `${b.travellers?.[0]?.firstName || ""} ${b.travellers?.[0]?.lastName || ""}`.trim() ||
            b.userId?.email ||
            "N/A",
          destination:
            lastOnward?.destination?.city ||
            lastOnward?.destination?.airportCode ||
            b.bookingSnapshot?.city ||
            "N/A",
          departureDate,
          returnDate,
          airlineName,
          flightNumber,
          status,
          travelKey,
          raw: b,
          isFailed,
        };
      })
      .filter(
        (t) =>
          t.travelKey &&
          t.status === "Confirmed" &&
          t.travelKey >= today &&
          !t.isFailed,
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

  const confirmed = filtered.filter((t) => t.status === "Confirmed").length;
  const pending = filtered.filter(
    (t) => t.status === "Pending" || !t.status,
  ).length;
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage],
  );

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Total Upcoming Flights"
          value={filtered.length}
          Icon={FaPlane}
          borderCls="border-[#0A4D68]"
          iconBgCls="bg-[#0A4D68]/10"
          iconColorCls="text-[#0A4D68]"
        />
        <StatCard
          label="Confirmed Bookings"
          value={confirmed}
          Icon={FiCheckCircle}
          borderCls="border-emerald-500"
          iconBgCls="bg-emerald-50"
          iconColorCls="text-emerald-600"
        />
        <StatCard
          label="Action Required"
          value={pending}
          Icon={FiClock}
          borderCls="border-amber-500"
          iconBgCls="bg-amber-50"
          iconColorCls="text-amber-600"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-6 lg:col-span-6">
            <LabeledField label="Search Upcoming History">
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Search by ID, Employee or Destination..."
              />
            </LabeledField>
          </div>
          <div className="md:col-span-3 lg:col-span-3">
            <LabeledField label="Travel From">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={dateCls}
              />
            </LabeledField>
          </div>
          <div className="md:col-span-3 lg:col-span-3">
            <LabeledField label="Travel To">
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
        title="Upcoming Flight Trips"
        subtitle={`${filtered.length} itineraries found`}
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
                    <h3 className="text-lg font-bold text-slate-800">No Upcoming Trips</h3>
                    <p className="text-slate-500 text-sm mt-1">No confirmed flight itineraries found for the selected period.</p>
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
                      <span className="text-[11px] text-slate-400 font-bold truncate max-w-[150px]">{t.raw?.userId?.email || "N/A"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                        <FiUser className="text-slate-400" size={14} />
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
                    <StatusBadge status={t.status || "Confirmed"} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <button
                        onClick={() => navigate(`/manager/team-booking/${t.id}`)}
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

// ————————————————————————————————————————————————————————————————————————————————————————————————————
function HotelSection() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [deptFilter, setDept] = useState("All");

  const {
    teamExecutedHotelRequests: hotelBookings,
    loadingTeamExecutedRequests: loadingHotels,
  } = useSelector((state) => state.manager);

  useEffect(() => {
    dispatch(getTeamExecutedHotelRequests());
  }, [dispatch]);

  const today = new Date().toISOString().slice(0, 10);

  const hotelTrips = useMemo(() => {
    return (hotelBookings || [])
      .map((b) => {
        const checkIn =
          b.bookingSnapshot?.checkInDate ||
          b.hotelRequest?.checkInDate ||
          b.checkInDate;
        const checkOut =
          b.bookingSnapshot?.checkOutDate ||
          b.hotelRequest?.checkOutDate ||
          b.checkOutDate;

        const checkInISO = checkIn
          ? new Date(checkIn).toISOString().slice(0, 10)
          : null;

        const status = (b.executionStatus || "").toLowerCase();
        const validStatuses = ["booked", "confirmed", "voucher_generated"];
        const isValidStatus = validStatuses.includes(status);
        const isCancelled =
          b.amendment && ["requested", "success"].includes(b.amendment?.status);

        if (!checkInISO || !isValidStatus || isCancelled || checkInISO < today) {
          return null;
        }

        const traveller =
          b.travellers?.[0] || b.employee || b.userId || {};
        const employeeName =
          `${traveller.firstName || ""} ${traveller.lastName || ""}`.trim() ||
          traveller.name ||
          traveller.email ||
          "N/A";

        return {
          raw: b,
          id: b._id,
          orderId: b.orderId,
          employee: employeeName,
          employeeId: traveller.email || "N/A",
          destination:
            b.hotelRequest?.selectedHotel?.hotelName ||
            b.bookingSnapshot?.hotelName ||
            "N/A",
          departureDate: checkIn,
          returnDate: checkOut,
          status: "Booked",
        };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(a.departureDate) - new Date(b.departureDate));
  }, [hotelBookings, today]);


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

  const confirmed = filtered.filter((t) =>
    ["Confirmed", "Booked"].includes(t.status),
  ).length;
  const pending = filtered.filter(
    (t) => t.status === "Pending" || !t.status,
  ).length;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Total Upcoming Hotels"
          value={filtered.length}
          Icon={FaHotel}
          borderCls="border-[#088395]"
          iconBgCls="bg-[#088395]/10"
          iconColorCls="text-[#088395]"
        />
        <StatCard
          label="Confirmed Stays"
          value={confirmed}
          Icon={FiCheckCircle}
          borderCls="border-emerald-500"
          iconBgCls="bg-emerald-50"
          iconColorCls="text-emerald-600"
        />
        <StatCard
          label="Action Required"
          value={pending}
          Icon={FiClock}
          borderCls="border-amber-500"
          iconBgCls="bg-amber-50"
          iconColorCls="text-amber-600"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-6 lg:col-span-6">
            <LabeledField label="Search Upcoming Stays">
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Search by ID, Employee or Hotel..."
              />
            </LabeledField>
          </div>
          <div className="md:col-span-3 lg:col-span-3">
            <LabeledField label="Check-In From">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={dateCls}
              />
            </LabeledField>
          </div>
          <div className="md:col-span-3 lg:col-span-3">
            <LabeledField label="Check-In To">
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
        title="Upcoming Hotel Stays"
        subtitle={`${filtered.length} bookings found`}
        tableMinWidth="1000px"
        arrowBgClass="bg-teal-50 border-teal-200 text-[#088395] hover:bg-teal-100"
        footer={
          <div className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            Showing <span className="text-slate-900">{filtered.length}</span> entries
          </div>
        }
      >
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#088395] text-white">
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Order ID</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Employee</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Hotel Name</th>
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
                    <h3 className="text-lg font-bold text-slate-800">No Upcoming Stays</h3>
                    <p className="text-slate-500 text-sm mt-1">No confirmed hotel bookings found for your team.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((t, i) => (
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
                    {new Date(t.departureDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-4 text-[13px] font-bold text-slate-500">
                    {new Date(t.returnDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={t.status || "Booked"} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <button
                        onClick={() => navigate(`/manager/team-hotel-booking/${t.id}`)}
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

// â”€â”€ ROOT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function UpcomingTripsForManager() {
  const [activeTab, setActiveTab] = useState("flight");
  const dispatch = useDispatch();
  const loadingFlights = useSelector(
    (state) => state.manager.loadingTeamExecutedFlightRequests,
  );
  const loadingHotels = useSelector(
    (state) => state.manager.loadingTeamExecutedRequests,
  );
  const loadingActive = activeTab === "flight" ? loadingFlights : loadingHotels;

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
              <FiCalendar size={24} />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase leading-none truncate">
                Upcoming Trips
              </h1>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 font-bold uppercase tracking-widest truncate">
                Review all confirmed future business travel plans
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

