/**
 * Dev-only approval fixture generator (Option B: standalone script).
 *
 * Generates a full approval matrix across:
 * - Employee Booking/Cancellation/Reissue: MANAGER -> TRAVEL_ADMIN -> EXECUTED
 * - Travel Admin Booking/Cancellation/Reissue: TRAVEL_ADMIN_APPROVER -> EXECUTED
 *
 * It creates:
 * - corporate
 * - employee user
 * - manager user
 * - travel-admin user
 * - configured approver user
 * - BookingRequest documents with required approvalStage/requestStatus and approver mapping
 * - (optionally) hotel/cancellation/reissue equivalents if your schemas support them
 *
 * It prints:
 * - document IDs
 * - dev JWTs (signed with process.env.JWT_SECRET using same payload shape as auth.middleware.js)
 * - curl commands
 *
 * Usage:
 *   node server/src/test-harness/approvalSeed.js --corporateId <id>   (optional)
 *   node server/src/test-harness/approvalSeed.js --freshCorporate       (optional)
 *   node server/src/test-harness/approvalSeed.js --count 1               (optional; multiple runs create more fixtures)
 *
 * NOTE:
 * - This script must be run in dev/test only.
 * - It uses the same JWT_SECRET as your auth.middleware.js.
 */

const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");

const mongoose = require("mongoose");

const User = require("../models/User");
const BookingRequest = require("../models/BookingRequest");
const HotelBookingRequest = require("../models/hotelBookingRequest.model");
const FlightReissueRequest = require("../models/FlightReissueRequest");
const CancellationQuery = require("../models/CancellationQuery");
const Employee = require("../models/Employee");
const Corporate = require("../models/Corporate");

const ApiError = require("../utils/ApiError");

const SECRET = process.env.JWT_SECRET;

const MONGO_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  process.env.DB_URI ||
  "mongodb://localhost:27017/corporate-travel-desk";

function ensureEnv() {
  if (!SECRET) {
    throw new Error("Missing process.env.JWT_SECRET. Set it before running this script.");
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--corporateId") out.corporateId = args[++i];
    else if (a === "--freshCorporate") out.freshCorporate = true;
    else if (a === "--count") out.count = Number(args[++i]);
  }
  if (!Number.isFinite(out.count)) out.count = 1;
  return out;
}

function buildDevTokenPayload(user, roleOverride = null) {
  // auth.middleware.js expects decoded.role and decoded.id
  // For ops-member/super-admin there are special flows,
  // but for this harness we only use normal User flow.
  return {
    id: user._id.toString(),
    role: roleOverride || user.role,
  };
}

function signDevJwt(user, roleOverride = null) {
  const payload = buildDevTokenPayload(user, roleOverride);
  // Keep payload minimal to mirror auth.middleware expectations.
  return jwt.sign(payload, SECRET, { expiresIn: "2h" });
}

async function upsertCorporateForFixtures({ freshCorporate }) {
  if (!freshCorporate) {
    // If user passes a corporateId, that is handled elsewhere.
    const corp = await Corporate.findOne({}).lean();
    if (corp) return corp;
  }

  const corp = await Corporate.create({
    corporateName: "Dev Corporate - Approval Harness",
    ssoConfig: { domain: "dev.example.com" },
    isActive: true,
    // Ensure the fields your schema requires are present.
    // Use safe defaults; adjust if your schema enforces more.
    classification: "postpaid",
    walletBalance: 0,
    creditLimit: 99999999,
    currentCredit: 0,
    registeredAddress: {
      street: "Dev Street",
      city: "Dev City",
      country: "India",
    },
    primaryContact: { mobile: "9999999999" },
  });

  return corp.toObject();
}

function splitName(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] || "Dev";
  const lastName = parts.slice(1).join(" ") || "User";
  return { firstName, lastName };
}

async function ensureUser({ role, corporateId, email, name, mobile }) {
  const existing = await User.findOne({ email, corporateId });
  if (existing) return existing;

  const { firstName, lastName } = splitName(name);

  const user = await User.create({
    corporateId,
    email,
    role,
    name: { firstName, lastName },
    mobile,
    isActive: true,
    managerRequestStatus: role === "manager" ? "approved" : "none",
  });

  // Create an Employee doc for manager/employee roles if your app expects it.
  if (!["super-admin"].includes(role)) {
    await Employee.findOneAndUpdate(
      { userId: user._id },
      {
        $set: {
          userId: user._id,
          corporateId,
          role,
          department: "Dev",
          designation: role === "manager" ? "Manager" : "Employee",
          status: "active",
          email: user.email,
          name: `${firstName} ${lastName}`.trim(),
        },
      },
      { upsert: true, new: true },
    );
  }

  return user;
}

