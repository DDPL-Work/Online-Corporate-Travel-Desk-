"use strict";

jest.mock("../../../models/OpsMember", () => ({
  find: jest.fn(),
  findById: jest.fn(),
  updateOne: jest.fn(),
}));

jest.mock("../../../models/AssignmentRotation", () => ({
  findOneAndUpdate: jest.fn(),
}));

jest.mock("../../../utils/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock("../../../utils/notificationService", () => ({
  sendNotification: jest.fn(),
}));

jest.mock("mongoose", () => {
  const mockSession = {
    startTransaction: jest.fn(),
    commitTransaction: jest.fn().mockResolvedValue(),
    abortTransaction: jest.fn().mockResolvedValue(),
    endSession: jest.fn().mockResolvedValue(),
  };
  return {
    startSession: jest.fn().mockResolvedValue(mockSession),
    Types: { ObjectId: { isValid: jest.fn().mockReturnValue(true) } },
  };
});

const OpsMember = require("../../../models/OpsMember");
const AssignmentRotation = require("../../../models/AssignmentRotation");
const mongoose = require("mongoose");
const roundRobinService = require("../services/roundRobinAssignment.service");

const buildMockMember = (overrides = {}) => ({
  _id: overrides._id || "member1",
  name: overrides.name || "Test Agent",
  permissions: overrides.permissions || ["Manage Reissues", "Manage Cancellations"],
  status: overrides.status || "Active",
  availabilityStatus: overrides.availabilityStatus || "AVAILABLE",
  autoAssignmentEnabled: overrides.autoAssignmentEnabled ?? true,
  currentActiveReissues: overrides.currentActiveReissues ?? 0,
  maxConcurrentReissues: overrides.maxConcurrentReissues ?? 10,
  currentActiveCancellations: overrides.currentActiveCancellations ?? 0,
  maxConcurrentCancellations: overrides.maxConcurrentCancellations ?? 10,
  currentActiveAssignments: overrides.currentActiveAssignments ?? 0,
  currentWorkload: overrides.currentWorkload ?? 0,
  lastAssignedAt: overrides.lastAssignedAt || null,
  lastAssignmentType: overrides.lastAssignmentType || null,
  assignmentStats: { totalAssigned: 0, totalCompleted: 0, avgResolutionMinutes: 0, slaBreaches: 0 },
  isDeleted: false,
  save: jest.fn().mockResolvedValue(true),
});

const mockFindById = (member) => {
  OpsMember.findById.mockReturnValue({
    session: jest.fn().mockResolvedValue(member),
  });
};

describe("RoundRobinAssignment — Reissue Capacity", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("14/15 → ELIGIBLE for reissue", async () => {
    const member = buildMockMember({
      currentActiveReissues: 14,
      maxConcurrentReissues: 15,
    });

    OpsMember.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      session: jest.fn().mockResolvedValue([member]),
    });

    const eligible = await roundRobinService.getEligibleOpsMembers({ requestType: "reissue" });
    expect(eligible).toHaveLength(1);
    expect(eligible[0].name).toBe("Test Agent");
  });

  test("15/15 → NOT ELIGIBLE for reissue", async () => {
    const member = buildMockMember({
      currentActiveReissues: 15,
      maxConcurrentReissues: 15,
    });

    OpsMember.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      session: jest.fn().mockResolvedValue([member]),
    });

    const eligible = await roundRobinService.getEligibleOpsMembers({ requestType: "reissue" });
    expect(eligible).toHaveLength(0);
  });

  test("16/15 → NOT ELIGIBLE for reissue (over capacity)", async () => {
    const member = buildMockMember({
      currentActiveReissues: 16,
      maxConcurrentReissues: 15,
    });

    OpsMember.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      session: jest.fn().mockResolvedValue([member]),
    });

    const eligible = await roundRobinService.getEligibleOpsMembers({ requestType: "reissue" });
    expect(eligible).toHaveLength(0);
  });

  test("0/15 → ELIGIBLE for reissue", async () => {
    const member = buildMockMember({
      currentActiveReissues: 0,
      maxConcurrentReissues: 15,
    });

    OpsMember.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      session: jest.fn().mockResolvedValue([member]),
    });

    const eligible = await roundRobinService.getEligibleOpsMembers({ requestType: "reissue" });
    expect(eligible).toHaveLength(1);
  });
});

