import React, { useState, useMemo, useEffect } from "react";
import {
  FiXCircle,
  FiHome,
  FiUser,
  FiCalendar,
  FiDollarSign,
  FiFilter,
  FiEye,
  FiMessageCircle,
  FiX,
  FiSearch,
  FiAlertTriangle,
  FiList,
  FiRefreshCw,
} from "react-icons/fi";
import { FaPlane, FaHotel } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchApprovals,
  selectApprovals,
  selectApprovalLoading,
} from "../../Redux/Actions/approval.thunks";
import {
  formatDate,
  formatDuration,
  formatTime,
  getCabinClassLabel,
  getDateInIST,
} from "../../utils/formatter";
import {
  PendingFlightDetailsModal,
  PendingHotelDetailsModal,
} from "./Modal/PendingHotelDetailsModal";
import {
  dateCls,
  IdCell,
  LabeledField,
  SearchBar,
  selectCls,
  StatCard,
  Th,
  CustomDropdown,
} from "./Shared/CommonComponents";
import ResponsiveDataTable from "./Shared/ResponsiveDataTable";

// ── normalize helper ──────────────────────────────────────────────────────────
function normalize(rejectedRequests) {
  return rejectedRequests.map((r) => {
    const isHotel = r.bookingType === "hotel";
    const segments = r.flightRequest?.segments || [];

    const estimatedCost = (() => {
      if (isHotel) {
        const rooms = r.hotelRequest?.selectedRoom?.rawRoomData || [];
        if (!Array.isArray(rooms)) return 0;

        return rooms.reduce((total, room) => {
          if (room.TotalFare) return total + room.TotalFare;
          if (room.Price?.totalFare) return total + room.Price.totalFare;
          if (Array.isArray(room.DayRates)) {
            const roomTotal = room.DayRates.flat().reduce(
              (sum, day) => sum + (day.BasePrice || 0),
              0,
            );
            return total + roomTotal;
          }
          return total;
        }, 0);
      }
      return (
        r.pricingSnapshot?.totalAmount ||
        r.bookingSnapshot?.amount ||
        r.flightRequest?.fareSnapshot?.publishedFare ||
        0
      );
    })();

    return {
      id: r._id,
      orderId: r.orderId || "N/A",
      raw: r,
      employee: r.userId?.name
        ? `${r.userId.name.firstName} ${r.userId.name.lastName}${r.userId.email ? ` (${r.userId.email})` : ""}`
        : r.userId?.email || "Employee",
      department: r.userId?.department || "N/A",
      type: isHotel ? "Hotel" : "Flight",
      destination: isHotel
        ? r.hotelRequest?.selectedHotel?.hotelName || r.hotelRequest?.selectedHotel?.city || "N/A"
        : segments.length
          ? `${segments[0].origin.city} → ${segments[segments.length - 1].destination.city}`
          : "N/A",
      rejectedDate: r.rejectedAt,
      rejectedBy:
        r.rejectedBy?.name?.firstName && r.rejectedBy?.name?.lastName
          ? `${r.rejectedBy.name.firstName} ${r.rejectedBy.name.lastName}`
          : "Admin",
      reason: r.approverComments || "No reason provided",
      estimatedCost,
      status: "Rejected",
    };
  });
}

