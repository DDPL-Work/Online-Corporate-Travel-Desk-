const crypto = require("crypto");
const BookingRequest = require("../../../../models/BookingRequest");
const Corporate = require("../../../../models/Corporate");
const OpsMember = require("../../../../models/OpsMember");
const ApiError = require("../../../../utils/ApiError");
const logger = require("../../../../utils/logger");
const {
  resolveSupplierBookingId,
  resolvePnr,
} = require("../../../../utils/bookingResolver.util");
const {
  resolveBookingContext,
} = require("../../../../utils/activeBookingResolver.util");
const reissueRepository = require("../repositories/reissue.repository");
const { generateReissueId } = require("../utils/reissueId.util");
const {
  REISSUE_MODES,
  REISSUE_STATUSES,
  REISSUE_TYPES,
  BILLING_MODES,
  PROVIDERS,
  DOMAIN_EVENTS,
  ACTIVE_REISSUE_STATUSES,
} = require("../constants/reissue.constants");
const reissueAuditService = require("./reissueAudit.service");
const reissueEligibilityService = require("./reissueEligibility.service");
const reissueBillingService = require("./reissueBilling.service");
const reissueExecutionService = require("./reissueExecution.service");
const reissueLockService = require("./reissueLock.service");
const reissueUploadService = require("./reissueUpload.service");
const reissueNotificationService = require("./reissueNotification.service");
const reissueBookingLifecycleService = require("./reissueBookingLifecycle.service");
const { validateCreateReissuePayload } = require("../validators/createReissue.validator");
const { validateOpsStatusUpdate } = require("../validators/opsUpdateReissue.validator");
const { canTransition } = require("../utils/reissueStatusMachine.util");
const reissueFinancialLedgerService = require("../../../../services/reissue/reissueFinancialLedger.service");
const {
  buildActiveTicketSnapshot,
  buildActiveTicketSnapshotFromState,
} = require("../utils/activeTicketSnapshot.helper");
const { normalizeSsrSnapshot } = require("../utils/ssrSnapshot.util");
const {
  buildOnlineReissueContext,
  validateOnlineReissueContext,
} = require("../utils/onlineReissueContext.util");
const {
  buildInitialBookingLineage,
} = require("../utils/reissueLineage.util");
const { validateNdcReissue } = require("../validators/ndcReissue.validator");
const providerReferenceService = require("../../../../services/reissue/providerReference.service");

reissueNotificationService.registerSubscribers();

class ReissueWorkflowService {
  async loadBookingOrThrow(bookingId) {
    const booking = await BookingRequest.findById(bookingId);
    if (!booking) throw new ApiError(404, "Booking not found");
    return booking;
  }

  async loadBookingContextOrThrow(bookingId) {
    const context = await resolveBookingContext(bookingId);
    if (!context?.requestedBooking || !context?.activeBooking) {
      throw new ApiError(404, "Booking not found");
    }
    return context;
  }

  extractOriginalBookingId(booking) {
    return (
      booking?.originalBookingSnapshot?.providerBookingReference ||
      booking?.onlineReissueContext?.providerBookingReference ||
      resolveSupplierBookingId(booking)
    );
  }

  extractOriginalPnr(booking) {
    return resolvePnr(booking);
  }

  extractOriginalTraceId(booking) {
    return (
      booking?.originalBookingSnapshot?.traceId ||
      booking?.flightRequest?.traceId ||
      booking?.bookingResult?.traceId ||
      booking?.bookingResult?.providerResponse?.Response?.Response?.TraceId ||
      null
    );
  }

  extractOriginalResultIndex(booking) {
    return (
      booking?.originalBookingSnapshot?.resultIndex ??
      booking?.flightRequest?.resultIndex ??
      booking?.bookingResult?.resultIndex ??
      booking?.bookingResult?.providerResponse?.Response?.Response?.ResultIndex ??
      null
    );
  }

  extractOriginalTicketData(booking) {
    return (
      booking?.ticketData ||
      booking?.originalBookingSnapshot?.ticketData ||
      booking?.bookingResult?.ticketData ||
      booking?.bookingResult?.providerResponse?.Response?.Response?.FlightItinerary?.Ticket ||
      booking?.bookingResult?.providerResponse?.raw?.Response?.Response?.FlightItinerary?.Ticket ||
      null
    );
  }

  buildOldJourney(booking) {
    return {
      sectors: booking?.bookingSnapshot?.sectors || [],
      airline: booking?.bookingSnapshot?.airline || "",
      travelDate: booking?.bookingSnapshot?.travelDate || null,
      returnDate: booking?.bookingSnapshot?.returnDate || null,
      cabinClass: booking?.bookingSnapshot?.cabinClass || "",
      segments: booking?.flightRequest?.segments || [],
    };
  }

  ensureServicableBooking(booking) {
    const allowedExecutionStatuses = new Set(["ticketed"]);
    if (!allowedExecutionStatuses.has(booking.executionStatus)) {
      throw new ApiError(409, "Only ticketed flight bookings can be reissued");
    }
    if (booking.bookingType !== "flight") {
      throw new ApiError(400, "Reissue is only supported for flight bookings");
    }

    const originalBookingId = this.extractOriginalBookingId(booking);
    const originalPnr = this.extractOriginalPnr(booking);
    if (!originalBookingId) {
      throw new ApiError(422, "Original supplier booking reference missing for reissue");
    }
    if (!originalPnr) {
      throw new ApiError(422, "Original airline PNR missing for reissue");
    }

    const ticketData = this.extractOriginalTicketData(booking);
    if (!ticketData) {
      logger.warn("Booking missing original ticket metadata required for online reissue", {
        bookingId: booking._id?.toString(),
        originalBookingId,
        originalPnr,
      });
    }
  }

  ensureAccess(actor, resource) {
    if (["super-admin", "ops-member"].includes(actor.role)) return;

    if (resource.userId?.toString?.() === actor.id) return;
    if (resource.corporateId?.toString?.() === actor.corporateId) return;

    throw new ApiError(403, "You are not authorized to access this reissue");
  }