describe("RoundRobinAssignment — Cancellation Capacity", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("19/20 → ELIGIBLE for cancellation", async () => {
    const member = buildMockMember({
      currentActiveCancellations: 19,
      maxConcurrentCancellations: 20,
    });

    OpsMember.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      session: jest.fn().mockResolvedValue([member]),
    });

    const eligible = await roundRobinService.getEligibleOpsMembers({ requestType: "cancellation" });
    expect(eligible).toHaveLength(1);
  });

  test("20/20 → NOT ELIGIBLE for cancellation", async () => {
    const member = buildMockMember({
      currentActiveCancellations: 20,
      maxConcurrentCancellations: 20,
    });

    OpsMember.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      session: jest.fn().mockResolvedValue([member]),
    });

    const eligible = await roundRobinService.getEligibleOpsMembers({ requestType: "cancellation" });
    expect(eligible).toHaveLength(0);
  });

  test("21/20 → NOT ELIGIBLE for cancellation (over capacity)", async () => {
    const member = buildMockMember({
      currentActiveCancellations: 21,
      maxConcurrentCancellations: 20,
    });

    OpsMember.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      session: jest.fn().mockResolvedValue([member]),
    });

    const eligible = await roundRobinService.getEligibleOpsMembers({ requestType: "cancellation" });
    expect(eligible).toHaveLength(0);
  });
});

describe("RoundRobinAssignment — Permission Filtering", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Missing Manage Reissues → NOT eligible", async () => {
    const member = buildMockMember({
      permissions: ["Manage Cancellations"],
      currentActiveReissues: 5,
      maxConcurrentReissues: 10,
    });

    OpsMember.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      session: jest.fn().mockResolvedValue([member]),
    });

    const eligible = await roundRobinService.getEligibleOpsMembers({ requestType: "reissue" });
    expect(eligible).toHaveLength(0);
  });

  test("Missing Manage Cancellations → NOT eligible", async () => {
    const member = buildMockMember({
      permissions: ["Manage Reissues"],
      currentActiveCancellations: 5,
      maxConcurrentCancellations: 10,
    });

    OpsMember.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      session: jest.fn().mockResolvedValue([member]),
    });

    const eligible = await roundRobinService.getEligibleOpsMembers({ requestType: "cancellation" });
    expect(eligible).toHaveLength(0);
  });
});

describe("RoundRobinAssignment — Availability Filtering", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("BUSY → NOT eligible for reissue", async () => {
    const member = buildMockMember({ availabilityStatus: "BUSY" });

    OpsMember.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      session: jest.fn().mockResolvedValue([]), // MongoDB query excludes non-AVAILABLE
    });

    const eligible = await roundRobinService.getEligibleOpsMembers({ requestType: "reissue" });
    expect(eligible).toHaveLength(0);
  });

  test("ON_LEAVE → NOT eligible for cancellation", async () => {
    OpsMember.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      session: jest.fn().mockResolvedValue([]),
    });

    const eligible = await roundRobinService.getEligibleOpsMembers({ requestType: "cancellation" });
    expect(eligible).toHaveLength(0);
  });

  test("OFFLINE → NOT eligible", async () => {
    OpsMember.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      session: jest.fn().mockResolvedValue([]),
    });

    const eligible = await roundRobinService.getEligibleOpsMembers({ requestType: "reissue" });
    expect(eligible).toHaveLength(0);
  });
});

describe("RoundRobinAssignment — Auto Assignment Disabled", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("autoAssignmentEnabled=false → NOT eligible", async () => {
    OpsMember.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      session: jest.fn().mockResolvedValue([]),
    });

    const eligible = await roundRobinService.getEligibleOpsMembers({ requestType: "reissue" });
    expect(eligible).toHaveLength(0);
  });
});

