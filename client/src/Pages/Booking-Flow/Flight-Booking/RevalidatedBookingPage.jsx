import React, { useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiDollarSign,
  FiLoader,
  FiMapPin,
  FiRefreshCw,
  FiUser,
} from "react-icons/fi";
import {
  clearRevalidatedBookingContext,
  resetBookingLifecycle,
} from "../../../Redux/Slice/booking.slice";
import {
  executeApprovedFlightBooking,
  fetchApprovedFlightBookingStatus,
  fetchMyBookingRequestById,
} from "../../../Redux/Actions/booking.thunks";
import { ToastWithTimer } from "../../../utils/ToastConfirm";
import {
  airlineLogo,
  formatDateTime,
  formatDuration,
  getCabinClassLabel,
} from "../../../utils/formatter";

const FlightSegmentCard = ({ seg }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <img
          src={airlineLogo(seg.airlineCode)}
          alt={seg.airlineName}
          className="w-8 h-8 object-contain"
        />
        <div>
          <p className="font-semibold text-[#0A4D68] text-sm">
            {seg.airlineName} ({seg.airlineCode}-{seg.flightNumber})
          </p>
          <p className="text-xs text-gray-500">Aircraft: {seg.aircraft || "-"}</p>
        </div>
      </div>

      <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700">
        {getCabinClassLabel(seg.cabinClass)}
      </span>
    </div>

    <div className="mt-4 flex items-center justify-between text-sm">
      <div>
        <p className="font-medium">
          {seg.origin.city} ({seg.origin.airportCode})
        </p>
        <p className="text-xs text-gray-500">{formatDateTime(seg.departureDateTime)}</p>
      </div>
      <div className="text-center text-xs text-gray-600">
        <p>{formatDuration(seg.durationMinutes)}</p>
        <p>{seg.stopOver ? "Stopover" : "Non-stop"}</p>
      </div>
      <div className="text-right">
        <p className="font-medium">
          {seg.destination.city} ({seg.destination.airportCode})
        </p>
        <p className="text-xs text-gray-500">{formatDateTime(seg.arrivalDateTime)}</p>
      </div>
    </div>
  </div>
);

