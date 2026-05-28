"use strict";

jest.mock("../../../../utils/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const logger = require("../../../../utils/logger");
const {
  evaluateReissueAssignmentEligibility,
  isEligibleForReissueAssignment,
} = require("../../../../utils/reissueAssignmentEligibility.util");

describe("reissueAssignmentEligibility.util", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("accepts OPS members with Manage Reissues permission and Flights scope", () => {
    const member = {
      _id: "ops-1",
      status: "Active",
      isBlocked: false,
      permissions: ["Manage Reissues"],
      servicingScope: "Flights",
    };

    expect(isEligibleForReissueAssignment(member)).toBe(true);
    expect(logger.info).toHaveBeenCalledWith(
      "reissue_assignment_eligibility_check",
      expect.objectContaining({
        userId: "ops-1",
        eligible: true,
      }),
    );
  });

  test("accepts OPS members with Manage Reissues permission and Both scope", () => {
    const member = {
      _id: "ops-2",
      status: "ACTIVE",
      permissions: ["Manage Reissues"],
      servicingScope: "Both",
    };

    const result = evaluateReissueAssignmentEligibility(member);

    expect(result.eligible).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  test("rejects OPS members missing Manage Reissues permission", () => {
    const member = {
      _id: "ops-3",
      status: "Active",
      permissions: ["View Finance"],
      servicingScope: "Flights",
    };

    const result = evaluateReissueAssignmentEligibility(member);

    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain("missing_manage_reissues_permission");
  });
});
