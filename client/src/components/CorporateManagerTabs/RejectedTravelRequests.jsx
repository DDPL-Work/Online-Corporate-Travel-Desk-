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
  FiClock,
  FiAlertCircle,
} from "react-icons/fi";
import { FaPlane, FaHotel } from "react-icons/fa";
import ResponsiveDataTable from "./Shared/ResponsiveDataTable";
import { useDispatch, useSelector } from "react-redux";
import {
  getRejectedHotelRequests,
  getRejectedFlightRequests,
} from "../../Redux/Actions/manager.thunk";
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
import { Pagination } from "./Shared/Pagination";
import { dateCls, IdCell, LabeledField, SearchBar, selectCls, StatCard, Th } from "./Shared/CommonComponents";

function normalize(rejectedRequests) {
  return rejectedRequests.map((r) => {
    const lead = r.travellers?.find(t => t.isLeadPassenger);

    const employeeName = lead
      ? `${lead.firstName} ${lead.lastName}`
      : "—";
    const employeeEmail = lead
      ? `${lead.email}`
      : "—";

    const amount =
      r.hotelRequest?.selectedRoom?.Price?.totalFare ||
      r.hotelRequest?.allRooms?.[0]?.totalFare ||
      r.bookingSnapshot?.amount ||
      0;

    return {
      id: r._id,
      orderId: r.orderId,
      raw: r,

      // ✅ FIXED
      employee: employeeName,
      employeeMail: employeeEmail,

      type:
        r.bookingType === "flight" || r.flightRequest ? "Flight" : "Hotel",

      destination: r.hotelRequest?.selectedHotel?.hotelName || "N/A",

      rejectedDate: r.rejectedAt,

      rejectedBy:
        r.rejectedByDetails?.name ||
        (r.rejectedBy?.name?.firstName
          ? `${r.rejectedBy.name.firstName} ${r.rejectedBy.name.lastName}`
          : "Admin"),

      reason: r.approverComments || "No reason provided",

      // ✅ FIXED
      estimatedCost: amount,

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
  

  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return flightRequests.filter((r) => {
      const rejDate = new Date(r.rejectedDate);
      const dateOk =
        rejDate >= new Date(startDate) && rejDate <= new Date(endDate);
      const searchOk =
        !q ||
        r.employee.toLowerCase().includes(q) ||
        (r.orderId || "").toLowerCase().includes(q) ||
        r.destination.toLowerCase().includes(q) ||
        r.rejectedBy.toLowerCase().includes(q) ||
        r.id.toString().includes(q);
      return dateOk && searchOk;
    });
  }, [search, startDate, endDate, deptFilter, flightRequests]);

  const paginated = useMemo(() => {
    return filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  }, [filtered, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, startDate, endDate]);

  const totalCost = filtered.reduce((s, r) => s + r.estimatedCost, 0);

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          label="Total Rejected"
          value={filtered.length}
          Icon={FiXCircle}
          borderCls="border-red-500"
          iconBgCls="bg-red-50"
          iconColorCls="text-red-500"
        />
        <StatCard
          label="Estimated Value Rejected"
          value={`₹${totalCost.toLocaleString()}`}
          Icon={FiDollarSign}
          borderCls="border-red-600"
          iconBgCls="bg-red-50"
          iconColorCls="text-red-600"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-6 lg:col-span-6">
            <LabeledField label="Search Rejected History">
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Search by ID, Employee or Reason..."
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
        title="Flight Rejection Records"
        subtitle={`${filtered.length} requests rejected`}
        tableMinWidth="1000px"
        arrowBgClass="bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
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
            <div className="text-[12px] font-black text-red-600 uppercase tracking-widest">
              Total Lost Opportunity: ₹{totalCost.toLocaleString()}
            </div>
          </div>
        }
      >
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-red-700 text-white">
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Order ID</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Employee</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Destination</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Rejected Date</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Rejected By</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Reason</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="7" className="py-20 text-center">
                  <div className="flex flex-col items-center">
                    <FiRefreshCw className="w-8 h-8 text-red-200 animate-spin mb-4" />
                    <p className="text-slate-500 font-bold">Synchronizing history...</p>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-20 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <FiXCircle className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">No Rejections Found</h3>
                    <p className="text-slate-500 text-sm mt-1">There are no rejected flight records matching your view.</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((r, i) => (
                <tr
                  key={r.id}
                  className="group hover:bg-red-50/30 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm font-bold text-red-600 bg-red-50 px-2 py-1 rounded-md border border-red-100">
                      {r.orderId || "N/A"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-800 text-[13px]">{r.employee}</span>
                      <span className="text-[11px] text-slate-400 font-bold truncate max-w-[150px]">{r.employeeMail}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[13px] font-bold text-slate-700">{r.destination}</span>
                  </td>
                  <td className="px-6 py-4 text-[13px] font-bold text-slate-500">
                    {r.rejectedDate
                      ? new Date(r.rejectedDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "N/A"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                        <FiUser className="text-slate-400" size={10} />
                      </div>
                      <span className="text-[12px] font-bold text-slate-600">{r.rejectedBy}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 max-w-[200px]">
                    <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
                      <FiMessageCircle size={12} className="shrink-0" />
                      <p className="text-[11px] font-bold truncate" title={r.reason}>{r.reason}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <button
                        onClick={() => setSelectedRequest(r)}
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
 

  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return hotelRequests.filter((r) => {
      const rejDate = new Date(r.rejectedDate);
      const dateOk =
        rejDate >= new Date(startDate) && rejDate <= new Date(endDate);
      const searchOk =
        !q ||
        r.employee.toLowerCase().includes(q) ||
        (r.orderId || "").toLowerCase().includes(q) ||
        r.destination.toLowerCase().includes(q) ||
        r.rejectedBy.toLowerCase().includes(q) ||
        r.id.toString().includes(q);
      return dateOk && searchOk;
    });
  }, [search, startDate, endDate, deptFilter, hotelRequests]);

  const paginated = useMemo(() => {
    return filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  }, [filtered, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, startDate, endDate]);

  const totalCost = filtered.reduce((s, r) => s + r.estimatedCost, 0);

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          label="Total Rejected"
          value={filtered.length}
          Icon={FiXCircle}
          borderCls="border-red-500"
          iconBgCls="bg-red-50"
          iconColorCls="text-red-500"
        />
        <StatCard
          label="Estimated Value Lost"
          value={`₹${totalCost.toLocaleString()}`}
          Icon={FiDollarSign}
          borderCls="border-red-600"
          iconBgCls="bg-red-50"
          iconColorCls="text-red-600"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-6 lg:col-span-6">
            <LabeledField label="Search Rejected History">
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
        title="Hotel Rejection Records"
        subtitle={`${filtered.length} requests rejected`}
        tableMinWidth="1000px"
        arrowBgClass="bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
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
            <div className="text-[12px] font-black text-red-600 uppercase tracking-widest">
              Total Lost Opportunity: ₹{totalCost.toLocaleString()}
            </div>
          </div>
        }
      >
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-red-700 text-white">
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Order ID</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Employee</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Rejected Date</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Rejected By</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Reason</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Est. Cost</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="7" className="py-20 text-center">
                  <div className="flex flex-col items-center">
                    <FiRefreshCw className="w-8 h-8 text-red-200 animate-spin mb-4" />
                    <p className="text-slate-500 font-bold">Synchronizing history...</p>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-20 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <FiXCircle className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">No Rejections Found</h3>
                    <p className="text-slate-500 text-sm mt-1">There are no rejected hotel records matching your view.</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((r, i) => (
                <tr
                  key={r.id}
                  className="group hover:bg-red-50/30 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm font-bold text-red-600 bg-red-50 px-2 py-1 rounded-md border border-red-100">
                      {r.orderId || "N/A"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-800 text-[13px]">{r.employee}</span>
                      <span className="text-[11px] text-slate-400 font-bold truncate max-w-[150px]">{r.employeeMail}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[13px] font-bold text-slate-500">
                    {r.rejectedDate
                      ? new Date(r.rejectedDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "N/A"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                        <FiUser className="text-slate-400" size={10} />
                      </div>
                      <span className="text-[12px] font-bold text-slate-600">{r.rejectedBy}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 max-w-[200px]">
                    <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
                      <FiMessageCircle size={12} className="shrink-0" />
                      <p className="text-[11px] font-bold truncate" title={r.reason}>{r.reason}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-black text-slate-900">₹{r.estimatedCost.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <button
                        onClick={() => setSelectedRequest(r)}
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
export default function RejectedTravelRequestsForManager() {
  const [activeTab, setActiveTab] = useState("flight");

  const dispatch = useDispatch();
  const {
    rejectedHotelRequests,
    rejectedFlightRequests,
    loadingRejectedRequests,
    loadingRejectedFlightRequests,
  } = useSelector((state) => state.manager);

  useEffect(() => {
    if (activeTab === "flight") {
      dispatch(getRejectedFlightRequests());
    } else {
      dispatch(getRejectedHotelRequests());
    }
  }, [activeTab, dispatch]);

  const allRequests = useMemo(
    () => normalize([
      ...(rejectedFlightRequests || []),
      ...(rejectedHotelRequests || []),
    ]),
    [rejectedFlightRequests, rejectedHotelRequests],
  );

  const loadingActive =
    activeTab === "flight"
      ? loadingRejectedFlightRequests
      : loadingRejectedRequests;

  const handleRefresh = () => {
    if (activeTab === "flight") {
      dispatch(getRejectedFlightRequests());
      return;
    }
    dispatch(getRejectedHotelRequests());
  };

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        
        {/* Header Card */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-red-600 to-red-400 flex items-center justify-center shadow-lg text-white shrink-0">
              <FiXCircle size={24} />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase leading-none truncate">
                Rejection Queue
              </h1>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 font-bold uppercase tracking-widest truncate">
                Review and analyze rejected travel requirements
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={handleRefresh}
              disabled={loadingActive}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-bold transition-all shadow-sm border bg-red-50 border-red-200 text-red-600 hover:bg-red-100 active:scale-95 disabled:opacity-50"
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
        {activeTab === "flight" ? (
          <FlightSection
            allRequests={allRequests}
            loading={loadingRejectedFlightRequests}
          />
        ) : (
          <HotelSection
            allRequests={allRequests}
            loading={loadingRejectedRequests}
          />
        )}
      </div>
    </div>
  );
}
