import React, { useState, useMemo, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FiHome,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiX,
  FiRefreshCw,
  FiSearch,
  FiCalendar,
  FiFilter,
} from "react-icons/fi";
import { FaPlane, FaHotel, FaRupeeSign } from "react-icons/fa";
import {
  fetchApprovals,
  selectApprovals,
  selectApprovalLoading,
} from "../../Redux/Actions/approval.thunks";
import {
  PendingFlightDetailsModal,
  PendingHotelDetailsModal,
} from "./Modal/PendingHotelDetailsModal";
import {
  LabeledField,
  StatCard,
  dateCls,
  IdCell,
  SearchBar,
  Th,
  getSegCity,
  ExecStatusBadge,
  CustomDropdown,
} from "./Shared/CommonComponents";
import ResponsiveDataTable from "./Shared/ResponsiveDataTable";
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
function FlightApprovalsSection({ rawApprovals }) {
  const [search, setSearch] = useState("");
  const [startDate, setStart] = useState("");
  const [endDate, setEnd] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [execFilter, setExec] = useState("All");
  const [empFilter, setEmp] = useState("All");
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

  const employees = useMemo(
    () => [
      "All",
      ...new Set(
        flightRaw.map((a) =>
          a.userId?.name
            ? `${a.userId.name.firstName} ${a.userId.name.lastName}${a.userId.email ? ` (${a.userId.email})` : ""}`
            : a.userId?.email || "—",
        ),
      ),
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
      const empName = a.userId?.name
        ? `${a.userId.name.firstName} ${a.userId.name.lastName}${a.userId.email ? ` (${a.userId.email})` : ""}`
        : a.userId?.email || "—";
      const empOk = empFilter === "All" || empName === empFilter;
      const qOk =
        !q ||
        a.bookingReference?.toLowerCase().includes(q) ||
        a.purposeOfTravel?.toLowerCase().includes(q) ||
        route.toLowerCase().includes(q) ||
        empName.toLowerCase().includes(q);
      return eOk && fOk && tOk && empOk && qOk;
    });
  }, [search, startDate, endDate, execFilter, empFilter, flightRaw]);

  const totalCost = filtered.reduce(
    (s, a) => s + (a.pricingSnapshot?.totalAmount || 0),
    0,
  );

  const handleExportFlights = () => {
    if (!filtered.length) return;
    const headers = ["Order ID", "Employee", "Route", "Airline", "Travel Date", "Amount", "Status"];
    const rows = filtered.map((a) => {
      const segs = a.flightRequest?.segments || [];
      const route = segs.length > 0 ? `${getSegCity(segs[0], "origin")} - ${getSegCity(segs[segs.length - 1], "destination")}` : "N/A";
      return [
        a.bookingReference || "N/A",
        a.userId?.name
          ? `${a.userId.name.firstName} ${a.userId.name.lastName}${a.userId.email ? ` (${a.userId.email})` : ""}`
          : a.userId?.email || "—",
        route,
        a.flightRequest?.airlineName || "N/A",
        formatDate(a.flightRequest?.travelDate) || "N/A",
        `₹${(a.pricingSnapshot?.totalAmount || 0).toLocaleString()}`,
        a.executionStatus || "N/A",
      ];
    });
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
    a.download = `approved-flights-${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  const notStarted = filtered.filter(
    (a) => a.executionStatus === "not_started",
  ).length;
  const failed = filtered.filter((a) => a.executionStatus === "failed").length;

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
          value={`${totalCost.toLocaleString()}`}
          Icon={FaRupeeSign}
          borderCls="border-violet-500"
          iconBgCls="bg-violet-50"
          iconColorCls="text-violet-600"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <LabeledField label={<><FiSearch size={10} /> Search</>}>
            <SearchBar value={search} onChange={setSearch} placeholder="Ref, name, route…" />
          </LabeledField>
          <LabeledField label={<><FiCalendar size={10} /> From Date</>}>
            <input type="date" value={startDate} onChange={(e) => setStart(e.target.value)} className={dateCls} />
          </LabeledField>
          <LabeledField label={<><FiCalendar size={10} /> To Date</>}>
            <input type="date" value={endDate} onChange={(e) => setEnd(e.target.value)} className={dateCls} />
          </LabeledField>
          <LabeledField label={<><FiCalendar size={10} /> Travel Date</>}>
            <input type="date" value={travelDate} onChange={(e) => setTravelDate(e.target.value)} className={dateCls} />
          </LabeledField>
          <LabeledField label={<><FiFilter size={10} /> Exec Status</>}>
            <CustomDropdown value={execFilter} onChange={setExec} options={execStatuses} />
          </LabeledField>
          <LabeledField label={<><FiFilter size={10} /> Employee</>}>
            <CustomDropdown value={empFilter} onChange={setEmp} options={employees} />
          </LabeledField>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearch("");
                setStart("");
                setEnd("");
                setTravelDate("");
                setExec("All");
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
        title="Flight Approval Requests"
        subtitle={`${filtered.length} record${filtered.length !== 1 ? "s" : ""} found`}
        tableMinWidth="1050px"
        onExport={handleExportFlights}
        exportLabel="Export"
        exportBgClass="bg-[#0A4D68] hover:bg-[#083d52]"
        arrowBgClass="bg-cyan-50 border-cyan-200 text-[#0A4D68] hover:bg-cyan-100"
        footer={
          <div className="px-4 py-2.5 flex justify-between text-xs text-slate-400">
            <span>
              Showing <strong className="text-slate-600">{filtered.length}</strong> of{" "}
              <strong className="text-slate-600">{flightRaw.length}</strong> flights
            </span>
            <span className="text-red-400 text-[11px]">
              ✕ ticketed &amp; cancelled excluded
            </span>
          </div>
        }
      >
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#0f9041] text-[#ffffff]">
              <Th>Order ID</Th>
              <Th>Employee</Th>
              <Th>Route</Th>
              <Th>Airline</Th>
              <Th>Travel Date</Th>
              <Th>Amount</Th>
              <Th>Exec Status</Th>
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
                      No approved flight requests found
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
      </ResponsiveDataTable>

      {selected && (
        <PendingFlightDetailsModal
          booking={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HOTEL APPROVALS SECTION
// ─────────────────────────────────────────────────────────────────────────────
function HotelApprovalsSection({ rawApprovals }) {
  const [search, setSearch] = useState("");
  const [startDate, setStart] = useState("");
  const [endDate, setEnd] = useState("");
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [execFilter, setExec] = useState("All");
  const [empFilter, setEmp] = useState("All");
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

  const employees = useMemo(
    () => [
      "All",
      ...new Set(
        hotelRaw.map((a) =>
          a.userId?.name
            ? `${a.userId.name.firstName} ${a.userId.name.lastName}${a.userId.email ? ` (${a.userId.email})` : ""}`
            : a.userId?.email || "—",
        ),
      ),
    ],
    [hotelRaw],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return hotelRaw.filter((a) => {
      const hotelName = a.hotelRequest?.selectedHotel?.hotelName || "";
      const empName = a.userId?.name
        ? `${a.userId.name.firstName} ${a.userId.name.lastName}${a.userId.email ? ` (${a.userId.email})` : ""}`
        : a.userId?.email || "—";
      const eOk = execFilter === "All" || a.executionStatus === execFilter;
      const empOk = empFilter === "All" || empName === empFilter;
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
      return eOk && fOk && tOk && empOk && qOk;
    });
  }, [search, startDate, endDate, execFilter, empFilter, hotelRaw]);

  const totalCost = filtered.reduce(
    (s, a) => s + (a.pricingSnapshot?.totalAmount || 0),
    0,
  );

  const handleExportHotels = () => {
    if (!filtered.length) return;
    const headers = ["Order ID", "Employee", "Hotel", "Check-In", "Check-Out", "Amount", "Status"];
    const rows = filtered.map((a) => [
      a.bookingReference || "N/A",
      `${a.userId?.name?.firstName || ""} ${a.userId?.name?.lastName || ""}`,
      a.hotelRequest?.selectedHotel?.hotelName || "N/A",
      formatDate(a.hotelRequest?.checkInDate) || "N/A",
      formatDate(a.hotelRequest?.checkOutDate) || "N/A",
      `₹${(a.pricingSnapshot?.totalAmount || 0).toLocaleString()}`,
      a.executionStatus || "N/A",
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
    a.download = `approved-hotels-${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  const notStarted = filtered.filter(
    (a) => a.executionStatus === "not_started",
  ).length;
  const failed = filtered.filter((a) => a.executionStatus === "failed").length;

  return (
    <div className="space-y-4 min-w-0">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
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
          value={`${totalCost.toLocaleString()}`}
          Icon={FaRupeeSign}
          borderCls="border-violet-500"
          iconBgCls="bg-violet-50"
          iconColorCls="text-violet-600"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-3">
          <LabeledField label={<><FiSearch size={10} /> Search</>}>
            <SearchBar value={search} onChange={setSearch} placeholder="Hotel, ref, name…" />
          </LabeledField>
          <LabeledField label={<><FiCalendar size={10} /> From Date</>}>
            <input type="date" value={startDate} onChange={(e) => setStart(e.target.value)} className={dateCls} />
          </LabeledField>
          <LabeledField label={<><FiCalendar size={10} /> To Date</>}>
            <input type="date" value={endDate} onChange={(e) => setEnd(e.target.value)} className={dateCls} />
          </LabeledField>
          <LabeledField label={<><FiCalendar size={10} /> CheckIn</>}>
            <input type="date" value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} className={dateCls} />
          </LabeledField>
          <LabeledField label={<><FiCalendar size={10} /> CheckOut</>}>
            <input type="date" value={checkOutDate} onChange={(e) => setCheckOutDate(e.target.value)} className={dateCls} />
          </LabeledField>
          <LabeledField label={<><FiFilter size={10} /> Exec Status</>}>
            <CustomDropdown value={execFilter} onChange={setExec} options={execStatuses} />
          </LabeledField>
          <LabeledField label={<><FiFilter size={10} /> Employee</>}>
            <CustomDropdown value={empFilter} onChange={setEmp} options={employees} />
          </LabeledField>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearch("");
                setStart("");
                setEnd("");
                setCheckInDate("");
                setCheckOutDate("");
                setExec("All");
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
        title="Hotel Approval Requests"
        subtitle={`${filtered.length} record${filtered.length !== 1 ? "s" : ""} found`}
        tableMinWidth="1050px"
        onExport={handleExportHotels}
        exportLabel="Export"
        exportBgClass="bg-[#0A4D68] hover:bg-[#083d52]"
        arrowBgClass="bg-teal-50 border-teal-200 text-[#088395] hover:bg-teal-100"
        footer={
          <div className="px-4 py-2.5 flex justify-between text-xs text-slate-400">
            <span>
              Showing <strong className="text-slate-600">{filtered.length}</strong> of{" "}
              <strong className="text-slate-600">{hotelRaw.length}</strong> hotels
            </span>
            <span className="text-red-400 text-[11px]">
              ✕ voucher-generated &amp; cancelled excluded
            </span>
          </div>
        }
      >
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#0f9041] text-[#ccfbf1]">
              <Th>Order ID</Th>
              <Th>Employee</Th>
              <Th>Hotel</Th>
              <Th>Check-In</Th>
              <Th>Check-Out</Th>
              <Th>Nights</Th>
              <Th>Amount</Th>
              <Th>Exec Status</Th>
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
                      No approved hotel requests found
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
                      <td className="px-4 py-3 font-bold text-center text-slate-700">
                        {nights}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">
                        ₹
                        {(
                          a.pricingSnapshot?.totalAmount ||
                          a.bookingSnapshot?.amount ||
                          (Array.isArray(a.hotelRequest?.selectedRoom?.rawRoomData)
                            ? a.hotelRequest.selectedRoom.rawRoomData.reduce(
                                (sum, r) => sum + (r.TotalFare || r.Price?.totalFare || 0),
                                0,
                              )
                            : 0) ||
                          0
                        ).toLocaleString()}
                      </td>
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
      </ResponsiveDataTable>

      {selected && (
        <PendingHotelDetailsModal
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

  const dispatch = useDispatch();
  const approvals = useSelector(selectApprovals);
  const loading = useSelector(selectApprovalLoading);

  useEffect(() => {
    dispatch(fetchApprovals({ status: "approved" }));
  }, [dispatch]);


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
    <div className="w-full min-w-0 space-y-6 font-sans">
      <div className="flex items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0A4D68] to-[#088395] flex items-center justify-center shadow-lg text-white shrink-0">
            <FiCheckCircle size={24} />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight truncate">
              Approved Travel Requests
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-widest truncate">
              Approved bookings pending execution · <span className="text-red-500 font-black">Ticketed & voucher-generated excluded</span>
            </p>
          </div>
        </div>
        <button
          onClick={() => dispatch(fetchApprovals({ status: "approved" }))}
          disabled={loading}
          className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold transition-all shadow-sm border ${
            activeTab === "hotel"
              ? "bg-teal-50 border-teal-200 text-[#088395] hover:bg-teal-100"
              : "bg-cyan-50 border-cyan-200 text-[#0A4D68] hover:bg-cyan-100"
          } disabled:opacity-60 disabled:cursor-not-allowed`}
        >
          <FiRefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
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
          />
        ) : (
          <HotelApprovalsSection rawApprovals={approvals} />
        )}
    </div>
  );
}
