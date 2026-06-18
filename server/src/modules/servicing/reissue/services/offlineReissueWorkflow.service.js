const crypto = require("crypto");
const mongoose = require("mongoose");
const BookingRequest = require("../../../../models/BookingRequest");
const Corporate = require("../../../../models/Corporate");
const ApiError = require("../../../../utils/ApiError");
const logger = require("../../../../utils/logger");
const tboService = require("../../../../services/tektravels/flight.service");
const { resolvePnr } = require("../../../../utils/bookingResolver.util");
const offlineReissueRepository = require("../repositories/offlineReissue.repository");
const { generateOfflineReissueId } = require("../utils/offlineReissueId.util");
const {
  OFFLINE_STATUSES,
  BILLING_MODES,
  DOMAIN_EVENTS,
  ACTIVE_OFFLINE_STATUSES,
  OFFLINE_TIMELINE_EVENTS,
  TERMINAL_OFFLINE_STATUSES,
} = require("../constants/reissue.constants");
const domainEventBus = require("../../shared/domainEventBus");
const { assertTransition } = require("../utils/reissueStatusMachine.util");
const {
  validateCreateOfflineReissuePayload,
  validateOfflineOpsStatusUpdate,
} = require("../validators/offlineReissue.validator");
const offlineSearchRepository = require("../repositories/offlineSearch.repository");
const { calculateOfflineReissueEstimate } = require("./reissuePricing.service");
const reissueAssignmentService = require("./reissueAssignment.service");
const reissueTicketGenerationService = require("./reissueTicketGeneration.service");
const reissueBookingLifecycleService = require("./reissueBookingLifecycle.service");
const reissueFinancialLedgerService = require("../../../../services/reissue/reissueFinancialLedger.service");
const {
  buildActiveTicketSnapshot,
  buildActiveTicketSnapshotFromState,
} = require("../utils/activeTicketSnapshot.helper");
const { normalizeSsrSnapshot } = require("../utils/ssrSnapshot.util");

const DEFAULT_SLA_HOURS = Number(process.env.OFFLINE_REISSUE_SLA_HOURS || 24);
const ADMIN_ROLES = new Set(["super-admin", "master-admin", "ops-admin"]);
const LEGACY_STATUS_MAP = Object.freeze({
  UNASSIGNED: OFFLINE_STATUSES.PENDING_ASSIGNMENT,
  RAISED: OFFLINE_STATUSES.PENDING_ASSIGNMENT,
  TICKET_UPLOADED: OFFLINE_STATUSES.TICKET_GENERATED,
});
const LEGACY_ACTIVE_STATUSES = Object.freeze(["UNASSIGNED"]);

const isValidDate = (value) => {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

const isFutureDate = (value) => {
  if (!isValidDate(value)) return false;
  const date = new Date(value);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return date >= now;
};

const formatIsoDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

const toBoolean = (value) =>
  value === true ||
  value === "true" ||
  value === 1 ||
  value === "1";

const roundCurrency = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Number(amount.toFixed(2));
};

const normalizeCode = (value) => String(value || "").trim().toUpperCase();

const normalizeFlightNumber = (value) =>
  String(value || "")
    .replace(/\s+/g, "")
    .trim()
    .toUpperCase();

const extractOriginalSegments = (booking = {}) => {
  const rawSegments = Array.isArray(booking?.flightRequest?.segments)
    ? booking.flightRequest.segments
    : [];

  return rawSegments
    .map((segment) => ({
      origin: normalizeCode(
        segment?.origin ||
          segment?.from ||
          segment?.Origin?.Airport?.AirportCode ||
          segment?.OriginAirportCode,
      ),
      destination: normalizeCode(
        segment?.destination ||
          segment?.to ||
          segment?.Destination?.Airport?.AirportCode ||
          segment?.DestinationAirportCode,
      ),
      departureTime:
        segment?.departureDateTime ||
        segment?.departureTime ||
        segment?.DepartureTime ||
        segment?.DepTime ||
        segment?.date ||
        null,
      airlineCode: normalizeCode(
        segment?.airlineCode ||
          segment?.airline ||
          segment?.Airline?.AirlineCode ||
          segment?.AirlineCode,
      ),
      flightNumber: normalizeFlightNumber(
        segment?.flightNumber || segment?.FlightNumber || segment?.FlightNo,
      ),
    }))
    .filter((segment) => segment.origin && segment.destination);
};

const isSameCalendarMinute = (left, right) => {
  if (!left || !right) return false;
  const leftDate = new Date(left);
  const rightDate = new Date(right);
  if (Number.isNaN(leftDate.getTime()) || Number.isNaN(rightDate.getTime())) return false;
  return leftDate.toISOString().slice(0, 16) === rightDate.toISOString().slice(0, 16);
};

const isSameFlightSelection = (booking, selectedFlight = {}) => {
  const originalSegments = extractOriginalSegments(booking);
  const originalFirst = originalSegments[0];
  const originalLast = originalSegments[originalSegments.length - 1];
  if (!originalFirst || !originalLast) return false;

  const sameRoute =
    normalizeCode(selectedFlight?.origin) === originalFirst.origin &&
    normalizeCode(selectedFlight?.destination) === originalLast.destination;

  const sameFlightNumber =
    normalizeFlightNumber(selectedFlight?.flightNumber) === originalFirst.flightNumber;

  const sameAirline =
    !selectedFlight?.airlineCode ||
    normalizeCode(selectedFlight?.airlineCode) === originalFirst.airlineCode;

  const sameDeparture = isSameCalendarMinute(
    selectedFlight?.departureTime || selectedFlight?.departureDate,
    originalFirst.departureTime || booking?.bookingSnapshot?.travelDate,
  );

  return sameRoute && sameFlightNumber && sameAirline && sameDeparture;
};

class OfflineReissueWorkflowService {
  async loadBookingOrThrow(bookingId) {
    const booking = await BookingRequest.findById(bookingId);
    if (!booking) throw new ApiError(404, "Booking not found");
    return booking;
  }

  async normalizeLegacyStatus(request) {
    if (!request?.status || !LEGACY_STATUS_MAP[request.status]) {
      return request;
    }

    const previousStatus = request.status;
    request.status = LEGACY_STATUS_MAP[request.status];
    await offlineReissueRepository.save(request);

    logger.info("offline_reissue_legacy_status_normalized", {
      requestId: request.requestId,
      previousStatus,
      status: request.status,
    });

    return request;
  }

  async loadRequestOrThrow(requestId) {
    const request = await offlineReissueRepository.findByIdOrRequestId(requestId);
    if (!request) throw new ApiError(404, "Offline reissue request not found");
    return this.normalizeLegacyStatus(request);
  }