  actorName(actor) {
    if (typeof actor.name === "string") return actor.name;
    return actor.name?.firstName
      ? `${actor.name.firstName} ${actor.name.lastName || ""}`.trim()
      : actor.email || actor.role;
  }

  normalizeSelectedSsr(payload = {}, booking = {}) {
    if (!Object.prototype.hasOwnProperty.call(payload, "ssr")) {
      return undefined;
    }

    return normalizeSsrSnapshot(payload?.ssr || {}, booking?.flightRequest?.segments || []);
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

  buildCreationSource(actor, workflow) {
    return {
      type: "USER_SUBMITTED",
      trigger: "USER_ACTION",
      createdBy: actor?._id?.toString?.() || actor?.id?.toString?.() || null,
      workflow,
    };
  }

  buildTransientOfflineResponse({
    booking,
    supplier,
    supplierSupport = {},
    reasons = [],
    code = "OFFLINE_REQUIRED",
    message = null,
    metadata = null,
  }) {
    return {
      transient: true,
      success: false,
      eligible: false,
      mode: REISSUE_MODES.OFFLINE,
      status: REISSUE_STATUSES.OFFLINE_REQUIRED,
      code,
      message: message || reasons[0] || "This booking requires offline reissue.",
      reasons,
      shouldCreateOfflineRequest: false,
      supplier,
      supplierSupport,
      support: supplierSupport,
      bookingId: booking?._id || null,
      originalPnr: resolvePnr(booking) || null,
      reissueId: null,
      reissueRequestId: null,
      metadata: metadata || {},
    };
  }

  shouldForceOfflineFromReasons(reasons = []) {
    return reasons.some((reason) =>
      /offline servicing|fare rules|provider references|partially travelled|check-in|past departure|legacy booking/i.test(
        String(reason || ""),
      ),
    );
  }

  isOfflineFallbackError(error) {
    const offlineCodes = new Set([
      "TBO_SANDBOX_REISSUE_UNSUPPORTED",
      "REISSUE_NOT_AVAILABLE",
      "REISSUE_AIRPORT_CODE_MISSING",
    ]);

    if (offlineCodes.has(error?.code)) return true;
    if (error?.mode === "OFFLINE" || error?.fallbackAvailable === true) return true;

    const message = String(error?.message || "").toLowerCase();
    return /online reissue.*not allowed|no (?:flights|options)|reissue.*not available|valid reissue flight options|did not return valid reissue flight options|supplier.*not available|please\s+provide\s+pnr/i.test(
      message,
    );
  }

  applyLedgerVisibilityFilter(query = {}, { excludeOfflineRequired = true } = {}) {
    const nextQuery = { ...query };
    const creationVisibility = [
      { "creationSource.type": "USER_SUBMITTED" },
      { creationSource: { $exists: false } },
      { "creationSource.type": { $exists: false } },
    ];

    if (Array.isArray(nextQuery.$and)) {
      nextQuery.$and = [...nextQuery.$and, { $or: creationVisibility }];
    } else {
      nextQuery.$or = creationVisibility;
    }

    if (excludeOfflineRequired && !nextQuery.status) {
      nextQuery.status = { $ne: REISSUE_STATUSES.OFFLINE_REQUIRED };
    }

    return nextQuery;
  }

  async createRequest({ actor, payload }) {
    validateCreateReissuePayload(payload);

    const bookingContext = await this.loadBookingContextOrThrow(payload.bookingId);
    const booking = bookingContext.activeBooking;
    await providerReferenceService.backfillProviderReferences(booking, { save: true });
    this.ensureServicableBooking(booking);
    reissueBookingLifecycleService.assertBookingCanBeReissued(booking);
    reissueBookingLifecycleService.assertBookingNotLocked(booking);
    this.ensureAccess(actor, {
      userId: booking.userId,
      corporateId: booking.corporateId,
    });

    const onlineReissueContext = buildOnlineReissueContext(booking, {
      requestedBookingId: bookingContext.requestedBooking?._id?.toString?.() || null,
    });
    const contextValidation = validateOnlineReissueContext(onlineReissueContext);

    if (!contextValidation.isValid) {
      logger.warn("SUPPLIER_REFERENCE_MISSING", {
        bookingId: booking?._id?.toString(),
        requestedBookingId: bookingContext.requestedBooking?._id?.toString?.() || null,
        missingFields: contextValidation.missingFields,
        context: onlineReissueContext,
        originalBookingSnapshot: booking?.originalBookingSnapshot || null,
      });
    }

    if (onlineReissueContext.journeyType === 2 || onlineReissueContext.returnSegments?.length) {
      logger.info("RETURN_REISSUE_CONTEXT_CREATED", {
        bookingId: booking?._id?.toString(),
        requestedBookingId: bookingContext.requestedBooking?._id?.toString?.() || null,
        onwardSegments: onlineReissueContext.onwardSegments?.length || 0,
        returnSegments: onlineReissueContext.returnSegments?.length || 0,
      });
    }

    const existing = await reissueRepository.findOne({
      bookingId: booking._id,
      status: { $in: ACTIVE_REISSUE_STATUSES },
    });
    if (existing) {
      throw new ApiError(409, "An active reissue request already exists for this booking");
    }

    const corporate = await Corporate.findById(booking.corporateId);
    if (!corporate) throw new ApiError(404, "Corporate not found");
    const normalizedSelectedSsr = this.normalizeSelectedSsr(payload, booking);
    const bookingLineage = buildInitialBookingLineage(booking);
    const lastTicketedSnapshot = reissueFinancialLedgerService.buildLastTicketedSnapshot({
      booking,
    });

    const eligibility = await reissueEligibilityService.evaluate({
      booking,
      newJourney: payload.newJourney,
    });
    if (eligibility?.support?.ndc) {
      validateNdcReissue({
        travellers: booking?.travellers || [],
        newJourney: payload.newJourney || {},
      });
    }
    const billingMode =
      corporate.classification === "postpaid"
        ? BILLING_MODES.POSTPAID
        : BILLING_MODES.PREPAID;

    const correlationId = payload.correlationId || crypto.randomUUID();
    const reissueId = await generateReissueId();
    const baseMetadata = {
      employeeEmail: actor.email,
      employeeName: this.actorName(actor),
      orderId: booking.orderId || booking.bookingReference,
      remarks: payload.remarks || "",
      requestedBookingId: bookingContext.requestedBooking?._id?.toString?.() || null,
      activeBookingId: booking?._id?.toString?.() || null,
      isReissueRedirect: bookingContext.isReissueRedirect === true,
      ...(normalizedSelectedSsr !== undefined ? { selectedSSR: normalizedSelectedSsr } : {}),
      originalTraceId: onlineReissueContext.traceId || this.extractOriginalTraceId(booking),
      originalResultIndex:
        onlineReissueContext.resultIndex ?? this.extractOriginalResultIndex(booking),
      originalTicketData:
        onlineReissueContext.ticketData || this.extractOriginalTicketData(booking),
      providerReferences:
        onlineReissueContext.providerReferences ||
        booking?.bookingSnapshot?.providerReferences ||
        null,
      corporateFareContext:
        onlineReissueContext.corporateFareContext ||
        booking?.originalBookingSnapshot?.corporateFareContext ||
        null,
    };
    const baseRequestPayload = {
      reissueId,
      bookingId: booking._id,
      originalBookingId: onlineReissueContext.providerBookingReference,
      originalPnr: onlineReissueContext.originalPnr,
      userId: booking.userId,
      corporateId: booking.corporateId,
      companyId: booking.corporateId,
      supplier: eligibility.supplier,
      airline: booking?.bookingSnapshot?.airline || "",
      provider: PROVIDERS.TBO,
      mode: REISSUE_MODES.ONLINE,
      status: REISSUE_STATUSES.CREATED,
      reissueType: REISSUE_TYPES.FULL_REISSUE,
      creationSource: this.buildCreationSource(actor, "ONLINE_REISSUE"),
      supplierSupport: eligibility.supplierSupport,
      oldJourney: this.buildOldJourney(booking),
      newJourney: payload.newJourney,
      billingMode,
      financialLedger: reissueFinancialLedgerService.initializeLedger(booking),
      pricingHistory: [],
      activeTicketSnapshot: buildActiveTicketSnapshot(booking),
      bookingLineage,
      lastTicketedSnapshot,
      onlineReissueContext,
      metadata: baseMetadata,
      correlationId,
    };

    if (!eligibility.eligible) {
      logger.info("ONLINE_REISSUE_REJECTED", {
        bookingId: booking._id?.toString(),
        airlineCode: eligibility.supplierSupport?.airlineCode || null,
        reasons: eligibility.reasons,
      });
      // ── QA sandbox path: ineligible by fare rules but sandbox testing is allowed ──
      // Allow the search to proceed so QA can verify the provider flow.
      // The provider will reject (expected) → workflow catches it → OFFLINE_REQUIRED.
      if (eligibility.supplierSupport.sandboxTestingAllowed) {
        logger.warn("SANDBOX TESTING PATH: real eligibility=false but sandboxTestingAllowed, proceeding to provider search", {
          bookingId: booking._id?.toString(),
          airlineCode: eligibility.supplierSupport.airlineCode,
          reasons: eligibility.reasons,
        });
        // Do NOT return early — fall through to search
      } else {
        logger.warn("ONLINE REISSUE BLOCKED - eligibility check failed, no sandbox override", {
          bookingId: booking._id?.toString(),
          reasons: eligibility.reasons,
        });
        return this.buildTransientOfflineResponse({
          booking,
          supplier: eligibility.supplier,
          supplierSupport: eligibility.supplierSupport,
          reasons: eligibility.reasons,
          code: "ONLINE_REISSUE_NOT_SUPPORTED",
          message:
            eligibility.message ||
            "This booking does not support online reissue. Please raise offline request.",
          metadata: {
            errorCode: "OFFLINE_REQUIRED",
          },
        });

        logger.warn("ONLINE REISSUE BLOCKED — eligibility check failed, no sandbox override", {
          bookingId: booking._id?.toString(),
          reasons: eligibility.reasons,
        });
      }
    }

    const lock = await reissueLockService.acquire(`search:${booking._id}`, 45000);
    if (!lock.acquired) {
      throw new ApiError(409, "This reissue search is already being processed");
    }

    const isOfflineFallbackError = (error) => {
      // ── Explicit offline-route error codes from TBO provider ──
      const OFFLINE_CODES = new Set([
        "TBO_SANDBOX_REISSUE_UNSUPPORTED",   // Sandbox / PNR not reissue-enabled
        "REISSUE_NOT_AVAILABLE",              // Generic provider unavailability
        "REISSUE_AIRPORT_CODE_MISSING",       // Segment extraction failure
      ]);

      if (OFFLINE_CODES.has(error?.code)) return true;

      // ── Provider explicitly set mode = OFFLINE ──
      if (error?.mode === "OFFLINE" || error?.fallbackAvailable === true) return true;

      // ── Message-based detection for older errors ──
      const message = String(error?.message || "").toLowerCase();
      return /online reissue.*not allowed|no (?:flights|options)|reissue.*not available|valid reissue flight options|did not return valid reissue flight options|supplier.*not available|please\s+provide\s+pnr/i.test(
        message,
      );
    };

    try {
      const { searchResponse, normalized } = await reissueExecutionService.searchFlights({
        booking,
        reissueRequest: {
          ...baseRequestPayload,
        },
      });

      const providerEligibility = await reissueEligibilityService.evaluate({
        booking,
        newJourney: payload.newJourney,
        miniFareRules: normalized.parsedMiniFareRules,
      });

      if (!providerEligibility.eligible) {
        logger.info("ONLINE_REISSUE_REJECTED", {
          bookingId: booking._id?.toString(),
          airlineCode: providerEligibility.supplierSupport?.airlineCode || null,
          reasons: providerEligibility.reasons,
        });
        return this.buildTransientOfflineResponse({
          booking,
          supplier: providerEligibility.supplier,
          supplierSupport: {
            ...(eligibility.supplierSupport || {}),
            ...(providerEligibility.supplierSupport || {}),
          },
          reasons: providerEligibility.reasons,
          code: this.shouldForceOfflineFromReasons(providerEligibility.reasons)
            ? "OFFLINE_REQUIRED"
            : "ONLINE_REISSUE_NOT_SUPPORTED",
          message:
            providerEligibility.message ||
            "Online reissue is currently unavailable for this booking/airline.",
          metadata: {
            errorCode: "OFFLINE_REQUIRED",
            searchTraceId: normalized.traceId,
          },
        });
      } else {
        logger.info("ONLINE_REISSUE_SUPPORTED", {
          bookingId: booking._id?.toString(),
          airlineCode: providerEligibility.supplierSupport?.airlineCode || null,
          traceId: normalized.traceId,
        });
        const now = new Date();
        const request = reissueRepository.build({
          ...baseRequestPayload,
          status: REISSUE_STATUSES.SEARCH_COMPLETED,
          supplierSupport: {
            ...(eligibility.supplierSupport || {}),
            ...(providerEligibility.supplierSupport || {}),
          },
          supplierResponse: {
            searchResponse,
          },
          miniFareRules: normalized.parsedMiniFareRules,
          metadata: {
            ...baseMetadata,
            supplierTraceId: normalized.traceId,
            searchTraceId: normalized.traceId,
            selectedResultIndex: normalized.firstResultIndex,
            itinerary: normalized.itineraries[0] || null,
            itineraryCount: normalized.itineraries.length,
          },
          timeline: [
            {
              status: REISSUE_STATUSES.CREATED,
              title: "Reissue request created",
              description: "Unified servicing engine request created",
              actorId: actor._id || actor.id,
              actorRole: actor.role,
              at: now,
              metadata: {},
            },
            {
              status: REISSUE_STATUSES.ELIGIBILITY_CHECKED,
              title: "Eligibility checked",
              description: "Online reissue pre-checks passed",
              actorId: actor._id || actor.id,
              actorRole: actor.role,
              at: now,
              metadata: {
                ...baseMetadata,
                mode: REISSUE_MODES.ONLINE,
                status: REISSUE_STATUSES.ELIGIBILITY_CHECKED,
                reasons: eligibility.reasons,
              },
            },
            {
              status: REISSUE_STATUSES.SEARCH_COMPLETED,
              title: "Search completed",
              description: "Provider returned revised flight options for reissue",
              actorId: actor._id || actor.id,
              actorRole: actor.role,
              at: now,
              metadata: {
                ...baseMetadata,
                mode: REISSUE_MODES.ONLINE,
                status: REISSUE_STATUSES.SEARCH_COMPLETED,
                itineraryCount: normalized.itineraries.length,
                searchTraceId: normalized.traceId,
              },
            },
          ],
          auditLogs: [
            {
              action: DOMAIN_EVENTS.REISSUE_CREATED,
              actorId: actor._id || actor.id,
              actorRole: actor.role,
              message: "Reissue request created",
              at: now,
              metadata: {},
            },
            {
              action: DOMAIN_EVENTS.REISSUE_ELIGIBILITY_CHECKED,
              actorId: actor._id || actor.id,
              actorRole: actor.role,
              message: "Online reissue pre-checks passed",
              at: now,
              metadata: {
                ...baseMetadata,
                mode: REISSUE_MODES.ONLINE,
                status: REISSUE_STATUSES.ELIGIBILITY_CHECKED,
                reasons: eligibility.reasons,
              },
            },
            {
              action: DOMAIN_EVENTS.REISSUE_SEARCH_COMPLETED,
              actorId: actor._id || actor.id,
              actorRole: actor.role,
              message: "Provider returned revised flight options for reissue",
              at: now,
              metadata: {
                ...baseMetadata,
                mode: REISSUE_MODES.ONLINE,
                status: REISSUE_STATUSES.SEARCH_COMPLETED,
                itineraryCount: normalized.itineraries.length,
                searchTraceId: normalized.traceId,
              },
            },
          ],
        });

        await reissueBookingLifecycleService.lockBookingForReissue({
          booking,
          actor,
          requestId: request._id,
          requestRef: request.reissueId,
          correlationId: request.correlationId,
          mode: REISSUE_MODES.ONLINE,
          reason: "Online reissue workflow created",
        });

        try {
          await reissueRepository.save(request);
        } catch (saveError) {
          await reissueBookingLifecycleService.unlockBookingReissue({
            bookingId: booking._id,
            requestId: request._id,
          });
          throw saveError;
        }

        return request;
      }
    } catch (error) {
      if (this.isOfflineFallbackError(error)) {
        return this.buildTransientOfflineResponse({
          booking,
          supplier: eligibility.supplier,
          supplierSupport: eligibility.supplierSupport,
          reasons: [error.message],
          code: error?.code || "OFFLINE_REQUIRED",
          message: "Online reissue is currently unavailable for this booking/airline.",
          metadata: {
            errorCode: error?.code || "REISSUE_NOT_AVAILABLE",
          },
        });
      }
      throw error;
    } finally {
      await reissueLockService.release(lock);
    }
  }

  async previewOnlineQuote({ actor, requestId, resultIndex = null }) {
    const request = await reissueRepository.findById(requestId);
    if (!request) throw new ApiError(404, "Reissue request not found");
    this.ensureAccess(actor, request);

    if (![REISSUE_STATUSES.SEARCH_COMPLETED, REISSUE_STATUSES.QUOTE_RECEIVED].includes(request.status)) {
      throw new ApiError(409, `Fare quote is not allowed from status ${request.status}`);
    }

    const lock = await reissueLockService.acquire(request.reissueId);
    if (!lock.acquired) {
      throw new ApiError(409, "This reissue is already being processed");
    }

    try {
      request.isReissueLocked = true;
      const booking = await this.loadBookingOrThrow(request.bookingId);
      const { quoteResponse, normalized } = await reissueExecutionService.fareQuote({
        reissueRequest: request,
        resultIndex,
      });

      request.supplierResponse = {
        ...(request.supplierResponse || {}),
        fareQuoteResponse: quoteResponse,
      };
      request.miniFareRules = normalized.miniFareRules;
      request.supplierSupport.onlineReissueAllowed = normalized.onlineReissueAllowed;
      request.supplierSupport.onlineRefundAllowed = normalized.onlineRefundAllowed;
      request.metadata = {
        ...(request.metadata || {}),
        supplierTraceId: normalized.searchTraceId,
        searchTraceId: normalized.searchTraceId,
        selectedResultIndex: normalized.selectedResultIndex,
        itinerary: normalized.itinerary,
        supplierCharges: Number(normalized.supplierReissueCharges || 0),
      };
      const reissuePenaltyResolver = require("./reissuePenaltyResolver.service");
      const resolvedPenalty = await reissuePenaltyResolver.resolvePenalty({
        booking,
        reissueRequest: request,
        normalizedQuote: normalized,
      });

      request.reissueCharges = resolvedPenalty;

      const calculation = reissueFinancialLedgerService.calculateCumulativeReissueAmount({
        request,
        newFareQuote: { fare: normalized.publishedFare },
        selectedSSR: this.resolveSelectedSsrForRequest(request, booking),
        supplierReissueCharge: request.reissueCharges,
        booking,
      });

      request.fareDifference = Number(
        (calculation.newFare - (calculation.previousFare || 0)).toFixed(2),
      );
      request.totalAdjustment = calculation.additionalCollection;

      request.normalizedPricing = {
        reissuePenalty: resolvedPenalty,
        newFlightBase: normalized.publishedFare,
        newSSRTotal: calculation.newSSR || 0,
        reusablePreviousValue: calculation.reusableValue || 0,
        netPayable: calculation.netPayable || 0,
        refundDue: calculation.refundDue || 0,
      };

      logger.info("REISSUE_QUOTE_GENERATED", {
        requestId: request.reissueId,
        selectedResultIndex: normalized.selectedResultIndex,
        newFare: calculation.newFare,
        newSSR: calculation.newSSR,
        airlinePenalty: resolvedPenalty,
        netPayable: calculation.netPayable,
        refundDue: calculation.refundDue,
      });

      if (!request.supplierSupport.onlineReissueAllowed) {
        request.mode = REISSUE_MODES.OFFLINE;
        reissueAuditService.transition(request, REISSUE_STATUSES.OFFLINE_REQUIRED, {
          title: "Offline reissue required",
          description: "Supplier fare rules do not allow online reissue",
          actorId: actor._id || actor.id,
          actorRole: actor.role,
          eventName: DOMAIN_EVENTS.REISSUE_FAILED,
          metadata: {
            ...request.metadata,
            mode: REISSUE_MODES.OFFLINE,
            status: REISSUE_STATUSES.OFFLINE_REQUIRED,
            onlineReissueAllowed: false,
          },
        });
        request.isReissueLocked = false;
        await reissueRepository.save(request);
        await reissueBookingLifecycleService.unlockBookingReissue({
          bookingId: booking._id,
          requestId: request._id,
        });
        return request;
      }

      if (request.status === REISSUE_STATUSES.SEARCH_COMPLETED) {
        reissueAuditService.transition(request, REISSUE_STATUSES.QUOTE_RECEIVED, {
          title: "Quote received",
          description: "Fare quote and reissue charges are available",
          actorId: actor._id || actor.id,
          actorRole: actor.role,
          eventName: DOMAIN_EVENTS.REISSUE_QUOTE_RECEIVED,
          metadata: {
            ...request.metadata,
            status: REISSUE_STATUSES.QUOTE_RECEIVED,
            onlineReissueAllowed: normalized.onlineReissueAllowed,
            onlineRefundAllowed: normalized.onlineRefundAllowed,
          },
        });
      } else {
        reissueAuditService.appendAudit(request, "REISSUE_QUOTE_REFRESHED", {
          actorId: actor._id || actor.id,
          actorRole: actor.role,
          message: "Reissue quote refreshed",
          metadata: {
            status: request.status,
            onlineReissueAllowed: normalized.onlineReissueAllowed,
            onlineRefundAllowed: normalized.onlineRefundAllowed,
          },
        });
      }

      await reissueBillingService.reserve({
        reissueRequest: request,
        actorId: actor._id || actor.id,
      });

      reissueAuditService.transition(request, REISSUE_STATUSES.BILLING_RESERVED, {
        title: "Billing reserved",
        description: "Internal wallet or ledger reservation has been created",
        actorId: actor._id || actor.id,
        actorRole: actor.role,
        eventName: DOMAIN_EVENTS.REISSUE_BILLING_RESERVED,
        metadata: {
          ...request.metadata,
          status: REISSUE_STATUSES.BILLING_RESERVED,
          amount: request.totalAdjustment,
        },
      });

      request.isReissueLocked = false;
      await reissueRepository.save(request);
      return request;
    } finally {
      await reissueLockService.release(lock);
    }
  }

  async confirmOnlineReissue({ actor, requestId, remarks, ticketData }) {
    const request = await reissueRepository.findById(requestId);
    if (!request) throw new ApiError(404, "Reissue request not found");
    this.ensureAccess(actor, request);

    if (request.status === REISSUE_STATUSES.COMPLETED) {
      return request;
    }
    if (request.status !== REISSUE_STATUSES.BILLING_RESERVED) {
      throw new ApiError(409, "Reissue confirmation requires a reserved billing quote first");
    }

    const lock = await reissueLockService.acquire(request.reissueId, 60000);
    if (!lock.acquired) {
      throw new ApiError(409, "This reissue is already being processed");
    }

    try {
      request.isReissueLocked = true;
      const booking = await this.loadBookingOrThrow(request.bookingId);
      const selectedSsr = this.resolveSelectedSsrForRequest(request, booking);
      const previousTicketedSnapshot =
        request.lastTicketedSnapshot ||
        request.financialLedger?.lastTicketedSnapshot ||
        request.activeTicketSnapshot ||
        reissueFinancialLedgerService.buildLastTicketedSnapshot({ request, booking });

      if (request?.supplierSupport?.ndc) {
        validateNdcReissue({
          travellers: booking?.travellers || [],
          newJourney: request.newJourney || {},
        });
      }

      reissueAuditService.transition(request, REISSUE_STATUSES.PROCESSING, {
        title: "Processing online reissue",
        description: "Supplier ticket reissue execution started",
        actorId: actor._id || actor.id,
        actorRole: actor.role,
        eventName: DOMAIN_EVENTS.REISSUE_PROCESSING_STARTED,
        metadata: {
          ...request.metadata,
          status: REISSUE_STATUSES.PROCESSING,
        },
      });

      const result = await reissueExecutionService.executeOnline({
        booking,
        reissueRequest: request,
        remarks,
        ticketData,
      });

      request.supplierResponse = {
        ...(request.supplierResponse || {}),
        ticketReissueResponse: result.supplierResponse,
      };
      request.newBookingId = result.newBookingId;
      request.newPnr = result.newPnr || request.originalPnr;
      request.ticketData = ticketData || request.ticketData || null;
      request.revisedTicket = result.revisedTicket || request.revisedTicket || null;
      request.revisedInvoice = result.revisedInvoice || request.revisedInvoice || null;
      request.onlineReissueContext = {
        ...(request.onlineReissueContext || {}),
        providerBookingReference: result.newBookingId || request.originalBookingId || null,
        supplierBookingReference:
          result.newBookingId ||
          request?.onlineReissueContext?.supplierBookingReference ||
          request.originalBookingId ||
          null,
        originalPnr: result.newPnr || request.originalPnr || null,
      };
      request.metadata = {
        ...(request.metadata || {}),
        newPnr: result.newPnr || request.originalPnr,
        newBookingId: result.newBookingId,
        changeDetails: remarks || "Online reissue completed",
      };

      const activeBooking = await reissueBookingLifecycleService.createReissuedBooking({
        sourceBooking: booking,
        actor,
        request,
        mode: REISSUE_MODES.ONLINE,
        selectedJourney: request.metadata?.itinerary || request.newJourney,
        supplierBookingId: result.newBookingId,
        supplierResponse: result.supplierResponse,
        revisedTicketUrl:
          result.revisedTicket?.url ||
          result.revisedTicket?.Url ||
          request.revisedTicket?.url ||
          null,
        revisedInvoiceUrl:
          result.revisedInvoice?.url ||
          result.revisedInvoice?.Url ||
          request.revisedInvoice?.url ||
          null,
      });

      // Refresh activeTicketSnapshot from the newly-reissued booking, supplementing
      // with request-level fields that the booking document may not carry yet.
      request.activeTicketSnapshot = activeBooking
        ? buildActiveTicketSnapshotFromState(activeBooking, {
            pnrOverride: request.newPnr || request.originalPnr || null,
            supplierBookingIdOverride: result.newBookingId || null,
            ssrSnapshotOverride: selectedSsr,
            ticketDataOverride: request.ticketData || null,
            revisedTicketOverride: request.revisedTicket || null,
            revisedInvoiceOverride: request.revisedInvoice || null,
            sourceBookingIdOverride: activeBooking?._id || null,
          })
        : request.activeTicketSnapshot;

      // Apply reissue cycle
      const cycleCalc = reissueFinancialLedgerService.calculateCumulativeReissueAmount({
        request,
        newFareQuote: request.metadata?.itinerary || request.newJourney,
        selectedSSR: selectedSsr,
        supplierReissueCharge: request.reissueCharges,
        booking,
        previousTicketedSnapshot,
        currentTicketedSnapshot: request.activeTicketSnapshot,
      });

      request.normalizedPricing = {
        reissuePenalty: request.reissueCharges || 0,
        newFlightBase: cycleCalc.newFare || 0,
        newSSRTotal: cycleCalc.newSSR || 0,
        reusablePreviousValue: cycleCalc.reusableValue || 0,
        netPayable: cycleCalc.netPayable || 0,
        refundDue: cycleCalc.refundDue || 0,
      };

      reissueFinancialLedgerService.applyReissueCycle(request, cycleCalc);
      request.lastTicketedSnapshot = request.financialLedger?.lastTicketedSnapshot || request.lastTicketedSnapshot;

      logger.info("SSR_PERSISTED", {
        requestId: request.reissueId,
        totalSSRAmount: request.activeTicketSnapshot?.ssr?.totalSSRAmount || 0,
        segmentCount: request.activeTicketSnapshot?.segments?.length || 0,
      });

      await reissueBillingService.finalize({ reissueRequest: request });

      reissueAuditService.transition(request, REISSUE_STATUSES.COMPLETED, {
        title: "Reissue completed",
        description: "Online reissue completed successfully",
        actorId: actor._id || actor.id,
        actorRole: actor.role,
        eventName: DOMAIN_EVENTS.REISSUE_COMPLETED,
        metadata: {
          ...request.metadata,
          status: REISSUE_STATUSES.COMPLETED,
          newPnr: result.newPnr || request.originalPnr,
          activeBookingId: activeBooking?._id?.toString?.() || null,
        },
      });

      request.isReissueLocked = false;
      await reissueRepository.save(request);
      logger.info("REISSUE_COMPLETED", {
        requestId: request.reissueId,
        activeBookingId: activeBooking?._id?.toString?.() || null,
        newPnr: request.newPnr,
      });
      await reissueBookingLifecycleService.unlockBookingReissue({
        bookingId: booking._id,
        requestId: request._id,
      });
      return request;
    } catch (error) {
      await reissueBillingService.release({
        reissueRequest: request,
        reason: error.message,
      });
      reissueAuditService.transition(request, REISSUE_STATUSES.FAILED, {
        title: "Reissue failed",
        description: error.message,
        actorId: actor._id || actor.id,
        actorRole: actor.role,
        eventName: DOMAIN_EVENTS.REISSUE_FAILED,
        metadata: {
          ...request.metadata,
          status: REISSUE_STATUSES.FAILED,
        },
      });
      request.isReissueLocked = false;
      await reissueRepository.save(request);
      await reissueBookingLifecycleService.unlockBookingReissue({
        bookingId: request.bookingId,
        requestId: request._id,
      });
      throw error;
    } finally {
      await reissueLockService.release(lock);
    }
  }

  async getMyRequests({ actor, query }) {
    const mongoQuery = this.applyLedgerVisibilityFilter({ userId: actor.id });
    if (query?.status) mongoQuery.status = query.status;
    return reissueRepository.list(mongoQuery, {
      page: Number(query?.page || 1),
      limit: Number(query?.limit || 20),
    });
  }

  async getById({ actor, requestId }) {
    const request = await reissueRepository.findById(requestId);
    if (!request) throw new ApiError(404, "Reissue request not found");
    this.ensureAccess(actor, request);
    return request;
  }

  async listAdmin({ query }) {
    const mongoQuery = this.applyLedgerVisibilityFilter({});
    if (query?.status) mongoQuery.status = query.status;
    if (query?.corporateId) mongoQuery.corporateId = query.corporateId;
    return reissueRepository.list(mongoQuery, {
      page: Number(query?.page || 1),
      limit: Number(query?.limit || 20),
    });
  }

  async listOps({ query }) {
    const mongoQuery = this.applyLedgerVisibilityFilter({});
    if (query?.status) mongoQuery.status = query.status;
    if (query?.corporateId) mongoQuery.corporateId = query.corporateId;
    if (query?.assignedOpsUserId) mongoQuery.assignedOpsUserId = query.assignedOpsUserId;
    if (query?.mode) mongoQuery.mode = query.mode;
    return reissueRepository.list(mongoQuery, {
      page: Number(query?.page || 1),
      limit: Number(query?.limit || 20),
    });
  }

  async updateOpsStatus({ actor, requestId, payload }) {
    validateOpsStatusUpdate(payload);
    const request = await reissueRepository.findById(requestId);
    if (!request) throw new ApiError(404, "Reissue request not found");

    if (payload.status === REISSUE_STATUSES.OPS_ASSIGNED) {
      const opsUser = payload.assignedOpsUserId
        ? await OpsMember.findById(payload.assignedOpsUserId)
        : null;
      request.assignedOpsUserId = opsUser?._id || actor._id || actor.id;
      request.assignedAt = new Date();
    }

    if (payload.message) {
      request.opsRemarks.push({
        message: payload.message,
        by: actor._id || actor.id,
        byRole: actor.role,
        at: new Date(),
      });
    }

    const eventName =
      payload.status === REISSUE_STATUSES.OPS_ASSIGNED
        ? DOMAIN_EVENTS.REISSUE_OPS_ASSIGNED
        : payload.status === REISSUE_STATUSES.TICKET_UPLOADED
          ? DOMAIN_EVENTS.REISSUE_TICKET_UPLOADED
          : payload.status === REISSUE_STATUSES.COMPLETED
            ? DOMAIN_EVENTS.REISSUE_COMPLETED
            : payload.status === REISSUE_STATUSES.FAILED
              ? DOMAIN_EVENTS.REISSUE_FAILED
              : DOMAIN_EVENTS.REISSUE_PROCESSING_STARTED;

    reissueAuditService.transition(request, payload.status, {
      title: `Ops status updated to ${payload.status}`,
      description: payload.message || `Operations changed status to ${payload.status}`,
      actorId: actor._id || actor.id,
      actorRole: actor.role,
      eventName,
      metadata: {
        ...request.metadata,
        status: payload.status,
        opsUserId: request.assignedOpsUserId?.toString?.(),
      },
    });

    if (payload.status === REISSUE_STATUSES.COMPLETED) {
      await reissueBillingService.finalize({ reissueRequest: request });
    }

    await reissueRepository.save(request);
    return request;
  }

  async uploadArtifact({ actor, requestId, file, type }) {
    const request = await reissueRepository.findById(requestId);
    if (!request) throw new ApiError(404, "Reissue request not found");

    const uploaded = await reissueUploadService.uploadArtifact(file, type);
    const fieldName = type === "ticket" ? "uploadedTicket" : "uploadedInvoice";

    request[fieldName] = {
      ...uploaded,
      uploadedBy: actor._id || actor.id,
      uploadedAt: new Date(),
    };

    if (type === "ticket") {
      if (request.status === REISSUE_STATUSES.TICKET_UPLOADED) {
        reissueAuditService.appendAudit(request, "REISSUE_TICKET_REUPLOADED", {
          actorId: actor._id || actor.id,
          actorRole: actor.role,
          message: "Reissue ticket replaced with an updated file",
          metadata: {
            ...request.metadata,
            status: request.status,
          },
        });
      } else if (canTransition(request.status, REISSUE_STATUSES.TICKET_UPLOADED)) {
        reissueAuditService.transition(request, REISSUE_STATUSES.TICKET_UPLOADED, {
          title: "Revised ticket uploaded",
          description: "Operations uploaded the revised ticket",
          actorId: actor._id || actor.id,
          actorRole: actor.role,
          eventName: DOMAIN_EVENTS.REISSUE_TICKET_UPLOADED,
          metadata: {
            ...request.metadata,
            status: REISSUE_STATUSES.TICKET_UPLOADED,
          },
        });
      } else {
        reissueAuditService.appendAudit(request, "REISSUE_TICKET_ARTIFACT_UPLOADED", {
          actorId: actor._id || actor.id,
          actorRole: actor.role,
          message: `Reissue ticket uploaded while request is in ${request.status}; status left unchanged`,
          metadata: {
            ...request.metadata,
            status: request.status,
            uploadedArtifact: "ticket",
          },
        });
      }
    } else {
      reissueAuditService.appendAudit(request, "REISSUE_INVOICE_UPLOADED", {
        actorId: actor._id || actor.id,
        actorRole: actor.role,
        message: "Reissue invoice uploaded",
      });
    }

    await reissueRepository.save(request);
    return request;
  }

  async getAnalytics() {
    const [statusSummary, modeSummary, ageing] = await Promise.all([
      reissueRepository.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      reissueRepository.aggregate([
        { $group: { _id: "$mode", count: { $sum: 1 } } },
      ]),
      reissueRepository.aggregate([
        {
          $project: {
            status: 1,
            ageHours: {
              $divide: [{ $subtract: [new Date(), "$createdAt"] }, 1000 * 60 * 60],
            },
          },
        },
        {
          $group: {
            _id: "$status",
            avgAgeHours: { $avg: "$ageHours" },
          },
        },
      ]),
    ]);

    return { statusSummary, modeSummary, ageing };
  }

  async recoverStaleRequests() {
    const staleSince = new Date(Date.now() - 30 * 60 * 1000);
    const { data } = await reissueRepository.list(
      {
        status: {
          $in: [
            REISSUE_STATUSES.PROCESSING,
            REISSUE_STATUSES.BILLING_RESERVED,
            REISSUE_STATUSES.AWAITING_INTERNAL_SETTLEMENT,
          ],
        },
        updatedAt: { $lt: staleSince },
      },
      { page: 1, limit: 100 },
    );

    const recovered = [];
    for (const request of data) {
      const lock = await reissueLockService.acquire(request.reissueId, 30000);
      if (!lock.acquired) continue;

      try {
        await reissueBillingService.release({
          reissueRequest: request,
          reason: "Recovered stale reissue request",
        });
        reissueAuditService.transition(request, REISSUE_STATUSES.FAILED, {
          title: "Recovery marked request failed",
          description: "Stale request was moved to failed during recovery",
          actorRole: "system",
          eventName: DOMAIN_EVENTS.REISSUE_FAILED,
          metadata: {
            ...request.metadata,
            status: REISSUE_STATUSES.FAILED,
            recovery: true,
          },
          allowRecoveryRetry: true,
        });
        await reissueRepository.save(request);
        recovered.push(request.reissueId);
      } finally {
        await reissueLockService.release(lock);
      }
    }

    return recovered;
  }
  /**
   * Eligibility check endpoint for frontend dynamic detection.
   * Returns eligibility status without creating any request or calling any API.
   */
  async checkEligibility({ actor, bookingId }) {
    const bookingContext = await this.loadBookingContextOrThrow(bookingId);
    const booking = bookingContext.activeBooking;
    await providerReferenceService.backfillProviderReferences(booking, { save: true });
    this.ensureAccess(actor, {
      userId: booking.userId,
      corporateId: booking.corporateId,
    });

    if (booking.executionStatus !== "ticketed") {
      return {
        eligible: false,
        mode: REISSUE_MODES.OFFLINE,
        code: "BOOKING_NOT_TICKETED",
        message: "Only ticketed bookings can be reissued",
        support: {},
        supplierSupport: {},
        reasons: ["Only ticketed bookings can be reissued."],
        shouldCreateOfflineRequest: false,
      };
    }
    if (booking.bookingType !== "flight") {
      return {
        eligible: false,
        mode: REISSUE_MODES.OFFLINE,
        code: "NOT_FLIGHT_BOOKING",
        message: "Reissue is only supported for flight bookings",
        support: {},
        supplierSupport: {},
        reasons: ["Reissue is only supported for flight bookings."],
        shouldCreateOfflineRequest: false,
      };
    }

    try {
      reissueBookingLifecycleService.assertBookingCanBeReissued(booking);
      reissueBookingLifecycleService.assertBookingNotLocked(booking);
    } catch (error) {
      return {
        eligible: false,
        mode: REISSUE_MODES.OFFLINE,
        code: error.message.includes("locked") ? "REISSUE_LOCKED" : "ONLINE_REISSUE_NOT_SUPPORTED",
        message: error.message,
        support: {},
        supplierSupport: {},
        reasons: [error.message],
        shouldCreateOfflineRequest: false,
      };
    }

    const eligibility = await reissueEligibilityService.evaluate({ booking });

    // eligible / code = REAL airline capability (no sandbox leakage)
    // sandboxTestingAllowed = QA-only override capability
    return {
      eligible: eligibility.eligible,
      mode: eligibility.eligible ? REISSUE_MODES.ONLINE : REISSUE_MODES.OFFLINE,
      code: eligibility.eligible ? "ONLINE_REISSUE_ALLOWED" : "ONLINE_REISSUE_NOT_SUPPORTED",
      message: eligibility.eligible
        ? "This booking supports online reissue"
        : eligibility.message || "This booking does not support online reissue. Please raise offline request.",
      support: eligibility.supplierSupport,
      supplierSupport: eligibility.supplierSupport,
      reasons: eligibility.reasons,
      supplier: eligibility.supplier,
      shouldCreateOfflineRequest: false,
      // QA-only fields — frontend uses these to show sandbox QA badge, NEVER the primary badge
      sandboxTestingAllowed: eligibility.supplierSupport.sandboxTestingAllowed || false,
      sandboxOverrideApplied: eligibility.supplierSupport.sandboxOverrideApplied || false,
    };
  }
}

module.exports = new ReissueWorkflowService();
