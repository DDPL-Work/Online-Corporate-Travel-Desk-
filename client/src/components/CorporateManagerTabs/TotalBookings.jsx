import React, { useState, useMemo, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { FaPlane, FaHotel } from "react-icons/fa";
import ResponsiveDataTable from "./Shared/ResponsiveDataTable";
import {
  FiSearch,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiDollarSign,
  FiCalendar,
  FiFilter,
  FiList,
  FiRefreshCw,
  FiEye,
} from "react-icons/fi";
import {
  getTeamExecutedHotelRequests,
  getTeamExecutedFlightRequests,
} from "../../Redux/Actions/manager.thunk";
// import {
//   FlightBookingModal,
//   HotelBookingModal,
// } from "./Modal/BookingRequestDetailsModal";
import { Pagination } from "./Shared/Pagination";
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

const mapStatus = (status) => {
  if (status === "confirmed") return "Confirmed";
  if (status === "cancel_requested") return "Cancelled";
  return "Pending";
};

// ── FLIGHT SECTION ────────────────────────────────────────────────────────────
function FlightSection() {
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatus] = useState("All");
  const [corpFilter, setCorp] = useState("All");
  const [travelDate, setTravelDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const dispatch = useDispatch();

  const { teamExecutedFlightRequests: flightBookings } = useSelector(
    (state) => state.manager,
  );
  const navigate = useNavigate();

  useEffect(() => {
    dispatch(getTeamExecutedFlightRequests());
  }, [dispatch]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, startDate, endDate, statusFilter, travelDate]);

  const corps = ["All"];

  const formatFlight = (b) => {
    const traveller = b.travellers?.length
      ? `${b.travellers[0].title || ""} ${b.travellers[0].firstName || ""} ${b.travellers[0].lastName || ""}`.trim()
      : "N/A";

    const employeeId = b.userId?.email || "N/A";

    const executionStatus = (b.executionStatus || "").toLowerCase();
    const status =
      executionStatus === "ticketed" || executionStatus === "confirmed"
        ? "Confirmed"
        : ["cancelled", "cancel_requested"].includes(executionStatus)
          ? "Cancelled"
          : executionStatus === "failed"
            ? "Failed"
            : "Pending";

    const pnr =
      b.bookingResult?.pnr ||
      b.bookingResult?.providerResponse?.raw?.Response?.Response?.PNR ||
      "-";

    const providerBookingId =
      b.bookingResult?.providerResponse?.raw?.Response?.Response?.BookingId ||
      "-";

    const amount =
      b.pricingSnapshot?.totalAmount ?? b.bookingSnapshot?.amount ?? 0;

    return {
      ...b,
      travellerName: traveller,
      employeeId,
      status,
      pnr,
      providerBookingId,
      amount,
      bookedDate: b.createdAt,
    };
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    return flightBookings
      .filter((b) => {
        const exec = (b.executionStatus || "").toLowerCase();
        return (
          exec !== "not_started" &&
          exec !== "failed" &&
          b.requestStatus !== "discarded"
        );
      })
      .map(formatFlight)
      .filter((b) => {
        const searchOk =
          !q ||
          b.travellerName?.toLowerCase().includes(q) ||
          (b.orderId || "").toLowerCase().includes(q) ||
          b.pnr?.toLowerCase().includes(q) ||
          (b.providerBookingId || "").toString().toLowerCase().includes(q);

      const booked = b.bookedDate
        ? new Date(b.bookedDate).toISOString().slice(0, 10)
        : "";

      const bookedDateOk =
        (!startDate || booked >= startDate) && (!endDate || booked <= endDate);

      const statusOk = statusFilter === "All" || b.status === statusFilter;

      const travelDateOk =
        !travelDate ||
        (() => {
          const snapshotDate = b.bookingSnapshot?.travelDate;
          if (snapshotDate) {
            if (
              new Date(snapshotDate).toISOString().slice(0, 10) === travelDate
            ) {
              return true;
            }
          }

          return (b.flightRequest?.segments ?? []).some((seg) => {
            const raw = seg.departureDateTime;
            if (!raw) return false;

            return new Date(raw).toISOString().slice(0, 10) === travelDate;
          });
        })();

      if (b.status === "Failed") return false;

      return searchOk && bookedDateOk && statusOk && travelDateOk;
    });
  }, [search, startDate, endDate, statusFilter, travelDate, flightBookings]);

  const paginated = useMemo(
    () =>
      filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage],
  );

  // const filtered = useMemo(() => {
  //   const q = search.toLowerCase();

  //   return flightBookings
  //     .map(formatFlight) // 🔥 IMPORTANT
  //     .filter((b) => {
  //       const searchOk =
  //         !q ||
  //         b.travellerName?.toLowerCase().includes(q) ||
  //         b.pnr?.toLowerCase().includes(q) ||
  //         (b.providerBookingId || "").toString().toLowerCase().includes(q);

  //       return searchOk;
  //     });
  // }, [search, flightBookings]);

  const total = filtered.reduce((s, b) => s + (b.amount || 0), 0);
  const confirmed = filtered.filter((b) => b.status === "Confirmed").length;
  const pending = filtered.filter((b) => b.status === "Pending").length;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Total Flight Bookings"
          value={filtered.length}
          Icon={FaPlane}
          borderCls="border-[#0A4D68]"
          iconBgCls="bg-[#0A4D68]/10"
          iconColorCls="text-[#0A4D68]"
        />
        <StatCard
          label="Confirmed Tickets"
          value={confirmed}
          Icon={FiCheckCircle}
          borderCls="border-emerald-500"
          iconBgCls="bg-emerald-50"
          iconColorCls="text-emerald-600"
        />
        <StatCard
          label="Processing / Pending"
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
          <div className="md:col-span-12 lg:col-span-4">
            <LabeledField label="Search Bookings">
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Search by Traveller, PNR, ID..."
              />
            </LabeledField>
          </div>
          <div className="md:col-span-4 lg:col-span-2">
            <LabeledField label="Booked From">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={dateCls}
              />
            </LabeledField>
          </div>
          <div className="md:col-span-4 lg:col-span-2">
            <LabeledField label="Booked To">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={dateCls}
              />
            </LabeledField>
          </div>
          <div className="md:col-span-4 lg:col-span-2">
            <LabeledField label="Travel Date">
              <input
                type="date"
                value={travelDate}
                onChange={(e) => setTravelDate(e.target.value)}
                className={dateCls}
              />
            </LabeledField>
          </div>
          <div className="md:col-span-4 lg:col-span-2">
            <LabeledField label="Booking Status">
              <select
                value={statusFilter}
                onChange={(e) => setStatus(e.target.value)}
                className={selectCls}
              >
                {["All", "Confirmed", "Pending", "Cancelled"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </LabeledField>
          </div>
        </div>
      </div>

      {/* Table */}
      <ResponsiveDataTable
        title="Complete Flight Inventory"
        subtitle={`${filtered.length} total flight records`}
        tableMinWidth="1100px"
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
          <div className="px-6 py-3 flex justify-between items-center bg-slate-50 border-t border-slate-100">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Showing <span className="text-slate-900">{paginated.length}</span> of <span className="text-slate-900">{filtered.length}</span> entries
            </div>
            <div className="text-[12px] font-black text-indigo-600 uppercase tracking-widest">
              Total Volume: ₹{total.toLocaleString()}
            </div>
          </div>
        }
      >
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#0A4D68] text-white">
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Order ID</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Traveller Name</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Booked Date</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Amount</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-20 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <FaPlane className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">No Bookings Found</h3>
                    <p className="text-slate-500 text-sm mt-1">No flight records match your search criteria.</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((b, i) => (
                <tr
                  key={b._id}
                  className="group hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">
                      {b.orderId || "N/A"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-800 text-[13px]">{b.travellerName}</span>
                      <span className="text-[11px] text-slate-400 font-bold truncate max-w-[150px]">{b.employeeId}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[13px] font-bold text-slate-500">
                    {new Date(b.bookedDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-black text-slate-900">₹{b.amount.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <button
                        onClick={() => navigate(`/manager/team-booking/${b._id}`)}
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
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatus] = useState("All");
  const [corpFilter, setCorp] = useState("All");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const dispatch = useDispatch();

  const hotelBookings = useSelector(
    (state) => state.manager.teamExecutedHotelRequests,
  );

  const loading = useSelector(
    (state) => state.manager.loadingTeamExecutedRequests,
  );
  const navigate = useNavigate();

  console.log(hotelBookings);

  useEffect(() => {
    dispatch(getTeamExecutedHotelRequests());
  }, [dispatch]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, startDate, endDate, statusFilter, checkIn, checkOut]);

  const corps = ["All"];

  const formatHotel = (b) => {
    const guest = b.travellers?.length
      ? `${b.travellers[0].title || ""} ${b.travellers[0].firstName || ""} ${b.travellers[0].lastName || ""}`.trim()
      : "N/A";

    const employeeId = b.userId?.email || "N/A";

    const executionStatus = (b.executionStatus || "").toLowerCase();
    const amendmentStatus = (b.amendment?.status || "").toLowerCase();

    let status = "Pending";
    if (["requested", "in_progress"].includes(amendmentStatus)) {
      status = "Cancelled";
    } else if (
      executionStatus === "voucher_generated" ||
      executionStatus === "confirmed"
    ) {
      status = "Confirmed";
    } else if (["cancelled", "cancel_requested"].includes(executionStatus)) {
      status = "Cancelled";
    } else if (executionStatus === "failed") {
      status = "Failed";
    }

    const bookResult = b.bookingResult?.providerResponse?.BookResult || {};

    const invoiceNo = bookResult.InvoiceNumber || "-";
    const providerBookingId = bookResult.BookingId || "-";

    const amount =
      b.pricingSnapshot?.totalAmount ?? b.bookingSnapshot?.amount ?? 0;

    return {
      ...b,
      guestName: guest,
      employeeId,
      status,
      invoiceNo,
      providerBookingId,
      amount,
      bookedDate: b.createdAt,
    };
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    return hotelBookings.map(formatHotel).filter((b) => {
      // Base visibility rules - Allow showing cancelled/failed if requested or All
      const isConfirmed = b.status === "Confirmed";
      const isCancelled = b.status === "Cancelled";
      const isFailed = b.status === "Failed";
      const isPending = b.status === "Pending";
      const amendmentRequested = b.amendment?.status === "requested";

      // If status filter is "All", we might want to show everything. 
      // But looking at the existing logic, it seems it was trying to only show "Confirmed" by default?
      // Given the user's request, we should probably allow showing what the statusFilter says.
      
      if (statusFilter !== "All" && b.status !== statusFilter) {
        return false;
      }
      
      // If it's "All", maybe we should still hide some things? 
      // Actually, the user said "total bookings", so it should probably show everything that is NOT discarded.
      const rawExecutionStatus = (b.executionStatus || "").toLowerCase();
      if (
        b.requestStatus === "discarded" ||
        rawExecutionStatus === "failed" ||
        rawExecutionStatus === "not_started"
      )
        return false;

      // Search
      const searchOk =
        !q ||
        b.guestName?.toLowerCase().includes(q) ||
        (b.orderId || "").toLowerCase().includes(q) ||
        b.invoiceNo?.toLowerCase().includes(q) ||
        (b.providerBookingId || "").toString().toLowerCase().includes(q);

      // Booked date range
      const booked = b.bookedDate
        ? new Date(b.bookedDate).toISOString().slice(0, 10)
        : "";
      const bookedDateOk =
        (!startDate || booked >= startDate) && (!endDate || booked <= endDate);

      // Status
      const statusOk = statusFilter === "All" || b.status === statusFilter;

      // Check-in / Check-out
      // Adjust field paths below to match your actual booking object shape
      const rawCheckIn =
        b.hotelDetails?.checkInDate ?? b.checkIn ?? b.checkInDate;
      const rawCheckOut =
        b.hotelDetails?.checkOutDate ?? b.checkOut ?? b.checkOutDate;

      const ciStr = rawCheckIn
        ? new Date(rawCheckIn).toISOString().slice(0, 10)
        : "";
      const coStr = rawCheckOut
        ? new Date(rawCheckOut).toISOString().slice(0, 10)
        : "";

      const checkInOk = !checkIn || !ciStr || ciStr >= checkIn;
      const checkOutOk = !checkOut || !coStr || coStr <= checkOut;

      return searchOk && bookedDateOk && statusOk && checkInOk && checkOutOk;
    });
  }, [
    search,
    startDate,
    endDate,
    statusFilter,
    checkIn,
    checkOut,
    hotelBookings,
  ]);

  const paginated = useMemo(
    () =>
      filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage],
  );

  const total = filtered.reduce((s, b) => s + (b.amount || 0), 0);
  const confirmed = filtered.filter((b) => b.status === "Confirmed").length;
  const pending = filtered.filter((b) => b.status === "Pending").length;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Total Hotel Bookings"
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
          label="Processing / Pending"
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
          <div className="md:col-span-12 lg:col-span-4">
            <LabeledField label="Search Bookings">
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Search by Guest, Invoice, ID..."
              />
            </LabeledField>
          </div>
          <div className="md:col-span-4 lg:col-span-2">
            <LabeledField label="Booked From">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={dateCls}
              />
            </LabeledField>
          </div>
          <div className="md:col-span-4 lg:col-span-2">
            <LabeledField label="Booked To">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={dateCls}
              />
            </LabeledField>
          </div>
          <div className="md:col-span-4 lg:col-span-2">
            <LabeledField label="Check-In">
              <input
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className={dateCls}
              />
            </LabeledField>
          </div>
          <div className="md:col-span-4 lg:col-span-2">
            <LabeledField label="Check-Out">
              <input
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className={dateCls}
              />
            </LabeledField>
          </div>
          <div className="md:col-span-4 lg:col-span-2">
            <LabeledField label="Booking Status">
              <select
                value={statusFilter}
                onChange={(e) => setStatus(e.target.value)}
                className={selectCls}
              >
                {["All", "Confirmed", "Pending", "Cancelled"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </LabeledField>
          </div>
        </div>
      </div>

      {/* Table */}
      <ResponsiveDataTable
        title="Complete Hotel Inventory"
        subtitle={`${filtered.length} total hotel records`}
        tableMinWidth="1100px"
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
          <div className="px-6 py-3 flex justify-between items-center bg-slate-50 border-t border-slate-100">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Showing <span className="text-slate-900">{paginated.length}</span> of <span className="text-slate-900">{filtered.length}</span> entries
            </div>
            <div className="text-[12px] font-black text-teal-600 uppercase tracking-widest">
              Total Volume: ₹{total.toLocaleString()}
            </div>
          </div>
        }
      >
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#088395] text-white">
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Order ID</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Guest Name</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Booked Date</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Amount</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-20 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <FaHotel className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">No Bookings Found</h3>
                    <p className="text-slate-500 text-sm mt-1">No hotel records match your search criteria.</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((b, i) => (
                <tr
                  key={b._id}
                  className="group hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded-md border border-teal-100">
                      {b.orderId || "N/A"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-800 text-[13px]">{b.guestName}</span>
                      <span className="text-[11px] text-slate-400 font-bold truncate max-w-[150px]">{b.employeeId}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[13px] font-bold text-slate-500">
                    {new Date(b.bookedDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-black text-slate-900">₹{b.amount.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <button
                        onClick={() => navigate(`/manager/team-hotel-booking/${b._id}`)}
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
export default function BookingsDashboardForManager() {
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
      label: "Flight Bookings",
      Icon: FaPlane,
      activeText: "text-[#0A4D68]",
      activeBorder: "border-b-[#0A4D68]",
    },
    {
      id: "hotel",
      label: "Hotel Bookings",
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
                Booking Inventory
              </h1>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 font-bold uppercase tracking-widest truncate">
                Comprehensive overview of your team's travel history
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