  isAdminActor(actor) {
    return ADMIN_ROLES.has(actor?.role);
  }

  isOpsActor(actor) {
    return actor?.role === "ops-member";
  }

  isSuperAdminActor(actor) {
    return actor?.role === "super-admin";
  }

  getActorObjectId(actor) {
    const candidate = actor?._id || actor?.id || null;
    if (!candidate) return null;
    if (candidate instanceof mongoose.Types.ObjectId) return candidate;
    if (!mongoose.Types.ObjectId.isValid(candidate)) return null;
    return new mongoose.Types.ObjectId(candidate);
  }

  isAssignedToActor(resource, actor) {
    if (!resource?.assignedOpsMember || !actor) return false;
    const assignedId =
      resource.assignedOpsMember?._id?.toString?.() ||
      resource.assignedOpsMember?.toString?.() ||
      null;
    const actorId = actor._id?.toString?.() || actor.id?.toString?.() || null;
    return Boolean(assignedId && actorId && assignedId === actorId);
  }

  ensureAccess(actor, resource) {
    if (this.isAdminActor(actor)) return;
    if (this.isOpsActor(actor) && this.isAssignedToActor(resource, actor)) return;
    if (resource.employeeId?._id?.toString?.() === actor.id) return;
    if (resource.employeeId?.toString?.() === actor.id) return;
    if (
      ["manager", "travel-admin", "corporate-super-admin"].includes(actor?.role) &&
      resource.corporateId?.toString?.() === actor.corporateId
    ) {
      return;
    }
    throw new ApiError(403, "You are not authorized to access this offline reissue");
  }

  actorName(actor) {
    if (typeof actor?.name === "string") return actor.name;
    return actor?.name?.firstName
      ? `${actor.name.firstName} ${actor.name.lastName || ""}`.trim()
      : actor?.email || actor?.role || "SYSTEM";
  }

  normalizeSelectedSsr(payload = {}, booking = {}) {
    if (
      !Object.prototype.hasOwnProperty.call(payload, "ssr") &&
      !Object.prototype.hasOwnProperty.call(payload?.selectedFlight || {}, "selectedSSR")
    ) {
      return undefined;
    }

    return normalizeSsrSnapshot(
      payload?.ssr ||
        payload?.selectedFlight?.selectedSSR ||
        payload?.preferredJourney?.selectedSSR ||
        {},
      booking?.flightRequest?.segments || [],
    );
  }

  resolveSelectedSsrForRequest(request = {}, booking = {}) {
    if (request?.metadata && Object.prototype.hasOwnProperty.call(request.metadata, "selectedSSR")) {
      return request.metadata.selectedSSR;
    }

    return (
      request?.activeTicketSnapshot?.ssrSnapshot ||
      request?.activeTicketSnapshot?.ssr ||
      booking?.flightRequest?.ssrSnapshot ||
      booking?.bookingSnapshot?.ssrSnapshot ||
      {}
    );
  }

  isTerminalStatus(status) {
    return TERMINAL_OFFLINE_STATUSES.includes(status);
  }

  calculateSlaDeadline(baseDate = new Date()) {
    return new Date(baseDate.getTime() + DEFAULT_SLA_HOURS * 60 * 60 * 1000);
  }

  refreshSlaFlags(request, now = new Date()) {
    const overdue =
      Boolean(request.slaDeadline) &&
      !this.isTerminalStatus(request.status) &&
      new Date(request.slaDeadline).getTime() < now.getTime();
    const breached =
      Boolean(request.slaDeadline) &&
      ((request.completedAt &&
        new Date(request.completedAt).getTime() >
          new Date(request.slaDeadline).getTime()) ||
        overdue);

    request.overdue = overdue;
    request.breached = breached;
  }

  appendTimeline(request, { status, eventType, title, description, actor, metadata, at = new Date() }) {
    request.timeline = Array.isArray(request.timeline) ? request.timeline : [];
    request.timeline.push({
      status,
      eventType,
      title,
      description,
      actorId: actor?._id || actor?.id || null,
      actorRole: actor?.role || "SYSTEM",
      at,
      metadata,
    });
  }

  appendAudit(request, { action, actor, message, metadata, at = new Date() }) {
    request.auditLogs = Array.isArray(request.auditLogs) ? request.auditLogs : [];
    request.auditLogs.push({
      action,
      actorId: actor?._id || actor?.id || null,
      actorRole: actor?.role || "SYSTEM",
      message,
      at,
      metadata,
    });
  }

  getSelectedFlightSnapshot(request) {
    return request?.selectedFlight || request?.preferredJourney || null;
  }

  ensureSelectedFlightSnapshot(request) {
    const selectedFlight = this.getSelectedFlightSnapshot(request);
    if (!selectedFlight) {
      throw new ApiError(400, "Please select a replacement flight");
    }
    return selectedFlight;
  }

  async markBookingReissueState(request) {
    if (!request?.bookingId) return;

    await BookingRequest.findByIdAndUpdate(request.bookingId, {
      $set: {
        "servicing.reissue.offlineRequestId": request._id,
        "servicing.reissue.status": request.status,
        "servicing.reissue.activePnr": request.originalPnr || request.pnr || null,
        "servicing.reissue.revisedTicketUrl":
          request.generatedTicketUrl || request.reissuedTicketUrl || null,
      },
    });
  }

  buildFlightSelectionTitle(selectedFlight) {
    const airlinePart = selectedFlight?.flightNumber
      ? `${selectedFlight.airlineCode || selectedFlight.airlineName || "Flight"} ${selectedFlight.flightNumber}`
      : selectedFlight?.airlineCode || selectedFlight?.airlineName || "Flight selected";
    const routePart =
      selectedFlight?.origin && selectedFlight?.destination
        ? `${selectedFlight.origin} -> ${selectedFlight.destination}`
        : "replacement flight selected";
    return `${airlinePart} | ${routePart}`;
  }

  buildReissuePricingSnapshot(estimate) {
    if (!estimate) return null;

    return {
      oldFare: roundCurrency(estimate.oldFare),
      newFare: roundCurrency(estimate.newFare),
      fareDifference: roundCurrency(estimate.fareDifference),
      reissueCharge: roundCurrency(estimate.reissueCharge),
      totalEstimate: roundCurrency(estimate.totalEstimate),
      currency: estimate.currency || "INR",
      refundEstimate: roundCurrency(estimate.refundEstimate || 0),
      source: estimate.source || null,
      matchedRule: estimate.matchedRule || null,
      breakdown: estimate.breakdown || null,
      calculatedAt: new Date(),
      pricingVersion: estimate.pricingVersion || "offline-reissue-v1",
    };
  }

