import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  FiArrowLeft,
  FiUser,
  FiCalendar,
  FiMail,
  FiPhone,
  FiMapPin,
  FiClock,
  FiTag,
  FiShield,
  FiDollarSign,
  FiList,
  FiHome,
  FiInfo,
  FiStar,
  FiCheckCircle,
  FiXCircle,
  FiBriefcase,
  FiKey,
} from "react-icons/fi";
import { FaHotel } from "react-icons/fa";
import {
  formatDate,
  formatDateTime,
  formatDateWithYear,
} from "../../../utils/formatter";
import { getHotelBookingByIdAdmin } from "../../../Redux/Actions/travelAdmin.thunks";
import {
  approveApproval,
  rejectApproval,
} from "../../../Redux/Actions/approval.thunks";
import Swal from "sweetalert2";
import { SectionLabel, InfoRow, InfoBadge } from "./Shared/CommonComponents";

/* ────────────────────────────────────────────────────────────── */
/*  Utility helpers                                               */
/* ────────────────────────────────────────────────────────────── */
const resolveApproverDetails = (booking) => {
  const approver =
    booking?.approverId ||
    booking?.approvedBy ||
    booking?.approvedByDetails ||
    {};

  const isId = (val) => typeof val === "string" && /^[0-9a-fA-F]{24}$/.test(val);

  const rawFirst =
    approver?.name?.firstName || approver?.firstName || booking?.approverName;
  const rawLast =
    approver?.name?.lastName || approver?.lastName || booking?.approverLastName;

  const first = isId(rawFirst) ? "" : rawFirst || "";
  const last = isId(rawLast) ? "" : rawLast || "";

  let name = `${first} ${last}`.trim();

  if (!name && typeof approver?.name === "string" && !isId(approver.name)) {
    name = approver.name;
  }

  if (!name || name === "Not assigned") {
    const email = approver?.email || booking?.approverEmail;
    if (email && email !== "N/A") {
      name = email.split("@")[0].replace(/[._]/g, " ");
    } else {
      name = "Not assigned";
    }
  }

  return {
    name,
    email: approver?.email || booking?.approverEmail || "N/A",
    role: approver?.role || booking?.approverRole || "manager",
  };
};

/* ────────────────────────────────────────────────────────────── */
/*  Main Component                                                */
/* ────────────────────────────────────────────────────────────── */