function moneySnapshot(totalAmount = 10000) {
  return {
    totalAmount,
    currency: "INR",
    capturedAt: new Date(),
  };
}

// Minimal booking request payload.
// IMPORTANT: adapt fields if your BookingRequest schema requires more.
function baseFlightBookingRequestPayload({
  corporateId,
  requesterId,
  bookingType = "flight",
  requestStatus,
  approvalStage,
  createdByType = "employee",
  approverId = null,
  travelAdminId = null,
  travadminApprover = null,
  approverName = null,
}) {
  const now = new Date();
  return {
    bookingReference: `DEV-${Date.now()}-${Math.random().toString(16).slice(2, 6).toUpperCase()}`,
    orderId: `DEV-ORDER-${Date.now()}`,
    bookingType,
    corporateId,
    userId: requesterId,
    requestStatus,
    approvalStage,
    executionStatus: approvalStage === "EXECUTED" ? "booking_initiated" : "not_started",
    approvedAt: approvalStage === "EXECUTED" ? now : null,

    createdByType,

    fareQuote: null,
    purposeOfTravel: "DEVELOPMENT",
    gstDetails: null,
    projectCodeId: null,
    projectId: null,
    projectName: null,
    projectClient: null,
    approverId,
    approverEmail: null,
    approverName: approverName || null,
    approverRole: null,

    requesterDetails: {
      userId: requesterId,
      email: null,
    },

    // Snapshots required for later approval execution logic (credit checks etc.)
    pricingSnapshot: moneySnapshot(10000),

    bookingSnapshot: {
      sectors: ["BLR-DEL"],
      travelDate: new Date(now.getTime() + 86400000).toISOString(),
      returnDate: null,
      cabinClass: "Economy",
      amount: 10000,
      purposeOfTravel: "DEVELOPMENT",
      city: "Delhi",
    },

    approvalSnapshot: null,

    // Travel-admin approval mapping fields (different code paths look at different fields)
    travadminApprover,
    // used by some logic as manager ownership:
    managerId: approverId,

    // used by transferRequest in controller as travelAdminId + stage
    travelAdminId,

    // secondApprover is used in some older flows; keep empty for harness unless you want it.
    secondApprover: null,
    managerApproval: null,
    rejectedBy: null,
    rejectedAt: null,
    approverComments: null,
    approvedBy: null,
  };
}

function flightRequestSegmentsFixture() {
  // booking.controller uses bookingRequest.flightRequest.segments and fare quote structures.
  // For auth-stage testing, minimal structure should suffice, but some approval execution may fail.
  return [
    {
      journeyType: "onward",
      origin: { airportCode: "BLR", city: "Bangalore", country: "IN" },
      destination: { airportCode: "DEL", city: "Delhi", country: "IN" },
      departureDateTime: new Date(Date.now() + 86400000).toISOString(),
      airlineCode: "6E",
      airlineName: "IndiGo",
      flightNumber: "6E-TEST",
      cabinClass: 2,
      // used later by revalidation / fare quote logic; safe stubs
      supplierFareClass: "Economy",
      fareBasisCode: "TEST",
      fareRuleDetail: "TEST",
    },
  ];
}

async function createFlightRequestFixture({
  corporateId,
  employeeUserId,
  managerUser,
  travelAdminUser,
  configuredApproverUser,
  stage,
}) {
  const requestStatusByStage = {
    MANAGER: "PENDING_MANAGER_APPROVAL",
    TRAVEL_ADMIN: "PENDING_TRAVEL_ADMIN_APPROVAL",
    EXECUTED: "approved",
    TRAVEL_ADMIN_APPROVER: "PENDING_ADMIN_APPROVAL",
  };

  const approvalStageByStage = stage;

  const base = baseFlightBookingRequestPayload({
    corporateId,
    requesterId: employeeUserId,
    bookingType: "flight",
    requestStatus: requestStatusByStage[stage] || "pending_approval",
    approvalStage: approvalStageByStage,

    createdByType: "employee",
  });

  // attach segments so approveRequest can create BookingIntent (it reads flightRequest segments).
  // If you plan to exercise EXECUTED execution path, you’ll need more robust provider fields.
  base.flightRequest = {
    segments: flightRequestSegmentsFixture(),
    fareQuote: {
      Results: [
        {
          Fare: { PublishedFare: 10000, OfferedFare: 10000 },
          // approveRequest expects fareResult.Segments[0][0]
          Segments: [[[{ Provider: "TEST", AirlineCode: "6E", Fare: { PublishedFare: 10000 } }]]],
        },
      ],
    },
    fareSnapshot: {},
  };

  if (stage === "MANAGER") {
    base.approverId = managerUser._id;
    base.managerId = managerUser._id;
  }

  if (stage === "TRAVEL_ADMIN") {
    base.travelAdminId = travelAdminUser._id;
  }

  if (stage === "TRAVEL_ADMIN_APPROVER") {
    base.travadminApprover = {
      userId: configuredApproverUser._id,
      email: configuredApproverUser.email,
      name: configuredApproverUser.name?.firstName || "Approver",
    };
  }

  if (stage === "EXECUTED") {
    base.approvedBy = travelAdminUser._id;
    base.executionStatus = "booking_initiated";
  }

  const doc = await BookingRequest.create(base);
  return doc.toObject();
}