  async resolvePreferredJourney(preferredJourney, booking) {
    if (!preferredJourney || typeof preferredJourney !== "object") return null;
    const { searchId, resultIndex, departureDate, returnDate } = preferredJourney;
    if (!searchId) throw new ApiError(400, "selectedFlight.searchId is required");
    if (
      resultIndex == null ||
      (typeof resultIndex === "string" && !String(resultIndex).trim())
    ) {
      throw new ApiError(400, "selectedFlight.resultIndex is required");
    }

    const cached = await offlineSearchRepository.getValid(searchId);
    if (!cached) {
      throw new ApiError(
        400,
        "Selected search option is no longer available. Please perform a new search.",
      );
    }
    if (cached.bookingId !== booking._id.toString()) {
      throw new ApiError(403, "Selected offline search results do not belong to this booking");
    }

    const results = Array.isArray(cached.results) ? cached.results : [];
    const selectedIndex = results.findIndex(
      (item, index) =>
        String(item?.resultIndex) === String(resultIndex) ||
        String(index) === String(resultIndex),
    );
    const selected = selectedIndex >= 0 ? results[selectedIndex] : null;

    if (!selected) {
      throw new ApiError(
        400,
        "Selected flight option could not be found. Please perform a new search.",
      );
    }

    const selectedDepartureDate = formatIsoDate(departureDate || cached.payload.departureDate);
    const selectedReturnDate = returnDate
      ? formatIsoDate(returnDate)
      : cached.payload.returnDate
        ? formatIsoDate(cached.payload.returnDate)
        : null;

    if (!selectedDepartureDate || !isFutureDate(selectedDepartureDate)) {
      throw new ApiError(400, "Selected departure date must be a valid future date");
    }
    if (selectedReturnDate && new Date(selectedReturnDate) < new Date(selectedDepartureDate)) {
      throw new ApiError(400, "Selected return date cannot be earlier than the departure date");
    }

    if (isSameFlightSelection(booking, selected)) {
      throw new ApiError(
        409,
        "Please select a different replacement flight. The existing ticket cannot be selected again.",
      );
    }

    let fareRuleResponse = selected?.fareRuleResponse || null;
    if (cached?.payload?.traceId) {
      try {
        fareRuleResponse = await tboService.getFareRule(
          cached.payload.traceId,
          selected?.resultIndex ?? selectedIndex,
        );
      } catch (error) {
        logger.warn("offline_reissue_selected_fare_rule_refresh_failed", {
          searchId,
          traceId: cached?.payload?.traceId || null,
          resultIndex: selected?.resultIndex ?? selectedIndex,
          error: error.message,
        });
      }
    }

    const estimate = calculateOfflineReissueEstimate({
      originalBooking: booking,
      selectedFlight: selected,
      fareRuleResponse,
    });
    const pricingSnapshot = this.buildReissuePricingSnapshot(estimate);

    return {
      searchId,
      resultIndex: selected?.resultIndex ?? selectedIndex,
      origin: selected.origin || cached.payload.origin,
      destination: selected.destination || cached.payload.destination,
      departureDate: selectedDepartureDate,
      returnDate: selectedReturnDate,
      airlineCode: selected.airlineCode,
      airlineName: selected.airlineName,
      flightNumber: selected.flightNumber,
      cabinClass: selected.cabinClass,
      fare: estimate.newFare,
      offeredFare: estimate.newFare,
      oldFare: estimate.oldFare,
      newFare: estimate.newFare,
      fareDifference: estimate.fareDifference,
      reissueCharge: estimate.reissueCharge,
      totalEstimate: estimate.totalEstimate,
      refundEstimate: estimate.refundEstimate,
      currency: estimate.currency,
      pricingBreakdown: estimate.breakdown,
      departureTime: selected.departureTime,
      arrivalTime: selected.arrivalTime,
      duration: selected.duration,
      stops: selected.stops,
      segments: selected.segments,
      metadata: {
        source: "offline_search",
        searchId,
        searchParams: cached.payload,
        searchTraceId: cached?.payload?.traceId || null,
        pricingSource: estimate.source || null,
        matchedRule: estimate.matchedRule || null,
      },
      pricingSnapshot,
    };
  }

  buildListQuery(query = {}, actor) {
    const mongoQuery = {};

    if (query.status) {
      mongoQuery.status = LEGACY_STATUS_MAP[query.status] || query.status;
    }
    if (query.bookingId) mongoQuery.bookingId = query.bookingId;
    if (query.corporateId) mongoQuery.corporateId = query.corporateId;

    const assigneeFilter = query.assignedOpsMember || query.assignedTo;
    if (assigneeFilter === "me" && actor?.id) {
      mongoQuery.assignedOpsMember = actor.id;
    } else if (assigneeFilter) {
      mongoQuery.assignedOpsMember = assigneeFilter;
    }

    if (query.assignmentStatus) {
      mongoQuery.assignmentStatus = query.assignmentStatus;
    }

    if (query.airline) {
      const airlinePattern = new RegExp(String(query.airline).trim(), "i");
      mongoQuery.$or = [
        { airline: airlinePattern },
        { "selectedFlight.airlineCode": airlinePattern },
        { "selectedFlight.airlineName": airlinePattern },
        { "preferredJourney.airlineCode": airlinePattern },
        { "preferredJourney.airlineName": airlinePattern },
      ];
    }

    if (query.createdFrom || query.createdTo) {
      mongoQuery.createdAt = {};
      if (query.createdFrom) {
        mongoQuery.createdAt.$gte = new Date(query.createdFrom);
      }
      if (query.createdTo) {
        const end = new Date(query.createdTo);
        end.setHours(23, 59, 59, 999);
        mongoQuery.createdAt.$lte = end;
      }
    }

    if (toBoolean(query.overdue)) {
      mongoQuery.slaDeadline = { ...(mongoQuery.slaDeadline || {}), $lt: new Date() };
      if (!mongoQuery.status) {
        mongoQuery.status = { $nin: TERMINAL_OFFLINE_STATUSES };
      }
    }

    if (toBoolean(query.breached) || toBoolean(query.slaBreach)) {
      mongoQuery.$and = [
        ...(mongoQuery.$and || []),
        {
          $or: [
            { breached: true },
            {
              $and: [
                { completedAt: { $exists: true, $ne: null } },
                { slaDeadline: { $exists: true, $ne: null } },
                { $expr: { $gt: ["$completedAt", "$slaDeadline"] } },
              ],
            },
          ],
        },
      ];
    }

    return mongoQuery;
  }

