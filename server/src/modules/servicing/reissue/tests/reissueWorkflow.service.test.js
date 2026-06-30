"use strict";

jest.mock("../../../../models/Corporate", () => ({
  findById: jest.fn(),
}));

jest.mock("../../../../utils/activeBookingResolver.util", () => ({
  resolveBookingContext: jest.fn(),
}));

jest.mock("../../../../services/reissue/providerReference.service", () => ({
  backfillProviderReferences: jest.fn(),
}));

jest.mock("../repositories/reissue.repository", () => ({
  findOne: jest.fn(),
  build: jest.fn(),
  save: jest.fn(),
}));

jest.mock("../utils/reissueId.util", () => ({
  generateReissueId: jest.fn(),
}));

jest.mock("../services/reissueEligibility.service", () => ({
  evaluate: jest.fn(),
}));

jest.mock("../../../../services/reissue/reissueFinancialLedger.service", () => ({
  initializeLedger: jest.fn(() => ({ originalTicketAmount: 1000 })),
  buildLastTicketedSnapshot: jest.fn(() => ({ fare: { totalFare: 1000 } })),
}));

jest.mock("../utils/onlineReissueContext.util", () => ({
  buildOnlineReissueContext: jest.fn(),
  validateOnlineReissueContext: jest.fn(() => ({ isValid: true, missingFields: [] })),
}));

jest.mock("../utils/reissueLineage.util", () => ({
  buildInitialBookingLineage: jest.fn(() => ({ originalBookingId: "OB-1", reissueGeneration: 1 })),
}));

jest.mock("../validators/ndcReissue.validator", () => ({
  validateNdcReissue: jest.fn(),
}));

jest.mock("../services/reissueExecution.service", () => ({
  searchFlights: jest.fn(),
}));

jest.mock("../services/reissueBookingLifecycle.service", () => ({
  assertBookingCanBeReissued: jest.fn(),
  assertBookingNotLocked: jest.fn(),
  lockBookingForReissue: jest.fn(),
  unlockBookingReissue: jest.fn(),
}));

jest.mock("../services/reissueLock.service", () => ({
  acquire: jest.fn(),
  release: jest.fn(),
}));

jest.mock("../services/reissueNotification.service", () => ({
  registerSubscribers: jest.fn(),
}));

jest.mock("../validators/createReissue.validator", () => ({
  validateCreateReissuePayload: jest.fn(),
}));

jest.mock("../services/reissueBilling.service", () => ({}));
jest.mock("../services/reissueUpload.service", () => ({}));
jest.mock("../services/reissueAudit.service", () => ({
  transition: jest.fn(),
  appendAudit: jest.fn(),
}));
jest.mock("../../../../models/BookingRequest", () => ({}));
jest.mock("../../../../models/OpsMember", () => ({}));

const Corporate = require("../../../../models/Corporate");
const { resolveBookingContext } = require("../../../../utils/activeBookingResolver.util");
const providerReferenceService = require("../../../../services/reissue/providerReference.service");
const reissueRepository = require("../repositories/reissue.repository");
const { generateReissueId } = require("../utils/reissueId.util");
const reissueEligibilityService = require("../services/reissueEligibility.service");
const { buildOnlineReissueContext } = require("../utils/onlineReissueContext.util");
const reissueExecutionService = require("../services/reissueExecution.service");
const reissueBookingLifecycleService = require("../services/reissueBookingLifecycle.service");
const reissueLockService = require("../services/reissueLock.service");
const reissueWorkflowService = require("../services/reissueWorkflow.service");

const actor = {
  id: "user-1",
  email: "traveler@example.com",
  role: "employee",
  name: "Traveler One",
};

const booking = {
  _id: "booking-1",
  userId: { toString: () => "user-1" },
  corporateId: { toString: () => "corp-1" },
  bookingType: "flight",
  executionStatus: "ticketed",
  orderId: "ORD-1",
  bookingReference: "BR-1",
  bookingSnapshot: {
    airline: "6E",
    providerReferences: {
      source: "LCC",
    },
  },
  originalBookingSnapshot: {
    providerBookingReference: "SUP-BOOK-1",
  },
  flightRequest: {
    source: "LCC",
    segments: [],
  },
  bookingResult: {
    pnr: "PNR-1",
  },
  travellers: [],
};

const onlineContext = {
  providerBookingReference: "SUP-BOOK-1",
  originalPnr: "PNR-1",
  traceId: "TRACE-1",
  resultIndex: 7,
  ticketData: { TourCode: "TC" },
  providerReferences: { bookingId: "SUP-BOOK-1" },
  corporateFareContext: { corporateCode: "CORP" },
  journeyType: 1,
  returnSegments: [],
};