const SsrSection = ({ title, items, renderLabel }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
    <h3 className="font-semibold text-[#0A4D68] mb-3">{title}</h3>
    {items?.length ? (
      <div className="space-y-2 text-sm text-gray-700">
        {items.map((item, index) => (
          <div
            key={`${title}-${index}`}
            className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
          >
            <div>
              <p className="font-medium">{renderLabel(item)}</p>
              <p className="text-xs text-gray-500">
                Traveller {Number(item.travelerIndex || 0) + 1}
              </p>
            </div>
            <p className="font-semibold">Rs.{Math.ceil(Number(item.price || 0))}</p>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-sm text-gray-500">No selections.</p>
    )}
  </div>
);

export default function RevalidatedBookingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const handledLifecycleRef = useRef(null);

  const bookingId = location.state?.bookingId || null;
  const {
    selected: booking,
    revalidatedBookingContext,
    revalidatedBookingStatus,
    revalidationMeta,
    bookingLifecycle,
    actionLoading,
    loading,
  } = useSelector((state) => state.bookings);

  useEffect(() => {
    dispatch(resetBookingLifecycle());
    if (bookingId) {
      dispatch(fetchMyBookingRequestById(bookingId));
    }
  }, [bookingId, dispatch]);

  useEffect(() => {
    if (bookingLifecycle.state !== "processing" || bookingLifecycle.bookingId !== bookingId) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      dispatch(fetchApprovedFlightBookingStatus(bookingId));
    }, 4000);

    return () => window.clearInterval(intervalId);
  }, [bookingId, bookingLifecycle.bookingId, bookingLifecycle.state, dispatch]);

  useEffect(() => {
    return () => {
      dispatch(clearRevalidatedBookingContext());
    };
  }, [dispatch]);

  useEffect(() => {
    if (
      !bookingLifecycle.updatedAt ||
      bookingLifecycle.bookingId !== bookingId ||
      handledLifecycleRef.current === bookingLifecycle.updatedAt
    ) {
      return;
    }

    const navigateToLatestBooking = (payload = {}) => {
      navigate("/booking", {
        replace: true,
        state: {
          bookingId,
          bookingContext: payload.bookingContext || null,
          status: payload.status || null,
          priceChange: payload.priceChange || null,
          ssrChange: payload.ssrChange || null,
          notifications: payload.notifications || [],
        },
      });
    };

    const handleLifecycle = async () => {
      switch (bookingLifecycle.state) {
        case "success":
          handledLifecycleRef.current = bookingLifecycle.updatedAt;
          ToastWithTimer({
            type: "success",
            message: "Flight booked successfully!",
          });
          dispatch(clearRevalidatedBookingContext());
          navigate("/my-bookings", { replace: true });
          break;

        case "revalidated":
        case "price_changed":
        case "ssr_changed":
          handledLifecycleRef.current = bookingLifecycle.updatedAt;
          navigateToLatestBooking(bookingLifecycle.payload);
          break;

        case "failed":
          handledLifecycleRef.current = bookingLifecycle.updatedAt;
          await Swal.fire({
            icon: "error",
            title: "Booking Failed",
            text: bookingLifecycle.message || "Unable to confirm the revalidated booking.",
            confirmButtonColor: "#DC2626",
          });
          break;

        default:
          break;
      }
    };

    handleLifecycle();
  }, [bookingId, bookingLifecycle, dispatch, navigate]);

  const bookingContext =
    location.state?.bookingContext ||
    revalidatedBookingContext ||
    booking?.orchestration?.pendingRevalidation?.bookingContext ||
    null;
  const status =
    location.state?.status ||
    revalidatedBookingStatus ||
    booking?.orchestration?.pendingRevalidation?.status ||
    null;
  const priceChange =
    location.state?.priceChange ||
    revalidationMeta?.priceChange ||
    booking?.orchestration?.pendingRevalidation?.priceChange ||
    null;
  const ssrChange =
    location.state?.ssrChange ||
    revalidationMeta?.ssrChange ||
    booking?.orchestration?.pendingRevalidation?.ssrChange ||
    null;
  const notifications =
    location.state?.notifications ||
    revalidationMeta?.notifications ||
    booking?.orchestration?.pendingRevalidation?.notifications ||
    [];
  const isProcessing = bookingLifecycle.state === "processing";

  const groupedSegments = useMemo(
    () => {
      const segments = bookingContext?.flight?.segments || [];

      return {
        onward: segments.filter((segment) => segment.journeyType === "onward"),
        return: segments.filter((segment) => segment.journeyType === "return"),
        all: segments,
      };
    },
    [bookingContext],
  );

  const handleConfirmBooking = async () => {
    if (!bookingId) {
      ToastWithTimer({
        type: "error",
        message: "Booking reference is missing for confirmation.",
      });
      return;
    }

    if (actionLoading || isProcessing) {
      return;
    }

    try {
      await dispatch(
        executeApprovedFlightBooking({
          bookingId,
          confirmPendingRevalidation: true,
        }),
      ).unwrap();
    } catch {
      return undefined;
    }
  };

  if (loading && !bookingContext) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="h-12 w-12 border-4 border-[#0A4D68]/30 border-t-[#0A4D68] rounded-full animate-spin" />
      </div>
    );
  }

  if (!bookingContext) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center max-w-lg">
          <h1 className="text-2xl font-semibold text-[#0A4D68]">Booking Context Missing</h1>
          <p className="mt-3 text-sm text-gray-600">
            No revalidated booking context is available right now. Please start again from
            your pending approvals.
          </p>
          <button
            onClick={() => navigate("/my-pending-approvals", { replace: true })}
            className="mt-6 px-4 py-2 rounded-lg bg-[#0A4D68] text-white font-medium"
          >
            Back to Pending Approvals
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-10">
      <div className="max-w-7xl mx-auto mt-10 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#0A4D68]">Revalidated Booking</h1>
          <p className="text-gray-600">
            Review the reconstructed booking context and confirm without going back to search.
          </p>
        </div>

        {isProcessing && (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-blue-700">
            <div className="flex items-center gap-2 font-semibold">
              <FiLoader className="animate-spin" /> Booking in progress... Please wait, do not refresh
            </div>
          </div>
        )}

        {(status === "PRICE_CHANGED" || status === "SSR_CHANGED" || notifications.length > 0) && (
          <div className="mb-6 space-y-3">
            {status === "PRICE_CHANGED" && priceChange && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <div className="flex items-center gap-2 font-semibold">
                  <FiAlertTriangle /> Fare changed during revalidation
                </div>
                <p className="mt-1">
                  Old total: {priceChange.currency || "INR"} {priceChange.oldTotal} | New total:{" "}
                  {priceChange.currency || "INR"} {priceChange.newTotal}
                </p>
              </div>
            )}

            {status === "SSR_CHANGED" && (
              <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
                <div className="flex items-center gap-2 font-semibold">
                  <FiRefreshCw /> SSR selections changed during revalidation
                </div>
                <p className="mt-1">
                  Unavailable SSRs: {ssrChange?.removedSelections?.length || 0} | Repriced SSRs:{" "}
                  {ssrChange?.repricedSelections?.length || 0}
                </p>
              </div>
            )}

            {notifications.map((item, index) => (
              <div
                key={`notification-${index}`}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
              >
                {item.message}
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-linear-to-r from-[#0A4D68] to-[#088395] text-white rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FiMapPin /> Flight Summary
            </h2>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <p>
                <span className="font-medium">Booking Request:</span> {bookingId || "-"}
              </p>
              <p>
                <span className="font-medium">Status:</span> {status || "REVALIDATED"}
              </p>
              <p>
                <span className="font-medium">TraceId:</span>{" "}
                {bookingContext.flight?.traceId || "-"}
              </p>
              <p>
                <span className="font-medium">Total Price:</span> Rs.
                {Math.ceil(Number(bookingContext.totalPrice || 0))}
              </p>
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 shadow-md">
            <h3 className="text-lg font-semibold text-emerald-700 mb-3">Final Action</h3>
            <p className="text-sm text-emerald-800">
              This booking is already reconstructed. No re-selection is required.
            </p>
            <button
              onClick={handleConfirmBooking}
              disabled={actionLoading || isProcessing}
              className="mt-5 w-full px-5 py-2.5 rounded-lg text-white font-semibold flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 transition disabled:bg-emerald-300"
            >
              {actionLoading || isProcessing ? (
                <>
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Booking...
                </>
              ) : (
                <>
                  <FiCheckCircle /> Confirm Booking
                </>
              )}
            </button>
          </div>

          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-[#0A4D68] flex items-center gap-2">
              <FiMapPin /> Flight Itinerary
            </h2>

            {(groupedSegments.onward.length ? groupedSegments.onward : groupedSegments.all).map(
              (segment, index) => (
                <FlightSegmentCard key={`onward-${index}`} seg={segment} />
              ),
            )}

            {groupedSegments.return.length > 0 && (
              <div className="pt-4 border-t border-slate-200 space-y-4">
                <h3 className="font-semibold text-[#0A4D68]">Return Flight</h3>
                {groupedSegments.return.map((segment, index) => (
                  <FlightSegmentCard key={`return-${index}`} seg={segment} />
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#0A4D68] mb-4 flex items-center gap-2">
              <FiDollarSign /> Fare
            </h2>
            <div className="space-y-2 text-sm text-gray-700">
              <p>
                Previous total: {bookingContext.fare?.details?.currency || "INR"}{" "}
                {bookingContext.fare?.details?.oldTotalFare ?? "-"}
              </p>
              <p>
                Current total: {bookingContext.fare?.details?.currency || "INR"}{" "}
                {bookingContext.totalPrice ?? "-"}
              </p>
              <p>
                Base fare: {bookingContext.fare?.details?.currency || "INR"}{" "}
                {bookingContext.fare?.details?.newBaseFareTotal ?? "-"}
              </p>
              <p>
                SSR total: {bookingContext.fare?.details?.currency || "INR"}{" "}
                {bookingContext.fare?.details?.newSsrTotal ?? "-"}
              </p>
            </div>
          </div>

          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#0A4D68] mb-4 flex items-center gap-2">
              <FiUser /> Passengers
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {(bookingContext.passengers || []).map((passenger, index) => (
                <div
                  key={`passenger-${index}`}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="font-semibold text-[#0A4D68]">{passenger.firstName} {passenger.lastName}</p>
                  <p className="text-sm text-gray-600">Pax Type: {passenger.paxType}</p>
                  <p className="text-sm text-gray-600">Email: {passenger.email || "-"}</p>
                  <p className="text-sm text-gray-600">Contact: {passenger.contactNo || "-"}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-3 grid md:grid-cols-3 gap-4">
            <SsrSection
              title="Seat SSR"
              items={bookingContext.ssr?.seats || []}
              renderLabel={(item) => item.seatNo || item.code || item.description || "Seat"}
            />
            <SsrSection
              title="Meal SSR"
              items={bookingContext.ssr?.meals || []}
              renderLabel={(item) => item.description || item.code || "Meal"}
            />
            <SsrSection
              title="Baggage SSR"
              items={bookingContext.ssr?.baggage || []}
              renderLabel={(item) => item.description || item.weight || item.code || "Baggage"}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