  emitPassengerEvent(eventName, request, metadata = {}) {
    domainEventBus.emit(eventName, {
      reissueRequestId: request._id.toString(),
      reissueId: request.requestId,
      bookingId: request.bookingId?._id?.toString?.() || request.bookingId?.toString?.(),
      corporateId: request.corporateId?._id?.toString?.() || request.corporateId?.toString?.(),
      userId: request.employeeId?._id?.toString?.() || request.employeeId?.toString?.(),
      metadata: {
        employeeEmail: request.metadata?.employeeEmail || null,
        employeeName: request.metadata?.employeeName || null,
        orderId: request.metadata?.orderId || request.bookingId?.toString?.(),
        mode: "OFFLINE",
        status: request.status,
        generatedTicketUrl: request.generatedTicketUrl || request.reissuedTicketUrl || null,
        ...metadata,
      },
    });
  }

  async createRequest({ actor, payload }) {
    validateCreateOfflineReissuePayload(payload);

    const booking = await this.loadBookingOrThrow(payload.bookingId);
    const preferredFlightPayload =
      payload.selectedFlight || payload.preferredJourney || payload.preferredFlight || null;

    reissueBookingLifecycleService.assertBookingCanBeReissued(booking);
    reissueBookingLifecycleService.assertBookingNotLocked(booking);

    this.ensureAccess(actor, {
      employeeId: booking.userId,
      corporateId: booking.corporateId,
    });

    const existing = await offlineReissueRepository.findOne({
      bookingId: booking._id,
      status: { $in: [...ACTIVE_OFFLINE_STATUSES, ...LEGACY_ACTIVE_STATUSES] },
    });
    if (existing) {
      throw Object.assign(
        new ApiError(409, "An offline reissue request already exists for this booking."),
        {
          code: "OFFLINE_REISSUE_ALREADY_EXISTS",
          data: {
            existingRequestId: existing.requestId,
            status: LEGACY_STATUS_MAP[existing.status] || existing.status,
          },
        },
      );
    }

    if (!payload.preferredDate || !isFutureDate(payload.preferredDate)) {
      throw new ApiError(400, "Preferred travel date must be today or later");
    }

    const selectedFlightSnapshot = await this.resolvePreferredJourney(preferredFlightPayload, booking);
    if (!selectedFlightSnapshot) {
      throw new ApiError(400, "Please select a replacement flight");
    }

    const pricingSnapshot = selectedFlightSnapshot.pricingSnapshot || null;
    const corporate = await Corporate.findById(booking.corporateId);
    if (!corporate) throw new ApiError(404, "Corporate not found");
    const normalizedSelectedSsr = this.normalizeSelectedSsr(payload, booking);

    const billingMode =
      corporate.classification === "postpaid"
        ? BILLING_MODES.POSTPAID
        : BILLING_MODES.PREPAID;

    const originalPnr = resolvePnr(booking) || "";
    if (!originalPnr) {
      throw new ApiError(422, "Original airline PNR missing for reissue");
    }

    const correlationId = payload.correlationId || crypto.randomUUID();
    const now = new Date();
    const session = await mongoose.startSession();

    let createdRequestId = null;
    let assignedOpsMember = null;

    try {
      await session.withTransaction(async () => {
        await reissueBookingLifecycleService.lockBookingForReissue({
          booking,
          actor,
          correlationId,
          mode: "OFFLINE",
          reason: "Offline reissue workflow created",
          session,
        });

        const request = offlineReissueRepository.build({
          requestId: await generateOfflineReissueId(),
          bookingId: booking._id,
          employeeId: booking.userId,
          corporateId: booking.corporateId,
          pnr: originalPnr,
          originalPnr,
          airline:
            selectedFlightSnapshot.airlineCode ||
            selectedFlightSnapshot.airlineName ||
            booking?.bookingSnapshot?.airline ||
            "",
          preferredDate: payload.preferredDate,
          preferredJourney: selectedFlightSnapshot,
          selectedFlight: selectedFlightSnapshot,
          selectedSegments: selectedFlightSnapshot.segments || [],
          remarks: payload.remarks || "",
          creationSource: {
            type: "USER_SUBMITTED",
            trigger: "USER_ACTION",
            createdBy: actor?._id?.toString?.() || actor?.id?.toString?.() || null,
            workflow: "OFFLINE_REISSUE",
          },
          status: OFFLINE_STATUSES.PENDING_ASSIGNMENT,
          assignmentStatus: "UNASSIGNED",
          autoAssignmentAttempted: false,
          assignmentFailureReason: null,
          billingMode,
          financialLedger: reissueFinancialLedgerService.initializeLedger(booking),
          pricingHistory: [],
          activeTicketSnapshot: buildActiveTicketSnapshot(booking),
          reissueCharges: pricingSnapshot?.reissueCharge || 0,
          fareDifference: pricingSnapshot?.fareDifference || 0,
          totalAdjustment: pricingSnapshot?.totalEstimate || 0,
          reissuePricingSnapshot: pricingSnapshot || undefined,
          correlationId,
          slaDeadline: this.calculateSlaDeadline(now),
          metadata: {
            employeeEmail: actor.email,
            employeeName: this.actorName(actor),
            orderId: booking.orderId || booking.bookingReference,
            bookingType: booking.bookingType,
            expectedProcessingTimeline: `Within ${DEFAULT_SLA_HOURS} hours`,
            searchTraceId: selectedFlightSnapshot?.metadata?.searchTraceId || null,
            selectedResultIndex: selectedFlightSnapshot?.resultIndex ?? null,
            selectedRoute: `${selectedFlightSnapshot.origin}-${selectedFlightSnapshot.destination}`,
            ...(normalizedSelectedSsr !== undefined ? { selectedSSR: normalizedSelectedSsr } : {}),
          },
        });

        this.appendTimeline(request, {
          status: OFFLINE_STATUSES.PENDING_ASSIGNMENT,
          eventType: OFFLINE_TIMELINE_EVENTS.REQUEST_CREATED,
          title: "Offline reissue request submitted",
          description: payload.remarks || "Passenger submitted an offline reissue request",
          actor,
          at: now,
          metadata: {
            originalPnr,
          },
        });

        this.appendTimeline(request, {
          status: OFFLINE_STATUSES.PENDING_ASSIGNMENT,
          eventType: OFFLINE_TIMELINE_EVENTS.FLIGHT_SELECTED,
          title: "Replacement flight selected",
          description: this.buildFlightSelectionTitle(selectedFlightSnapshot),
          actor,
          at: now,
          metadata: {
            totalEstimate: pricingSnapshot?.totalEstimate || 0,
            fareDifference: pricingSnapshot?.fareDifference || 0,
            reissueCharge: pricingSnapshot?.reissueCharge || 0,
            currency: pricingSnapshot?.currency || "INR",
          },
        });

        this.appendAudit(request, {
          action: DOMAIN_EVENTS.OFFLINE_REISSUE_CREATED,
          actor,
          message: "Offline reissue request created",
          at: now,
          metadata: {
            correlationId,
            originalPnr,
            selectedFlight: selectedFlightSnapshot,
            pricingSnapshot,
          },
        });

        const assignmentResult = await reissueAssignmentService.assignOfflineReissue({
          request,
          session,
          assignedBy: {
            id: null,
            name: "OPS Assignment Service",
            role: "SYSTEM",
          },
          mode: "ROUND_ROBIN",
          remarks: "Automatic offline reissue assignment",
          notify: false,
          persistRequest: false,
        });

        assignedOpsMember = assignmentResult.assignedOpsMember;
        if (assignedOpsMember) {
          this.appendTimeline(request, {
            status: OFFLINE_STATUSES.ASSIGNED,
            eventType: OFFLINE_TIMELINE_EVENTS.AUTO_ASSIGNED,
            title: "Auto assigned to OPS",
            description: `Automatically assigned to ${assignedOpsMember.name}`,
            actor: {
              id: null,
              name: "OPS Assignment Service",
              role: "SYSTEM",
            },
            at: request.assignedAt,
            metadata: {
              assignedOpsMember: assignedOpsMember._id,
              assignmentMethod: "ROUND_ROBIN",
            },
          });

          this.appendAudit(request, {
            action: "AUTO_ASSIGNED",
            actor: {
              id: null,
              role: "SYSTEM",
            },
            message: `Auto assigned to ${assignedOpsMember.name}`,
            at: request.assignedAt,
            metadata: {
              assignedOpsMember: assignedOpsMember._id,
              assignmentMethod: "ROUND_ROBIN",
            },
          });
        } else {
          this.appendTimeline(request, {
            status: OFFLINE_STATUSES.PENDING_ASSIGNMENT,
            eventType: OFFLINE_TIMELINE_EVENTS.STATUS_UPDATED,
            title: "Awaiting OPS assignment",
            description:
              "No eligible OPS member was available during auto-assignment. The request remains active in the unassigned queue.",
            actor: {
              id: null,
              name: "OPS Assignment Service",
              role: "SYSTEM",
            },
            at: now,
            metadata: {
              assignmentFailureReason: request.assignmentFailureReason || "NO_ELIGIBLE_OPS",
            },
          });

          this.appendAudit(request, {
            action: "ASSIGNMENT_PENDING",
            actor: {
              id: null,
              role: "SYSTEM",
            },
            message: "Offline reissue request is awaiting OPS assignment",
            at: now,
            metadata: {
              assignmentFailureReason: request.assignmentFailureReason || "NO_ELIGIBLE_OPS",
              autoAssignmentAttempted: true,
            },
          });
        }

        this.refreshSlaFlags(request, now);
        await request.save({ session });
        booking.reissueLocked.requestId = request._id;
        booking.reissueLocked.requestRef = request.requestId;
        await booking.save({ session });

        try {
          const serviceFeeService = require("../../../../services/serviceFee.service");
          await serviceFeeService.applyServiceFee(
            booking.corporateId,
            booking.userId,
            booking._id,
            booking.orderId || booking.bookingReference,
            {
              productType: "Flight",
              operation: "Re-Issue",
              tripType: (() => {
                const f = booking.flightRequest || booking.flightDetails;
                if (!f) return "Domestic";
                const firstSeg = f.segments?.[0];
                const lastSeg = f.segments?.[f.segments.length - 1];
                const isIndia = c => { if(!c) return false; const cl = c.toLowerCase(); return cl==="in" || cl==="ind" || cl==="india"; };
                return isIndia(firstSeg?.origin?.countryCode || firstSeg?.origin?.country) && isIndia(lastSeg?.destination?.countryCode || lastSeg?.destination?.country) ? "Domestic" : "International";
              })(),
              cabinClass: (() => {
                const segCabin = booking.flightRequest?.segments?.[0]?.cabinClass;
                if (segCabin != null) return segCabin;
                const map = { "Economy": 2, "Premium Economy": 3, "Business": 4, "First Class": 6 };
                return map[booking.bookingSnapshot?.cabinClass] || 2;
              })(),
              baseFare: Number(booking.pricingSnapshot?.totalAmount || 0)
            },
            session
          );
        } catch(err) {
          logger.error("Failed to deduct service fee for offline reissue:", err);
        }

        createdRequestId = request._id;
      });
    } finally {
      session.endSession();
    }

    const request = await this.loadRequestOrThrow(createdRequestId);

    if (assignedOpsMember) {
      await reissueAssignmentService.notifyAssignedOpsMember({
        request,
        assignedOpsMember,
        assignedBy: {
          id: null,
          name: "OPS Assignment Service",
          role: "SYSTEM",
        },
        mode: "ROUND_ROBIN",
      });
    }

    this.emitPassengerEvent(DOMAIN_EVENTS.OFFLINE_REISSUE_CREATED, request);

    logger.info("offline_reissue_created", {
      requestId: request.requestId,
      bookingId: booking._id?.toString(),
      employeeId: request.employeeId?._id?.toString?.() || request.employeeId?.toString?.(),
      originalPnr,
      assignedOpsMember: assignedOpsMember?._id?.toString?.() || null,
      correlationId,
    });

    return request;
  }