async function createHotelRequestFixture({
  corporateId,
  employeeUserId,
  managerUser,
  travelAdminUser,
  configuredApproverUser,
  stage,
}) {
  const requestStatusByStage = {
    MANAGER: "PENDING_MANAGER_APPROVAL",
    TRAVEL_ADMIN: "PENDING_TRAVEL_ADMIN_APPROVAL",
    EXECUTED: "approved",
    TRAVEL_ADMIN_APPROVER: "PENDING_ADMIN_APPROVAL",
  };

  const now = new Date();

  const base = {
    bookingReference: `DEV-${Date.now()}-${Math.random().toString(16).slice(2, 6).toUpperCase()}`,
    orderId: `DEV-ORDER-${Date.now()}`,
    bookingType: "hotel",
    corporateId,
    userId: employeeUserId,

    requestStatus: requestStatusByStage[stage] || "pending_approval",
    approvalStage: stage,
    executionStatus: stage === "EXECUTED" ? "booking_initiated" : "not_started",
    approvedAt: stage === "EXECUTED" ? now : null,

    purposeOfTravel: "DEVELOPMENT",
    gstDetails: null,
    projectCodeId: null,
    projectId: null,
    projectName: null,
    projectClient: null,

    // ownership / approver fields (best-effort; your schema may differ)
    approverId: stage === "MANAGER" ? managerUser._id : null,
    managerId: stage === "MANAGER" ? managerUser._id : null,
    travelAdminId: stage === "TRAVEL_ADMIN" ? travelAdminUser._id : null,

    travadminApprover:
      stage === "TRAVEL_ADMIN_APPROVER"
        ? {
            userId: configuredApproverUser._id,
            email: configuredApproverUser.email,
            name: configuredApproverUser.name?.firstName || "Approver",
          }
        : undefined,

    pricingSnapshot: moneySnapshot(10000),

    bookingSnapshot: {
      amount: 10000,
      createdAt: now,
    },

    requesterDetails: {
      userId: employeeUserId,
      email: null,
    },

    approverComments: null,
    rejectedBy: null,
    rejectedAt: null,

    approvalAudit: [],
    approvedBy: stage === "EXECUTED" ? travelAdminUser._id : null,
    bookingSnapshotRaw: {},
    createdByType: "employee",
  };

  const doc = await HotelBookingRequest.create(base);
  return doc.toObject();
}

/**
 * Seed runner:
 * - Creates/uses a corporate
 * - Creates users (employee, manager, travel-admin, configured approver)
 * - Creates BookingRequest fixtures for each stage
 * - Prints IDs and dev JWTs
 */