// ── FLIGHT SECTION ────────────────────────────────────────────────────────────
function FlightSection({ allRequests, loading }) {
  const today = new Date();
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState(
    new Date(today.getFullYear(), 0, 1).toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState(
    new Date(today.getFullYear(), 11, 31).toISOString().split("T")[0],
  );
  const [deptFilter, setDept] = useState("All");
  const [empFilter, setEmp] = useState("All");
  const [selectedRequest, setSelectedRequest] = useState(null);

  const flightRequests = allRequests.filter((r) => r.type === "Flight");
  const departments = useMemo(() => [
    "All",
    ...new Set(flightRequests.map((r) => r.department)),
  ], [flightRequests]);

  const employees = useMemo(() => [
    "All",
    ...new Set(flightRequests.map((r) => r.employee)),
  ], [flightRequests]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return flightRequests.filter((r) => {
      const rejDate = new Date(r.rejectedDate);
      const dateOk =
        rejDate >= new Date(startDate) && rejDate <= new Date(endDate);
      const deptOk = deptFilter === "All" || r.department === deptFilter;
      const empOk = empFilter === "All" || r.employee === empFilter;
      const searchOk =
        !q ||
        r.employee.toLowerCase().includes(q) ||
        r.destination.toLowerCase().includes(q) ||
        r.rejectedBy.toLowerCase().includes(q) ||
        r.orderId.toLowerCase().includes(q);
      return dateOk && deptOk && empOk && searchOk;
    });
  }, [search, startDate, endDate, deptFilter, empFilter, flightRequests]);

  const totalCost = filtered.reduce((s, r) => s + r.estimatedCost, 0);

  const handleExportFlights = () => {
    if (!filtered.length) return;
    const headers = ["Order ID", "Employee", "Dept", "Destination", "Rejected Date", "Rejected By", "Reason", "Cost"];
    const rows = filtered.map((r) => [
      r.orderId,
      r.employee,
      r.department,
      r.destination,
      r.rejectedDate ? new Date(r.rejectedDate).toLocaleDateString("en-IN") : "—",
      r.rejectedBy,
      r.reason,
      `₹${r.estimatedCost.toLocaleString()}`,
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
    a.download = `rejected-flights-${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 min-w-0">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
        <StatCard
          label="Total Rejected"
          value={filtered.length}
          Icon={FiXCircle}
          borderCls="border-red-500"
          iconBgCls="bg-red-50"
          iconColorCls="text-red-500"
        />
        <StatCard
          label="Flight Requests"
          value={filtered.length}
          Icon={FaPlane}
          borderCls="border-[#0A4D68]"
          iconBgCls="bg-[#0A4D68]/10"
          iconColorCls="text-[#0A4D68]"
        />
        <StatCard
          label="Est. Cost Lost"
          value={`₹${totalCost.toLocaleString()}`}
          Icon={FiDollarSign}
          borderCls="border-violet-500"
          iconBgCls="bg-violet-50"
          iconColorCls="text-violet-600"
        />
        <StatCard
          label="Departments"
          value={new Set(filtered.map((r) => r.department)).size}
          Icon={FiUser}
          borderCls="border-amber-500"
          iconBgCls="bg-amber-50"
          iconColorCls="text-amber-600"
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
              placeholder="Name, destination, ID…"
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
                setStartDate(new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0]);
                setEndDate(new Date(new Date().getFullYear(), 11, 31).toISOString().split("T")[0]);
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
        title="Rejected Flight Requests"
        subtitle={`${filtered.length} record${filtered.length !== 1 ? "s" : ""} found`}
        tableMinWidth="1100px"
        onExport={handleExportFlights}
        exportLabel="Export"
        exportBgClass="bg-[#0A4D68] hover:bg-[#083d52]"
        arrowBgClass="bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
        footer={
          <div className="px-4 py-2.5 flex justify-between text-xs text-slate-400">
            <span>
              Showing <strong className="text-slate-600">{filtered.length}</strong> of <strong className="text-slate-600">{flightRequests.length}</strong> rejected flight requests
            </span>
            <span>
              Est. Cost Lost: <strong className="text-red-600">₹{totalCost.toLocaleString()}</strong>
            </span>
          </div>
        }
      >
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#0f9041] text-red-100">
              <Th>Order ID</Th>
              <Th>Employee</Th>
              <Th>Department</Th>
              <Th>Destination</Th>
              <Th>Rejected Date</Th>
              <Th>Rejected By</Th>
              <Th>Reason</Th>
              <Th>Est. Cost</Th>
              <Th>Action</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="9" className="py-16 text-center text-slate-400">
                  <p className="text-sm font-semibold">Loading...</p>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="9" className="py-16 text-center text-slate-400">
                  <div className="flex justify-center mb-3">
                    <FaPlane size={32} className="opacity-20" />
                  </div>
                  <p className="font-semibold text-sm">
                    No rejected flight requests found
                  </p>
                  <p className="text-xs mt-1">
                    Try adjusting the filters or search query
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((r, i) => (
                <tr
                  key={r.id}
                  className={`transition-colors hover:bg-red-50 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}
                >
                  <td className="px-4 py-3">
                    <IdCell id={r.orderId} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center text-[11px] font-black text-red-600 shrink-0">
                        {r.employee[0]}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-[13px] text-slate-800">
                          {r.employee}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600 font-medium">
                      {r.department}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-slate-700 font-medium">
                    {r.destination}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-slate-500">
                    {r.rejectedDate
                      ? new Date(r.rejectedDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "N/A"}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-slate-600">
                    {r.rejectedBy}
                  </td>
                  <td className="px-4 py-3 max-w-[180px]">
                    <p
                      className="text-[12px] text-red-600 truncate"
                      title={r.reason}
                    >
                      {r.reason}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-900">
                    ₹{r.estimatedCost.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedRequest(r)}
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

      {selectedRequest?.raw?.bookingType === "flight" && (
        <PendingFlightDetailsModal
          booking={selectedRequest.raw}
          onClose={() => setSelectedRequest(null)}
        />
      )}
    </div>
  );
}

// ── HOTEL SECTION ─────────────────────────────────────────────────────────────
function HotelSection({ allRequests, loading }) {
  const today = new Date();
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState(
    new Date(today.getFullYear(), 0, 1).toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState(
    new Date(today.getFullYear(), 11, 31).toISOString().split("T")[0],
  );
  const [deptFilter, setDept] = useState("All");
  const [empFilter, setEmp] = useState("All");
  const [selectedRequest, setSelectedRequest] = useState(null);

  const hotelRequests = allRequests.filter((r) => r.type === "Hotel");
  const departments = useMemo(() => [
    "All",
    ...new Set(hotelRequests.map((r) => r.department)),
  ], [hotelRequests]);

  const employees = useMemo(() => [
    "All",
    ...new Set(hotelRequests.map((r) => r.employee)),
  ], [hotelRequests]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return hotelRequests.filter((r) => {
      const rejDate = new Date(r.rejectedDate);
      const dateOk =
        rejDate >= new Date(startDate) && rejDate <= new Date(endDate);
      const deptOk = deptFilter === "All" || r.department === deptFilter;
      const empOk = empFilter === "All" || r.employee === empFilter;
      const searchOk =
        !q ||
        r.employee.toLowerCase().includes(q) ||
        r.destination.toLowerCase().includes(q) ||
        r.rejectedBy.toLowerCase().includes(q) ||
        r.orderId.toLowerCase().includes(q);
      return dateOk && deptOk && empOk && searchOk;
    });
  }, [search, startDate, endDate, deptFilter, empFilter, hotelRequests]);

  const totalCost = filtered.reduce((s, r) => s + r.estimatedCost, 0);

  const handleExportHotels = () => {
    if (!filtered.length) return;
    const headers = ["Order ID", "Employee", "Dept", "Hotel Name", "Rejected Date", "Rejected By", "Reason", "Cost"];
    const rows = filtered.map((r) => [
      r.orderId,
      r.employee,
      r.department,
      r.destination,
      r.rejectedDate ? new Date(r.rejectedDate).toLocaleDateString("en-IN") : "—",
      r.rejectedBy,
      r.reason,
      `₹${r.estimatedCost.toLocaleString()}`,
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
    a.download = `rejected-hotels-${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 min-w-0">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
        <StatCard
          label="Total Rejected"
          value={filtered.length}
          Icon={FiXCircle}
          borderCls="border-red-500"
          iconBgCls="bg-red-50"
          iconColorCls="text-red-500"
        />
        <StatCard
          label="Hotel Requests"
          value={filtered.length}
          Icon={FaHotel}
          borderCls="border-[#088395]"
          iconBgCls="bg-[#088395]/10"
          iconColorCls="text-[#088395]"
        />
        <StatCard
          label="Est. Cost Lost"
          value={`₹${totalCost.toLocaleString()}`}
          Icon={FiDollarSign}
          borderCls="border-violet-500"
          iconBgCls="bg-violet-50"
          iconColorCls="text-violet-600"
        />
        <StatCard
          label="Departments"
          value={new Set(filtered.map((r) => r.department)).size}
          Icon={FiUser}
          borderCls="border-amber-500"
          iconBgCls="bg-amber-50"
          iconColorCls="text-amber-600"
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
              placeholder="Name, destination, ID…"
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
                setStartDate(new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0]);
                setEndDate(new Date(new Date().getFullYear(), 11, 31).toISOString().split("T")[0]);
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
        title="Rejected Hotel Requests"
        subtitle={`${filtered.length} record${filtered.length !== 1 ? "s" : ""} found`}
        tableMinWidth="1100px"
        onExport={handleExportHotels}
        exportLabel="Export"
        exportBgClass="bg-[#088395] hover:bg-[#066b78]"
        arrowBgClass="bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
        footer={
          <div className="px-4 py-2.5 flex justify-between text-xs text-slate-400">
            <span>
              Showing <strong className="text-slate-600">{filtered.length}</strong> of <strong className="text-slate-600">{hotelRequests.length}</strong> rejected hotel requests
            </span>
            <span>
              Est. Cost Lost: <strong className="text-red-600">₹{totalCost.toLocaleString()}</strong>
            </span>
          </div>
        }
      >
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#0f9041] text-red-100">
              <Th>Order ID</Th>
              <Th>Employee</Th>
              <Th>Rejected Date</Th>
              <Th>Rejected By</Th>
              <Th>Reason</Th>
              <Th>Est. Cost</Th>
              <Th>Action</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="9" className="py-16 text-center text-slate-400">
                  <p className="text-sm font-semibold">Loading...</p>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="9" className="py-16 text-center text-slate-400">
                  <div className="flex justify-center mb-3">
                    <FaHotel size={32} className="opacity-20" />
                  </div>
                  <p className="font-semibold text-sm">
                    No rejected hotel requests found
                  </p>
                  <p className="text-xs mt-1">
                    Try adjusting the filters or search query
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((r, i) => (
                <tr
                  key={r.id}
                  className={`transition-colors hover:bg-red-50 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}
                >
                  <td className="px-4 py-3">
                    <IdCell id={r.orderId} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col">
                        <span className="font-semibold text-[13px] text-slate-800">
                          {r.employee}
                        </span>
                        <span className="font-mono text-[11px] text-slate-400">
                          {r.raw?.userId?._id || "N/A"}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-slate-500">
                    {r.rejectedDate
                      ? new Date(r.rejectedDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "N/A"}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-slate-600">
                    {r.rejectedBy}
                  </td>
                  <td className="px-4 py-3 max-w-[180px]">
                    <p
                      className="text-[12px] text-red-600 truncate"
                      title={r.reason}
                    >
                      {r.reason}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-900">
                    ₹{r.estimatedCost.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedRequest(r)}
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

      {selectedRequest && (
        <PendingHotelDetailsModal
          booking={selectedRequest.raw}
          onClose={() => setSelectedRequest(null)}
        />
      )}
    </div>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function RejectedTravelRequests() {
  const [activeTab, setActiveTab] = useState("flight");

  const dispatch = useDispatch();
  const rejectedRequests = useSelector(selectApprovals);
  const loading = useSelector(selectApprovalLoading);

  useEffect(() => {
    dispatch(fetchApprovals({ status: "rejected" }));
  }, [dispatch]);

  const allRequests = useMemo(
    () => normalize(rejectedRequests),
    [rejectedRequests],
  );

  const tabs = [
    {
      id: "flight",
      label: "Flight Requests",
      Icon: FaPlane,
      activeText: "text-red-700",
      activeBorder: "border-b-red-700",
    },
    {
      id: "hotel",
      label: "Hotel Requests",
      Icon: FaHotel,
      activeText: "text-red-600",
      activeBorder: "border-b-red-600",
    },
  ];

  return (
    <div className="w-full min-w-0 space-y-6 font-sans">
      <div className="flex items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-400 flex items-center justify-center shrink-0 shadow-sm">
            <FiXCircle size={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-black text-slate-900 tracking-tight truncate">
              Rejected Travel Requests
            </h1>
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              Review and analyze all rejected or cancelled travel requests
            </p>
          </div>
        </div>
        <button
          onClick={() => dispatch(fetchApprovals({ status: "rejected" }))}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold transition-all shadow-sm border bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
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
        {activeTab === "flight" ? (
          <FlightSection allRequests={allRequests} loading={loading} />
        ) : (
          <HotelSection allRequests={allRequests} loading={loading} />
        )}
    </div>
  );
}
