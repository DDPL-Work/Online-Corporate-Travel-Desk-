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
} from "react-icons/fi";
import { pastTripsData } from "../../data/dummyData";
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
          employeeId: b.userId?._id || "N/A",
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
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-2 gap-3">
        <StatCard
          label="Total Flights"
          value={filtered.length}
          Icon={FaPlane}
          borderCls="border-[#0A4D68]"
          iconBgCls="bg-[#0A4D68]/10"
          iconColorCls="text-[#0A4D68]"
        />
        <StatCard
          label="Completed"
          value={filtered.length}
          Icon={FiCheckCircle}
          borderCls="border-emerald-500"
          iconBgCls="bg-emerald-50"
          iconColorCls="text-emerald-600"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <LabeledField
            label={
              <>
                <FiSearch size={10} /> Search Employee / Destination
              </>
            }
          >
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Name, destination, trip ID…"
            />
          </LabeledField>
          <LabeledField
            label={
              <>
                <FiCalendar size={10} /> From Date
              </>
            }
          >
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={dateCls}
            />
          </LabeledField>
          <LabeledField
            label={
              <>
                <FiCalendar size={10} /> To Date
              </>
            }
          >
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={dateCls}
            />
          </LabeledField>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[920px]">
            <thead>
              <tr className="bg-[#0A4D68] text-[#bfdbfe]">
                <Th>Order ID</Th>
                <Th>Employee</Th>
                <Th>Destination</Th>
                <Th>Departure Date</Th>
                <Th>Airline</Th>
                <Th>Status</Th>
                <Th>Action</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-16 text-center text-slate-400">
                    <div className="flex justify-center mb-3">
                      <FaPlane size={32} className="opacity-20" />
                    </div>
                    <p className="font-semibold text-sm">
                      No past flight trips found
                    </p>
                    <p className="text-xs mt-1">
                      Try adjusting the filters or search query
                    </p>
                  </td>
                </tr>
              ) : (
                paginated.map((t, i) => (
                  <tr
                    key={t.id}
                    className={`transition-colors hover:bg-sky-50 ${
                      i % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <IdCell id={t.orderId || "N/A"} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                          <span className="font-semibold text-[13px] text-slate-800">
                            {t.employee}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {t.employeeId}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-[13px] text-slate-700 font-medium">
                      {t.destination}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-slate-500">
                      {t.departureDate
                        ? new Date(t.departureDate).toLocaleDateString(
                            "en-IN",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            },
                          )
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-slate-500">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800 text-[13px]">
                          {t.airlineName || "N/A"}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {t.flightNumber ? `Flight ${t.flightNumber}` : "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={t.status || "Completed"} />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() =>
                          navigate(`/manager/team-booking/${t.id}`, {
                            state: { isPastTrip: true },
                          })
                        }
                        className="px-3 py-1 text-xs font-semibold bg-[#0A4D68] text-white rounded-md hover:bg-[#083a50] flex items-center gap-1"
                      >
                        <FiEye size={12} /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 flex justify-between text-xs text-slate-400">
          <span>
            Showing{" "}
            <strong className="text-slate-600">{paginated.length}</strong> of{" "}
            <strong className="text-slate-600">{filtered.length}</strong>{" "}
            flight trips (filtered)
          </span>
        </div>
        <Pagination
          currentPage={currentPage}
          totalItems={filtered.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>
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
        employeeId: b.userId?._id || "N/A",
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
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-2 gap-3">
        <StatCard
          label="Total Hotels"
          value={filtered.length}
          Icon={FaHotel}
          borderCls="border-[#088395]"
          iconBgCls="bg-[#088395]/10"
          iconColorCls="text-[#088395]"
        />
        <StatCard
          label="Completed"
          value={filtered.length}
          Icon={FiCheckCircle}
          borderCls="border-emerald-500"
          iconBgCls="bg-emerald-50"
          iconColorCls="text-emerald-600"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <LabeledField
            label={
              <>
                <FiSearch size={10} /> Search Employee / Destination
              </>
            }
          >
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Name, destination, trip ID…"
            />
          </LabeledField>
          <LabeledField
            label={
              <>
                <FiCalendar size={10} /> From Date
              </>
            }
          >
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={dateCls}
            />
          </LabeledField>
          <LabeledField
            label={
              <>
                <FiCalendar size={10} /> To Date
              </>
            }
          >
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={dateCls}
            />
          </LabeledField>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[920px]">
            <thead>
              <tr className="bg-[#088395] text-[#ccfbf1]">
                <Th>Order ID</Th>
                <Th>Employee</Th>
                <Th>Destination</Th>
                <Th>Check-in Date</Th>
                <Th>Check-out Date</Th>
                <Th>Status</Th>
                <Th>Action</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-16 text-center text-slate-400">
                    <div className="flex justify-center mb-3">
                      <FaHotel size={32} className="opacity-20" />
                    </div>
                    <p className="font-semibold text-sm">
                      No past hotel trips found
                    </p>
                    <p className="text-xs mt-1">
                      Try adjusting the filters or search query
                    </p>
                  </td>
                </tr>
              ) : (
                paginated.map((t, i) => (
                  <tr
                    key={t.id}
                    className={`transition-colors hover:bg-teal-50 ${
                      i % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <IdCell id={t.orderId || "N/A"} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        
                        <span className="font-semibold text-[13px] text-slate-800">
                          {t.employee}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-[13px] text-slate-700 font-medium">
                      {t.destination}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-slate-500">
                      {t.departureDate
                        ? new Date(t.departureDate).toLocaleDateString(
                            "en-IN",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            },
                          )
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-slate-500">
                      {t.returnDate
                        ? new Date(t.returnDate).toLocaleDateString(
                            "en-IN",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            },
                          )
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={t.status || "Completed"} />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() =>
                          navigate(`/manager/team-hotel-booking/${t.id}`)
                        }
                        className="px-3 py-1 text-xs font-semibold bg-[#088395] text-white rounded-md hover:bg-[#066b78] flex items-center gap-1"
                      >
                        <FiEye size={12} /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 flex justify-between text-xs text-slate-400">
          <span>
            Showing{" "}
            <strong className="text-slate-600">{paginated.length}</strong> of{" "}
            <strong className="text-slate-600">{filtered.length}</strong>{" "}
            hotel trips (filtered)
          </span>
        </div>
        <Pagination
          currentPage={currentPage}
          totalItems={filtered.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>
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
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-[#0A4D68] to-[#088395] flex items-center justify-center shrink-0">
            <FiList size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Past Trips
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              View all completed business travel records
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loadingActive}
            className="ml-auto inline-f
           lex items-center gap-2 px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-lg shadow-sm text-slate-600 hover:text-slate-800 hover:border-slate-300 disabled:opacity-50"
          >
            <FiRefreshCw
              size={14}
              className={loadingActive ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex items-end gap-0 mb-5 border-b-2 border-slate-200">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-5 py-2.5 text-[13px] font-bold transition-all border-b-2 -mb-0.5 rounded-t-lg
                  ${
                    active
                      ? `bg-white ${tab.activeText} ${tab.activeBorder} shadow-sm`
                      : "text-slate-400 border-transparent hover:text-slate-600 hover:bg-white/60"
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
