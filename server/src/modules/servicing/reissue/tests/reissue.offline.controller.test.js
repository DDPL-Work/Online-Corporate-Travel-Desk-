"use strict";

jest.mock("../services/offlineReissueWorkflow.service", () => ({
  createRequest: jest.fn(),
  listAdmin: jest.fn(),
}));

jest.mock("../transformers/offlineReissue.dto", () => ({
  toOfflineReissueDto: jest.fn((value) => value),
}));

const offlineReissueWorkflowService = require("../services/offlineReissueWorkflow.service");
const { toOfflineReissueDto } = require("../transformers/offlineReissue.dto");
const controller = require("../controllers/reissue.offline.controller");

const buildResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("reissue.offline.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns success for requests awaiting OPS assignment instead of 503", async () => {
    const req = {
      user: { id: "employee-1" },
      body: { bookingId: "booking-1" },
    };
    const res = buildResponse();
    const next = jest.fn();
    const createdRequest = {
      id: "offline-1",
      requestId: "OFF-REQ-1",
      status: "PENDING_ASSIGNMENT",
      assignmentStatus: "UNASSIGNED",
    };

    offlineReissueWorkflowService.createRequest.mockResolvedValue(createdRequest);
    toOfflineReissueDto.mockReturnValue(createdRequest);

    await controller.create(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Reissue request submitted successfully and awaiting OPS assignment.",
        data: expect.objectContaining({
          status: "PENDING_ASSIGNMENT",
          assignmentStatus: "UNASSIGNED",
        }),
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  test("returns pending-assignment requests in the admin queue response", async () => {
    const req = {
      user: { id: "admin-1", role: "super-admin" },
      query: {},
    };
    const res = buildResponse();
    const next = jest.fn();
    const pendingRequest = {
      id: "offline-2",
      requestId: "OFF-REQ-2",
      status: "PENDING_ASSIGNMENT",
      assignmentStatus: "UNASSIGNED",
      assignmentFailureReason: "NO_ELIGIBLE_OPS",
    };

    offlineReissueWorkflowService.listAdmin.mockResolvedValue({
      data: [pendingRequest],
      pagination: { total: 1, page: 1, pages: 1, limit: 20 },
      metrics: {
        pendingAssignmentCount: 1,
        assignmentFailures: 1,
        avgAssignmentWaitTime: 0,
      },
    });
    toOfflineReissueDto.mockReturnValue(pendingRequest);

    await controller.listAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          data: [
            expect.objectContaining({
              status: "PENDING_ASSIGNMENT",
              assignmentStatus: "UNASSIGNED",
            }),
          ],
          metrics: expect.objectContaining({
            pendingAssignmentCount: 1,
            assignmentFailures: 1,
          }),
        }),
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });
});
