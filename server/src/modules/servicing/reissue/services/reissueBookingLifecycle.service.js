const BookingRequest = require("../../../../models/BookingRequest");
const ApiError = require("../../../../utils/ApiError");
const { generateBookingReference } = require("../../../../utils/helpers");
const { generateSequentialOrderId } = require("../../../../utils/orderIdGenerator");
const {
  resolvePnr,
  resolveSupplierBookingId,
} = require("../../../../utils/bookingResolver.util");

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const roundCurrency = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Number(amount.toFixed(2));
};

const deepClone = (value) => {
  if (value == null) return value;
  return JSON.parse(JSON.stringify(value));
};

const normalizeCabinClass = (value) => {
  if (!value) return "Economy";
  const normalized = String(value).trim().toLowerCase();
  if (normalized.includes("business")) return "Business";
  if (normalized.includes("premium economy")) return "Premium Economy";
  if (normalized.includes("first")) return "First Class";
  return "Economy";
};

class ReissueBookingLifecycleService {
  assertBookingCanBeReissued(booking) {
    if (!booking) {
      throw new ApiError(404, "Booking not found");
    }
    if (booking.bookingType !== "flight") {
      throw new ApiError(400, "Reissue is only supported for flight bookings");
    }
    if (booking.executionStatus !== "ticketed") {
      throw new ApiError(409, "Only ticketed bookings can be reissued");
    }
    if (booking.cancellation?.cancelledAt || booking.executionStatus === "cancelled") {
      throw new ApiError(409, "Cancelled bookings cannot be reissued");
    }
    if (booking?.servicing?.reissue?.partiallyUsedTicket) {
      throw new ApiError(409, "Flown or partially used tickets cannot be reissued");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastTravelDate =
      toDate(booking?.bookingSnapshot?.returnDate) ||
      toDate(booking?.bookingSnapshot?.travelDate);

    if (lastTravelDate && lastTravelDate < today) {
      throw new ApiError(409, "Flown bookings cannot be reissued");
    }
  }

  assertBookingNotLocked(booking, { ignoreRequestId = null } = {}) {
    const lock = booking?.reissueLocked || {};
    if (!lock.isLocked) return;

    const lockedRequestId = lock.requestId?.toString?.() || null;
    if (ignoreRequestId && lockedRequestId === String(ignoreRequestId)) return;

    throw new ApiError(
      409,
      "This booking is currently locked for another reissue workflow",
    );
  }

  async lockBookingForReissue({
    booking,
    actor,
    requestId = null,
    requestRef = null,
    correlationId = null,
    mode,
    reason,
    session,
  }) {
    this.assertBookingCanBeReissued(booking);
    this.assertBookingNotLocked(booking);

    booking.reissueLocked = {
      isLocked: true,
      reason: reason || "Reissue workflow in progress",
      requestId,
      requestRef: requestRef || null,
      mode: mode || null,
      correlationId: correlationId || null,
      lockedAt: new Date(),
      lockedBy: actor?._id || actor?.id || null,
    };

    await booking.save({ session });
    return booking;
  }

  async unlockBookingReissue({ bookingId, requestId = null, session } = {}) {
    if (!bookingId) return null;

    const booking = await BookingRequest.findById(bookingId).session(session || null);
    if (!booking) return null;

    const lockedRequestId = booking?.reissueLocked?.requestId?.toString?.() || null;
    if (requestId && lockedRequestId && lockedRequestId !== String(requestId)) {
      return booking;
    }

    booking.reissueLocked = {
      isLocked: false,
      reason: null,
      requestId: null,
      requestRef: null,
      mode: null,
      correlationId: null,
      lockedAt: null,
      lockedBy: null,
    };

    await booking.save({ session });
    return booking;
  }

  buildFlightRequestSegments(selectedJourney = {}) {
    const rawSegments =
      Array.isArray(selectedJourney?.segments) && selectedJourney.segments.length
        ? selectedJourney.segments
        : [selectedJourney];

    return rawSegments.map((segment, index) => ({
      origin:
        segment?.origin ||
        segment?.Origin?.Airport?.AirportCode ||
        selectedJourney?.origin ||
        null,
      destination:
        segment?.destination ||
        segment?.Destination?.Airport?.AirportCode ||
        selectedJourney?.destination ||
        null,
      departureDateTime:
        segment?.departureTime ||
        segment?.Origin?.DepTime ||
        selectedJourney?.departureTime ||
        null,
      arrivalDateTime:
        segment?.arrivalTime ||
        segment?.Destination?.ArrTime ||
        selectedJourney?.arrivalTime ||
        null,
      airlineCode:
        segment?.airlineCode ||
        segment?.Airline?.AirlineCode ||
        selectedJourney?.airlineCode ||
        null,
      airlineName:
        segment?.airlineName ||
        segment?.Airline?.AirlineName ||
        selectedJourney?.airlineName ||
        null,
      flightNumber:
        segment?.flightNumber ||
        segment?.Airline?.FlightNumber ||
        selectedJourney?.flightNumber ||
        `${index + 1}`,
      cabinClass:
        segment?.cabinClass ||
        segment?.CabinClass ||
        selectedJourney?.cabinClass ||
        "Economy",
      baggage:
        segment?.baggage ||
        segment?.Baggage ||
        selectedJourney?.baggage ||
        null,
      journeyType: index > 0 ? "return" : "onward",
    }));
  }

  buildBookingSnapshot(sourceBooking, selectedJourney, activePnr) {
    const segments = this.buildFlightRequestSegments(selectedJourney);
    const first = segments[0] || {};
    const last = segments[segments.length - 1] || {};

    return {
      ...deepClone(sourceBooking?.bookingSnapshot || {}),
      sectors: segments
        .map((segment) =>
          segment.origin && segment.destination
            ? `${segment.origin}-${segment.destination}`
            : null,
        )
        .filter(Boolean),
      airline:
        selectedJourney?.airlineCode ||
        selectedJourney?.airlineName ||
        sourceBooking?.bookingSnapshot?.airline ||
        "",
      travelDate: toDate(first?.departureDateTime) || sourceBooking?.bookingSnapshot?.travelDate,
      returnDate:
        segments.length > 1
          ? toDate(last?.departureDateTime) || sourceBooking?.bookingSnapshot?.returnDate
          : selectedJourney?.returnDate
            ? toDate(selectedJourney.returnDate)
            : null,
      cabinClass: normalizeCabinClass(
        selectedJourney?.cabinClass || sourceBooking?.bookingSnapshot?.cabinClass,
      ),
      amount: roundCurrency(
        selectedJourney?.newFare ||
          selectedJourney?.fare ||
          sourceBooking?.pricingSnapshot?.totalAmount ||
          sourceBooking?.bookingSnapshot?.amount ||
          0,
      ),
      pnr: activePnr,
    };
  }

  buildProviderResponse(sourceBooking, selectedJourney, { supplierBookingId, activePnr, mode }) {
    const providerResponse = deepClone(sourceBooking?.bookingResult?.providerResponse || {});
    const segments = this.buildFlightRequestSegments(selectedJourney);

    const mappedSegments = segments.map((segment) => ({
      Origin: {
        Airport: {
          AirportCode: segment.origin,
          CityName: segment.origin,
          AirportName: segment.origin,
        },
        DepTime: segment.departureDateTime,
      },
      Destination: {
        Airport: {
          AirportCode: segment.destination,
          CityName: segment.destination,
          AirportName: segment.destination,
        },
        ArrTime: segment.arrivalDateTime,
      },
      Airline: {
        AirlineCode: segment.airlineCode,
        AirlineName: segment.airlineName || segment.airlineCode,
        FlightNumber: segment.flightNumber,
      },
      FlightNumber: segment.flightNumber,
      Baggage: segment.baggage || null,
      CabinClass: segment.cabinClass || null,
    }));

    const root =
      providerResponse?.raw?.Response?.Response ||
      providerResponse?.Response?.Response ||
      providerResponse?.raw?.Response ||
      providerResponse?.Response ||
      null;

    if (root) {
      root.PNR = activePnr;
      root.BookingId = supplierBookingId || root.BookingId || null;
      root.FlightItinerary = root.FlightItinerary || {};
      root.FlightItinerary.PNR = activePnr;
      root.FlightItinerary.BookingId =
        supplierBookingId || root.FlightItinerary.BookingId || null;
      if (mappedSegments.length) {
        root.FlightItinerary.Segments = mappedSegments;
      }
      root.FlightItinerary.Fare = {
        ...(root.FlightItinerary.Fare || {}),
        PublishedFare: roundCurrency(
          selectedJourney?.newFare || selectedJourney?.fare || root?.FlightItinerary?.Fare?.PublishedFare || 0,
        ),
      };
    }

    providerResponse.reissueMeta = {
      ...(providerResponse.reissueMeta || {}),
      mode,
      activePnr,
      supplierBookingId: supplierBookingId || null,
    };

    return providerResponse;
  }

  async createReissuedBooking({
    sourceBooking,
    actor,
    request,
    mode,
    selectedJourney,
    supplierBookingId = null,
    supplierResponse = null,
    revisedTicketUrl = null,
    revisedInvoiceUrl = null,
    revisedTicketPath = null,
    session,
  }) {
    if (!sourceBooking) {
      throw new ApiError(404, "Source booking not found for reissue lifecycle");
    }

    const source =
      typeof sourceBooking.toObject === "function"
        ? sourceBooking.toObject({ depopulate: true })
        : deepClone(sourceBooking);
    const activePnr = request?.originalPnr || resolvePnr(sourceBooking) || null;
    const providerBookingId =
      supplierBookingId ||
      request?.newBookingId ||
      resolveSupplierBookingId(sourceBooking) ||
      null;
    const orderId = await generateSequentialOrderId("flight");
    const bookingReference = generateBookingReference();

    const newFlightSegments = this.buildFlightRequestSegments(selectedJourney);
    const newBookingSnapshot = this.buildBookingSnapshot(sourceBooking, selectedJourney, activePnr);
    const newProviderResponse = this.buildProviderResponse(sourceBooking, selectedJourney, {
      supplierBookingId: providerBookingId,
      activePnr,
      mode,
    });

    const clonedPayload = {
      ...source,
      bookingReference,
      orderId,
      originalBookingId: sourceBooking._id,
      latestReissueBookingId: null,
      isReissued: true,
      reissueLocked: {
        isLocked: false,
        reason: null,
        requestId: null,
        requestRef: null,
        mode: null,
        correlationId: null,
        lockedAt: null,
        lockedBy: null,
      },
      executionStatus: "ticketed",
      bookingSnapshot: newBookingSnapshot,
      flightRequest: {
        ...(deepClone(source?.flightRequest) || {}),
        segments: newFlightSegments,
      },
      pricingSnapshot: {
        ...(deepClone(source?.pricingSnapshot) || {}),
        totalAmount: roundCurrency(
          selectedJourney?.newFare ||
            selectedJourney?.fare ||
            source?.pricingSnapshot?.totalAmount ||
            0,
        ),
      },
      bookingResult: {
        ...(deepClone(source?.bookingResult) || {}),
        pnr: activePnr,
        onwardPNR: activePnr,
        returnPNR: newFlightSegments.length > 1 ? activePnr : null,
        providerBookingId,
        providerResponse: newProviderResponse,
        reissueSupplierResponse: supplierResponse || null,
      },
      documents: {
        ...(deepClone(source?.documents) || {}),
        ticketUrl: revisedTicketUrl || source?.documents?.ticketUrl || null,
        invoiceUrl: revisedInvoiceUrl || source?.documents?.invoiceUrl || null,
      },
      servicing: {
        ...(deepClone(source?.servicing) || {}),
        reissue: {
          ...(deepClone(source?.servicing?.reissue) || {}),
          status: "REISSUED",
          currentRequestId: mode === "ONLINE" ? request?._id || null : source?.servicing?.reissue?.currentRequestId || null,
          offlineRequestId: mode === "OFFLINE" ? request?._id || null : source?.servicing?.reissue?.offlineRequestId || null,
          originalBookingId: resolveSupplierBookingId(sourceBooking),
          originalPnr: activePnr,
          reissuedBookingId: providerBookingId,
          activeBookingId: providerBookingId,
          activePnr,
          revisedTicketUrl: revisedTicketUrl || null,
          revisedInvoiceUrl: revisedInvoiceUrl || null,
        },
      },
      amendmentHistory: [
        ...(Array.isArray(source?.amendmentHistory) ? deepClone(source.amendmentHistory) : []),
        {
          type: "FULL_REISSUE",
          changeRequestId: request?.reissueId || request?.requestId || null,
          status: "completed",
          response: supplierResponse || null,
          createdAt: new Date(),
        },
      ],
      amendment: {
        type: "FULL_REISSUE",
        changeRequestId: request?.reissueId || request?.requestId || null,
        status: "completed",
        response: supplierResponse || null,
      },
      reissueHistory: [
        ...(Array.isArray(source?.reissueHistory) ? deepClone(source.reissueHistory) : []),
        {
          requestId: request?._id || null,
          requestRef: request?.reissueId || request?.requestId || null,
          mode,
          originalBookingId: sourceBooking.originalBookingId || sourceBooking._id,
          reissuedBookingId: null,
          originalPnr: activePnr,
          activePnr,
          supplierBookingId: providerBookingId,
          reissuedAt: new Date(),
          reissuedBy: actor?._id || actor?.id || null,
          fareDifference: roundCurrency(request?.fareDifference || 0),
          reissueCharge: roundCurrency(request?.reissueCharges || request?.reissueCharge || 0),
          totalCollection: roundCurrency(request?.totalAdjustment || request?.totalEstimate || 0),
          ticketUrl: revisedTicketUrl || null,
          metadata: {
            revisedTicketPath: revisedTicketPath || null,
          },
        },
      ],
      createdAt: undefined,
      updatedAt: undefined,
      _id: undefined,
      __v: undefined,
    };

    const [created] = await BookingRequest.create([clonedPayload], { session });

    sourceBooking.isReissued = true;
    sourceBooking.latestReissueBookingId = created._id;
    sourceBooking.reissueHistory = Array.isArray(sourceBooking.reissueHistory)
      ? sourceBooking.reissueHistory
      : [];
    sourceBooking.reissueHistory.push({
      requestId: request?._id || null,
      requestRef: request?.reissueId || request?.requestId || null,
      mode,
      originalBookingId: sourceBooking.originalBookingId || sourceBooking._id,
      reissuedBookingId: created._id,
      originalPnr: activePnr,
      activePnr,
      supplierBookingId: providerBookingId,
      reissuedAt: new Date(),
      reissuedBy: actor?._id || actor?.id || null,
      fareDifference: roundCurrency(request?.fareDifference || 0),
      reissueCharge: roundCurrency(request?.reissueCharges || request?.reissueCharge || 0),
      totalCollection: roundCurrency(request?.totalAdjustment || request?.totalEstimate || 0),
      ticketUrl: revisedTicketUrl || null,
      metadata: {
        latestReissueBookingId: created._id,
      },
    });
    sourceBooking.servicing = sourceBooking.servicing || {};
    sourceBooking.servicing.reissue = sourceBooking.servicing.reissue || {};
    sourceBooking.servicing.reissue.status = "REISSUED";
    sourceBooking.servicing.reissue.originalBookingId =
      resolveSupplierBookingId(sourceBooking) || sourceBooking.servicing.reissue.originalBookingId || null;
    sourceBooking.servicing.reissue.originalPnr =
      activePnr || sourceBooking.servicing.reissue.originalPnr || null;
    sourceBooking.servicing.reissue.reissuedBookingId = providerBookingId;
    sourceBooking.servicing.reissue.activeBookingId = providerBookingId;
    sourceBooking.servicing.reissue.activePnr = activePnr;
    sourceBooking.servicing.reissue.revisedTicketUrl = revisedTicketUrl || null;
    sourceBooking.reissueLocked = {
      isLocked: false,
      reason: null,
      requestId: null,
      requestRef: null,
      mode: null,
      correlationId: null,
      lockedAt: null,
      lockedBy: null,
    };

    await sourceBooking.save({ session });
    return created;
  }
}

module.exports = new ReissueBookingLifecycleService();
