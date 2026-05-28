"use strict";

jest.mock("../repositories/offlineReissue.repository", () => ({
  save: jest.fn(),
}));

jest.mock("../services/reissueTicketGeneration.service", () => ({
  generateReissuedTicket: jest.fn(),
}));

jest.mock("../services/reissueBookingLifecycle.service", () => ({
  createReissuedBooking: jest.fn(),
}));

jest.mock("../../../../services/reissue/reissueFinancialLedger.service", () => ({
  calculateCumulativeReissueAmount: jest.fn(),
  applyReissueCycle: jest.fn(),
}));

jest.mock("../utils/activeTicketSnapshot.helper", () => ({
  buildActiveTicketSnapshot: jest.fn(),
  buildActiveTicketSnapshotFromState: jest.fn(),
}));

jest.mock("../utils/reissueStatusMachine.util", () => ({
  assertTransition: jest.fn(),
}));

jest.mock("../../shared/domainEventBus", () => ({
  emit: jest.fn(),
}));

jest.mock("../../../../utils/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const offlineReissueRepository = require("../repositories/offlineReissue.repository");
const reissueTicketGenerationService = require("../services/reissueTicketGeneration.service");
const reissueBookingLifecycleService = require("../services/reissueBookingLifecycle.service");
const reissueFinancialLedgerService = require("../../../../services/reissue/reissueFinancialLedger.service");
const {
  buildActiveTicketSnapshotFromState,
} = require("../utils/activeTicketSnapshot.helper");
const logger = require("../../../../utils/logger");
const offlineReissueWorkflowService = require("../services/offlineReissueWorkflow.service");

describe("offlineReissueWorkflow.service generateTicket", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  test("allows super admin ticket generation even when the request is still unassigned", async () => {
    const generatedAt = new Date("2026-05-27T10:00:00.000Z");
    const actor = {
      id: "super-admin-1",
      _id: "super-admin-1",
      role: "super-admin",
    };
    const request = {
      _id: "offline-1",
      requestId: "OREI-1",
      bookingId: "booking-1",
      status: "PENDING_ASSIGNMENT",
      assignmentStatus: "UNASSIGNED",
      assignedOpsMember: null,
      assignmentHistory: [],
      timeline: [],
      auditLogs: [],
      reissueHistory: [],
      employeeId: "employee-1",
      financialLedger: { originalTicketAmount: 9000 },
      reissueCharges: 300,
      selectedFlight: { fare: 9500 },
      originalPnr: "PNR001",
      pnr: "PNR001",
    };
    const booking = {
      _id: "booking-1",
      flightRequest: { segments: [] },
      bookingSnapshot: {},
      bookingResult: {},
    };

    jest
      .spyOn(offlineReissueWorkflowService, "loadRequestOrThrow")
      .mockResolvedValueOnce(request)
      .mockResolvedValueOnce(request);
    jest
      .spyOn(offlineReissueWorkflowService, "ensureAccess")
      .mockImplementation(() => {});
    jest
      .spyOn(offlineReissueWorkflowService, "loadBookingOrThrow")
      .mockResolvedValue(booking);
    jest
      .spyOn(offlineReissueWorkflowService, "ensureSelectedFlightSnapshot")
      .mockReturnValue({ fare: 9500 });
    jest
      .spyOn(offlineReissueWorkflowService, "markBookingReissueState")
      .mockResolvedValue();
    jest
      .spyOn(offlineReissueWorkflowService, "emitPassengerEvent")
      .mockImplementation(() => {});

    reissueFinancialLedgerService.calculateCumulativeReissueAmount.mockReturnValue({
      newFare: 9500,
      newSSR: 0,
      reusableValue: 0,
      netPayable: 800,
    });
    reissueTicketGenerationService.generateReissuedTicket.mockResolvedValue({
      generatedTicketUrl: "https://example.com/ticket.pdf",
      generatedTicketPath: "/tmp/ticket.pdf",
      fileName: "ticket.pdf",
      generatedAt,
      originalItinerary: [],
      newItinerary: [],
      fareDifference: 500,
      reissueCharge: 300,
      totalCollection: 800,
    });
    reissueBookingLifecycleService.createReissuedBooking.mockResolvedValue({
      _id: "active-booking-1",
    });
    buildActiveTicketSnapshotFromState.mockReturnValue({
      ssr: { totalSSRAmount: 0 },
      segments: [],
    });

    const result = await offlineReissueWorkflowService.generateTicket({
      actor,
      requestId: "offline-1",
      payload: {},
    });

    expect(result).toBe(request);
    expect(request.assignmentStatus).toBe("ASSIGNED");
    expect(request.assignmentMethod).toBe("MANUAL");
    expect(request.status).toBe("TICKET_GENERATED");
    expect(request.generatedTicketUrl).toBe("https://example.com/ticket.pdf");
    expect(offlineReissueRepository.save).toHaveBeenCalledWith(request);
    expect(logger.info).toHaveBeenCalledWith(
      "offline_reissue_super_admin_assignment_override",
      expect.objectContaining({
        requestId: "OREI-1",
        actorId: "super-admin-1",
      }),
    );
  });
});
