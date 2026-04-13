import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FiClock, FiDollarSign, FiCheck, FiX, FiList, FiRefreshCw } from "react-icons/fi";
import { FaHotel, FaPlane } from "react-icons/fa";
import {
  approveApproval,
  rejectApproval,
} from "../../Redux/Actions/approval.thunks";
import {
  getPendingHotelRequests,
  getPendingFlightRequests,
} from "../../Redux/Actions/manager.thunk";

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

// ── Main Component ──────────────────────────────────────────────────────────

export default function PendingTravelRequestsForManager() {
  const dispatch = useDispatch();
  const {
    pendingHotelRequests,
    loadingPendingRequests,
    pendingFlightRequests,
    loadingPendingFlightRequests,
  } = useSelector((state) => state.manager);

  const [activeTab, setActiveTab] = useState("flight");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    if (activeTab === "flight") {
      dispatch(getPendingFlightRequests());
    } else {
      dispatch(getPendingHotelRequests());
    }
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

  const filteredData = requests.filter(
    (r) =>
      r.type === activeTab &&
      (r.employee.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.bookingRef.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const handleAction = async (id, type, action) => {
    const isApprove = action === "approve";
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
    <div className="min-h-screen bg-slate-100 font-sans">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-[#0A4D68] to-[#088395] flex items-center justify-center shrink-0">
            <FiList size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Pending Travel Requests
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage and approve corporate travel requirements
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loadingActive}
            className="ml-auto inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-lg shadow-sm text-slate-600 hover:text-slate-800 hover:border-slate-300 disabled:opacity-50"
          >
            <FiRefreshCw size={14} className={loadingActive ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        <div className="flex items-end gap-0 mb-5 border-b-2 border-slate-200">
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

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
            label="Urgent"
            value="0"
            Icon={FiCheck}
            borderCls="border-emerald-500"
            iconBgCls="bg-emerald-50"
            iconColorCls="text-emerald-600"
          />
          <StatCard
            label="Estimated Spend"
            value={`₹${filteredData.reduce((s, r) => s + r.estimatedCost, 0).toLocaleString()}`}
            Icon={FiDollarSign}
            borderCls="border-violet-500"
            iconBgCls="bg-violet-50"
            iconColorCls="text-violet-600"
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[860px]">
              <thead>
                <tr className="bg-[#dac448]">
                  <Th>Request ID</Th>
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
                    <td colSpan="7" className="px-4 py-10 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                        <FiList size={28} />
                        <p className="text-sm font-semibold">
                          No {activeTab === "flight" ? "flight" : "hotel"}{" "}
                          requests found
                        </p>
                        <p className="text-xs">
                          There are currently no pending {activeTab} requests to
                          display.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredData.map((r, i) => (
                    <tr
                      key={r.id}
                      className={`transition-colors hover:bg-slate-50 ${
                        i % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <IdCell id={r.id} />
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
                        <StatusBadge status={r.status} />
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
                          className="px-3 py-1 text-xs font-semibold bg-[#0A4D68] text-white rounded-md hover:bg-[#083a50] transition shadow-sm"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* RENDER THE CORRECT MODAL */}
      {selectedRequest && selectedRequest.type === "hotel" && (
        <PendingHotelDetailsModal
          booking={selectedRequest.originalData}
          onClose={() => setSelectedRequest(null)}
          onApprove={handleAction}
          onReject={handleAction}
        />
      )}

      {/* Flight Modal placeholder (if needed) */}
      {selectedRequest && selectedRequest.type === "flight" && (
        <PendingFlightDetailsModal
          booking={selectedRequest.originalData}
          onClose={() => setSelectedRequest(null)}
          onApprove={handleAction}
          onReject={handleAction}
        />
      )}
    </div>
  );
}
