"use strict";

jest.mock("../../../../models/OpsMember", () => ({
  find: jest.fn(),
  findById: jest.fn(),
}));

jest.mock("../../../../utils/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock("../../../../utils/notificationService", () => ({
  sendNotification: jest.fn(),
}));

const logger = require("../../../../utils/logger");
const OpsMember = require("../../../../models/OpsMember");
const reissueAssignmentService = require("../services/reissueAssignment.service");

const buildQueryChain = (result) => ({
  sort: jest.fn().mockReturnThis(),
  session: jest.fn().mockResolvedValue(result),
});

describe("reissueAssignment.service assignOfflineReissue", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  test("assigns the request when an eligible OPS member is available", async () => {
    const request = {
      requestId: "OFF-REQ-1",
      bookingId: "booking-1",
      status: "PENDING_ASSIGNMENT",
      assignmentHistory: [],
      save: jest.fn(),
    };
    const eligibleOpsMember = {
      _id: "ops-1",
      name: "OPS One",
    };

    jest
      .spyOn(reissueAssignmentService, "findNextEligibleOpsMember")
      .mockResolvedValue(eligibleOpsMember);
    jest
      .spyOn(reissueAssignmentService, "incrementOpsWorkload")
      .mockResolvedValue({});
    jest
      .spyOn(reissueAssignmentService, "decrementOpsWorkload")
      .mockResolvedValue(null);

    const result = await reissueAssignmentService.assignOfflineReissue({
      request,
      persistRequest: false,
      notify: false,
    });

    expect(result.assignmentAvailable).toBe(true);
    expect(result.assignedOpsMember).toBe(eligibleOpsMember);
    expect(request.status).toBe("ASSIGNED");
    expect(request.assignmentStatus).toBe("ASSIGNED");
    expect(request.assignmentFailureReason).toBeNull();
    expect(request.autoAssignmentAttempted).toBe(true);
    expect(request.assignedOpsMember).toBe("ops-1");
    expect(request.assignmentHistory).toHaveLength(1);
  });

  test("selects the first eligible round-robin OPS member using normalized permission and scope checks", async () => {
    const eligibleOpsMember = {
      _id: "ops-eligible",
      name: "OPS Eligible",
      status: "Active",
      permissions: ["Manage Reissues"],
      servicingScope: "Both",
    };
    OpsMember.find.mockReturnValue(
      buildQueryChain([
        {
          _id: "ops-missing-permission",
          name: "OPS Missing Permission",
          status: "Active",
          permissions: ["View Finance"],
          servicingScope: "Flights",
        },
        eligibleOpsMember,
      ]),
    );

    const result = await reissueAssignmentService.findNextEligibleOpsMember();

    expect(result).toBe(eligibleOpsMember);
    expect(logger.info).toHaveBeenCalledWith(
      "reissue_assignment_eligibility_check",
      expect.objectContaining({
        userId: "ops-missing-permission",
        eligible: false,
      }),
    );
  });

  test("manual assignment accepts OPS members with Manage Reissues and Flights scope", async () => {
    const opsMemberId = "507f1f77bcf86cd799439011";
    const request = {
      requestId: "OFF-REQ-3",
      bookingId: "booking-3",
      status: "PENDING_ASSIGNMENT",
      assignmentHistory: [],
      save: jest.fn(),
    };
    const opsMember = {
      _id: opsMemberId,
      name: "OPS Manual",
      status: "Active",
      permissions: ["Manage Reissues"],
      servicingScope: "Flights",
    };

    OpsMember.findById.mockReturnValue({
      session: jest.fn().mockResolvedValue(opsMember),
    });
    jest
      .spyOn(reissueAssignmentService, "incrementOpsWorkload")
      .mockResolvedValue({});
    jest
      .spyOn(reissueAssignmentService, "decrementOpsWorkload")
      .mockResolvedValue(null);

    const result = await reissueAssignmentService.assignOfflineReissue({
      request,
      opsMemberId,
      mode: "MANUAL",
      persistRequest: false,
      notify: false,
    });

    expect(result.assignmentAvailable).toBe(true);
    expect(result.assignedOpsMember).toBe(opsMember);
    expect(request.status).toBe("ASSIGNED");
  });

  test("keeps the request active when no eligible OPS member is available", async () => {
    const request = {
      requestId: "OFF-REQ-2",
      bookingId: "booking-2",
      status: "PENDING_ASSIGNMENT",
      assignmentHistory: [],
      save: jest.fn(),
    };

    jest
      .spyOn(reissueAssignmentService, "findNextEligibleOpsMember")
      .mockResolvedValue(null);

    const result = await reissueAssignmentService.assignOfflineReissue({
      request,
      persistRequest: false,
      notify: false,
    });

    expect(result.assignmentAvailable).toBe(false);
    expect(result.assignedOpsMember).toBeNull();
    expect(request.status).toBe("PENDING_ASSIGNMENT");
    expect(request.assignmentStatus).toBe("UNASSIGNED");
    expect(request.assignmentFailureReason).toBe("NO_ELIGIBLE_OPS");
    expect(request.autoAssignmentAttempted).toBe(true);
    expect(request.assignedOpsMember).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(
      "offline_reissue_assignment_unavailable",
      expect.objectContaining({
        requestId: "OFF-REQ-2",
        bookingId: "booking-2",
      }),
    );
  });
});
