import React, { useState, useMemo, useEffect } from "react";
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
  FiX,
} from "react-icons/fi";
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
import {
  getAllFlightBookingsAdmin,
  getAllHotelBookingsAdmin,
} from "../../Redux/Actions/travelAdmin.thunks";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Pagination } from "./Shared/Pagination";

// ── FLIGHT SECTION ────────────────────────────────────────────────────────────
function FlightSection() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [deptFilter, setDept] = useState("All");
  const [empFilter, setEmp] = useState("All");

  const flightBookings = useSelector(
    (state) => state.adminBooking.flightBookings,
  );

  useEffect(() => {
    dispatch(getAllFlightBookingsAdmin());
  }, [dispatch]);

  const today = new Date().toISOString().slice(0, 10);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const flightTrips = useMemo(() => {
    return (flightBookings || [])
      .map((b) => {
        const segments = b.flightRequest?.segments || [];
        const onward = segments.filter((s) => s.journeyType === "onward");
        const firstSeg = onward[0] || segments[0];
        const lastOnward = onward[onward.length - 1] || firstSeg;

        const departureDate =
          firstSeg?.departureDateTime || b.bookingSnapshot?.travelDate;
        const airlineName =
          firstSeg?.airlineName || b.bookingSnapshot?.airline || "N/A";
        const flightNumber = firstSeg?.flightNumber || "—";

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
          orderId: b.orderId || "N/A",
          employee: b.userId?.name
            ? `${b.userId.name.firstName} ${b.userId.name.lastName}`.trim()
            : b.userId?.email ||
              `${b.travellers?.[0]?.firstName || ""} ${b.travellers?.[0]?.lastName || ""}`.trim() ||
              "N/A",
          employeeEmail: b.userId?.email || "N/A",
          department: b.corporateId || "N/A",
          destination:
            lastOnward?.destination?.city ||
            lastOnward?.destination?.airportCode ||
            b.bookingSnapshot?.city ||
            "N/A",
          departureDate,
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

  const departments = useMemo(() => ["All", ...new Set(flightTrips.map((t) => t.department))], [flightTrips]);

  const employees = useMemo(() => ["All", ...new Set(flightTrips.map((t) => t.employee))], [flightTrips]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return flightTrips.filter((t) => {
      const depDate = new Date(t.departureDate);
      const dateOk =
        (!startDate || depDate >= new Date(startDate)) &&
        (!endDate || depDate <= new Date(endDate));
      const deptOk = deptFilter === "All" || t.department === deptFilter;
      const empOk = empFilter === "All" || t.employee === empFilter;
      const searchOk =
        !q ||
        t.employee.toLowerCase().includes(q) ||
        t.employeeEmail.toLowerCase().includes(q) ||
        t.destination.toLowerCase().includes(q) ||
        t.orderId.toLowerCase().includes(q);
      return dateOk && deptOk && empOk && searchOk;
    });
  }, [search, startDate, endDate, deptFilter, empFilter, flightTrips]);

  const confirmedCount = filtered.length;
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage],
  );

  const handleExportFlights = () => {
    if (!filtered.length) return;
    const headers = ["Order ID", "Employee", "Dept", "Departure Date", "Airline", "Status"];
    const rows = filtered.map((t) => [
      t.orderId,
      t.employee,
      t.department,
      t.departureDate ? new Date(t.departureDate).toLocaleDateString("en-IN") : "—",
      t.airlineName,
      t.status,
    ]);
    const tableRows = rows
      .map(
        (row) =>
          `<tr>${row
            .map(
              (cell) =>
                `<td style="border:1px solid #dbe4f0;padding:8px;">${String(
                  cell ?? "",
                )
                  .replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")}</td>`,
            )
            .join("")}</tr>`,
      )
      .join("");
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head><body><table><thead><tr>${headers.map((h) => `<th style="border:1px solid #cbd5e1;padding:10px;background:#0f172a;color:#fff;font-weight:700;text-align:left;">${h}</th>`).join("")}</tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
    const blob = new Blob(["\ufeff", html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `upcoming-flights-${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 min-w-0">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
        <StatCard
          label="Total Flights"
          value={filtered.length}
          Icon={FaPlane}
          borderCls="border-[#0A4D68]"
          iconBgCls="bg-[#0A4D68]/10"
          iconColorCls="text-[#0A4D68]"
        />
        <StatCard
          label="Confirmed"
          value={confirmedCount}
          Icon={FiCheckCircle}
          borderCls="border-emerald-500"
          iconBgCls="bg-emerald-50"
          iconColorCls="text-emerald-600"
        />
      </div>

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
          <LabeledField
            label={
              <>
                <FiFilter size={10} /> Department
              </>
            }
          >
            <CustomDropdown
              value={deptFilter}
              onChange={setDept}
              options={departments}
            />
          </LabeledField>
          <LabeledField
            label={
              <>
                <FiUser size={10} /> Employee
              </>
            }
          >
            <CustomDropdown
              value={empFilter}
              onChange={setEmp}
              options={employees}
            />
          </LabeledField>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSearch("");
                setStartDate("");
                setEndDate("");
                setDept("All");
                setEmp("All");
              }}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-bold text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200 hover:text-slate-700 transition-colors"
            >
              <FiX size={12} /> Reset
            </button>
          </div>
        </div>
      </div>

      <ResponsiveDataTable
        title="Upcoming Flight Trips"
        subtitle={`${filtered.length} record${filtered.length !== 1 ? "s" : ""} found`}
        tableMinWidth="1050px"
        onExport={handleExportFlights}
        exportLabel="Export"
        exportBgClass="bg-[#0A4D68] hover:bg-[#083d52]"
        arrowBgClass="bg-cyan-50 border-cyan-200 text-[#0A4D68] hover:bg-cyan-100"
        footer={
          <div className="px-4 py-2.5 flex justify-between text-xs text-slate-400">
            <span>
              Showing <strong className="text-slate-600">{filtered.length === 0 ? 0 : `${Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)}-${Math.min(currentPage * PAGE_SIZE, filtered.length)}`}</strong> of <strong className="text-slate-600">{flightTrips.length}</strong> flight trips
            </span>
          </div>
        }
        pagination={
          <Pagination
            currentPage={currentPage}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        }
      >
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#0f9041] text-[#ffffff]">
              <Th>Order ID</Th>
              <Th>Employee</Th>
              <Th>Departure Date</Th>
              <Th>Airline</Th>
              <Th>Status</Th>
              <Th>Action</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-16 text-center text-slate-400">
                  <div className="flex justify-center mb-3">
                    <FaPlane size={32} className="opacity-20" />
                  </div>
                  <p className="font-semibold text-sm">
                    No upcoming flight trips found
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
                    <IdCell id={t.orderId} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col text-left">
                      <span className="font-semibold text-[13px] text-slate-800">
                        {t.employee}
                      </span>
                      <span className="text-xs text-[#0A4D68] font-medium">
                        {t.employeeEmail}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-slate-500">
                    {t.departureDate
                      ? new Date(t.departureDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
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
                    <StatusBadge status={t.status || "Pending"} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/employee-flight-booking/${t.id}?source=upcoming`)}
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
  const [empFilter, setEmp] = useState("All");

  const hotelBookings = useSelector(
    (state) => state.adminBooking.hotelBookings,
  );

  useEffect(() => {
    dispatch(getAllHotelBookingsAdmin());
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
        const isValidStatus =
          validStatuses.includes(b.executionStatus) &&
          b.executionStatus !== "failed";
        const isNotCancelled =
          !b.amendment ||
          !["requested", "success"].includes(b.amendment?.status);

        return isValidStatus && isNotCancelled && ci > today;
      })
      .map((b) => ({
        raw: b,
        id: b._id,
        orderId: b.orderId || "N/A",
        employee: b.userId?.name
          ? `${b.userId.name.firstName} ${b.userId.name.lastName}`.trim()
          : b.userId?.email ||
            `${b.travellers?.[0]?.firstName || ""} ${b.travellers?.[0]?.lastName || ""}`.trim() ||
            "N/A",
          employeeId: b.userId?.email || "N/A",
          department: b.corporateId || "N/A",
          destination: b.hotelRequest?.selectedHotel?.hotelName || "N/A",
          departureDate:
            b.bookingSnapshot?.checkInDate ||
            b.hotelRequest?.checkInDate ||
            b.checkInDate,
          returnDate:
            b.bookingSnapshot?.checkOutDate ||
            b.hotelRequest?.checkOutDate ||
            b.checkOutDate,
          status: "Confirmed",
        }));
  }, [hotelBookings, today]);

  const departments = useMemo(() => ["All", ...new Set(hotelTrips.map((t) => t.department))], [hotelTrips]);

  const employees = useMemo(() => ["All", ...new Set(hotelTrips.map((t) => t.employee))], [hotelTrips]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return hotelTrips.filter((t) => {
      const depDate = new Date(t.departureDate);
      const dateOk =
        (!startDate || depDate >= new Date(startDate)) &&
        (!endDate || depDate <= new Date(endDate));
      const deptOk = deptFilter === "All" || t.department === deptFilter;
      const empOk = empFilter === "All" || t.employee === empFilter;
      const searchOk =
        !q ||
        t.employee.toLowerCase().includes(q) ||
        t.employeeId.toLowerCase().includes(q) ||
        t.destination.toLowerCase().includes(q) ||
        t.orderId.toLowerCase().includes(q);
      return dateOk && deptOk && empOk && searchOk;
    });
  }, [search, startDate, endDate, deptFilter, empFilter, hotelTrips]);

  const handleExportHotels = () => {
    if (!filtered.length) return;
    const headers = ["Order ID", "Employee", "Hotel", "Check-In", "Check-Out", "Status"];
    const rows = filtered.map((t) => [
      t.orderId,
      t.employee,
      t.destination,
      t.departureDate ? new Date(t.departureDate).toLocaleDateString("en-IN") : "—",
      t.returnDate ? new Date(t.returnDate).toLocaleDateString("en-IN") : "—",
      t.status,
    ]);
    const tableRows = rows
      .map(
        (row) =>
          `<tr>${row
            .map(
              (cell) =>
                `<td style="border:1px solid #dbe4f0;padding:8px;">${String(
                  cell ?? "",
                )
                  .replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")}</td>`,
            )
            .join("")}</tr>`,
      )
      .join("");
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head><body><table><thead><tr>${headers.map((h) => `<th style="border:1px solid #cbd5e1;padding:10px;background:#0f172a;color:#fff;font-weight:700;text-align:left;">${h}</th>`).join("")}</tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
    const blob = new Blob(["\ufeff", html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `upcoming-hotels-${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 min-w-0">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
        <StatCard
          label="Total Hotels"
          value={filtered.length}
          Icon={FaHotel}
          borderCls="border-[#088395]"
          iconBgCls="bg-[#088395]/10"
          iconColorCls="text-[#088395]"
        />
        <StatCard
          label="Confirmed"
          value={filtered.length}
          Icon={FiCheckCircle}
          borderCls="border-emerald-500"
          iconBgCls="bg-emerald-50"
          iconColorCls="text-emerald-600"
        />
      </div>

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
          <LabeledField
            label={
              <>
                <FiFilter size={10} /> Department
              </>
            }
          >
            <CustomDropdown
              value={deptFilter}
              onChange={setDept}
              options={departments}
            />
          </LabeledField>

          <LabeledField
            label={
              <>
                <FiUser size={10} /> Employee
              </>
            }
          >
            <CustomDropdown
              value={empFilter}
              onChange={setEmp}
              options={employees}
            />
          </LabeledField>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSearch("");
                setStartDate("");
                setEndDate("");
                setDept("All");
                setEmp("All");
              }}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-bold text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200 hover:text-slate-700 transition-colors"
            >
              <FiX size={12} /> Reset
            </button>
          </div>
        </div>
      </div>

      <ResponsiveDataTable
        title="Upcoming Hotel Trips"
        subtitle={`${filtered.length} record${filtered.length !== 1 ? "s" : ""} found`}
        tableMinWidth="1050px"
        onExport={handleExportHotels}
        exportLabel="Export"
        exportBgClass="bg-[#088395] hover:bg-[#066b78]"
        arrowBgClass="bg-teal-50 border-teal-200 text-[#088395] hover:bg-teal-100"
        footer={
          <div className="px-4 py-2.5 flex justify-between text-xs text-slate-400">
            <span>
              Showing <strong className="text-slate-600">{filtered.length}</strong> of <strong className="text-slate-600">{hotelTrips.length}</strong> hotel trips
            </span>
          </div>
        }
      >
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#0f9041] text-[#ccfbf1]">
              <Th>Order ID</Th>
              <Th>Employee</Th>
              <Th>Hotel Name</Th>
              <Th>Check-in Date</Th>
              <Th>Check-out Date</Th>
              <Th>Status</Th>
              <Th>Action</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-16 text-center text-slate-400">
                  <div className="flex justify-center mb-3">
                    <FaHotel size={32} className="opacity-20" />
                  </div>
                  <p className="font-semibold text-sm">
                    No upcoming hotel trips found
                  </p>
                  <p className="text-xs mt-1">
                    Try adjusting the filters or search query
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((t, i) => (
                <tr
                  key={t.id}
                  className={`transition-colors hover:bg-teal-50 ${
                    i % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                  }`}
                >
                  <td className="px-4 py-3">
                    <IdCell id={t.orderId} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-semibold text-[13px] text-slate-800">
                        {t.employee}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {t.employeeId}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-slate-700 font-medium">
                    {t.destination}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-slate-500">
                    {t.departureDate ? new Date(t.departureDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    }) : "—"}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-slate-500">
                    {t.returnDate ? new Date(t.returnDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    }) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={t.status || "Pending"} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/employee-hotel-booking/${t.id}?source=upcoming`)}
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
      </ResponsiveDataTable>
    </div>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function UpcomingTrips() {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState("flight");

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

  const handleRefresh = () => {
    if (activeTab === "flight") {
      dispatch(getAllFlightBookingsAdmin());
    } else {
      dispatch(getAllHotelBookingsAdmin());
    }
  };

  return (
    <div className="w-full min-w-0 space-y-6 font-sans">
      <div className="flex items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0A4D68] to-[#088395] flex items-center justify-center shrink-0 shadow-sm">
            <FiCalendar size={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-black text-slate-900 tracking-tight truncate">
              Upcoming Trips
            </h1>
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              Review all upcoming business travel plans
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold transition-all shadow-sm border ${
            activeTab === "hotel"
              ? "bg-teal-50 border-teal-200 text-[#088395] hover:bg-teal-100"
              : "bg-cyan-50 border-cyan-200 text-[#0A4D68] hover:bg-cyan-100"
          }`}
        >
          <FiRefreshCw size={14} />
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
  );
}