  async getMyRequests({ actor, query }) {
    const mongoQuery = {
      ...this.buildListQuery(query, actor),
      employeeId: actor.id,
    };

    return offlineReissueRepository.list(mongoQuery, {
      page: Number(query?.page || 1),
      limit: Number(query?.limit || 20),
    });
  }

  async listAdmin({ actor, query }) {
    const mongoQuery = this.buildListQuery(query, actor);
    if (this.isOpsActor(actor)) {
      mongoQuery.assignedOpsMember = this.getActorObjectId(actor);
    }

    const result = await offlineReissueRepository.list(mongoQuery, {
      page: Number(query?.page || 1),
      limit: Number(query?.limit || 20),
    });

    return {
      ...result,
      metrics: await reissueAssignmentService.getOfflineReissueMetrics({
        baseQuery: mongoQuery,
      }),
    };
  }

  async getById({ actor, requestId }) {
    const request = await this.loadRequestOrThrow(requestId);
    this.ensureAccess(actor, request);
    this.refreshSlaFlags(request);
    return request;
  }

  async updateStatus({ actor, requestId, payload }) {
    validateOfflineOpsStatusUpdate(payload);

    let request = await this.loadRequestOrThrow(requestId);
    this.ensureAccess(actor, request);

    const booking = await this.loadBookingOrThrow(request.bookingId);

    if (payload.status === OFFLINE_STATUSES.TICKET_GENERATED) {
      return this.generateTicket({
        actor,
        requestId,
        payload,
      });
    }

    const previousStatus = request.status;
    assertTransition(previousStatus, payload.status, {});

    if (payload.assignedTo || payload.assignedOpsMember || payload.opsMemberId) {
      if (!this.isAdminActor(actor)) {
        throw new ApiError(403, "Only super admin can reassign offline reissues");
      }
      throw new ApiError(400, "Use the reassignment endpoint to change OPS ownership");
    }

    if (payload.status === OFFLINE_STATUSES.ASSIGNED && !request.assignedOpsMember) {
      throw new ApiError(400, "Use the reassignment endpoint to assign an OPS member");
    }

    const now = new Date();

    if (
      !request.firstResponseAt &&
      ![
        OFFLINE_STATUSES.PENDING_ASSIGNMENT,
        OFFLINE_STATUSES.RAISED,
      ].includes(payload.status)
    ) {
      request.firstResponseAt = now;
    }

    if (payload.message) {
      request.opsRemarks = Array.isArray(request.opsRemarks) ? request.opsRemarks : [];
      request.opsRemarks.push({
        message: payload.message,
        by: actor._id || actor.id,
        byRole: actor.role,
        at: now,
      });
    }

    if (payload.reissueCharges != null) request.reissueCharges = Number(payload.reissueCharges);
    if (payload.reissueCharge != null) request.reissueCharges = Number(payload.reissueCharge);
    if (payload.fareDifference != null) request.fareDifference = Number(payload.fareDifference);

    // Cumulative Delta calculation
    const calculation = reissueFinancialLedgerService.calculateCumulativeReissueAmount({
      request,
      newFareQuote: { fare: (request.financialLedger?.originalTicketAmount || 0) + request.fareDifference },
      selectedSSR: this.resolveSelectedSsrForRequest(request, booking),
      supplierReissueCharge: request.reissueCharges,
      booking,
    });

    request.normalizedPricing = {
      reissuePenalty: request.reissueCharges || 0,
      newFlightBase: calculation.newFare || 0,
      newSSRTotal: calculation.newSSR || 0,
      reusablePreviousValue: calculation.reusableValue || 0,
      netPayable: calculation.netPayable || 0,
    };

    request.totalAdjustment = roundCurrency(calculation.additionalCollection);

    if (request.reissuePricingSnapshot) {
      request.reissuePricingSnapshot = {
        ...(request.reissuePricingSnapshot || {}),
        fareDifference: roundCurrency(request.fareDifference || 0),
        reissueCharge: roundCurrency(request.reissueCharges || 0),
        totalEstimate: roundCurrency(request.totalAdjustment || 0),
        calculatedAt: now,
        breakdown: {
          ...(request.reissuePricingSnapshot.breakdown || {}),
          airlineDateChangeFee: roundCurrency(request.reissueCharges || 0),
          estimatedAdditionalCollection: roundCurrency(request.totalAdjustment || 0),
        },
      };
    }

    request.status = payload.status;
    if (payload.status === OFFLINE_STATUSES.ASSIGNED) {
      request.assignmentStatus = "ASSIGNED";
      request.assignmentFailureReason = null;
    }
    if (payload.status === OFFLINE_STATUSES.CANCELLED) request.rejectedAt = now;

    if (payload.status === OFFLINE_STATUSES.COMPLETED) {
      if (!request.generatedTicketUrl && !request.reissuedTicketUrl) {
        throw new ApiError(400, "Generate the revised ticket before completing the request");
      }
      // If the reissue cycle hasn't been applied yet, apply it now.
      if (!request.pricingHistory || request.pricingHistory.length === 0) {
        const compCalc = reissueFinancialLedgerService.calculateCumulativeReissueAmount({
          request,
          newFareQuote: { fare: (request.financialLedger?.originalTicketAmount || 0) + request.fareDifference },
          selectedSSR: this.resolveSelectedSsrForRequest(request, booking),
          supplierReissueCharge: request.reissueCharges,
          booking,
        });

        request.normalizedPricing = {
          reissuePenalty: request.reissueCharges || 0,
          newFlightBase: compCalc.newFare || 0,
          newSSRTotal: compCalc.newSSR || 0,
          reusablePreviousValue: compCalc.reusableValue || 0,
          netPayable: compCalc.netPayable || 0,
        };

        reissueFinancialLedgerService.applyReissueCycle(request, compCalc);
      }
      request.completedAt = now;
      await this.markBookingReissueState(request);
    }
    if (payload.status === OFFLINE_STATUSES.FAILED) request.failedAt = now;
    if (payload.status === OFFLINE_STATUSES.REJECTED) request.rejectedAt = now;

    const timelineEventType =
      payload.status === OFFLINE_STATUSES.COMPLETED
        ? OFFLINE_TIMELINE_EVENTS.COMPLETED
        : payload.status === OFFLINE_STATUSES.CANCELLED
          ? OFFLINE_TIMELINE_EVENTS.CANCELLED
        : payload.status === OFFLINE_STATUSES.REJECTED
          ? OFFLINE_TIMELINE_EVENTS.REJECTED
          : payload.status === OFFLINE_STATUSES.FAILED
            ? OFFLINE_TIMELINE_EVENTS.FAILED
            : OFFLINE_TIMELINE_EVENTS.STATUS_UPDATED;

    this.appendTimeline(request, {
      status: payload.status,
      eventType: timelineEventType,
      title:
        payload.status === OFFLINE_STATUSES.COMPLETED
          ? "Offline reissue completed"
          : payload.status === OFFLINE_STATUSES.CANCELLED
            ? "Offline reissue request cancelled"
          : payload.status === OFFLINE_STATUSES.REJECTED
            ? "Offline reissue request rejected"
            : `Status updated to ${payload.status}`,
      description: payload.message || `Operations moved the request to ${payload.status}`,
      actor,
      at: now,
      metadata: {
        previousStatus,
        newStatus: payload.status,
      },
    });

    this.appendAudit(request, {
      action: DOMAIN_EVENTS.OFFLINE_REISSUE_UPDATED,
      actor,
      message: payload.message || `Status changed to ${payload.status}`,
      at: now,
      metadata: { previousStatus, newStatus: payload.status },
    });

    this.refreshSlaFlags(request, now);
    await offlineReissueRepository.save(request);
    if (this.isTerminalStatus(request.status)) {
      await reissueAssignmentService.releaseOfflineReissueAssignment({ request });
      await reissueBookingLifecycleService.unlockBookingReissue({
        bookingId: request.bookingId,
        requestId: request._id,
      });
    }

    if (
      [
        OFFLINE_STATUSES.ASSIGNED,
        OFFLINE_STATUSES.IN_PROGRESS,
        OFFLINE_STATUSES.WAITING_AIRLINE,
        OFFLINE_STATUSES.TICKET_GENERATED,
        OFFLINE_STATUSES.COMPLETED,
        OFFLINE_STATUSES.FAILED,
        OFFLINE_STATUSES.REJECTED,
        OFFLINE_STATUSES.CANCELLED,
      ].includes(request.status)
    ) {
      this.emitPassengerEvent(DOMAIN_EVENTS.OFFLINE_REISSUE_UPDATED, request, {
        message: payload.message || null,
      });
    }

    return this.loadRequestOrThrow(request._id);
  }

