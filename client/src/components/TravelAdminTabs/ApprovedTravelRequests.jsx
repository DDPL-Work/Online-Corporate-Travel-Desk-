import React, { useState, useMemo, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FaPlane, FaHotel } from "react-icons/fa";
import TableScrollWrapper from "../common/TableScrollWrapper";
import {
  FiHome,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiX,
} from "react-icons/fi";
import {
  fetchApprovals,
  selectApprovals,
  selectApprovalLoading,
} from "../../Redux/Actions/approval.thunks";
import {
  FlightBookingModal,
  HotelBookingModal,
} from "./Modal/BookingRequestDetailsModal";
import {
  LabeledField,
  StatCard,
  dateCls,
  IdCell,
  SearchBar,
  selectCls,
  Th,
  TraceTimer,
  getSegCity,
  ExecStatusBadge,
} from "./Shared/CommonComponents";
import { formatDate } from "../../utils/formatter";

// ─────────────────────────────────────────────────────────────────────────────
// STATUS FILTERING
// Flights  → exclude: ticketed | cancel_requested | cancelled
// Hotels   → exclude: voucher_generated | cancelled
// ─────────────────────────────────────────────────────────────────────────────
const FLIGHT_EXCLUDE = new Set(["ticketed", "cancel_requested", "cancelled"]);
const HOTEL_EXCLUDE = new Set(["voucher_generated", "cancelled"]);