export default function PendingHotelApprovalPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      setLoading(true);
      dispatch(getHotelBookingByIdAdmin(id))
        .unwrap()
        .then((res) => {
          setBooking(res);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
          toast.error("Failed to load request details");
        });
    }
  }, [id, dispatch]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F4]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#088395] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#088395] font-bold animate-pulse">Loading hotel details...</p>
        </div>
      </div>
    );
  }

  if (!booking) return null;

  const hotel = booking.hotelRequest?.selectedHotel || {};
  const room = booking.hotelRequest?.selectedRoom || {};
  const rawRooms = Array.isArray(room?.rawRoomData) ? room.rawRoomData : room?.rawRoomData ? [room.rawRoomData] : [];
  const travelers = booking.travellers || [];
  const bookingSnapshot = booking.bookingSnapshot || {};
  const approver = resolveApproverDetails(booking);
  
  const project = {
    name: booking.projectName || booking.project?.name,
    id: booking.projectId || booking.project?.id,
    client: booking.projectClient || booking.project?.client,
  };

  const handleAction = async (action) => {
    const isApprove = action === "approve";
    
    const result = await Swal.fire({
      title: `${isApprove ? "Approve" : "Reject"} Request`,
      text: isApprove ? "Confirm approval of this hotel request?" : "Provide a reason for rejection",
      input: isApprove ? null : "textarea",
      icon: isApprove ? "question" : "warning",
      showCancelButton: true,
      confirmButtonColor: isApprove ? "#16a34a" : "#dc2626",
      confirmButtonText: isApprove ? "Yes, Approve" : "Reject Request",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      const actionThunk = isApprove ? approveApproval : rejectApproval;
      dispatch(actionThunk({ id: booking._id, comments: result.value || "", type: "hotel" }))
        .unwrap()
        .then(() => {
          Swal.fire("Success", `Request ${action}d successfully`, "success");
          navigate("/travel-requests");
        })
        .catch((err) => Swal.fire("Error", err || "Action failed", "error"));
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F4] font-sans pb-20">
      {/* ── Header ── */}
      <div className="bg-[#000D26] text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-[#088395] hover:text-[#0AA3B8] transition-colors mb-6 group"
          >
            <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-bold uppercase tracking-widest">Back to Requests</span>
          </button>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#088395]/20 flex items-center justify-center text-[#088395]">
                  <FaHotel size={20} />
                </div>
                <h1 className="text-3xl font-black tracking-tight">Pending Hotel Approval</h1>
              </div>
              <p className="text-slate-400 font-mono text-sm uppercase tracking-wider">
                Ref: {booking.bookingReference}
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => handleAction("reject")}
                className="px-6 py-3 bg-red-500/10 border border-red-500/50 text-red-400 hover:bg-red-500 hover:text-white font-bold text-xs rounded-xl transition-all uppercase tracking-widest"
              >
                Reject Request
              </button>
              <button
                onClick={() => handleAction("approve")}
                className="px-8 py-3 bg-[#088395] text-white hover:bg-[#0AA3B8] font-bold text-xs rounded-xl shadow-lg shadow-[#088395]/20 transition-all uppercase tracking-widest"
              >
                Approve & Book
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* ── Left Column: Property & Rooms ── */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Status Bar */}
            <div className="bg-white rounded-2xl border border-[#E8E0D0] p-6 flex flex-wrap items-center justify-between gap-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="px-4 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Awaiting Approval
                </div>
                <div className="h-6 w-[1px] bg-[#E8E0D0]" />
                <div className="flex items-center gap-2 text-slate-500">
                  <FiClock size={14} className="text-[#088395]" />
                  <span className="text-xs font-bold uppercase tracking-wide">Submitted: {formatDateTime(booking.createdAt)}</span>
                </div>
              </div>
              <div className="flex items-center gap-6 text-right">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Check-In</p>
                  <p className="text-sm font-black text-slate-900">{formatDate(booking.hotelRequest?.checkInDate)}</p>
                </div>
                <div className="w-[1px] h-8 bg-slate-100" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Check-Out</p>
                  <p className="text-sm font-black text-slate-900">{formatDate(booking.hotelRequest?.checkOutDate)}</p>
                </div>
              </div>
            </div>

            {/* Hotel Details Card */}
            <div className="bg-white rounded-2xl border border-[#E8E0D0] overflow-hidden shadow-sm">
              <div className="flex flex-col md:flex-row">
                <div className="md:w-1/3 relative h-64 md:h-auto overflow-hidden bg-slate-100">
                  <img
                    src={hotel.images?.[0] || bookingSnapshot.hotelImage || "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=800"}
                    alt={hotel.hotelName}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 left-4">
                    <InfoBadge color="amber">
                      <FiStar size={10} className="mr-1 fill-amber-500" /> {hotel.starRating} Stars
                    </InfoBadge>
                  </div>
                </div>
                <div className="p-8 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 mb-1">{hotel.hotelName}</h2>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                        <FiMapPin className="text-[#088395]" /> {hotel.city}, {hotel.address}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6 border-y border-slate-50">
                    <TravellerField icon={<FiCalendar />} label="Duration" value={`${booking.hotelRequest?.noOfNights || 1} Nights`} />
                    <TravellerField icon={<FiHome />} label="Rooms" value={`${booking.hotelRequest?.noOfRooms || 1} Unit`} />
                    <TravellerField icon={<FiUser />} label="Adults" value={booking.hotelRequest?.roomGuests?.[0]?.noOfAdults || 0} />
                    <TravellerField icon={<FiUser />} label="Children" value={booking.hotelRequest?.roomGuests?.[0]?.noOfChild || 0} />
                  </div>

                  <div className="pt-6">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Key Amenities</p>
                    <div className="flex flex-wrap gap-2">
                       {hotel.hotelAmenities?.slice(0, 6).map((a, i) => (
                         <span key={i} className="px-3 py-1 bg-slate-50 border border-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider rounded-lg">
                           {a}
                         </span>
                       ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Room Selections */}
            <div className="bg-white rounded-2xl border border-[#E8E0D0] overflow-hidden shadow-sm">
              <div className="bg-slate-50 px-6 py-4 border-b border-[#E8E0D0]">
                <SectionLabel icon={<FiHome />} title="Selected Room Details" />
              </div>
              <div className="divide-y divide-slate-100">
                {rawRooms.map((r, idx) => (
                  <div key={idx} className="p-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                      <div>
                        <h3 className="text-xl font-black text-slate-900 mb-1">{r.Name?.[0] || "Standard Room"}</h3>
                        <p className="text-xs text-[#088395] font-bold uppercase tracking-widest">Included Meals: {r.MealType || "Room Only"}</p>
                      </div>
                      <div className="flex items-center gap-3">
                         <InfoBadge color={r.IsRefundable ? "green" : "red"}>
                            {r.IsRefundable ? "Refundable" : "Non-Refundable"}
                         </InfoBadge>
                      </div>
                    </div>
                    
                    <div className="p-6 bg-[#000D26]/5 rounded-2xl border border-[#000D26]/10 mb-6">
                       <p className="text-[10px] font-black text-[#000D26]/40 uppercase tracking-[0.15em] mb-3">Room Description</p>
                       <div 
                         className="text-sm text-slate-600 leading-relaxed italic"
                         dangerouslySetInnerHTML={{ __html: r.RoomDescription }}
                       />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {r.Inclusions?.length > 0 && (
                        <div>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Room Inclusions</p>
                           <div className="space-y-2">
                             {r.Inclusions.map((inc, i) => (
                               <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                                 <FiCheckCircle className="text-[#088395] shrink-0" />
                                 <span>{inc}</span>
                               </div>
                             ))}
                           </div>
                        </div>
                      )}
                      {r.CancellationPolicies?.length > 0 && (
                         <div>
                            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-3">Cancellation Terms</p>
                            <div className="space-y-2">
                               {r.CancellationPolicies.map((pol, i) => (
                                 <div key={i} className="p-3 bg-red-50/50 border border-red-100 rounded-xl text-[11px]">
                                    <p className="font-bold text-red-800 mb-1">Charge: {pol.ChargeType === 2 ? `${pol.CancellationCharge}%` : `₹${pol.CancellationCharge}`}</p>
                                    <p className="text-red-600/70">Applicable from {pol.FromDate} to {pol.ToDate || "Check-In"}</p>
                                 </div>
                               ))}
                            </div>
                         </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Travellers Section */}
            <div className="bg-white rounded-2xl border border-[#E8E0D0] overflow-hidden shadow-sm">
              <div className="bg-slate-50 px-6 py-4 border-b border-[#E8E0D0]">
                <SectionLabel icon={<FiUser />} title={`Guests (${travelers.length})`} />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50/50 border-b border-[#E8E0D0]">
                    <tr className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                      <th className="px-6 py-4">Guest Name</th>
                      <th className="px-6 py-4">Contact</th>
                      <th className="px-6 py-4">Identity</th>
                      <th className="px-6 py-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {travelers.map((pax, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#000D26]/5 text-[#000D26] flex items-center justify-center font-black text-xs shrink-0 border border-[#000D26]/10">
                              {pax.firstName?.[0]}{pax.lastName?.[0]}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-sm">{pax.title} {pax.firstName} {pax.lastName}</p>
                              <p className="text-[10px] font-bold text-[#088395] uppercase tracking-wider">{pax.paxType || "Adult"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                           <div className="space-y-1">
                              <p className="text-xs font-bold text-slate-700">{pax.email || "—"}</p>
                              <p className="text-[11px] font-mono text-slate-400">{pax.phoneWithCode || "—"}</p>
                           </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="space-y-1">
                            <p className="text-xs text-slate-600 font-medium capitalize">{pax.gender || "—"} · {formatDate(pax.dateOfBirth)}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">{pax.nationality || "—"}</p>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                           {pax.isLeadPassenger ? (
                             <InfoBadge color="amber">Lead Guest</InfoBadge>
                           ) : <span className="text-slate-300">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── Right Column: Pricing & Meta ── */}
          <div className="space-y-8">
            
            {/* Pricing Summary */}
            <div className="bg-[#000D26] text-white rounded-2xl p-8 shadow-xl shadow-[#000D26]/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                 <FiDollarSign size={120} className="rotate-12" />
              </div>
              <div className="relative z-10 space-y-6">
                <div>
                  <p className="text-[#088395] text-[10px] font-black uppercase tracking-[0.2em] mb-2">Total Amount</p>
                  <p className="text-5xl font-black tracking-tight flex items-baseline gap-1">
                    <span className="text-xl opacity-40 font-normal">₹</span>
                    {bookingSnapshot.totalAmount?.toLocaleString() || bookingSnapshot.amount?.toLocaleString() || "0"}
                  </p>
                  <p className="text-slate-400 text-[10px] font-mono mt-2 italic">Captured from search results</p>
                </div>

                <div className="space-y-4 pt-6 border-t border-white/10">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Base Rate</span>
                    <span className="font-black text-sm">₹{bookingSnapshot.baseFare?.toLocaleString() || "—"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Tax & Fees</span>
                    <span className="font-black text-sm">₹{bookingSnapshot.tax?.toLocaleString() || "—"}</span>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/10">
                   <p className="text-[10px] text-[#088395] font-black uppercase tracking-[0.2em] mb-3">Booking Status</p>
                   <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
                      <FiShield className="text-[#088395]" />
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-300">Pending Approval</p>
                   </div>
                </div>
              </div>
            </div>

            {/* Request Context */}
            <div className="bg-white rounded-2xl border border-[#E8E0D0] overflow-hidden shadow-sm">
               <div className="bg-slate-50 px-6 py-4 border-b border-[#E8E0D0]">
                 <SectionLabel icon={<FiInfo />} title="Request Context" />
               </div>
               <div className="p-6 space-y-6">
                 {/* Requested By */}
                 <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Requested By</p>
                   <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                     <div className="w-10 h-10 rounded-full bg-[#000D26] text-[#088395] flex items-center justify-center font-black text-xs shrink-0">
                       {booking.userId?.name?.firstName?.[0]}{booking.userId?.name?.lastName?.[0]}
                     </div>
                     <div>
                       <p className="font-black text-slate-900 text-sm">{booking.userId?.name?.firstName} {booking.userId?.name?.lastName}</p>
                       <p className="text-[11px] text-slate-400 font-medium">{booking.userId?.email}</p>
                     </div>
                   </div>
                 </div>

                 {/* Purpose */}
                 <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Purpose of Travel</p>
                   <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100">
                     <p className="text-xs text-amber-900 font-medium italic leading-relaxed">"{booking.purposeOfTravel || "Business Trip"}"</p>
                   </div>
                 </div>

                 {/* Project */}
                 <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Project Details</p>
                   <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden divide-y divide-slate-100">
                     <div className="px-4 py-3 flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">Project Name</span>
                        <span className="font-bold text-slate-900">{project.name || "—"}</span>
                     </div>
                     <div className="px-4 py-3 flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">Client</span>
                        <span className="font-bold text-slate-900">{project.client || "—"}</span>
                     </div>
                   </div>
                 </div>

                 {/* Approver */}
                 <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Manager Selected</p>
                   <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden divide-y divide-slate-100">
                     <div className="px-4 py-3 flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">Name</span>
                        <span className="font-bold text-[#088395]">{approver.name}</span>
                     </div>
                     <div className="px-4 py-3 flex justify-between items-center text-xs text-slate-400">
                        <span className="font-medium">Role</span>
                        <span className="uppercase font-black text-[10px]">{approver.role}</span>
                     </div>
                   </div>
                 </div>

                 {/* Timeline */}
                 <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Timeline</p>
                   <div className="space-y-4 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
                      <div className="relative pl-6">
                        <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-green-500 border-4 border-white shadow-sm" />
                        <p className="text-[11px] font-black text-slate-900 uppercase tracking-wide">Request Created</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{formatDateTime(booking.createdAt)}</p>
                      </div>
                      <div className="relative pl-6">
                        <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-amber-500 border-4 border-white shadow-sm animate-pulse" />
                        <p className="text-[11px] font-black text-amber-700 uppercase tracking-wide">Awaiting Approval</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Manager Review in progress</p>
                      </div>
                   </div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const TravellerField = ({ icon, label, value }) => (
  <div className="flex items-start gap-2.5">
    <div className="mt-1 text-[#088395] opacity-60">{icon}</div>
    <div>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-[11px] font-bold text-slate-700 leading-tight">{value || "—"}</p>
    </div>
  </div>
);