  async reassignRequest({ actor, requestId, payload }) {
    if (!this.isAdminActor(actor)) {
      throw new ApiError(403, "Only super admin can reassign offline reissue requests");
    }

    const request = await this.loadRequestOrThrow(requestId);
    const opsMemberId =
      payload.opsMemberId || payload.assignedOpsMember || payload.assignedTo || null;

    if (!opsMemberId) {
      throw new ApiError(400, "opsMemberId is required for reassignment");
    }

    const assignmentResult = await reissueAssignmentService.assignOfflineReissue({
      request,
      assignedBy: actor,
      mode: "MANUAL",
      remarks: payload.remarks || payload.message || "Manual reassignment",
      opsMemberId,
    });
    const updatedRequest = assignmentResult?.request || request;
    const now = new Date();

    this.appendTimeline(updatedRequest, {
      status: updatedRequest.status,
      eventType: OFFLINE_TIMELINE_EVENTS.REASSIGNED,
      title: "Offline reissue reassigned",
      description: `Reassigned to ${assignmentResult.assignedOpsMember.name}`,
      actor,
      at: now,
      metadata: {
        assignedOpsMember: assignmentResult.assignedOpsMember._id,
      },
    });

    this.appendAudit(updatedRequest, {
      action: "REASSIGNED",
      actor,
      message: payload.message || payload.remarks || "Offline reissue reassigned",
      at: now,
      metadata: { assignedOpsMember: opsMemberId, requestId: updatedRequest.requestId },
    });

    await offlineReissueRepository.save(updatedRequest);
    await reissueAssignmentService.notifyAssignedOpsMember({
      request: updatedRequest,
      assignedOpsMember: assignmentResult.assignedOpsMember,
      assignedBy: actor,
      mode: "MANUAL",
    });

    return this.loadRequestOrThrow(updatedRequest._id);
  }