// ─────────────────────────────────────────────────────────────────────────────
// FLIGHT APPROVALS SECTION
// ─────────────────────────────────────────────────────────────────────────────
function FlightApprovalsSection({ rawApprovals, traceTimers, loading }) {
  const [search, setSearch] = useState("");
  const [startDate, setStart] = useState("");
  const [endDate, setEnd] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [execFilter, setExec] = useState("All");
  const [selected, setSelected] = useState(null);

  const flightRaw = useMemo(
    () =>
      rawApprovals.filter(
        (a) =>
          a.bookingType === "flight" && !FLIGHT_EXCLUDE.has(a.executionStatus),
      ),
    [rawApprovals],
  );

  const execStatuses = useMemo(
    () => [
      "All",
      ...new Set(flightRaw.map((a) => a.executionStatus).filter(Boolean)),
    ],
    [flightRaw],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return flightRaw.filter((a) => {
      const segs = a.flightRequest?.segments || [];
      const route =
        segs.length > 0
          ? `${getSegCity(segs[0], "origin")} ${getSegCity(segs[segs.length - 1], "destination")}`
          : "";
      const eOk = execFilter === "All" || a.executionStatus === execFilter;
      const fOk = !startDate || new Date(a.approvedAt) >= new Date(startDate);
      const tOk = !endDate || new Date(a.approvedAt) <= new Date(endDate);
      const qOk =
        !q ||
        a.bookingReference?.toLowerCase().includes(q) ||
        a.purposeOfTravel?.toLowerCase().includes(q) ||
        route.toLowerCase().includes(q) ||
        `${a.userId?.name?.firstName} ${a.userId?.name?.lastName}`
          .toLowerCase()
          .includes(q);
      return eOk && fOk && tOk && qOk;
    });
  }, [search, startDate, endDate, execFilter, flightRaw]);

  const totalCost = filtered.reduce(
    (s, a) => s + (a.pricingSnapshot?.totalAmount || 0),
    0,
  );
  const notStarted = filtered.filter(
    (a) => a.executionStatus === "not_started",
  ).length;
  const failed = filtered.filter((a) => a.executionStatus === "failed").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total Flights"
          value={filtered.length}
          Icon={FaPlane}
          borderCls="border-[#0A4D68]"
          iconBgCls="bg-[#0A4D68]/10"
          iconColorCls="text-[#0A4D68]"
        />
        <StatCard
          label="Not Started"
          value={notStarted}
          Icon={FiClock}
          borderCls="border-amber-500"
          iconBgCls="bg-amber-50"
          iconColorCls="text-amber-600"
        />
        <StatCard
          label="Failed"
          value={failed}
          Icon={FiX}
          borderCls="border-red-500"
          iconBgCls="bg-red-50"
          iconColorCls="text-red-600"
        />
        <StatCard
          label="Est. Cost"
          value={`₹${totalCost.toLocaleString()}`}
          Icon={FiDollarSign}
          borderCls="border-violet-500"
          iconBgCls="bg-violet-50"
          iconColorCls="text-violet-600"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <LabeledField label="Search">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Ref, name, route…"
            />
          </LabeledField>
          <LabeledField label="From Date">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStart(e.target.value)}
              className={dateCls}
            />
          </LabeledField>
          <LabeledField label="To Date">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEnd(e.target.value)}
              className={dateCls}
            />
          </LabeledField>
          <LabeledField label="Travel Date">
            <input
              type="date"
              value={travelDate}
              onChange={(e) => setTravelDate(e.target.value)}
              className={dateCls}
            />
          </LabeledField>
          <LabeledField label="Execution Status">
            <select
              value={execFilter}
              onChange={(e) => setExec(e.target.value)}
              className={selectCls}
            >
              {execStatuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </LabeledField>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm">
        <TableScrollWrapper>
          <table className="w-full border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-[#0A4D68] text-blue-100">
                <Th>Order ID</Th>
                <Th>Employee</Th>
                <Th>Route</Th>
                <Th>Airline</Th>
                <Th>Travel Date</Th>
                <Th>Amount</Th>
                <Th>Exec Status</Th>
                <Th>Fare Timer</Th>
                <Th>Action</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-16 text-center text-slate-400">
                    <div className="flex justify-center mb-3">
                      <FaPlane size={32} className="opacity-20" />
                    </div>
                    <p className="font-semibold text-sm">
                      No cancelled flight bookings found
                    </p>
                    <p className="text-xs mt-1">
                      Try adjusting the filters or search query
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((a, i) => {
                  const segs = a.flightRequest?.segments || [];
                  const route =
                    segs.length > 0
                      ? `${segs[0].origin?.airportCode || "—"} → ${segs[segs.length - 1].destination?.airportCode || "—"}`
                      : a.bookingSnapshot?.sectors?.join(", ") || "—";
                  const airline =
                    a.bookingSnapshot?.airline || segs[0]?.airlineName || "—";
                  const emp = a.userId?.name
                    ? `${a.userId.name.firstName} ${a.userId.name.lastName}`
                    : a.userId?.email || "—";
                  return (
                    <tr
                      key={a._id}
                      className={`hover:bg-sky-50/60 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}
                    >
                      <td className="px-4 py-3">
                        <IdCell id={a.orderId || a.bookingReference || "N/A"} />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[13px] text-slate-800">
                          {emp}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate max-w-40">
                          {a.purposeOfTravel}
                        </p>
                      </td>
                      <td className="px-4 py-3 font-bold text-[13px] text-slate-900">
                        {route}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-slate-500">
                        {airline}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-slate-500">
                        {formatDate(
                          a.bookingSnapshot?.travelDate ||
                            segs[0]?.departureDateTime,
                        )}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">
                        ₹
                        {(a.pricingSnapshot?.totalAmount || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <ExecStatusBadge status={a.executionStatus} />
                      </td>
                      <td className="px-4 py-3">
                        {a.flightRequest?.traceId ? (
                          <TraceTimer timer={traceTimers[a._id]} />
                        ) : (
                          <span className="text-[11px] text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelected(a)}
                          className="text-[12px] px-3 py-1.5 bg-[#0A4D68] text-white rounded-lg hover:bg-[#093f54] transition-colors font-semibold"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </TableScrollWrapper>
        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 flex justify-between text-xs text-slate-400">
          <span>
            Showing{" "}
            <strong className="text-slate-600">{filtered.length}</strong> of{" "}
            <strong className="text-slate-600">{flightRaw.length}</strong>{" "}
            flights
          </span>
          <span className="text-red-400 text-[11px]">
            ✕ ticketed &amp; cancelled excluded
          </span>
        </div>
      </div>

      {selected && (
        <FlightBookingModal
          booking={selected}
          traceTimers={traceTimers}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HOTEL APPROVALS SECTION
// ─────────────────────────────────────────────────────────────────────────────
function HotelApprovalsSection({ rawApprovals, loading }) {
  const [search, setSearch] = useState("");
  const [startDate, setStart] = useState("");
  const [endDate, setEnd] = useState("");
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [execFilter, setExec] = useState("All");
  const [selected, setSelected] = useState(null);

  const hotelRaw = useMemo(
    () =>
      rawApprovals.filter(
        (a) =>
          a.bookingType === "hotel" && !HOTEL_EXCLUDE.has(a.executionStatus),
      ),
    [rawApprovals],
  );

  const execStatuses = useMemo(
    () => [
      "All",
      ...new Set(hotelRaw.map((a) => a.executionStatus).filter(Boolean)),
    ],
    [hotelRaw],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return hotelRaw.filter((a) => {
      const hotelName = a.hotelRequest?.selectedHotel?.hotelName || "";
      const eOk = execFilter === "All" || a.executionStatus === execFilter;
      const fOk = !startDate || new Date(a.approvedAt) >= new Date(startDate);
      const tOk = !endDate || new Date(a.approvedAt) <= new Date(endDate);
      const qOk =
        !q ||
        a.bookingReference?.toLowerCase().includes(q) ||
        hotelName.toLowerCase().includes(q) ||
        a.purposeOfTravel?.toLowerCase().includes(q) ||
        `${a.userId?.name?.firstName} ${a.userId?.name?.lastName}`
          .toLowerCase()
          .includes(q);
      return eOk && fOk && tOk && qOk;
    });
  }, [search, startDate, endDate, execFilter, hotelRaw]);

  const totalCost = filtered.reduce(
    (s, a) => s + (a.pricingSnapshot?.totalAmount || 0),
    0,
  );
  const notStarted = filtered.filter(
    (a) => a.executionStatus === "not_started",
  ).length;
  const failed = filtered.filter((a) => a.executionStatus === "failed").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total Hotels"
          value={filtered.length}
          Icon={FiHome}
          borderCls="border-[#088395]"
          iconBgCls="bg-[#088395]/10"
          iconColorCls="text-[#088395]"
        />
        <StatCard
          label="Not Started"
          value={notStarted}
          Icon={FiClock}
          borderCls="border-amber-500"
          iconBgCls="bg-amber-50"
          iconColorCls="text-amber-600"
        />
        <StatCard
          label="Failed"
          value={failed}
          Icon={FiX}
          borderCls="border-red-500"
          iconBgCls="bg-red-50"
          iconColorCls="text-red-600"
        />
        <StatCard
          label="Est. Cost"
          value={`₹${totalCost.toLocaleString()}`}
          Icon={FiDollarSign}
          borderCls="border-violet-500"
          iconBgCls="bg-violet-50"
          iconColorCls="text-violet-600"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <LabeledField label="Search">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Hotel, ref, name…"
            />
          </LabeledField>
          <LabeledField label="From Date">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStart(e.target.value)}
              className={dateCls}
            />
          </LabeledField>
          <LabeledField label="To Date">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEnd(e.target.value)}
              className={dateCls}
            />
          </LabeledField>
          <LabeledField label="CheckIn Date">
            <input
              type="date"
              value={checkInDate}
              onChange={(e) => setCheckInDate(e.target.value)}
              className={dateCls}
            />
          </LabeledField>
          <LabeledField label="CheckOut Date">
            <input
              type="date"
              value={checkOutDate}
              onChange={(e) => setCheckOutDate(e.target.value)}
              className={dateCls}
            />
          </LabeledField>
          <LabeledField label="Execution Status">
            <select
              value={execFilter}
              onChange={(e) => setExec(e.target.value)}
              className={selectCls}
            >
              {execStatuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </LabeledField>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm">
        <TableScrollWrapper>
          <table className="w-full border-collapse min-w-[950px]">
            <thead>
              <tr className="bg-[#088395] text-teal-100">
                <Th>Order ID</Th>
                <Th>Employee</Th>
                <Th>Hotel</Th>
                <Th>Check-In</Th>
                <Th>Check-Out</Th>
                {/* <Th>Nights</Th>
                <Th>Amount</Th> */}
                <Th>Exec Status</Th>
                <Th>Action</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-16 text-center text-slate-400">
                    <div className="flex justify-center mb-3">
                      <FaPlane size={32} className="opacity-20" />
                    </div>
                    <p className="font-semibold text-sm">
                      No cancelled flight bookings found
                    </p>
                    <p className="text-xs mt-1">
                      Try adjusting the filters or search query
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((a, i) => {
                  const hotel = a.hotelRequest?.selectedHotel || {};
                  const snap = a.bookingSnapshot || {};
                  const emp = a.userId?.name
                    ? `${a.userId.name.firstName} ${a.userId.name.lastName}`
                    : a.userId?.email || "—";
                  const nights =
                    a.hotelRequest?.selectedRoom?.rawRoomData?.Price?.nights ||
                    snap.nights ||
                    "—";
                  return (
                    <tr
                      key={a._id}
                      className={`hover:bg-teal-50/60 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}
                    >
                      <td className="px-4 py-3">
                        <IdCell id={a.orderId || a.bookingReference || "N/A"} />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[13px] text-slate-800">
                          {emp}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate max-w-40">
                          {a.purposeOfTravel}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[13px] text-slate-800">
                          {hotel.hotelName || "—"}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate max-w-[200px]">
                          {hotel.address?.split(",")[0]}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-slate-500">
                        {formatDate(a.hotelRequest?.checkInDate)}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-slate-500">
                        {formatDate(a.hotelRequest?.checkOutDate)}
                      </td>
                      {/* <td className="px-4 py-3 font-bold text-center text-slate-700">
                        {nights}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">
                        ₹
                        {(a.pricingSnapshot?.totalAmount || 0).toLocaleString()}
                      </td> */}
                      <td className="px-4 py-3">
                        <ExecStatusBadge status={a.executionStatus} />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelected(a)}
                          className="text-[12px] px-3 py-1.5 bg-[#088395] text-white rounded-lg hover:bg-[#066f7e] transition-colors font-semibold"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </TableScrollWrapper>
        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 flex justify-between text-xs text-slate-400">
          <span>
            Showing{" "}
            <strong className="text-slate-600">{filtered.length}</strong> of{" "}
            <strong className="text-slate-600">{hotelRaw.length}</strong> hotels
          </span>
          <span className="text-red-400 text-[11px]">
            ✕ voucher-generated &amp; cancelled excluded
          </span>
        </div>
      </div>

      {selected && (
        <HotelBookingModal
          booking={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────────────────────
export default function ApprovedTravelRequests() {
  const [activeTab, setActiveTab] = useState("flight");
  const [traceTimers, setTimers] = useState({});

  const dispatch = useDispatch();
  const approvals = useSelector(selectApprovals);
  const loading = useSelector(selectApprovalLoading);

  useEffect(() => {
    dispatch(fetchApprovals({ status: "approved" }));
  }, [dispatch]);

  useEffect(() => {
    const interval = setInterval(() => {
      const updated = {};
      approvals.forEach((a) => {
        const exp = a.flightRequest?.fareExpiry;
        if (!exp) return;
        const diff = new Date(exp.$date || exp) - new Date();
        if (diff <= 0) {
          updated[a._id] = "expired";
          return;
        }
        const h = Math.floor(diff / 3600000),
          m = Math.floor((diff % 3600000) / 60000),
          s = Math.floor((diff % 60000) / 1000);
        updated[a._id] = `${h}h ${m}m ${s}s`;
      });
      setTimers(updated);
    }, 1000);
    return () => clearInterval(interval);
  }, [approvals]);

  const flightCount = useMemo(
    () =>
      approvals.filter(
        (a) =>
          a.bookingType === "flight" && !FLIGHT_EXCLUDE.has(a.executionStatus),
      ).length,
    [approvals],
  );
  const hotelCount = useMemo(
    () =>
      approvals.filter(
        (a) =>
          a.bookingType === "hotel" && !HOTEL_EXCLUDE.has(a.executionStatus),
      ).length,
    [approvals],
  );

  const tabs = [
    {
      id: "flight",
      label: "Flight Approvals",
      Icon: FaPlane,
      count: flightCount,
      activeText: "text-[#0A4D68]",
      activeBorder: "border-b-[#0A4D68]",
    },
    {
      id: "hotel",
      label: "Hotel Approvals",
      Icon: FiHome,
      count: hotelCount,
      activeText: "text-[#088395]",
      activeBorder: "border-b-[#088395]",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#0A4D68] flex items-center justify-center shrink-0">
            <FiCheckCircle size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Approved Travel Requests
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Approved bookings pending execution &nbsp;·&nbsp;
              <span className="text-red-500">
                Ticketed flights &amp; voucher-generated hotels are excluded
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-end gap-0 mb-5 border-b-2 border-slate-200">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 text-[13px] font-bold transition-all border-b-2 -mb-0.5 rounded-t-lg ${active ? `bg-white ${tab.activeText} ${tab.activeBorder} shadow-sm` : "text-slate-400 border-transparent hover:text-slate-600 hover:bg-white/60"}`}
              >
                <tab.Icon size={14} />
                {tab.label}
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${active ? "bg-slate-100 text-slate-600" : "bg-slate-200 text-slate-400"}`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {activeTab === "flight" ? (
          <FlightApprovalsSection
            rawApprovals={approvals}
            traceTimers={traceTimers}
            loading={loading}
          />
        ) : (
          <HotelApprovalsSection rawApprovals={approvals} loading={loading} />
        )}
      </div>
    </div>
  );
}
