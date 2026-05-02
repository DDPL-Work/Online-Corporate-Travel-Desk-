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
  FlightBookingModal,
  HotelBookingModal,
} from "./Modal/BookingRequestDetailsModal";
import { dateCls, IdCell, LabeledField, SearchBar, selectCls, StatCard, Th } from "./Shared/CommonComponents";

// ── normalize helper ──────────────────────────────────────────────────────────
function normalize(rejectedRequests) {
  return rejectedRequests.map((r) => {
    const segments = r.flightRequest?.segments || [];
    return {
      id: r._id,
      orderId: r.orderId || "N/A",
      raw: r,
      employee: r.userId?.name
        ? `${r.userId.name.firstName} ${r.userId.name.lastName}`
        : r.userId?.email || "Employee",
      department: r.userId?.department || "N/A",
      type: r.bookingType === "flight" ? "Flight" : "Hotel",
      destination: segments.length
        ? `${segments[0].origin.city} → ${segments[segments.length - 1].destination.city}`
        : "N/A",
      rejectedDate: r.rejectedAt,
      rejectedBy:
        r.rejectedBy?.name?.firstName && r.rejectedBy?.name?.lastName
          ? `${r.rejectedBy.name.firstName} ${r.rejectedBy.name.lastName}`
          : "Admin",
      reason: r.approverComments || "No reason provided",
      estimatedCost: r.pricingSnapshot?.totalAmount || 0,
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
  const [selectedRequest, setSelectedRequest] = useState(null);

  const flightRequests = allRequests.filter((r) => r.type === "Flight");
  const departments = [
    "All",
    ...new Set(flightRequests.map((r) => r.department)),
  ];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return flightRequests.filter((r) => {
      const rejDate = new Date(r.rejectedDate);
      const dateOk =
        rejDate >= new Date(startDate) && rejDate <= new Date(endDate);
      const deptOk = deptFilter === "All" || r.department === deptFilter;
      const searchOk =
        !q ||
        r.employee.toLowerCase().includes(q) ||
        r.destination.toLowerCase().includes(q) ||
        r.rejectedBy.toLowerCase().includes(q) ||
        r.id.toString().includes(q);
      return dateOk && deptOk && searchOk;
    });
  }, [search, startDate, endDate, deptFilter, flightRequests]);

  const totalCost = filtered.reduce((s, r) => s + r.estimatedCost, 0);

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
            <select
              value={deptFilter}
              onChange={(e) => setDept(e.target.value)}
              className={selectCls}
            >
              {departments.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </LabeledField>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[960px]">
            <thead>
              <tr className="bg-red-700 text-red-100">
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
        </div>
        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 flex justify-between text-xs text-slate-400">
          <span>
            Showing{" "}
            <strong className="text-slate-600">{filtered.length}</strong> of{" "}
            <strong className="text-slate-600">{flightRequests.length}</strong>{" "}
            rejected flight requests
          </span>
          <span>
            Est. Cost:{" "}
            <strong className="text-red-600">
              ₹{totalCost.toLocaleString()}
            </strong>
          </span>
        </div>
      </div>

      {selectedRequest?.raw?.bookingType === "flight" && (
        <FlightBookingModal
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
  const [selectedRequest, setSelectedRequest] = useState(null);

  const hotelRequests = allRequests.filter((r) => r.type === "Hotel");
  const departments = [
    "All",
    ...new Set(hotelRequests.map((r) => r.department)),
  ];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return hotelRequests.filter((r) => {
      const rejDate = new Date(r.rejectedDate);
      const dateOk =
        rejDate >= new Date(startDate) && rejDate <= new Date(endDate);
      const deptOk = deptFilter === "All" || r.department === deptFilter;
      const searchOk =
        !q ||
        r.employee.toLowerCase().includes(q) ||
        r.destination.toLowerCase().includes(q) ||
        r.rejectedBy.toLowerCase().includes(q) ||
        r.id.toString().includes(q);
      return dateOk && deptOk && searchOk;
    });
  }, [search, startDate, endDate, deptFilter, hotelRequests]);

  const totalCost = filtered.reduce((s, r) => s + r.estimatedCost, 0);

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
            <select
              value={deptFilter}
              onChange={(e) => setDept(e.target.value)}
              className={selectCls}
            >
              {departments.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </LabeledField>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[960px]">
            <thead>
              <tr className="bg-red-700 text-red-100">
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
        </div>
        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 flex justify-between text-xs text-slate-400">
          <span>
            Showing{" "}
            <strong className="text-slate-600">{filtered.length}</strong> of{" "}
            <strong className="text-slate-600">{hotelRequests.length}</strong>{" "}
            rejected hotel requests
          </span>
          <span>
            Est. Cost:{" "}
            <strong className="text-red-600">
              ₹{totalCost.toLocaleString()}
            </strong>
          </span>
        </div>
      </div>

      {selectedRequest?.raw?.bookingType === "hotel" && (
        <HotelBookingModal
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
    <div className="min-h-screen bg-slate-100 font-sans">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-red-600 to-red-400 flex items-center justify-center shrink-0">
            <FiXCircle size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Rejected Travel Requests
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Review and analyze all rejected or cancelled travel requests
            </p>
          </div>
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
    </div>
  );
}
