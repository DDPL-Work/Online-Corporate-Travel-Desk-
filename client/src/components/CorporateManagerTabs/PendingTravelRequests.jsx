import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FiClock,
  FiDollarSign,
  FiCheck,
  FiX,
  FiList,
  FiRefreshCw,
  FiAlertCircle,
  FiXCircle,
} from "react-icons/fi";
import { FaHotel, FaPlane } from "react-icons/fa";
import {
  approveApproval,
  rejectApproval,
} from "../../Redux/Actions/approval.thunks";
import {
  getPendingHotelRequests,
  getPendingFlightRequests,
  getMyEmployees,
} from "../../Redux/Actions/manager.thunk";
import { fetchCorporateAdmin } from "../../Redux/Slice/corporateAdminSlice";
import ResponsiveDataTable from "./Shared/ResponsiveDataTable";
import { Pagination } from "./Shared/Pagination";
import { FiSearch } from "react-icons/fi";

import Swal from "sweetalert2";
import PendingHotelDetailsModal, {
  PendingFlightDetailsModal,
} from "./Modal/PendingHotelDetailsModal";
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

// ── FilterChip ───────────────────────────────────────────────────────────────
function FilterChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 bg-[#0A4D68]/8 border border-[#0A4D68]/20 text-[#0A4D68] rounded-lg text-[10px] font-black uppercase tracking-wider">
      {label}
      <button
        onClick={onRemove}
        className="w-4 h-4 rounded-md flex items-center justify-center hover:bg-[#0A4D68]/20 transition-colors"
      >
        <FiX size={9} />
      </button>
    </span>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function PendingTravelRequestsForManager() {
  const dispatch = useDispatch();
  const {
    pendingHotelRequests,
    loadingPendingRequests,
    pendingFlightRequests,
    loadingPendingFlightRequests,
    myEmployees,
  } = useSelector((state) => state.manager);

  const [activeTab, setActiveTab] = useState("flight");
  const [searchTerm, setSearchTerm] = useState("");
  // ── Date / range filters ───────────────────────────────────────────────────
  const [bookingFrom, setBookingFrom] = useState("");   // booking created date range
  const [bookingTo, setBookingTo]     = useState("");
  const [travelFrom, setTravelFrom]   = useState("");   // travel/check-in date (single filter)
  // ── Dropdown filters ───────────────────────────────────────────────────────
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedStatus,   setSelectedStatus]   = useState("");
  // ── Modal ─────────────────────────────────────────────────────────────────
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    if (activeTab === "flight") {
      dispatch(getPendingFlightRequests());
    } else {
      dispatch(getPendingHotelRequests());
    }
    dispatch(fetchCorporateAdmin());
    dispatch(getMyEmployees());
  }, [activeTab, dispatch]);

  const loadingActive =
    activeTab === "flight"
      ? loadingPendingFlightRequests
      : loadingPendingRequests;

  const handleRefresh = () => {
    if (activeTab === "flight") {
      dispatch(getPendingFlightRequests());
      return;
    }
    dispatch(getPendingHotelRequests());
  };

  const requests = useMemo(() => {
    const source =
      activeTab === "flight" ? pendingFlightRequests : pendingHotelRequests;

    return source.map((b) => {
      const bookingType = b.bookingType || activeTab;
      const isHotel = bookingType === "hotel";
      const isFlight = bookingType === "flight";

      const estimatedCost = (() => {
        if (isHotel) {
          const rooms = b.hotelRequest?.selectedRoom?.rawRoomData || [];
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

        if (isFlight) {
          return (
            b.pricingSnapshot?.totalAmount ||
            b.bookingSnapshot?.amount ||
            b.flightRequest?.fareSnapshot?.publishedFare ||
            0
          );
        }

        return 0;
      })();

      const leadTraveller = b.travellers?.find((t) => t.isLeadPassenger);

      const common = {
        id: b._id,
        orderId: b.orderId,
        bookingRef: b.bookingReference,
        type: bookingType,
        status: b.requestStatus || "pending_approval",
        employee: leadTraveller
          ? `${leadTraveller.firstName} ${leadTraveller.lastName}`
          : "N/A",

        employeeId:
          leadTraveller?.email || leadTraveller?.phoneWithCode || "N/A",
        bookedDate: b.createdAt ? new Date(b.createdAt) : new Date(),
        estimatedCost,
        originalData: b, // Important for the detailed modal
        isTravelPassed: isHotel
          ? Boolean(
              b.hotelRequest?.checkInDate &&
              new Date() > new Date(b.hotelRequest.checkInDate),
            )
          : Boolean(
              b.flightRequest?.segments?.[0]?.departureDateTime &&
              new Date() >
                new Date(b.flightRequest.segments[0].departureDateTime),
            ),
      };

      if (isHotel) {
        const hotelReq = b.hotelRequest || {};
        return {
          ...common,
          hotelName: hotelReq.selectedHotel?.hotelName || "N/A",
          city: hotelReq.selectedHotel?.city || "N/A",
          checkIn: hotelReq.checkInDate,
          checkOut: hotelReq.checkOutDate,
          roomName:
            hotelReq.selectedRoom?.rawRoomData?.Name?.[0] || "Standard Room",
        };
      }

      const segments = b.flightRequest?.segments || [];
      const onwardSegments = segments.filter((s) => s.journeyType === "onward");
      const returnSegments = segments.filter((s) => s.journeyType === "return");

      const buildLeg = (segs, label) => {
        if (!segs.length) return null;
        const first = segs[0];
        const last = segs[segs.length - 1];

        return {
          label,
          fromCity: first?.origin?.city || first?.origin?.airportCode || "N/A",
          toCity:
            last?.destination?.city || last?.destination?.airportCode || "N/A",
          fromCode: first?.origin?.airportCode || "",
          toCode: last?.destination?.airportCode || "",
        };
      };

      const routes = [];
      const onwardLeg = buildLeg(onwardSegments, "Onward");
      const returnLeg = buildLeg(returnSegments, "Return");

      if (onwardLeg) routes.push(onwardLeg);
      if (returnLeg) routes.push(returnLeg);
      if (!routes.length) {
        const fallbackLeg = buildLeg(segments, "Route");
        if (fallbackLeg) routes.push(fallbackLeg);
      }
      return {
        ...common,
        cityFrom:
          onwardSegments[0]?.origin?.city || segments[0]?.origin?.city || "N/A",
        cityTo:
          (returnLeg ? returnLeg.toCity : onwardLeg?.toCity) ||
          segments[segments.length - 1]?.destination?.city ||
          "N/A",
        pnr: b.bookingReference?.substring(0, 6).toUpperCase() || "N/A",
        providerId: "P-882910",
        routes,
      };
    });
  }, [activeTab, pendingFlightRequests, pendingHotelRequests]);

  // ── Unique employee names for dropdown (from team list) ────────────────────
  const employeeOptions = useMemo(() => {
    // Show all employees in the team dropdown
    const names = myEmployees.map(emp => emp.name).filter(Boolean);
    return [...new Set(names)].sort();
  }, [myEmployees]);

  // ── Filtered data (all filters applied) ──────────────────────────────────
  const filteredData = useMemo(() => {
    const bFromTs = bookingFrom ? new Date(bookingFrom).setHours(0,0,0,0) : null;
    const bToTs   = bookingTo   ? new Date(bookingTo).setHours(23,59,59,999) : null;
    const tFromTs = travelFrom  ? new Date(travelFrom).setHours(0,0,0,0) : null;

    return requests.filter(r => {
      if (r.type !== activeTab) return false;

      // ── Search bar ─────────────────────────────────────────────────────
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matched =
          r.employee.toLowerCase().includes(q) ||
          (r.orderId || "").toLowerCase().includes(q) ||
          r.bookingRef.toLowerCase().includes(q) ||
          (r.hotelName || "").toLowerCase().includes(q) ||
          (r.city || "").toLowerCase().includes(q);
        if (!matched) return false;
      }

      // ── Employee dropdown ───────────────────────────────────────────────
      if (selectedEmployee && r.employee !== selectedEmployee) return false;

      // ── Status dropdown ─────────────────────────────────────────────────
      if (selectedStatus) {
        const effectiveStatus = (r.isTravelPassed && r.status === "pending_approval") ? "discarded" : r.status;
        if (effectiveStatus !== selectedStatus) return false;
      }

      // ── Booking date range ──────────────────────────────────────────────
      const bookedTs = r.bookedDate.getTime();
      if (bFromTs && bookedTs < bFromTs) return false;
      if (bToTs   && bookedTs > bToTs)   return false;

      // ── Travel / check-in date range ───────────────────────────────────
      if (tFromTs) {
        const travelDateRaw = activeTab === "flight"
          ? r.originalData?.flightRequest?.segments?.[0]?.departureDateTime
          : r.originalData?.hotelRequest?.checkInDate;
        const travelDateEnd = activeTab === "hotel"
          ? r.originalData?.hotelRequest?.checkOutDate
          : null;

        if (travelDateRaw) {
          const travelTs = new Date(travelDateRaw).getTime();
          if (tFromTs && travelTs < tFromTs) return false;
        } else {
          return false; // no travel date — exclude when date filter active
        }
      }

      return true;
    });
  }, [requests, activeTab, searchTerm, selectedEmployee, selectedStatus, bookingFrom, bookingTo, travelFrom]);

  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const paginatedData = useMemo(() => {
    return filteredData.slice(
      (currentPage - 1) * PAGE_SIZE,
      currentPage * PAGE_SIZE,
    );
  }, [filteredData, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab, selectedEmployee, selectedStatus, bookingFrom, bookingTo, travelFrom]);

  // Reset all filters when tab switches
  useEffect(() => {
    setSearchTerm("");
    setBookingFrom("");
    setBookingTo("");
    setTravelFrom("");
    setSelectedEmployee("");
    setSelectedStatus("");
  }, [activeTab]);

  const { corporate } = useSelector((state) => state.corporateAdmin);
  // ... rest of handleAction ...

  const handleAction = async (id, type, action) => {
    const isApprove = action === "approve";

    // 💰 CREDIT CHECK LOGIC
    if (isApprove) {
      const request = requests.find((r) => r.id === id);
      const estimatedCost = request?.estimatedCost || 0;

      let currentCorp = corporate;
      if (!currentCorp) {
        try {
          const res = await dispatch(fetchCorporateAdmin()).unwrap();
          currentCorp = res;
        } catch (err) {
          Swal.fire(
            "Error",
            "Could not verify corporate balance. Please try again.",
            "error",
          );
          return;
        }
      }

      if (currentCorp) {
        const {
          classification,
          walletBalance,
          creditLimit,
          creditUtilization,
        } = currentCorp;

        if (classification === "prepaid") {
          const balance = walletBalance || 0;
          if (balance < estimatedCost) {
            await Swal.fire({
              title: "Insufficient Wallet Balance",
              text: `Wallet balance (₹${balance.toLocaleString()}) is less than the booking amount (₹${estimatedCost.toLocaleString()}). Please recharge your wallet to proceed.`,
              icon: "error",
              confirmButtonColor: "#0A4D68",
            });
            return;
          }
        } else if (classification === "postpaid") {
          const limit = creditLimit || 0;
          const utilization = creditUtilization || 0;
          const usedCredit = (limit * utilization) / 100;
          const availableCredit = limit - usedCredit;

          if (availableCredit < estimatedCost) {
            await Swal.fire({
              title: "Insufficient Credit Limit",
              text: `Available credit limit (₹${availableCredit.toLocaleString()}) is less than the booking amount (₹${estimatedCost.toLocaleString()}). Approval blocked.`,
              icon: "error",
              confirmButtonColor: "#0A4D68",
            });
            return;
          }
        }
      } else {
        Swal.fire(
          "Error",
          "Corporate financial data not found. Approval blocked.",
          "error",
        );
        return;
      }
    }

    const result = await Swal.fire({
      title: `${isApprove ? "Approve" : "Reject"} Request`,
      text: isApprove ? "Confirm approval?" : "Provide a reason for rejection",
      input: isApprove ? null : "textarea",
      icon: isApprove ? "question" : "warning",
      showCancelButton: true,
      confirmButtonColor: isApprove ? "#16a34a" : "#dc2626",
    });

    if (result.isConfirmed) {
      const actionThunk = isApprove ? approveApproval : rejectApproval;
      dispatch(actionThunk({ id, comments: result.value || "", type }))
        .unwrap()
        .then(() => {
          Swal.fire("Success", `Request ${action}d successfully`, "success");
          setSelectedRequest(null);
        })
        .catch((err) => Swal.fire("Error", err || "Update failed", "error"));
    }
  };

  const { user } = useSelector((state) => state.auth);
  const isVerified = user?.managerRequestStatus === "approved";

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Verification Alert */}
        {!isVerified && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center gap-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <FiAlertCircle className="text-amber-600" size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-amber-900 tracking-tight">
                Account Verification Pending
              </h3>
              <p className="text-[12px] text-amber-700 mt-0.5 leading-relaxed">
                Your manager account is awaiting verification. You'll be able to
                approve requests once verified by your Travel Admin.
              </p>
            </div>
          </div>
        )}

        {/* Header Card */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#0A4D68] to-[#088395] flex items-center justify-center shadow-lg text-white shrink-0">
              <FiList size={24} />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase leading-none truncate">
                Approval Queue
              </h1>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 font-bold uppercase tracking-widest truncate">
                Review and manage employee travel requirements
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={handleRefresh}
              disabled={loadingActive}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-bold transition-all shadow-sm border bg-cyan-50 border-cyan-200 text-[#0A4D68] hover:bg-cyan-100 active:scale-95 disabled:opacity-50"
            >
              <FiRefreshCw
                size={14}
                className={loadingActive ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-slate-200/50 p-1.5 rounded-2xl w-fit shadow-inner">
          <button
            onClick={() => setActiveTab("flight")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${
              activeTab === "flight"
                ? "bg-white text-[#0A4D68] shadow-md"
                : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
            }`}
          >
            <FaPlane size={14} />
            Flight Requests
          </button>
          <button
            onClick={() => setActiveTab("hotel")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${
              activeTab === "hotel"
                ? "bg-white text-[#088395] shadow-md"
                : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
            }`}
          >
            <FaHotel size={14} />
            Hotel Requests
          </button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label={`Total ${activeTab}s`}
            value={filteredData.length}
            Icon={activeTab === "flight" ? FaPlane : FaHotel}
            borderCls={
              activeTab === "flight" ? "border-[#0A4D68]" : "border-[#088395]"
            }
            iconBgCls={
              activeTab === "flight" ? "bg-[#0A4D68]/10" : "bg-[#088395]/10"
            }
            iconColorCls={
              activeTab === "flight" ? "text-[#0A4D68]" : "text-[#088395]"
            }
          />
          <StatCard
            label="Awaiting Urgent Review"
            value={filteredData.filter((r) => !r.isTravelPassed).length}
            Icon={FiClock}
            borderCls="border-emerald-500"
            iconBgCls="bg-emerald-50"
            iconColorCls="text-emerald-600"
          />
          <StatCard
            label="Expired / Discarded"
            value={filteredData.filter((r) => r.isTravelPassed).length}
            Icon={FiXCircle}
            borderCls="border-red-500"
            iconBgCls="bg-red-50"
            iconColorCls="text-red-600"
          />
        </div>

        {/* ── Filter Panel ────────────────────────────────────────────────────── */}
        {(() => {
          const isFlight = activeTab === "flight";
          const activeFiltersCount = [
            searchTerm, selectedEmployee, selectedStatus,
            bookingFrom, bookingTo, travelFrom,
          ].filter(Boolean).length;

          const inputCls = "w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-medium outline-none focus:ring-2 focus:ring-[#0A4D68]/15 focus:border-[#0A4D68] transition-all placeholder:text-slate-400";
          const labelCls = "block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5";

          const handleClearAll = () => {
            setSearchTerm("");
            setBookingFrom("");
            setBookingTo("");
            setTravelFrom("");
            setSelectedEmployee("");
            setSelectedStatus("");
          };

          return (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Filter header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
                <div className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 text-[#0A4D68]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 9h10M10 14h4" />
                  </svg>
                  <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest">
                    Filters
                  </span>
                  {activeFiltersCount > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 bg-[#0A4D68] text-white text-[10px] font-black rounded-full">
                      {activeFiltersCount}
                    </span>
                  )}
                </div>
                <button
                  onClick={handleClearAll}
                  disabled={activeFiltersCount === 0}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${
                    activeFiltersCount > 0
                      ? "bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 active:scale-95"
                      : "bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed opacity-60"
                  }`}
                >
                  <FiX size={11} />
                  Reset Filters
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Row 1: Search + Employee + Status */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Search */}
                  <div className="md:col-span-5">
                    <label className={labelCls}>Search</label>
                    <div className="relative group">
                      <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0A4D68] transition-colors" size={14} />
                      <input
                        type="text"
                        placeholder={isFlight ? "Order ID, traveller, route..." : "Order ID, hotel name, city..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={inputCls + " pl-9"}
                      />
                    </div>
                  </div>

                  {/* Employee */}
                  <div className="md:col-span-4">
                    <label className={labelCls}>Employee</label>
                    <select
                      value={selectedEmployee}
                      onChange={(e) => setSelectedEmployee(e.target.value)}
                      className={inputCls}
                    >
                      <option value="">All Employees</option>
                      {employeeOptions.map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Status */}
                  <div className="md:col-span-3">
                    <label className={labelCls}>Status</label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className={inputCls}
                    >
                      <option value="">All Statuses</option>
                      <option value="pending_approval">Pending Approval</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="discarded">Discarded (Expired)</option>
                    </select>
                  </div>
                </div>

                {/* Row 2: Booking Date range + Travel / Check-in+Check-out */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-1">
                  {/* Booking From */}
                  <div className="md:col-span-3">
                    <label className={labelCls}>Booking From</label>
                    <input
                      type="date"
                      value={bookingFrom}
                      onChange={(e) => setBookingFrom(e.target.value)}
                      max={bookingTo || undefined}
                      className={inputCls}
                    />
                  </div>

                  {/* Booking To */}
                  <div className="md:col-span-3">
                    <label className={labelCls}>Booking To</label>
                    <input
                      type="date"
                      value={bookingTo}
                      onChange={(e) => setBookingTo(e.target.value)}
                      min={bookingFrom || undefined}
                      className={inputCls}
                    />
                  </div>

                  {/* Travel / Check-in — single date */}
                  <div className="md:col-span-4">
                    <label className={labelCls}>{isFlight ? "Travel Date" : "Check-in Date"}</label>
                    <input
                      type="date"
                      value={travelFrom}
                      onChange={(e) => setTravelFrom(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>

                {/* Active filter chips */}
                {activeFiltersCount > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
                    {searchTerm && (
                      <FilterChip label={`"${searchTerm}"`} onRemove={() => setSearchTerm("")} />
                    )}
                    {selectedEmployee && (
                      <FilterChip label={selectedEmployee} onRemove={() => setSelectedEmployee("")} />
                    )}
                    {selectedStatus && (
                      <FilterChip label={selectedStatus.replace("_", " ")} onRemove={() => setSelectedStatus("")} />
                    )}
                    {bookingFrom && (
                      <FilterChip label={`Booking ≥ ${bookingFrom}`} onRemove={() => setBookingFrom("")} />
                    )}
                    {bookingTo && (
                      <FilterChip label={`Booking ≤ ${bookingTo}`} onRemove={() => setBookingTo("")} />
                    )}
                    {travelFrom && (
                      <FilterChip label={`${isFlight ? "Travel" : "Check-in"}: ${travelFrom}`} onRemove={() => setTravelFrom("")} />
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Data Table */}
        <ResponsiveDataTable
          title={`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Approval Queue`}
          subtitle={`${filteredData.length} request${filteredData.length !== 1 ? "s" : ""} pending`}
          tableMinWidth="1000px"
          arrowBgClass="bg-cyan-50 border-cyan-200 text-[#0A4D68] hover:bg-cyan-100"
          pagination={
            <Pagination
              currentPage={currentPage}
              totalItems={filteredData.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          }
          footer={
            <div className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Showing{" "}
              <span className="text-slate-900">{paginatedData.length}</span> of{" "}
              <span className="text-slate-900">{filteredData.length}</span>{" "}
              entries
            </div>
          }
        >
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#0A4D68] text-white">
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">
                  Order ID
                </th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">
                  Traveller
                </th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">
                  Requested On
                </th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">
                  Amount
                </th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">
                  {activeTab === "flight" ? "Route" : "Hotel"}
                </th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">
                  Status
                </th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-center">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <FiList className="w-8 h-8 text-slate-300" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-800">
                        No Requests Found
                      </h3>
                      <p className="text-slate-500 text-sm mt-1">
                        There are no pending {activeTab} approvals matching your
                        current view.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((r, i) => {
                  const isDiscarded =
                    r.isTravelPassed && r.status === "pending_approval";
                  return (
                    <tr
                      key={r.id}
                      className={`group hover:bg-slate-50 transition-colors ${isDiscarded ? "opacity-60 grayscale-[40%]" : ""}`}
                    >
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">
                          {r.orderId || "N/A"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-800 text-[13px]">
                            {r.employee}
                          </span>
                          <span className="text-[11px] text-slate-400 font-bold truncate max-w-[150px]">
                            {r.employeeId}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[13px] font-bold text-slate-600">
                        {r.bookedDate.toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-black text-slate-900">
                          ₹{Math.ceil(r.estimatedCost).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {activeTab === "flight" ? (
                          <div className="flex flex-col gap-1">
                            {r.routes?.map((leg, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2"
                              >
                                <span className="font-bold text-slate-700 text-[12px]">
                                  {leg.fromCode} → {leg.toCode}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 text-[13px] line-clamp-1">
                              {r.hotelName}
                            </span>
                            <span className="text-[11px] text-slate-400 font-bold">
                              {r.city}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isDiscarded ? (
                          <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200">
                            Discarded
                          </span>
                        ) : (
                          <StatusBadge status={r.status} />
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <button
                            onClick={() => setSelectedRequest(r)}
                            className="inline-flex items-center gap-2 px-5 py-2 bg-slate-800 text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-900 transition-all active:scale-95 shadow-md shadow-slate-200"
                          >
                            <FiList size={12} /> View
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </ResponsiveDataTable>
      </div>

      {/* RENDER THE CORRECT MODAL */}
      {selectedRequest && selectedRequest.type === "hotel" && (
        <PendingHotelDetailsModal
          booking={selectedRequest.originalData}
          onClose={() => setSelectedRequest(null)}
          onApprove={handleAction}
          onReject={handleAction}
          isVerified={isVerified}
          isDiscarded={selectedRequest.isTravelPassed}
        />
      )}

      {/* Flight Modal placeholder (if needed) */}
      {selectedRequest && selectedRequest.type === "flight" && (
        <PendingFlightDetailsModal
          booking={selectedRequest.originalData}
          onClose={() => setSelectedRequest(null)}
          onApprove={handleAction}
          onReject={handleAction}
          isVerified={isVerified}
          isDiscarded={selectedRequest.isTravelPassed}
        />
      )}
    </div>
  );
}