async function runSeed() {
  ensureEnv();
  const args = parseArgs();

  await mongoose.connect(MONGO_URI);

  const corporate = args.corporateId
    ? await Corporate.findById(args.corporateId)
    : await upsertCorporateForFixtures({ freshCorporate: args.freshCorporate });

  if (!corporate) {
    throw new Error("Could not resolve corporate for fixtures.");
  }

  const corporateId = corporate._id;

  const managerUser = await ensureUser({
    role: "manager",
    corporateId,
    email: `manager-${Date.now()}@dev.example.com`,
    name: "Dev Manager",
    mobile: "9000000001",
  });

  const employeeUser = await ensureUser({
    role: "employee",
    corporateId,
    email: `employee-${Date.now()}@dev.example.com`,
    name: "Dev Employee",
    mobile: "9000000002",
  });

  const travelAdminUser = await ensureUser({
    role: "travel-admin",
    corporateId,
    email: `travadmin-${Date.now()}@dev.example.com`,
    name: "Dev TravelAdmin",
    mobile: "9000000003",
  });

  const configuredApproverUser = await ensureUser({
    role: "manager", // configured approver could be manager in your system; ownership checks depend on stage fields
    corporateId,
    email: `configured-approver-${Date.now()}@dev.example.com`,
    name: "Configured Approver",
    mobile: "9000000004",
  });

  // Create stage fixtures (BookingRequest)
  const managerStageReq = await createFlightRequestFixture({
    corporateId,
    employeeUserId: employeeUser._id,
    managerUser,
    travelAdminUser,
    configuredApproverUser,
    stage: "MANAGER",
  });

  const travelAdminStageReq = await createFlightRequestFixture({
    corporateId,
    employeeUserId: employeeUser._id,
    managerUser,
    travelAdminUser,
    configuredApproverUser,
    stage: "TRAVEL_ADMIN",
  });

  const configuredApproverStageReq = await createFlightRequestFixture({
    corporateId,
    employeeUserId: employeeUser._id,
    managerUser,
    travelAdminUser,
    configuredApproverUser,
    stage: "TRAVEL_ADMIN_APPROVER",
  });

  const executedReq = await createFlightRequestFixture({
    corporateId,
    employeeUserId: employeeUser._id,
    managerUser,
    travelAdminUser,
    configuredApproverUser,
    stage: "EXECUTED",
  });

  const tokens = {
    employee: signDevJwt(employeeUser),
    manager: signDevJwt(managerUser),
    travelAdmin: signDevJwt(travelAdminUser),
    configuredApprover: signDevJwt(configuredApproverUser),
  };

  console.log("\n=== Approval Fixture Seed Created ===\n");
  console.log("corporateId:", corporateId.toString());
  console.log("\nUsers:");
  console.log(" employee:", { id: employeeUser._id.toString(), role: employeeUser.role, email: employeeUser.email });
  console.log(" manager:", { id: managerUser._id.toString(), role: managerUser.role, email: managerUser.email });
  console.log(" travel-admin:", { id: travelAdminUser._id.toString(), role: travelAdminUser.role, email: travelAdminUser.email });
  console.log(" configured-approver:", { id: configuredApproverUser._id.toString(), role: configuredApproverUser.role, email: configuredApproverUser.email });

  console.log("\nJWTs (dev/test):");
  console.log(" employee:", tokens.employee);
  console.log(" manager:", tokens.manager);
  console.log(" travelAdmin:", tokens.travelAdmin);
  console.log(" configuredApprover:", tokens.configuredApprover);

  console.log("\nBookingRequest Fixtures (IDs):");
  console.log(" MANAGER stage:             ", managerStageReq._id.toString(), {
    approvalStage: managerStageReq.approvalStage,
    requestStatus: managerStageReq.requestStatus,
  });
  console.log(" TRAVEL_ADMIN stage:       ", travelAdminStageReq._id.toString(), {
    approvalStage: travelAdminStageReq.approvalStage,
    requestStatus: travelAdminStageReq.requestStatus,
    travelAdminId: travelAdminStageReq.travelAdminId?.toString?.(),
  });
  console.log(" TRAVEL_ADMIN_APPROVER:    ", configuredApproverStageReq._id.toString(), {
    approvalStage: configuredApproverStageReq.approvalStage,
    requestStatus: configuredApproverStageReq.requestStatus,
    travadminApprover: configuredApproverStageReq.travadminApprover?.userId?.toString?.(),
  });
  console.log(" EXECUTED stage:           ", executedReq._id.toString(), {
    approvalStage: executedReq.approvalStage,
    requestStatus: executedReq.requestStatus,
  });

  console.log("\n=== Suggested manual tests ===\n");
  console.log("1) Travel Admin tries to approve MANAGER stage (expect 403):");
  console.log(`curl -X POST http://localhost:PORT/api/v1/approvals/${managerStageReq._id.toString()}/approve ` + `-H "Authorization: Bearer ${tokens.travelAdmin}" ` + `-H "Content-Type: application/json" ` + `-d '{"comments":"should fail"}'`);

  console.log("\n2) Manager approves MANAGER stage (expect 200 and stage move):");
  console.log(`curl -X POST http://localhost:PORT/api/v1/approvals/${managerStageReq._id.toString()}/approve ` + `-H "Authorization: Bearer ${tokens.manager}" ` + `-H "Content-Type: application/json" ` + `-d '{"comments":"manager approve"}'`);

  console.log("\n3) Travel Admin tries to reject TRAVEL_ADMIN stage (expect 200):");
  console.log(`curl -X POST http://localhost:PORT/api/v1/approvals/${travelAdminStageReq._id.toString()}/reject ` + `-H "Authorization: Bearer ${tokens.travelAdmin}" ` + `-H "Content-Type: application/json" ` + `-d '{"comments":"reject"}'`);

  console.log("\n4) Manager tries to approve TRAVEL_ADMIN stage (expect 403):");
  console.log(`curl -X POST http://localhost:PORT/api/v1/approvals/${travelAdminStageReq._id.toString()}/approve ` + `-H "Authorization: Bearer ${tokens.manager}" ` + `-H "Content-Type: application/json" ` + `-d '{"comments":"manager should not act"}'`);

  await mongoose.disconnect();
}

runSeed()
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error("Seed failed:", err);
    try {
      await mongoose.disconnect();
    } catch {}
    process.exit(1);
  });