  async generateTicket({ actor, requestId, payload = {} }) {
    let request = await this.loadRequestOrThrow(requestId);
    this.ensureAccess(actor, request);

    const booking = await this.loadBookingOrThrow(request.bookingId);
    const selectedFlight = this.ensureSelectedFlightSnapshot(request);
    request.isReissueLocked = true;

    if (!request.assignedOpsMember) {
      if (!this.isSuperAdminActor(actor)) {
        throw new ApiError(409, "Request must be assigned before ticket generation");
      }

      const overrideAt = new Date();
      const previousStatus = request.status;

      request.assignmentStatus = "ASSIGNED";
      request.assignmentFailureReason = null;
      request.assignmentMethod = "MANUAL";
      request.assignedAt = request.assignedAt || overrideAt;

      if (
        !request.status ||
        [
          OFFLINE_STATUSES.PENDING_ASSIGNMENT,
          OFFLINE_STATUSES.RAISED,
        ].includes(request.status)
      ) {
        request.status = OFFLINE_STATUSES.ASSIGNED;
      }

      this.appendTimeline(request, {
        status: request.status,
        eventType: OFFLINE_TIMELINE_EVENTS.REASSIGNED,
        title: "Super admin override applied",
        description:
          payload.message ||
          "Super admin bypassed the missing assignment requirement for ticket generation",
        actor,
        at: overrideAt,
        metadata: {
          previousStatus,
          overrideReason: "MISSING_ASSIGNMENT",
        },
      });

      this.appendAudit(request, {
        action: "SUPER_ADMIN_ASSIGNMENT_OVERRIDE",
        actor,
        message:
          payload.message ||
          "Super admin bypassed the missing assignment requirement for ticket generation",
        at: overrideAt,
        metadata: {
          previousStatus,
          newStatus: request.status,
          requestId: request.requestId,
        },
      });

      logger.info("offline_reissue_super_admin_assignment_override", {
        requestId: request.requestId || request._id?.toString?.(),
        actorId: actor?._id || actor?.id || null,
        previousStatus,
        status: request.status,
      });
    }

    const now = new Date();
    const previousStatus = request.status;

    if (
      ![
        OFFLINE_STATUSES.ASSIGNED,
        OFFLINE_STATUSES.IN_PROGRESS,
        OFFLINE_STATUSES.WAITING_AIRLINE,
        OFFLINE_STATUSES.FAILED,
      ].includes(request.status)
    ) {
      throw new ApiError(
        409,
        `Ticket generation is not allowed from status ${request.status}`,
      );
    }

    if (request.status !== OFFLINE_STATUSES.IN_PROGRESS) {
      assertTransition(request.status, OFFLINE_STATUSES.IN_PROGRESS, {
        allowRecoveryRetry: request.status === OFFLINE_STATUSES.FAILED,
      });
      request.status = OFFLINE_STATUSES.IN_PROGRESS;
      if (!request.firstResponseAt) {
        request.firstResponseAt = now;
      }
      this.appendTimeline(request, {
        status: OFFLINE_STATUSES.IN_PROGRESS,
        eventType: OFFLINE_TIMELINE_EVENTS.STATUS_UPDATED,
        title: "Ticket generation started",
        description: payload.message || "Operations started revised ticket generation",
        actor,
        at: now,
        metadata: {
          previousStatus,
          newStatus: OFFLINE_STATUSES.IN_PROGRESS,
        },
      });
      this.appendAudit(request, {
        action: "TICKET_GENERATION_STARTED",
        actor,
        message: payload.message || "Revised ticket generation started",
        at: now,
        metadata: {
          previousStatus,
          newStatus: OFFLINE_STATUSES.IN_PROGRESS,
        },
      });
    }

    // Perform cumulative calculation and apply reissue cycle
    const calculation = reissueFinancialLedgerService.calculateCumulativeReissueAmount({
      request,
      newFareQuote: selectedFlight,
      selectedSSR: this.resolveSelectedSsrForRequest(request, booking),
      supplierReissueCharge: request.reissueCharges,
      booking,
    });

    request.normalizedPricing = {
      reissuePenalty: request.reissueCharges || 0,
      newFlightBase: calculation.newFare || 0,
      newSSRTotal: calculation.newSSR || 0,
      reusablePreviousValue: calculation.reusableValue || 0,
      netPayable: calculation.netPayable || 0,
    };

    reissueFinancialLedgerService.applyReissueCycle(request, calculation);

    const generatedTicket = await reissueTicketGenerationService.generateReissuedTicket({
      request,
      actor,
      selectedFlight,
    });

    request.generatedTicketUrl = generatedTicket.generatedTicketUrl;
    request.generatedTicketPath = generatedTicket.generatedTicketPath || null;
    request.generatedTicketFileName = generatedTicket.fileName || null;
    request.generatedAt = generatedTicket.generatedAt;
    request.generatedBy = actor._id || actor.id;
    request.reissuedTicketUrl = generatedTicket.generatedTicketUrl;
    request.status = OFFLINE_STATUSES.TICKET_GENERATED;

    const sourceBooking = await this.loadBookingOrThrow(request.bookingId);
    const activeBooking = await reissueBookingLifecycleService.createReissuedBooking({
      sourceBooking,
      actor,
      request,
      mode: "OFFLINE",
      selectedJourney: selectedFlight,
      supplierBookingId:
        sourceBooking?.servicing?.reissue?.activeBookingId ||
        sourceBooking?.bookingResult?.providerBookingId ||
        null,
      revisedTicketUrl: generatedTicket.generatedTicketUrl,
      revisedTicketPath: generatedTicket.generatedTicketPath || null,
    });

    request.activeTicketSnapshot = activeBooking
      ? buildActiveTicketSnapshotFromState(activeBooking, {
          pnrOverride: request.originalPnr || request.pnr || null,
          ssrSnapshotOverride: this.resolveSelectedSsrForRequest(request, booking),
          revisedTicketOverride: { url: generatedTicket.generatedTicketUrl },
          sourceBookingIdOverride: activeBooking?._id || null,
        })
      : request.activeTicketSnapshot;

    request.reissueHistory = Array.isArray(request.reissueHistory) ? request.reissueHistory : [];
    request.reissueHistory.push({
      requestId: request._id,
      oldFlight: generatedTicket.originalItinerary,
      newFlight: generatedTicket.newItinerary,
      fareDifference: generatedTicket.fareDifference,
      reissueCharge: generatedTicket.reissueCharge,
      totalCollection: generatedTicket.totalCollection,
      reissuedAt: generatedTicket.generatedAt,
      reissuedBy: actor._id || actor.id,
      ticketNumber: request.originalPnr || request.pnr,
      pdfUrl: generatedTicket.generatedTicketUrl,
    });

    await this.markBookingReissueState(request);

    this.appendTimeline(request, {
      status: OFFLINE_STATUSES.TICKET_GENERATED,
      eventType: OFFLINE_TIMELINE_EVENTS.TICKET_GENERATED,
      title: "Revised ticket generated",
      description: "System generated the revised ticket automatically",
      actor,
      at: generatedTicket.generatedAt,
      metadata: {
        generatedTicketUrl: generatedTicket.generatedTicketUrl,
        activeBookingId: activeBooking?._id?.toString?.() || null,
      },
    });

    this.appendTimeline(request, {
      status: OFFLINE_STATUSES.TICKET_GENERATED,
      eventType: OFFLINE_TIMELINE_EVENTS.PASSENGER_NOTIFIED,
      title: "Passenger notified",
      description: "Passenger notification and email were queued for this revised ticket",
      actor: {
        id: null,
        role: "SYSTEM",
      },
      at: generatedTicket.generatedAt,
      metadata: {
        recipientId: request.employeeId?._id || request.employeeId,
      },
    });

    this.appendTimeline(request, {
      status: OFFLINE_STATUSES.TICKET_GENERATED,
      eventType: OFFLINE_TIMELINE_EVENTS.DOWNLOAD_READY,
      title: "Download ready",
      description: "Revised ticket is now available on the passenger dashboard",
      actor: {
        id: null,
        role: "SYSTEM",
      },
      at: generatedTicket.generatedAt,
      metadata: {
        generatedTicketUrl: generatedTicket.generatedTicketUrl,
      },
    });

    this.appendAudit(request, {
      action: DOMAIN_EVENTS.OFFLINE_TICKET_GENERATED,
      actor,
      message: "Revised ticket generated automatically",
      at: generatedTicket.generatedAt,
      metadata: {
        generatedTicketUrl: generatedTicket.generatedTicketUrl,
        originalPnr: request.originalPnr || request.pnr,
      },
    });

    logger.info("SSR_PERSISTED", {
      requestId: request.requestId,
      totalSSRAmount: request.activeTicketSnapshot?.ssr?.totalSSRAmount || 0,
      segmentCount: request.activeTicketSnapshot?.segments?.length || 0,
    });
    logger.info("REISSUE_COMPLETED", {
      requestId: request.requestId,
      activeBookingId: activeBooking?._id?.toString?.() || null,
      mode: "OFFLINE",
    });

    this.appendAudit(request, {
      action: "DOWNLOAD_READY",
      actor: {
        id: null,
        role: "SYSTEM",
      },
      message: "Passenger download enabled for revised ticket",
      at: generatedTicket.generatedAt,
      metadata: {
        generatedTicketUrl: generatedTicket.generatedTicketUrl,
      },
    });

    this.refreshSlaFlags(request, generatedTicket.generatedAt);
    request.isReissueLocked = false;
    await offlineReissueRepository.save(request);

    this.emitPassengerEvent(DOMAIN_EVENTS.OFFLINE_REISSUE_UPDATED, request, {
      generatedTicketUrl: generatedTicket.generatedTicketUrl,
    });

    return this.loadRequestOrThrow(request._id);
  }

  async getArtifactForDownload({ actor, requestId, type }) {
    const request = await this.loadRequestOrThrow(requestId);
    this.ensureAccess(actor, request);

    if (type !== "ticket") {
      throw new ApiError(400, `Invalid artifact type: ${type}`);
    }

    const ticketUrl = request.generatedTicketUrl || request.reissuedTicketUrl;
    if (!ticketUrl) {
      throw new ApiError(404, "Offline reissue ticket not found");
    }

    return {
      request,
      artifact: {
        url: ticketUrl,
        localPath: request.generatedTicketPath || null,
        fileName:
          request.generatedTicketFileName ||
          `reissued-ticket-${request.requestId}.pdf`,
      },
    };
  }
}

module.exports = new OfflineReissueWorkflowService();