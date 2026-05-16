import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";

import { FiClock, FiDollarSign, FiCheck, FiList, FiRefreshCw, FiX, FiSearch, FiXCircle } from "react-icons/fi";
import { FaHotel, FaPlane, FaRupeeSign } from "react-icons/fa";
import TableScrollWrapper from "../common/TableScrollWrapper";
import {
  fetchApprovals,
  approveApproval,
  rejectApproval,
} from "../../Redux/Actions/approval.thunks";
import { fetchCorporateAdmin } from "../../Redux/Slice/corporateAdminSlice";
import Swal from "sweetalert2";
import PendingHotelDetailsModal, {
  PendingFlightDetailsModal,
} from "./Modal/PendingHotelDetailsModal";
import {
  LabeledField,
  StatCard,
  StatusBadge,
  IdCell,
  SearchBar,
  selectCls,
  Th,
  CustomDropdown,
} from "./Shared/CommonComponents";
import ResponsiveDataTable from "./Shared/ResponsiveDataTable";

// ── Main Component ──────────────────────────────────────────────────────────

export default function PendingTravelRequests() {
  const dispatch = useDispatch();
  const { list } = useSelector(
    (state) => state.approvals,
  );

  const [searchParams] = useSearchParams();
  const typeQuery = searchParams.get("type");

  const [activeTab, setActiveTab] = useState(typeQuery === "hotel" ? "hotel" : "flight");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [travelDate, setTravelDate] = useState(""); // Flight specific
  const [checkIn, setCheckIn] = useState("");     // Hotel specific
  const [checkOut, setCheckOut] = useState("");    // Hotel specific
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    Promise.all([
      dispatch(fetchApprovals({ status: "pending_approval" })),
      dispatch(fetchCorporateAdmin()),
    ]).finally(() => {
      setTimeout(() => setRefreshing(false), 500);
    });
  };

  useEffect(() => {
    dispatch(fetchApprovals({ status: "pending_approval" }));
    dispatch(fetchCorporateAdmin());
  }, [dispatch]);


  const requests = useMemo(() => {
    return list.map((b) => {
      const isHotel = b.bookingType === "hotel";
      const isFlight = b.bookingType === "flight";

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

      const common = {
        id: b._id,
        orderId: b.orderId || "N/A",
        bookingRef: b.bookingReference,
        type: b.bookingType,
        status: b.requestStatus || "pending_approval",
        employee: b.userId?.name
          ? `${b.userId.name.firstName} ${b.userId.name.lastName}`.trim()
          : b.userId?.email || "Employee",
        employeeId: b.userId?.email || "N/A",
        bookedDate: b.createdAt ? new Date(b.createdAt) : new Date(),
        estimatedCost,
        originalData: b, // Important for the detailed modal
        isTravelPassed: isHotel
          ? Boolean(b.hotelRequest?.checkInDate && new Date() > new Date(b.hotelRequest.checkInDate))
          : Boolean(b.flightRequest?.segments?.[0]?.departureDateTime && new Date() > new Date(b.flightRequest.segments[0].departureDateTime)),
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
      const onwardSegments = segments.filter(
        (s) => s.journeyType === "onward",
      );
      const returnSegments = segments.filter(
        (s) => s.journeyType === "return",
      );

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
          onwardSegments[0]?.origin?.city ||
          segments[0]?.origin?.city ||
          "N/A",
        cityTo:
          (returnLeg ? returnLeg.toCity : onwardLeg?.toCity) ||
          segments[segments.length - 1]?.destination?.city ||
          "N/A",
        pnr: b.bookingReference?.substring(0, 6).toUpperCase() || "N/A",
        providerId: "P-882910",
        routes,
      };
    });
  }, [list]);

  const employees = useMemo(() => {
    const names = new Set();
    requests.forEach(r => names.add(r.employee));
    return Array.from(names).sort();
  }, [requests]);

  const filteredData = useMemo(() => {
    return requests.filter((r) => {
      // 1. Tab Type
      if (r.type !== activeTab) return false;

      // 2. Search Term (Employee or ID)
      const matchesSearch = 
        r.employee.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.bookingRef && r.bookingRef.toLowerCase().includes(searchTerm.toLowerCase()));
      if (!matchesSearch) return false;

      // 3. Employee Dropdown
      if (selectedEmployee && r.employee !== selectedEmployee) return false;

      // 4. Status Dropdown
      if (selectedStatus !== "all") {
        const isDiscarded = r.isTravelPassed && r.status === "pending_approval";
        if (selectedStatus === "discarded" && !isDiscarded) return false;
        if (selectedStatus === "pending_approval" && (isDiscarded || r.status !== "pending_approval")) return false;
        if (selectedStatus !== "discarded" && r.status !== selectedStatus) return false;
      }

      // 5. Booking Date Range (createdAt)
      if (dateFrom && new Date(r.bookedDate) < new Date(dateFrom)) return false;
      if (dateTo) {
        const dTo = new Date(dateTo);
        dTo.setHours(23, 59, 59, 999);
        if (new Date(r.bookedDate) > dTo) return false;
      }

      // 6. Travel/Check-in/Check-out Dates
      if (activeTab === "flight") {
        if (travelDate) {
          const tDate = new Date(travelDate).toDateString();
          const rDate = new Date(r.originalData?.flightRequest?.segments?.[0]?.departureDateTime).toDateString();
          if (tDate !== rDate) return false;
        }
      } else {
        if (checkIn) {
          const cIn = new Date(checkIn).toDateString();
          const rIn = new Date(r.checkIn).toDateString();
          if (cIn !== rIn) return false;
        }
        if (checkOut) {
          const cOut = new Date(checkOut).toDateString();
          const rOut = new Date(r.checkOut).toDateString();
          if (cOut !== rOut) return false;
        }
      }

      return true;
    });
  }, [requests, activeTab, searchTerm, selectedEmployee, selectedStatus, dateFrom, dateTo, travelDate, checkIn, checkOut]);

  const resetFilters = () => {
    setSearchTerm("");
    setDateFrom("");
    setDateTo("");
    setTravelDate("");
    setCheckIn("");
    setCheckOut("");
    setSelectedEmployee("");
    setSelectedStatus("all");
  };

  const handleExport = () => {
    if (!filteredData.length) return;
    const isHotel = activeTab === "hotel";
    const headers = isHotel 
      ? ["Order ID", "Employee", "Hotel", "Check-In", "Check-Out", "Amount"]
      : ["Order ID", "Employee", "Route", "Booked Date", "Amount"];
    
    const rows = filteredData.map((r) => {
      if (isHotel) {
        return [
          r.orderId,
          r.employee,
          r.hotelName,
          r.checkIn ? new Date(r.checkIn).toLocaleDateString("en-IN") : "—",
          r.checkOut ? new Date(r.checkOut).toLocaleDateString("en-IN") : "—",
          `₹${r.estimatedCost.toLocaleString()}`,
        ];
      }
      const routeStr = r.routes?.map(l => `${l.fromCode || l.fromCity}→${l.toCode || l.toCity}`).join(" | ") || "—";
      return [
        r.orderId,
        r.employee,
        routeStr,
        r.bookedDate.toLocaleDateString("en-IN"),
        `₹${r.estimatedCost.toLocaleString()}`,
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
    a.download = `pending-${activeTab}s-${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const { corporate } = useSelector((state) => state.corporateAdmin);

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
        } catch {
          Swal.fire("Error", "Could not verify corporate balance. Please try again.", "error");
          return;
        }
      }

      if (currentCorp) {
        const { classification, walletBalance, creditLimit, creditUtilization } = currentCorp;

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
        Swal.fire("Error", "Corporate financial data not found. Approval blocked.", "error");
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

  return (
    <div className="w-full min-w-0 space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0A4D68] to-[#088395] flex items-center justify-center shrink-0">
            <FiList size={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-black text-slate-900 tracking-tight truncate">
              Pending Travel Requests
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage and approve corporate travel requirements
            </p>
          </div>
        </div>
        {/* Refresh button */}
        <button
          onClick={handleRefresh}
          className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold transition-all shadow-sm border ${
            activeTab === "hotel"
              ? "bg-teal-50 border-teal-200 text-[#088395] hover:bg-teal-100"
              : "bg-cyan-50 border-cyan-200 text-[#0A4D68] hover:bg-cyan-100"
          }`}
        >
          <FiRefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

        <div className="flex items-end gap-0 border-b-2 border-slate-200">
          <button
            onClick={() => setActiveTab("flight")}
            className={`flex items-center gap-2 px-5 py-2.5 text-[13px] font-bold transition-all border-b-2 -mb-0.5 rounded-t-lg ${activeTab === "flight" ? "bg-white text-[#0A4D68] border-b-[#0A4D68] shadow-sm" : "text-slate-400 border-transparent hover:text-slate-600 hover:bg-white/60"}`}
          >
            <FaPlane size={14} /> Flight Requests
          </button>
          <button
            onClick={() => setActiveTab("hotel")}
            className={`flex items-center gap-2 px-5 py-2.5 text-[13px] font-bold transition-all border-b-2 -mb-0.5 rounded-t-lg ${activeTab === "hotel" ? "bg-white text-[#088395] border-b-[#088395] shadow-sm" : "text-slate-400 border-transparent hover:text-slate-600 hover:bg-white/60"}`}
          >
            <FaHotel size={14} /> Hotel Requests
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
          <StatCard
            label={`Pending ${activeTab}s`}
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
            label="Awaiting Review"
            value={filteredData.length}
            Icon={FiClock}
            borderCls="border-amber-500"
            iconBgCls="bg-amber-50"
            iconColorCls="text-amber-600"
          />
          <StatCard
            label="Discarded Requests"
            value={filteredData.filter(r => r.isTravelPassed && r.status === "pending_approval").length}
            Icon={FiXCircle}
            borderCls="border-red-500"
            iconBgCls="bg-red-50"
            iconColorCls="text-red-600"
          />
          <StatCard
            label="Estimated Spend"
            value={`${filteredData.reduce((s, r) => s + r.estimatedCost, 0).toLocaleString()}`}
            Icon={FaRupeeSign}
            borderCls="border-violet-500"
            iconBgCls="bg-violet-50"
            iconColorCls="text-violet-600"
          />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100 min-w-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Row 1 */}
            <LabeledField label={<><FiSearch size={10} /> Search Request</>}>
              <SearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Order ID, Name, Ref..."
              />
            </LabeledField>

            <LabeledField label="Booking From">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className={selectCls}
              />
            </LabeledField>

            <LabeledField label="Booking To">
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className={selectCls}
              />
            </LabeledField>

            <LabeledField label="Employee">
              <CustomDropdown
                value={selectedEmployee}
                onChange={setSelectedEmployee}
                options={["", ...employees]}
                placeholder="All Employees"
              />
            </LabeledField>

            {/* Row 2 */}
            {activeTab === "flight" ? (
              <LabeledField label="Travel Date">
                <input
                  type="date"
                  value={travelDate}
                  onChange={(e) => setTravelDate(e.target.value)}
                  className={selectCls}
                />
              </LabeledField>
            ) : (
              <>
                <LabeledField label="Check-In Date">
                  <input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className={selectCls}
                  />
                </LabeledField>
                <LabeledField label="Check-Out Date">
                  <input
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className={selectCls}
                  />
                </LabeledField>
              </>
            )}

            <LabeledField label="Status">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className={selectCls}
              >
                <option value="all">All Status</option>
                <option value="pending_approval">Pending Review</option>
                <option value="discarded">Discarded (Expired)</option>
              </select>
            </LabeledField>

            <div className="flex items-end gap-2 lg:col-span-1">
              <button
                onClick={resetFilters}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-[11px] font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 hover:text-slate-700 transition-colors shadow-sm"
              >
                <FiRefreshCw size={12} /> Reset All
              </button>
            </div>
          </div>
        </div>

        <ResponsiveDataTable
          title={`${activeTab === "flight" ? "Flight" : "Hotel"} Requests`}
          subtitle={`${filteredData.length} record${filteredData.length !== 1 ? "s" : ""} found`}
          tableMinWidth="860px"
          onExport={handleExport}
          exportLabel="Export"
          exportBgClass={activeTab === "hotel" ? "bg-[#088395] hover:bg-[#066f7e]" : "bg-[#0A4D68] hover:bg-[#083d52]"}
          arrowBgClass={activeTab === "hotel" ? "bg-teal-50 border-teal-200 text-[#088395] hover:bg-teal-100" : "bg-cyan-50 border-cyan-200 text-[#0A4D68] hover:bg-cyan-100"}
          footer={
            <div className="px-4 py-2.5 flex justify-between text-xs text-slate-400">
              <span>
                Showing <strong className="text-slate-600">{filteredData.length}</strong> {activeTab} requests
              </span>
              <span>
                Est. Total: <strong className={activeTab === "hotel" ? "text-[#088395]" : "text-[#0A4D68]"}>
                  ₹{filteredData.reduce((s, r) => s + r.estimatedCost, 0).toLocaleString()}
                </strong>
              </span>
            </div>
          }
        >
          <table className="w-full text-left">
            <thead>
              <tr className={activeTab === "hotel" ? "bg-[#0f9041] text-[#ccfbf1]" : "bg-[#0f9041] text-[#ffffff]"}>
                <Th>Order ID</Th>
                <Th>Traveller Name</Th>
                <Th>Requested Date</Th>
                <Th>Est. Amount</Th>
                <Th>Status</Th>
                <Th>{activeTab === "flight" ? "Route" : "Hotel"}</Th>
                <Th>Action</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-16 text-center text-slate-400">
                    <div className="flex justify-center mb-3">
                      <FiList size={32} className="opacity-20" />
                    </div>
                    <p className="font-semibold text-sm">
                      No {activeTab} requests found
                    </p>
                  </td>
                </tr>
              ) : (
                filteredData.map((r, i) => {
                  const isDiscarded = r.isTravelPassed && r.status === "pending_approval";
                  return (
                  <tr
                    key={r.id}
                    className={`transition-colors hover:bg-slate-50 ${
                      i % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                    } ${isDiscarded ? "opacity-60 grayscale-[50%]" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <IdCell id={r.orderId} />
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-[13px] text-slate-800">
                          {r.employee}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {r.employeeId}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-[13px] text-slate-500">
                      {r.bookedDate.toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>

                    <td className="px-4 py-3 font-bold text-slate-900 text-[13px]">
                      ₹{r.estimatedCost.toLocaleString()}
                    </td>

                    <td className="px-4 py-3">
                      {isDiscarded ? (
                        <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded text-[11px] font-semibold border border-slate-200 whitespace-nowrap">
                          Discarded
                        </span>
                      ) : (
                        <StatusBadge status={r.status} />
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        {activeTab === "flight" ? (
                          <div className="flex flex-col gap-1">
                            {r.routes?.map((leg) => (
                              <div
                                key={`${leg.label}-${leg.fromCode}-${leg.toCode}`}
                                className="flex items-center gap-2"
                              >
                                <span className="text-[11px] uppercase text-slate-400 font-semibold tracking-wide">
                                  {leg.label}
                                </span>
                                <span className="font-semibold text-slate-800 text-[13px]">
                                  {leg.fromCode || leg.fromCity} →{" "}
                                  {leg.toCode || leg.toCity}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="font-semibold text-slate-800 text-[13px]">
                            {r.hotelName}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedRequest(r)}
                        disabled={isDiscarded}
                        className={`px-3 py-1 text-xs font-semibold text-white rounded-md transition shadow-sm ${
                          isDiscarded
                            ? "bg-slate-300 cursor-not-allowed"
                            : "bg-[#0A4D68] hover:bg-[#083a50]"
                        }`}
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

      {/* RENDER THE CORRECT MODAL */}
      {selectedRequest && selectedRequest.type === "hotel" && (
        <PendingHotelDetailsModal
          booking={selectedRequest.originalData}
          onClose={() => setSelectedRequest(null)}
          onApprove={handleAction}
          onReject={handleAction}
          isDiscarded={selectedRequest.isTravelPassed && selectedRequest.status === "pending_approval"}
        />
      )}

      {/* Flight Modal placeholder (if needed) */}
      {selectedRequest && selectedRequest.type === "flight" && (
        <PendingFlightDetailsModal
          booking={selectedRequest.originalData}
          onClose={() => setSelectedRequest(null)}
          onApprove={handleAction}
          onReject={handleAction}
          isDiscarded={selectedRequest.isTravelPassed && selectedRequest.status === "pending_approval"}
        />
      )}
    </div>
  );
}
