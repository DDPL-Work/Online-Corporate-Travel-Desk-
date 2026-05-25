const BookingRequest = require("../../../../models/BookingRequest");
const ApiError = require("../../../../utils/ApiError");
const { generateBookingReference } = require("../../../../utils/helpers");
const { generateSequentialOrderId } = require("../../../../utils/orderIdGenerator");
const {
  resolvePnr,
  resolveSupplierBookingId,
} = require("../../../../utils/bookingResolver.util");
const {
  normalizeSsrSnapshot,
} = require("../utils/ssrSnapshot.util");
const {
  buildOriginalBookingSnapshot,
} = require("../utils/onlineReissueContext.util");
const {
  buildInitialBookingLineage,
  buildNextBookingLineage,
} = require("../utils/reissueLineage.util");

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

const hasOwn = (object, key) =>
  Boolean(object) && Object.prototype.hasOwnProperty.call(object, key);

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

  buildBookingSnapshot(sourceBooking, selectedJourney, activePnr, totalAmountOverride = null) {
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
        totalAmountOverride ??
          selectedJourney?.newFare ??
          selectedJourney?.fare ??
          sourceBooking?.pricingSnapshot?.totalAmount ??
          sourceBooking?.bookingSnapshot?.amount ??
          0,
      ),
      pnr: activePnr,
      ticketData:
        sourceBooking?.ticketData ||
        sourceBooking?.originalBookingSnapshot?.ticketData ||
        null,
      providerReferences:
        sourceBooking?.bookingSnapshot?.providerReferences ||
        sourceBooking?.originalBookingSnapshot?.providerReferences ||
        null,
    };
  }

  buildProviderResponse(
    sourceBooking,
    selectedJourney,
    { supplierBookingId, activePnr, mode, fareTotals = {}, ssrSnapshot = {} },
  ) {
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
          fareTotals.currentTicketValue ??
            selectedJourney?.newFare ??
            selectedJourney?.fare ??
            root?.FlightItinerary?.Fare?.PublishedFare ??
            0,
        ),
        OfferedFare: roundCurrency(
          fareTotals.currentTicketValue ??
            selectedJourney?.newFare ??
            selectedJourney?.fare ??
            root?.FlightItinerary?.Fare?.OfferedFare ??
            0,
        ),
        TotalSeatCharges: roundCurrency(ssrSnapshot?.totalSeatAmount || 0),
        TotalMealCharges: roundCurrency(ssrSnapshot?.totalMealAmount || 0),
        TotalBaggageCharges: roundCurrency(ssrSnapshot?.totalBaggageAmount || 0),
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
    const activePnr =
      request?.newPnr ||
      request?.originalPnr ||
      resolvePnr(sourceBooking) ||
      null;
    const providerBookingId =
      supplierBookingId ||
      request?.newBookingId ||
      resolveSupplierBookingId(sourceBooking) ||
      null;
    const lastPricingEntry =
      Array.isArray(request?.pricingHistory) && request.pricingHistory.length
        ? request.pricingHistory[request.pricingHistory.length - 1]
        : null;
    const orderId = await generateSequentialOrderId("flight");
    const bookingReference = generateBookingReference();
    const selectedSsrSnapshot = hasOwn(request?.metadata, "selectedSSR")
      ? deepClone(request?.metadata?.selectedSSR || {})
      : deepClone(source?.flightRequest?.ssrSnapshot || {});
    const normalizedSsrSnapshot = normalizeSsrSnapshot(
      selectedSsrSnapshot,
      this.buildFlightRequestSegments(selectedJourney),
    );
    const fareTotals = {
      currentTicketValue: roundCurrency(
        request?.financialLedger?.currentTicketValue ??
          lastPricingEntry?.newFare ??
          selectedJourney?.newFare ??
          selectedJourney?.fare ??
          source?.pricingSnapshot?.totalAmount ??
          0,
      ),
      currentSSRValue: roundCurrency(
        request?.financialLedger?.currentSSRValue ??
          normalizedSsrSnapshot.totalSSRAmount ??
          0,
      ),
    };
    fareTotals.currentTotalValue = roundCurrency(
      fareTotals.currentTicketValue + fareTotals.currentSSRValue,
    );
    const inheritedLineage = buildInitialBookingLineage(sourceBooking);
    const providerReferences = {
      bookingId: providerBookingId,
      supplierBookingReference: providerBookingId,
      providerBookingReference: providerBookingId,
      pnr: activePnr,
      traceId:
        request?.metadata?.searchTraceId ||
        request?.onlineReissueContext?.traceId ||
        source?.originalBookingSnapshot?.traceId ||
        null,
      resultIndex:
        request?.metadata?.selectedResultIndex ??
        request?.onlineReissueContext?.resultIndex ??
        null,
      supplierLocator:
        source?.bookingSnapshot?.providerReferences?.supplierLocator ||
        source?.originalBookingSnapshot?.providerReferences?.supplierLocator ||
        null,
      providerLocator:
        source?.bookingSnapshot?.providerReferences?.providerLocator ||
        source?.originalBookingSnapshot?.providerReferences?.providerLocator ||
        null,
      reservationId:
        source?.bookingSnapshot?.providerReferences?.reservationId ||
        source?.originalBookingSnapshot?.providerReferences?.reservationId ||
        null,
      ticketIds:
        request?.onlineReissueContext?.ticketIds ||
        source?.originalBookingSnapshot?.providerReferences?.ticketIds ||
        source?.originalBookingSnapshot?.ticketId ||
        [],
      ticketNumbers:
        source?.originalBookingSnapshot?.providerReferences?.ticketNumbers ||
        source?.bookingSnapshot?.providerReferences?.ticketNumbers ||
        [],
      source:
        source?.bookingSnapshot?.providerReferences?.source ||
        source?.originalBookingSnapshot?.providerReferences?.source ||
        source?.flightRequest?.source ||
        null,
      gdsPcc:
        source?.bookingSnapshot?.providerReferences?.gdsPcc ||
        source?.originalBookingSnapshot?.providerReferences?.gdsPcc ||
        source?.metadata?.PCC ||
        null,
      validatingAirline:
        source?.bookingSnapshot?.providerReferences?.validatingAirline ||
        source?.originalBookingSnapshot?.providerReferences?.validatingAirline ||
        selectedJourney?.airlineCode ||
        null,
      supplierName:
        source?.bookingSnapshot?.providerReferences?.supplierName ||
        source?.originalBookingSnapshot?.providerReferences?.supplierName ||
        source?.metadata?.supplierName ||
        "TBO",
      providerName:
        source?.bookingSnapshot?.providerReferences?.providerName ||
        source?.originalBookingSnapshot?.providerReferences?.providerName ||
        source?.metadata?.providerName ||
        "TBO",
      createdAt: new Date(),
    };

    const newFlightSegments = this.buildFlightRequestSegments(selectedJourney);
    const newBookingSnapshot = this.buildBookingSnapshot(
      sourceBooking,
      selectedJourney,
      activePnr,
      fareTotals.currentTotalValue,
    );
    newBookingSnapshot.providerReferences = providerReferences;
    newBookingSnapshot.ticketData =
      request?.ticketData ||
      source?.ticketData ||
      source?.originalBookingSnapshot?.ticketData ||
      null;
    const newProviderResponse = this.buildProviderResponse(sourceBooking, selectedJourney, {
      supplierBookingId: providerBookingId,
      activePnr,
      mode,
      fareTotals,
      ssrSnapshot: normalizedSsrSnapshot,
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
        ssrSnapshot: normalizedSsrSnapshot,
        fareSnapshot: {
          ...(deepClone(source?.flightRequest?.fareSnapshot) || {}),
          offeredFare: fareTotals.currentTicketValue,
          publishedFare: fareTotals.currentTicketValue,
          totalAmount: fareTotals.currentTotalValue,
        },
      },
      pricingSnapshot: {
        ...(deepClone(source?.pricingSnapshot) || {}),
        totalAmount: fareTotals.currentTotalValue,
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
      ticketData:
        request?.ticketData ||
        source?.ticketData ||
        source?.originalBookingSnapshot?.ticketData ||
        null,
      bookingLineage: inheritedLineage,
      lastTicketedSnapshot: {
        fare: {
          totalFare: fareTotals.currentTicketValue,
        },
        ssr: normalizedSsrSnapshot,
        segments: newFlightSegments,
        baggage: normalizedSsrSnapshot.baggage,
        meals: normalizedSsrSnapshot.meals,
        seats: normalizedSsrSnapshot.seats,
        bookingId: providerBookingId,
        providerReferences,
        ticketData:
          request?.ticketData ||
          source?.ticketData ||
          source?.originalBookingSnapshot?.ticketData ||
          null,
        capturedAt: new Date(),
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
          status: "ACTIVE",
          currentRequestId: mode === "ONLINE" ? request?._id || null : source?.servicing?.reissue?.currentRequestId || null,
          offlineRequestId: mode === "OFFLINE" ? request?._id || null : source?.servicing?.reissue?.offlineRequestId || null,
          originalBookingId: inheritedLineage.originalBookingId || resolveSupplierBookingId(sourceBooking),
          originalPnr: inheritedLineage.originalPnr || activePnr,
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
            currentTicketValue: fareTotals.currentTicketValue,
            currentSSRValue: fareTotals.currentSSRValue,
          },
        },
      ],
      createdAt: undefined,
      updatedAt: undefined,
      _id: undefined,
      __v: undefined,
    };

    clonedPayload.originalBookingSnapshot = buildOriginalBookingSnapshot(clonedPayload, {
      bookingId: bookingReference,
      providerBookingReference: providerBookingId,
      supplierBookingReference: providerBookingId,
      pnr: activePnr,
      traceId:
        request?.metadata?.searchTraceId ||
        request?.onlineReissueContext?.traceId ||
        source?.originalBookingSnapshot?.traceId ||
        null,
      resultIndex:
        request?.metadata?.selectedResultIndex ??
        request?.onlineReissueContext?.resultIndex ??
        null,
    });

    const [created] = await BookingRequest.create([clonedPayload], { session });
    created.bookingLineage = buildNextBookingLineage({
      sourceBooking,
      newMongoBookingId: created._id,
      newProviderBookingId: providerBookingId,
      newPnr: activePnr,
    });
    created.lastTicketedSnapshot = {
      ...(created.lastTicketedSnapshot || {}),
      bookingId: providerBookingId,
      providerReferences,
    };
    await created.save({ session });

    sourceBooking.isReissued = true;
    sourceBooking.latestReissueBookingId = created._id;
    sourceBooking.bookingLineage = buildNextBookingLineage({
      sourceBooking,
      newMongoBookingId: created._id,
      newProviderBookingId: providerBookingId,
      newPnr: activePnr,
    });
    sourceBooking.lastTicketedSnapshot = created.lastTicketedSnapshot;
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
        currentTicketValue: fareTotals.currentTicketValue,
        currentSSRValue: fareTotals.currentSSRValue,
      },
    });
    sourceBooking.servicing = sourceBooking.servicing || {};
    sourceBooking.servicing.reissue = sourceBooking.servicing.reissue || {};
    sourceBooking.servicing.reissue.status = "REISSUED";
    sourceBooking.servicing.reissue.originalBookingId =
      sourceBooking.bookingLineage?.originalBookingId ||
      resolveSupplierBookingId(sourceBooking) ||
      sourceBooking.servicing.reissue.originalBookingId ||
      null;
    sourceBooking.servicing.reissue.originalPnr =
      sourceBooking.bookingLineage?.originalPnr ||
      activePnr ||
      sourceBooking.servicing.reissue.originalPnr ||
      null;
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
    sourceBooking.originalBookingSnapshot =
      sourceBooking.originalBookingSnapshot ||
      buildOriginalBookingSnapshot(sourceBooking);
    sourceBooking.ticketData =
      request?.ticketData ||
      sourceBooking.ticketData ||
      sourceBooking.originalBookingSnapshot?.ticketData ||
      null;
    sourceBooking.bookingSnapshot = sourceBooking.bookingSnapshot || {};
    sourceBooking.bookingSnapshot.providerReferences = providerReferences;
    sourceBooking.bookingSnapshot.ticketData = sourceBooking.ticketData;

    await sourceBooking.save({ session });
    return created;
  }
}

module.exports = new ReissueBookingLifecycleService();
