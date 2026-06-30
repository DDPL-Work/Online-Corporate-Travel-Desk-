import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useDispatch, useSelector } from "react-redux";
import { FaPlane, FaHotel, FaRupeeSign } from "react-icons/fa";
import {
  FiSearch,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiCalendar,
  FiFilter,
  FiList,
  FiRefreshCw,
  FiX,
  FiUser,
  FiArrowRight,
} from "react-icons/fi";
import {
  getAllFlightBookingsAdmin,
  getAllHotelBookingsAdmin,
} from "../../Redux/Actions/travelAdmin.thunks";
import { Pagination } from "./Shared/Pagination";
import {
  LabeledField,
  StatCard,
  StatusBadge,
  dateCls,
  IdCell,
  SearchBar,
  Th,
  CustomDropdown,
} from "./Shared/CommonComponents";
import ResponsiveDataTable from "./Shared/ResponsiveDataTable";
import { C } from "../Shared/color";
import { airlineLogo } from "../../utils/formatter";
import useExcelExporter from "../../hooks/export/useExcelExporter";
import { totalFlightsExportTemplate, totalHotelsExportTemplate } from "../../templates/exportTemplates/clientExportTemplates";

const RouteCell = ({ routes, airline }) => {
  if (!routes || routes.length === 0)
    return <span className="text-slate-400">No Route</span>;

  const airlineCode = (airline?.airlineCode || "AI").toUpperCase();
  const airlineName = airline?.airlineName || "Airline";
  const logoUrl = airlineLogo(airlineCode);

  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-white border border-slate-100 flex items-center justify-center p-1.5 shadow-sm overflow-hidden">
        <img src={logoUrl}
          alt={airlineName}
          className="w-full h-full object-contain"
          loading="eager" onError={(e) => {
            e.target.onerror = null;
            e.target.src =
              "https://cdn-icons-png.flaticon.com/512/3114/3114883.png";
          }}
        />
      </div>
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-black text-slate-800 uppercase tracking-tight">
            {routes[0].fromCode}
          </span>
          <FiArrowRight size={12} className="text-slate-400" />
          <span className="text-[13px] font-black text-slate-800 uppercase tracking-tight">
            {routes.length > 1
              ? routes[0].toCode
              : routes[routes.length - 1].toCode}
          </span>
          {routes.length > 1 && (
            <span className="bg-amber-50 text-amber-600 text-[8px] font-black px-1.5 py-0.5 rounded border border-amber-100 ml-1">
              RT
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
          <span className="capitalize">{routes[0].fromCity || "Origin"}</span>
          <span>→</span>
          <span className="capitalize">
            {routes.length > 1
              ? routes[0].toCity || "Turnaround"
              : routes[routes.length - 1].toCity || "Dest"}
          </span>
        </div>
      </div>
    </div>
  );
};

function FlightSection() {
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatus] = useState("All");
  const [empFilter, setEmp] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { flightBookings, loading } = useSelector(
    (state) => state.adminBooking,
  );
  const { exportExcel, isExporting } = useExcelExporter();

  useEffect(() => {
    dispatch(getAllFlightBookingsAdmin());
  }, [dispatch]);

  const formattedBookings = useMemo(
    () =>
      (flightBookings || []).map((b) => {
        const traveller = b.userId?.name
          ? `${b.userId.name.firstName} ${b.userId.name.lastName}`.trim()
          : "Staff Member";
        const status =
          b.executionStatus === "ticketed"
            ? "Confirmed"
            : b.executionStatus === "cancel_requested"
              ? "Cancelled"
              : "Pending";
        const pnr = b.bookingResult?.pnr || "-";
        const amount =
          b.pricingSnapshot?.totalAmount ?? b.bookingSnapshot?.amount ?? 0;
        // console.log(flightBookings);

        // Route logic
        const segments = b.flightRequest?.segments || [];
        const onwardSegments = segments.filter(
          (s) => s.journeyType === "onward",
        );
        const returnSegments = segments.filter(
          (s) => s.journeyType === "return",
        );

        const buildLeg = (segs) => {
          if (!segs.length) return null;
          const first = segs[0];
          const last = segs[segs.length - 1];
          return {
            fromCode: (first?.origin?.code || first?.origin?.airportCode) || "N/A",
            toCode: (last?.destination?.code || last?.destination?.airportCode) || "N/A",
            fromCity: first?.origin?.city || "Unknown",
            toCity: last?.destination?.city || "Unknown",
          };
        };

        const routes = [];
        if (onwardSegments.length > 0 || returnSegments.length > 0) {
          const onwardLeg = buildLeg(onwardSegments);
          const returnLeg = buildLeg(returnSegments);
          if (onwardLeg) routes.push(onwardLeg);
          if (returnLeg) routes.push(returnLeg);
        } else if (segments.length > 0) {
          const leg = buildLeg(segments);
          if (leg) routes.push(leg);
        }

        const airline = segments[0]
          ? {
              airlineCode:
                segments[0].airlineCode || segments[0].airline?.airlineCode,
              airlineName:
                segments[0].airlineName || segments[0].airline?.airlineName,
            }
          : null;

        return {
          ...b,
          travellerName: traveller,
          employeeId: b.userId?.email || "—",
          status,
          pnr,
          amount,
          bookedDate: b.createdAt,
          routes,
          airline,
        };
      }),
    [flightBookings],
  );

  const employees = [
    "All",
    ...new Set(formattedBookings.map((b) => b.travellerName)),
  ];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return formattedBookings.filter((b) => {
      if (
        (b.executionStatus !== "ticketed" || b.latestReissueBookingId) ||
        b.amendment?.status === "requested"
      )
        return false;
      const booked = b.bookedDate
        ? new Date(b.bookedDate).toISOString().slice(0, 10)
        : "";
      return (
        (!q ||
          b.travellerName?.toLowerCase().includes(q) ||
          b.employeeId?.toLowerCase().includes(q) ||
          b.pnr?.toLowerCase().includes(q) ||
          b.orderId?.toLowerCase().includes(q) ||
          b.status?.toLowerCase().includes(q) ||
          b.flightRequest?.purposeOfTravel?.toLowerCase().includes(q) ||
          b.airline?.airlineName?.toLowerCase().includes(q) ||
          b.airline?.airlineCode?.toLowerCase().includes(q) ||
          (b.routes && b.routes.some(r => 
            r.fromCode?.toLowerCase().includes(q) || 
            r.toCode?.toLowerCase().includes(q) || 
            r.fromCity?.toLowerCase().includes(q) || 
            r.toCity?.toLowerCase().includes(q)
          )) ||
          b.amount?.toString().includes(q)) &&
        (!startDate || booked >= startDate) &&
        (!endDate || booked <= endDate) &&
        (statusFilter === "All" || b.status === statusFilter) &&
        (empFilter === "All" || b.travellerName === empFilter)
      );
    });
  }, [search, startDate, endDate, statusFilter, empFilter, formattedBookings]);

  const paginated = useMemo(
    () =>
      filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage],
  );
  const totalSpend = filtered.reduce((s, b) => s + (b.amount || 0), 0);

  // We rely on exportConfig instead of a custom handleExport for uniform CSV functionality

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Total Flights"
          value={filtered.length}
          Icon={FiList}
          borderCls="border-[#003399]"
          iconBgCls="bg-[#003399]/10"
          iconColorCls="text-[#003399]"
        />
        <StatCard
          label="Confirmed Flights"
          value={filtered.filter((b) => b.status === "Confirmed").length}
          Icon={FiCheckCircle}
          borderCls="border-emerald-500"
          iconBgCls="bg-emerald-50"
          iconColorCls="text-emerald-600"
        />
        <StatCard
          label="Pending Flights"
          value={filtered.filter((b) => b.status === "Pending").length}
          Icon={FiClock}
          borderCls="border-amber-500"
          iconBgCls="bg-amber-50"
          iconColorCls="text-amber-600"
        />
        <StatCard
          label="Total Spend"
          value={`₹${totalSpend.toLocaleString()}`}
          Icon={FaRupeeSign}
          borderCls="border-violet-500"
          iconBgCls="bg-violet-50"
          iconColorCls="text-violet-600"
        />
      </div>

      <div
        className="bg-white rounded-2xl p-6 border shadow-sm"
        style={{ borderColor: C.border }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
          <LabeledField
            label={
              <>
                <FiSearch size={10} /> Search
              </>
            }
            className="lg:col-span-3"
          >
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search Flights..."
            />
          </LabeledField>
          <LabeledField label="Employee Name" className="lg:col-span-2">
            <CustomDropdown
              value={empFilter}
              onChange={setEmp}
              options={employees}
            />
          </LabeledField>
          <LabeledField label="Status" className="lg:col-span-2">
            <CustomDropdown
              value={statusFilter}
              onChange={setStatus}
              options={["All", "Confirmed", "Pending"]}
            />
          </LabeledField>
          <LabeledField label="Date Range" className="lg:col-span-3">
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={dateCls}
                style={{ borderColor: C.border }}
              />
              <span className="text-slate-300">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={dateCls}
                style={{ borderColor: C.border }}
              />
            </div>
          </LabeledField>
          <div className="flex items-end lg:col-span-2">
            <button
              onClick={() => {
                setSearch("");
                setStartDate("");
                setEndDate("");
                setStatus("All");
                setEmp("All");
              }}
              className="w-full py-2.5 rounded-xl font-black text-[11px] flex items-center justify-center gap-2 border shadow-sm transition-all hover:bg-slate-50 uppercase tracking-widest"
              style={{
                background: C.white,
                borderColor: C.border,
                color: C.muted,
              }}
            >
              <FiX /> Reset Filters
            </button>
          </div>
        </div>
      </div>

      <ResponsiveDataTable
        title="Flight Ledger"
        subtitle={`${filtered.length} flight bookings`}
        exportLabel="Export Excel"
        exportLoading={isExporting}
        exportDisabled={isExporting}
        onExport={() => exportExcel({
          pageHeader: "Total Flight Bookings",
          statCards: [
            { label: "Total Flights", value: filtered.length },
            { label: "Confirmed Flights", value: filtered.filter((b) => b.status === "Confirmed").length },
            { label: "Pending Flights", value: filtered.filter((b) => b.status === "Pending").length },
            { label: "Total Spend", value: `₹${totalSpend.toLocaleString()}` }
          ],
          appliedFilters: [
            { label: "Search", value: search || "None" },
            { label: "Employee Name", value: empFilter },
            { label: "Status", value: statusFilter },
            { label: "Date Range", value: `${startDate || "Any"} to ${endDate || "Any"}` }
          ],
          data: filtered,
          columns: totalFlightsExportTemplate,
          filenamePrefix: "total_flight_bookings"
        })}
        wrapperClass="!border-none !shadow-none"
        pagination={
          <Pagination
            currentPage={currentPage}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        }
      >
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-[#003399] to-[#000d26] text-white">
              <Th className="!px-6 !py-5">Booking ID</Th>
              <Th className="!px-6 !py-5">Employee Name</Th>
              <Th className="!px-6 !py-5">Route</Th>
              <Th className="!px-6 !py-5">Email</Th>
              <Th className="!px-6 !py-5">Status</Th>
              <Th className="!px-6 !py-5">PNR</Th>
              <Th className="!px-6 !py-5">Amount</Th>
              <Th className="!px-6 !py-5 !text-left">Action</Th>
            </tr>
          </thead>
          <tbody>
            {paginated.length > 0 ? (
              paginated.map((b, i) => (
                <tr
                  key={b._id}
                  className="hover:bg-slate-100 transition-colors"
                  style={{ background: i % 2 === 0 ? C.white : C.lightGray }}
                >
                  <td className="!px-6 !py-5">
                    <IdCell id={b.orderId} />
                  </td>
                  <td className="!px-6 !py-5">
                    <p className="text-xs font-black" style={{ color: C.navy }}>
                      {b.travellerName}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[120px]">
                      {b.flightRequest?.purposeOfTravel}
                    </p>
                  </td>
                  <td className="!px-6 !py-5">
                    <RouteCell routes={b.routes} airline={b.airline} />
                  </td>
                  <td className="!px-6 !py-5">
                    <span
                      className="text-[11px] font-bold font-mono px-2 py-1 rounded"
                      style={{ background: C.offWhite, color: C.navy }}
                    >
                      {b.employeeId}
                    </span>
                  </td>
                  <td className="!px-6 !py-5">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="!px-6 !py-5 font-black text-blue-500 text-xs">
                    {b.pnr}
                  </td>
                  <td
                    className="!px-6 !py-5 font-black text-xs"
                    style={{ color: C.navy }}
                  >
                    ₹{b.amount.toLocaleString()}
                  </td>
                  <td className="!px-6 !py-5 !text-left">
                    <button
                      onClick={() =>
                        navigate(`/employee-flight-booking/${b._id}`)
                      }
                      className="p-3 rounded-xl transition-all shadow-sm hover:shadow-md bg-gradient-to-br from-[#003399] to-[#000d26] hover:bg-white hover:from-white hover:to-white group"
                    >
                      <FiArrowRight
                        size={18}
                        className="text-[#E7C695] group-hover:text-[#000d26] transition-colors"
                      />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="!px-6 !py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                      <FiSearch size={32} />
                    </div>
                    <p className="text-sm font-bold text-slate-400">
                      No active deployments found for the selected criteria.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ResponsiveDataTable>
    </div>
  );
}

function HotelSection() {
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [waitingBookingId, setWaitingBookingId] = useState(null);
  const PAGE_SIZE = 10;

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { hotelBookings, loading } = useSelector((state) => state.adminBooking);
  const { exportExcel, isExporting } = useExcelExporter();

  useEffect(() => {
    dispatch(getAllHotelBookingsAdmin());
  }, [dispatch]);

  const formattedBookings = useMemo(
    () =>
      (hotelBookings || []).map((b) => {
        const guest = b.userId?.name
          ? `${b.userId.name.firstName} ${b.userId.name.lastName}`.trim()
          : "Staff Member";
        const status =
          b.executionStatus === "voucher_generated" ? "Confirmed" : "Pending";
        const amount =
          b.pricingSnapshot?.totalAmount ?? b.bookingSnapshot?.amount ?? 0;

        const hotelName =
          b.bookingSnapshot?.hotelName ||
          b.hotelRequest?.selectedHotel?.hotelName ||
          "Unknown Hotel";
        const city =
          b.hotelRequest?.selectedHotel?.city ||
          b.hotelRequest?.city ||
          b.hotelRequest?.cityName ||
          b.hotelRequest?.selectedHotel?.cityName ||
          b.bookingSnapshot?.city ||
          "—";
        // console.log(hotelBookings);

        return {
          ...b,
          guestName: guest,
          employeeId: b.userId?.email || "—",
          status,
          amount,
          bookedDate: b.createdAt,
          hotelName,
          city,
        };
      }),
    [hotelBookings],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return formattedBookings.filter((b) => {
      if (
        b.executionStatus !== "voucher_generated" ||
        (b.amendment && b.amendment.status !== "not_requested")
      ) {
        return false;
      }
      const booked = b.bookedDate
        ? new Date(b.bookedDate).toISOString().slice(0, 10)
        : "";
      return (
        (!q ||
          b.guestName?.toLowerCase().includes(q) ||
          b.employeeId?.toLowerCase().includes(q) ||
          b.orderId?.toLowerCase().includes(q) ||
          b.hotelName?.toLowerCase().includes(q) ||
          b.city?.toLowerCase().includes(q) ||
          b.status?.toLowerCase().includes(q) ||
          b.hotelRequest?.purposeOfTravel?.toLowerCase().includes(q) ||
          b.amount?.toString().includes(q)) &&
        (!startDate || booked >= startDate) &&
        (!endDate || booked <= endDate)
      );
    });
  }, [search, startDate, endDate, formattedBookings]);

  const paginated = useMemo(
    () =>
      filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage],
  );
  const totalSpend = filtered.reduce((s, b) => s + (b.amount || 0), 0);

  // We rely on exportConfig instead of a custom handleExport for uniform CSV functionality

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Hotel Manifest"
          value={filtered.length}
          Icon={FaHotel}
          borderCls="border-[#000D26]"
          iconBgCls="bg-slate-100"
          iconColorCls="text-[#000D26]"
        />
        <StatCard
          label="Vouchered Assets"
          value={filtered.length}
          Icon={FiCheckCircle}
          borderCls="border-emerald-500"
          iconBgCls="bg-emerald-50"
          iconColorCls="text-emerald-600"
        />
        <StatCard
          label="Capital Outlay"
          value={`₹${totalSpend.toLocaleString()}`}
          Icon={FaRupeeSign}
          borderCls="border-violet-500"
          iconBgCls="bg-violet-50"
          iconColorCls="text-violet-600"
        />
        <StatCard
          label="Unique Properties"
          value={new Set(filtered.map((b) => b.hotelName)).size}
          Icon={FiList}
          borderCls="border-amber-500"
          iconBgCls="bg-amber-50"
          iconColorCls="text-amber-600"
        />
      </div>

      <div
        className="bg-white rounded-2xl p-6 border shadow-sm"
        style={{ borderColor: C.border }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
          <LabeledField
            label={
              <>
                <FiSearch size={10} /> Manifest Search
              </>
            }
            className="lg:col-span-4"
          >
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Guest Name or Order ID..."
            />
          </LabeledField>
          <LabeledField label="Date Range" className="lg:col-span-4">
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={dateCls}
                style={{ borderColor: C.border }}
              />
              <span className="text-slate-300">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={dateCls}
                style={{ borderColor: C.border }}
              />
            </div>
          </LabeledField>
          <div className="flex items-end lg:col-span-4">
            <button
              onClick={() => {
                setSearch("");
                setStartDate("");
                setEndDate("");
              }}
              className="w-full py-2.5 rounded-xl font-black text-[11px] flex items-center justify-center gap-2 border shadow-sm transition-all hover:bg-slate-50 uppercase tracking-widest"
              style={{
                background: C.white,
                borderColor: C.border,
                color: C.muted,
              }}
            >
              <FiX /> Reset Filters
            </button>
          </div>
        </div>
      </div>

      <ResponsiveDataTable
        title="Hotel Ledger"
        subtitle={`${filtered.length} hotel bookings`}
        exportLabel="Export Excel"
        exportLoading={isExporting}
        exportDisabled={isExporting}
        onExport={() => exportExcel({
          pageHeader: "Total Hotel Bookings",
          statCards: [
            { label: "Total Hotels", value: filtered.length },
            { label: "Confirmed Hotels", value: filtered.length },
            { label: "Total Spend", value: `₹${totalSpend.toLocaleString()}` },
            { label: "Unique Hotels", value: new Set(filtered.map((b) => b.hotelName)).size }
          ],
          appliedFilters: [
            { label: "Search", value: search || "None" },
            { label: "Employee Name", value: empFilter },
            { label: "Date Range", value: `${startDate || "Any"} to ${endDate || "Any"}` }
          ],
          data: filtered,
          columns: totalHotelsExportTemplate,
          filenamePrefix: "total_hotel_bookings"
        })}
        wrapperClass="!border-none !shadow-none"
        pagination={
          <Pagination
            currentPage={currentPage}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        }
      >
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-[#003399] to-[#000d26] text-white">
              <Th className="!px-6 !py-5">Booking ID</Th>
              <Th className="!px-6 !py-5">Employee Name</Th>
              <Th className="!px-6 !py-5">Email</Th>
              <Th className="!px-6 !py-5">Hotel Name</Th>
              <Th className="!px-6 !py-5">Booked Date</Th>
              <Th className="!px-6 !py-5">Status</Th>
              <Th className="!px-6 !py-5">Amount</Th>
              <Th className="!px-6 !py-5 !text-left">Action</Th>
            </tr>
          </thead>
          <tbody>
            {paginated.length > 0 ? (
              paginated.map((b, i) => (
                <tr
                  key={b._id}
                  className="hover:bg-slate-100 transition-colors"
                  style={{ background: i % 2 === 0 ? C.white : C.lightGray }}
                >
                  <td className="!px-6 !py-5">
                    <IdCell id={b.orderId} />
                  </td>
                  <td className="!px-6 !py-5">
                    <p className="text-xs font-black" style={{ color: C.navy }}>
                      {b.guestName}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[120px]">
                      {b.hotelRequest?.purposeOfTravel}
                    </p>
                  </td>
                  <td className="!px-6 !py-5">
                    <span
                      className="text-[11px] font-bold font-mono px-2 py-1 rounded"
                      style={{ background: C.offWhite, color: C.navy }}
                    >
                      {b.employeeId}
                    </span>
                  </td>
                  <td className="!px-6 !py-5">
                    <p className="text-xs font-black" style={{ color: C.navy }}>
                      {b.hotelName}
                    </p>
                    <p className="text-[10px] font-bold text-gold uppercase">
                      {b.city}
                    </p>
                  </td>
                  <td className="!px-6 !py-5 text-[11px] font-bold text-slate-500 uppercase">
                    {new Date(b.bookedDate).toLocaleDateString()}
                  </td>
                  <td className="!px-6 !py-5">
                    <StatusBadge status={b.status} />
                  </td>
                  <td
                    className="!px-6 !py-5 font-black text-xs"
                    style={{ color: C.navy }}
                  >
                    ₹{b.amount.toLocaleString()}
                  </td>
                  <td className="!px-6 !py-5 !text-left relative">
                    <button
                      onClick={() => {
                        const elapsed = (Date.now() - new Date(b.bookedDate).getTime()) / 1000;
                        if (elapsed < 120) {
                          setWaitingBookingId(b._id);
                          setTimeout(() => setWaitingBookingId(null), 3000);
                        } else {
                          navigate(`/employee-hotel-booking/${b._id}`);
                        }
                      }}
                      className="p-3 rounded-xl transition-all shadow-sm hover:shadow-md bg-gradient-to-br from-[#003399] to-[#000d26] hover:bg-white hover:from-white hover:to-white group relative"
                    >
                      <FiArrowRight
                        size={18}
                        className="text-[#E7C695] group-hover:text-[#000d26] transition-colors"
                      />
                    </button>
                    {waitingBookingId === b._id && (
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 mr-16 w-48 bg-white border border-amber-200 shadow-xl rounded-xl p-3 z-[100] animate-in fade-in zoom-in-95 duration-200">
                        <p className="text-xs text-amber-600 font-black mb-1">Please Wait</p>
                        <p className="text-[10px] text-slate-500 leading-tight">Your voucher is being generated. Please wait 120 seconds after booking to view details.</p>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="!px-6 !py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                      <FiSearch size={32} />
                    </div>
                    <p className="text-sm font-bold text-slate-400">
                      No active stays found for the selected criteria.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ResponsiveDataTable>
    </div>
  );
}

export default function TotalBookings() {
  const [activeTab, setActiveTab] = useState("flight");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading: reduxLoading } = useSelector((state) => state.adminBooking);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleRefresh = async () => {
    setIsSyncing(true);
    try {
      await dispatch(
        activeTab === "flight"
          ? getAllFlightBookingsAdmin()
          : getAllHotelBookingsAdmin(),
      );
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div
      className="min-h-screen font-sans pb-20 -mt-6 -mx-4 md:-mx-6"
      style={{ background: C.offWhite }}
    >
      {/* Navy Header Section - Aligned with CancelledBookings */}
      <div className="w-full bg-gradient-to-br from-[#003399] to-[#000d26] text-white pt-8 pb-20 px-6 md:px-10">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10"
              >
                <FiArrowRight className="rotate-180" size={20} />
              </button>
              <button
                onClick={handleRefresh}
                className={`p-3 rounded-xl bg-white/10 transition-all border border-white/10 ${isSyncing || reduxLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-white/20"}`}
                disabled={isSyncing || reduxLoading}
              >
                <div
                  className={isSyncing || reduxLoading ? "animate-spin" : ""}
                >
                  <FiRefreshCw size={20} />
                </div>
              </button>
            </div>

            <div className="h-12 w-[1px] bg-white/10 mx-2 hidden md:block" />

            <div className="flex items-center md:items-center gap-4 md:gap-5">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl flex shrink-0 items-center justify-center shadow-xl text-white border border-white/10 bg-white/10">
                <FiList size={24} className="md:w-7 md:h-7" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-none">
                  Total Bookings
                </h1>
                <p className="text-[9px] md:text-[10px] mt-2 md:mt-3 font-bold uppercase tracking-[2px] opacity-60">
                  View all corporate travel bookings
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 md:px-10 -mt-10 space-y-10">
        {/* Tab Switcher - Aligned with CancelledBookings */}
        <div className="flex gap-2 p-1.5 bg-white border border-slate-200/60 shadow-xl rounded-2xl w-fit max-w-full overflow-x-auto">
          {[
            ["flight", "Flight Bookings", FaPlane],
            ["hotel", "Hotel Bookings", FaHotel],
          ].map(([k, lbl, Icon]) => (
            <button
              key={k}
              onClick={() => setActiveTab(k)}
              className={`px-6 md:px-8 py-3.5 rounded-xl text-[10px] md:text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all whitespace-nowrap ${activeTab === k ? "bg-[#000D26] text-white shadow-lg scale-[1.02]" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}
            >
              <Icon className="w-3 h-3 md:w-3.5 md:h-3.5" /> {lbl}
            </button>
          ))}
        </div>

        {activeTab === "flight" ? <FlightSection /> : <HotelSection />}
      </div>
    </div>
  );
}