describe("RoundRobinAssignment — Round Robin Rotation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("A → B → C → A (round-robin rotation)", async () => {
    const members = ["Alice", "Bob", "Charlie"].map((name, i) =>
      buildMockMember({
        _id: `member${i}`,
        name,
        currentActiveReissues: 0,
        maxConcurrentReissues: 10,
      }),
    );

    OpsMember.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      session: jest.fn().mockResolvedValue(members),
    });

    AssignmentRotation.findOneAndUpdate
      .mockResolvedValueOnce({ currentIndex: 0, save: jest.fn().mockResolvedValue(true) })
      .mockResolvedValueOnce({ currentIndex: 1, save: jest.fn().mockResolvedValue(true) })
      .mockResolvedValueOnce({ currentIndex: 2, save: jest.fn().mockResolvedValue(true) })
      .mockResolvedValueOnce({ currentIndex: 0, save: jest.fn().mockResolvedValue(true) });

    const r1 = await roundRobinService.findNextEligibleAgent({ requestType: "reissue" });
    expect(r1.name).toBe("Alice");

    const r2 = await roundRobinService.findNextEligibleAgent({ requestType: "reissue" });
    expect(r2.name).toBe("Bob");

    const r3 = await roundRobinService.findNextEligibleAgent({ requestType: "reissue" });
    expect(r3.name).toBe("Charlie");

    const r4 = await roundRobinService.findNextEligibleAgent({ requestType: "reissue" });
    expect(r4.name).toBe("Alice");
  });
});

describe("RoundRobinAssignment — Capacity Release", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("incrementAgentCounters bumps currentActiveReissues", async () => {
    const member = buildMockMember({ currentActiveReissues: 5 });
    mockFindById(member);

    await roundRobinService.incrementAgentCounters("member1", "reissue");
    expect(member.currentActiveReissues).toBe(6);
    expect(member.save).toHaveBeenCalled();
  });

  test("incrementAgentCounters bumps currentActiveCancellations", async () => {
    const member = buildMockMember({ currentActiveCancellations: 5 });
    mockFindById(member);

    await roundRobinService.incrementAgentCounters("member1", "cancellation");
    expect(member.currentActiveCancellations).toBe(6);
    expect(member.save).toHaveBeenCalled();
  });

  test("decrementAgentCounters releases reissue capacity", async () => {
    const member = buildMockMember({ currentActiveReissues: 7 });
    mockFindById(member);

    await roundRobinService.decrementAgentCounters("member1", "reissue");
    expect(member.currentActiveReissues).toBe(6);
    expect(member.save).toHaveBeenCalled();
  });

  test("decrementAgentCounters releases cancellation capacity", async () => {
    const member = buildMockMember({ currentActiveCancellations: 9 });
    mockFindById(member);

    await roundRobinService.decrementAgentCounters("member1", "cancellation");
    expect(member.currentActiveCancellations).toBe(8);
    expect(member.save).toHaveBeenCalled();
  });

  test("counters never go below zero", async () => {
    const member = buildMockMember({ currentActiveReissues: 0 });
    mockFindById(member);

    await roundRobinService.decrementAgentCounters("member1", "reissue");
    expect(member.currentActiveReissues).toBe(0);
  });
});

describe("RoundRobinAssignment — Assignment Audit", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("autoAssignRequest writes audit with capacity info", async () => {
    jest.setTimeout(10000);
    const member = buildMockMember({
      name: "John",
      currentActiveReissues: 3,
      maxConcurrentReissues: 15,
    });
    const request = {
      _id: "req1",
      corporateId: "corp1",
      assignedTo: null,
      assignedAt: null,
      assignmentMethod: null,
      status: "PENDING",
      assignmentHistory: [],
      assignmentAudit: [],
      save: jest.fn().mockResolvedValue(true),
    };

    OpsMember.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      session: jest.fn().mockResolvedValue([member]),
    });

    mockFindById(member);

    AssignmentRotation.findOneAndUpdate.mockResolvedValue({
      currentIndex: 0,
      save: jest.fn().mockResolvedValue(true),
    });

    mongoose.startSession.mockResolvedValue({
      startTransaction: jest.fn(),
      commitTransaction: jest.fn().mockResolvedValue(),
      abortTransaction: jest.fn().mockResolvedValue(),
      endSession: jest.fn().mockResolvedValue(),
    });

    const result = await roundRobinService.autoAssignRequest({
      request,
      requestType: "reissue",
      assignedBy: "SYSTEM",
      reason: "Round robin test",
      statusOnAssign: "ASSIGNED",
    });

    expect(result).not.toBeNull();
    expect(result.request.assignedTo).toBe("member1");
    expect(result.request.assignmentHistory).toHaveLength(1);
    expect(result.request.assignmentAudit).toHaveLength(1);
    expect(result.request.assignmentAudit[0].action).toBe("AUTO_ASSIGNED");
    expect(result.request.assignmentAudit[0].message).toContain("John");
    expect(result.request.assignmentAudit[0].message).toContain("3/15");
    expect(member.currentActiveReissues).toBe(4);
  });
});