describe("reissueWorkflow.service createRequest", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    resolveBookingContext.mockResolvedValue({
      requestedBooking: { _id: { toString: () => "requested-1" } },
      activeBooking: booking,
      isReissueRedirect: false,
    });
    providerReferenceService.backfillProviderReferences.mockResolvedValue(booking);
    reissueRepository.findOne.mockResolvedValue(null);
    Corporate.findById.mockResolvedValue({ classification: "prepaid" });
    generateReissueId.mockResolvedValue("REI-1");
    buildOnlineReissueContext.mockReturnValue(onlineContext);
    reissueLockService.acquire.mockResolvedValue({ acquired: true, key: "k", token: "t" });
    reissueLockService.release.mockResolvedValue(true);
  });

  test("returns transient offline decision when eligibility fails before search", async () => {
    reissueEligibilityService.evaluate.mockResolvedValue({
      eligible: false,
      supplier: "LCC",
      supplierSupport: {
        airlineCode: "6E",
        sandboxTestingAllowed: false,
      },
      reasons: ["Supplier does not support online reissue."],
      message: "Supplier does not support online reissue.",
    });

    const result = await reissueWorkflowService.createRequest({
      actor,
      payload: {
        bookingId: "booking-1",
        newJourney: { departureDate: "2026-06-10" },
      },
    });

    expect(result.transient).toBe(true);
    expect(result.mode).toBe("OFFLINE");
    expect(result.status).toBe("OFFLINE_REQUIRED");
    expect(result.shouldCreateOfflineRequest).toBe(false);
    expect(reissueRepository.build).not.toHaveBeenCalled();
    expect(reissueRepository.save).not.toHaveBeenCalled();
    expect(reissueExecutionService.searchFlights).not.toHaveBeenCalled();
    expect(reissueBookingLifecycleService.lockBookingForReissue).not.toHaveBeenCalled();
  });

  test("does not persist a fake offline request when provider eligibility falls back after search", async () => {
    reissueEligibilityService.evaluate
      .mockResolvedValueOnce({
        eligible: true,
        supplier: "LCC",
        supplierSupport: {
          airlineCode: "6E",
          sandboxTestingAllowed: false,
        },
        reasons: [],
      })
      .mockResolvedValueOnce({
        eligible: false,
        supplier: "LCC",
        supplierSupport: {
          airlineCode: "6E",
          onlineReissueAllowed: false,
        },
        reasons: ["Supplier fare rules do not permit online reissue for this booking."],
        message: "Supplier fare rules do not permit online reissue for this booking.",
      });

    reissueExecutionService.searchFlights.mockResolvedValue({
      searchResponse: { Response: { Results: [] } },
      normalized: {
        traceId: "TRACE-SEARCH-1",
        firstResultIndex: 11,
        itineraries: [{ id: "itinerary-1" }],
        parsedMiniFareRules: { onlineReissueAllowed: false },
      },
    });

    const result = await reissueWorkflowService.createRequest({
      actor,
      payload: {
        bookingId: "booking-1",
        newJourney: { departureDate: "2026-06-10" },
      },
    });

    expect(result.transient).toBe(true);
    expect(result.status).toBe("OFFLINE_REQUIRED");
    expect(result.shouldCreateOfflineRequest).toBe(false);
    expect(reissueRepository.build).not.toHaveBeenCalled();
    expect(reissueRepository.save).not.toHaveBeenCalled();
    expect(reissueBookingLifecycleService.lockBookingForReissue).not.toHaveBeenCalled();
    expect(reissueLockService.acquire).toHaveBeenCalled();
    expect(reissueLockService.release).toHaveBeenCalled();
  });

  test("persists only successful online searches and stamps USER_SUBMITTED creationSource", async () => {
    const builtRequest = {
      _id: "mongo-1",
      reissueId: "REI-1",
      correlationId: "corr-1",
    };

    reissueEligibilityService.evaluate
      .mockResolvedValueOnce({
        eligible: true,
        supplier: "LCC",
        supplierSupport: {
          airlineCode: "6E",
          sandboxTestingAllowed: false,
        },
        reasons: [],
      })
      .mockResolvedValueOnce({
        eligible: true,
        supplier: "LCC",
        supplierSupport: {
          airlineCode: "6E",
          onlineReissueAllowed: true,
        },
        reasons: [],
      });

    reissueExecutionService.searchFlights.mockResolvedValue({
      searchResponse: { Response: { Results: ["option"] } },
      normalized: {
        traceId: "TRACE-SEARCH-2",
        firstResultIndex: 12,
        itineraries: [{ id: "itinerary-2" }],
        parsedMiniFareRules: { onlineReissueAllowed: true },
      },
    });

    reissueRepository.build.mockImplementation((payload) => ({
      ...builtRequest,
      ...payload,
    }));
    reissueRepository.save.mockImplementation(async (payload) => payload);

    const result = await reissueWorkflowService.createRequest({
      actor,
      payload: {
        bookingId: "booking-1",
        newJourney: { departureDate: "2026-06-10" },
      },
    });

    expect(reissueRepository.build).toHaveBeenCalledTimes(1);
    const persistedPayload = reissueRepository.build.mock.calls[0][0];
    expect(persistedPayload.creationSource).toEqual({
      type: "USER_SUBMITTED",
      trigger: "USER_ACTION",
      createdBy: "user-1",
      workflow: "ONLINE_REISSUE",
    });
    expect(reissueBookingLifecycleService.lockBookingForReissue).toHaveBeenCalledTimes(1);
    expect(reissueRepository.save).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("SEARCH_COMPLETED");
  });
});
