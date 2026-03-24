/* ─────────────────────────────────────────────────────────────── */
/*  Clean Hotel Detail Modal - Matches App Color Palette           */
/*  Colors: Teal (#0A4D68) + Cyan (#088395)                        */
/* ─────────────────────────────────────────────────────────────── */

import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FiX,
  FiMapPin,
  FiDownload,
  FiLoader,
  FiAlertCircle,
  FiUser,
  FiPhone,
  FiMail,
  FiCalendar,
  FiDollarSign,
} from "react-icons/fi";
import { MdInfo } from "react-icons/md";
import { fetchBookedHotelDetails } from "../../../Redux/Actions/hotelBooking.thunks";

/* ─────────────────────────────────────────────────────────────── */
/*  Stars Component                                                */
/* ─────────────────────────────────────────────────────────────── */
function Stars({ count = 0 }) {
  if (!count) return null;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: Math.min(count, 5) }).map((_, i) => (
        <svg
          key={i}
          className="w-3 h-3 text-amber-400"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Info Row Component                                             */
/* ─────────────────────────────────────────────────────────────── */
function InfoRow({ label, value, icon: Icon }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-3 flex-1">
        {Icon && (
          <div className="w-5 h-5 text-slate-400 shrink-0 mt-0.5">
            <Icon size={16} />
          </div>
        )}
        <span className="text-sm text-slate-600">{label}</span>
      </div>
      <span className="text-sm font-semibold text-slate-900 text-right max-w-xs">
        {value || "—"}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Section Card Component                                         */
/* ─────────────────────────────────────────────────────────────── */
function SectionCard({ title, icon: Icon, children }) {
  return (
    <div className="border border-slate-200 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-4">
        {Icon && (
          <div className="w-5 h-5 text-teal-600">
            <Icon size={18} />
          </div>
        )}
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
          {title}
        </h3>
      </div>
      <div className="space-y-0">{children}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Main Modal Component                                           */
/* ─────────────────────────────────────────────────────────────── */
function HotelDetailModal({ isOpen, hotelId, onClose }) {
  const dispatch = useDispatch();
  const overlayRef = useRef(null);
  const {
    selectedBookingDetails: hotelDetails,
    loading,
    error,
  } = useSelector((s) => s.hotelBookings);

  useEffect(() => {
    if (isOpen && hotelId) {
      dispatch(fetchBookedHotelDetails(hotelId));
    }
  }, [isOpen, hotelId, dispatch]);

  if (!isOpen) return null;

  // Calculate nights
  const checkInDate = hotelDetails?.bookingSnapshot?.checkInDate;
  const checkOutDate = hotelDetails?.bookingSnapshot?.checkOutDate;
  const nights =
    checkInDate && checkOutDate
      ? Math.ceil(
          (new Date(checkOutDate) - new Date(checkInDate)) /
            (1000 * 60 * 60 * 24),
        )
      : 0;

  // Format date helper
  const fmtDate = (date) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <>
      {/* BACKDROP */}
      <div
        ref={overlayRef}
        onClick={(e) => {
          if (e.target === overlayRef.current) onClose();
        }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
      />

      {/* MODAL */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="relative bg-slate-50 w-full sm:max-w-5xl max-h-[92dvh] sm:max-h-[88vh] rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden shadow-2xl">
          {/* Header Section */}
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white">
            <div className="p-5 flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-900">
                  {hotelDetails?.hotelName ||
                    hotelDetails?.bookingSnapshot?.hotelName ||
                    "Hotel Details"}
                </h2>
                <div className="flex items-center gap-2 mt-2">
                  {hotelDetails?.raw?.StarRating && (
                    <>
                      <Stars count={hotelDetails.raw.StarRating} />
                      <span className="text-xs text-slate-500">
                        {hotelDetails.raw.StarRating} Star
                      </span>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
              >
                <FiX size={20} className="text-slate-600" />
              </button>
            </div>

            {/* Status Badge */}
            {hotelDetails?.executionStatus === "cancelled" && (
              <div className="px-5 pb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  <span className="text-xs font-semibold text-red-700">
                    Cancelled
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Content Section */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <FiLoader className="w-8 h-8 text-teal-600 animate-spin mx-auto mb-3" />
                  <p className="text-sm text-slate-600">
                    Loading booking details…
                  </p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center max-w-sm">
                  <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
                    <FiAlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900 mb-1">
                    Failed to load details
                  </p>
                  <p className="text-xs text-slate-500">{error}</p>
                </div>
              </div>
            ) : hotelDetails ? (
              <div className="p-5 space-y-5">
                {/* Location */}
                <div className="flex items-start gap-3">
                  <FiMapPin className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {hotelDetails?.city || "—"}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {hotelDetails?.raw?.AddressLine1 || "—"}
                    </p>
                  </div>
                </div>

                {/* Key Info Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Check-in */}
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <p className="text-xs text-slate-600 font-semibold mb-1">
                      CHECK-IN
                    </p>
                    <p className="text-sm font-bold text-slate-900">
                      {fmtDate(checkInDate)}
                    </p>
                  </div>

                  {/* Check-out */}
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <p className="text-xs text-slate-600 font-semibold mb-1">
                      CHECK-OUT
                    </p>
                    <p className="text-sm font-bold text-slate-900">
                      {fmtDate(checkOutDate)}
                    </p>
                  </div>

                  {/* Nights */}
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <p className="text-xs text-slate-600 font-semibold mb-1">
                      DURATION
                    </p>
                    <p className="text-sm font-bold text-slate-900">
                      {nights} Night{nights !== 1 ? "s" : ""}
                    </p>
                  </div>

                  {/* Rooms */}
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <p className="text-xs text-slate-600 font-semibold mb-1">
                      ROOMS
                    </p>
                    <p className="text-sm font-bold text-slate-900">
                      {hotelDetails?.hotelRequest?.noOfRooms || 1}
                    </p>
                  </div>
                </div>

                {/* Guest Details */}
                {hotelDetails?.travellers &&
                  hotelDetails.travellers.length > 0 && (
                    <SectionCard title="Guest Details" icon={FiUser}>
                      <InfoRow
                        label="Name"
                        value={`${hotelDetails.travellers[0].firstName} ${hotelDetails.travellers[0].lastName}`}
                      />
                      <InfoRow
                        label="Email"
                        value={hotelDetails.travellers[0].email}
                        icon={FiMail}
                      />
                      <InfoRow
                        label="Phone"
                        value={hotelDetails.travellers[0].phoneWithCode}
                        icon={FiPhone}
                      />
                      {hotelDetails.travellers[0].nationality && (
                        <InfoRow
                          label="Nationality"
                          value={hotelDetails.travellers[0].nationality}
                        />
                      )}
                    </SectionCard>
                  )}

                {/* Booking Info */}
                <SectionCard title="Booking Reference" icon={MdInfo}>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-sm text-slate-600">
                        Confirmation No.
                      </span>
                      <code className="text-xs font-mono text-teal-600 font-semibold">
                        {hotelDetails?.confirmationNo || "—"}
                      </code>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-sm text-slate-600">
                        Booking Reference
                      </span>
                      <code className="text-xs font-mono text-teal-600 font-semibold">
                        {hotelDetails?.bookingReference || "—"}
                      </code>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-slate-600">Booked on</span>
                      <span className="text-sm font-semibold text-slate-900">
                        {fmtDate(hotelDetails?.createdAt)}
                      </span>
                    </div>
                  </div>
                </SectionCard>

                {/* Pricing */}
                {/* {hotelDetails?.pricingSnapshot && (
                  <SectionCard title="Pricing" icon={FiDollarSign}>
                    <InfoRow
                      label="Total Amount"
                      value={`₹${(hotelDetails.pricingSnapshot.totalAmount || 0).toLocaleString("en-IN")}`}
                    />
                    <InfoRow
                      label="Currency"
                      value={hotelDetails.pricingSnapshot.currency}
                    />
                  </SectionCard>
                )} */}

                {/* Cancellation Details */}
                {hotelDetails?.amendment && (
                  <div className="border border-red-200 bg-red-50 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <FiAlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-red-900 mb-3">
                          Cancellation Details
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-red-800">Cancelled on</span>
                            <span className="font-semibold text-red-900">
                              {fmtDate(hotelDetails.amendment.requestedAt)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-red-800">Reason</span>
                            <span className="font-semibold text-red-900">
                              {hotelDetails.amendment.remarks ||
                                "User requested"}
                            </span>
                          </div>
                          {/* {hotelDetails.amendment.providerResponse
                            ?.HotelChangeRequestStatusResult
                            ?.RefundedAmount && (
                            <div className="pt-2 mt-2 border-t border-red-200 flex justify-between">
                              <span className="text-red-800">
                                Refund Amount
                              </span>
                              <span className="font-bold text-emerald-600">
                                ₹
                                {hotelDetails.amendment.providerResponse.HotelChangeRequestStatusResult.RefundedAmount.toLocaleString(
                                  "en-IN"
                                )}
                              </span>
                            </div>
                          )} */}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Refund Status Info */}
                {hotelDetails?.executionStatus === "cancelled" && (
                  <div className="border border-amber-200 bg-amber-50 rounded-lg p-4">
                    <div className="flex gap-3">
                      <MdInfo className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-amber-900 mb-2">
                          Refund Information
                        </h4>
                        <p className="text-xs text-amber-800 leading-relaxed">
                          {hotelDetails?.amendment?.providerResponse
                            ?.HotelChangeRequestStatusResult?.RefundedAmount
                            ? `Your refund of ₹${hotelDetails.amendment.providerResponse.HotelChangeRequestStatusResult.RefundedAmount.toLocaleString("en-IN")} has been processed. It will be credited to your account within 5-7 business days.`
                            : "Refund details are being processed. Please check back soon for updates."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <p className="text-sm text-slate-500">
                  No booking details available
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 border-t border-slate-200 bg-white px-5 py-4 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 active:bg-slate-200 rounded-lg transition-colors cursor-pointer border border-slate-200 bg-white"
            >
              Close
            </button>
            {/* <button className="px-4 py-2.5 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-lg transition-colors cursor-pointer border-none flex items-center gap-2">
              <FiDownload size={14} />
              Download Invoice
            </button> */}
          </div>
        </div>
      </div>
    </>
  );
}

export default HotelDetailModal;
