// server/src/controllers/corporate.controller.js

const Corporate = require("../models/Corporate");
const User = require("../models/User");
const BookingRequest = require("../models/BookingRequest");
const HotelBookingRequest = require("../models/hotelBookingRequest.model");
const Ledger = require("../models/Ledger");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { calculateNextBillingDate, slugify } = require("../utils/helpers");
const emailService = require("../services/email.service");
const { notify } = require("../notifications/orchestrator");
const EVENTS = require("../events/eventConstants");
const crypto = require("crypto");
const cloudinary = require("../config/cloudinary");
const fs = require("fs");
const hotelService = require("../services/tektravels/hotel.service");


// -----------------------------------------------------
// ONBOARD CORPORATE - PUBLIC (Pending Status)
// -----------------------------------------------------
exports.onboardCorporate = asyncHandler(async (req, res) => {
  console.log("BODY:", req.body);
  // 🟢 Keep original destructuring
  // BASIC
  const corporateName = req.body.corporateName;
  const corporateType = req.body.corporateType || "pvt-ltd";
  const classification = req.body.classification || "prepaid";
  const defaultApprover = req.body.defaultApprover || "travel-admin";
  const creditTermsNotes = req.body.creditTermsNotes;
  const metadata = req.body.metadata || {};

  // PRIMARY CONTACT
  const primaryContact = req.body.primaryContact || {};
  // const secondaryContact = req.body.secondaryContact || {};
  const billingDepartment = req.body.billingDepartment || {};
  const registeredAddress = req.body.registeredAddress || {};
  const ssoConfig = req.body.ssoConfig || {};
  const gstDetails = req.body.gstDetails || {};

  // Removed travel policy logic

  // --------------------------------------------------
  // VALIDATIONS (UNCHANGED)
  // --------------------------------------------------
  if (
    !corporateName ||
    !primaryContact?.name ||
    !primaryContact?.email ||
    !primaryContact?.mobile
  )
    throw new ApiError(
      400,
      "Primary contact name, email & mobile are required",
    );

  if (!ssoConfig?.type || !ssoConfig?.domain)
    throw new ApiError(400, "SSO config type & domain are required");

  if (!classification)
    throw new ApiError(400, "Corporate classification is required");

  const existingDomain = await Corporate.findOne({
    "ssoConfig.domain": ssoConfig.domain,
  });

  if (existingDomain) throw new ApiError(400, "Domain already registered");

  // Phone number uniqueness validation
  const existingPhone = await Corporate.findOne({
    "primaryContact.mobile": primaryContact.mobile,
  });

  if (existingPhone) throw new ApiError(400, "Phone number already exists");

  // GST Email Preference: 1. Accounts (Billing), 2. Travel-admin (Primary)
  gstDetails.gstEmail =
    gstDetails.gstEmail ||
    billingDepartment?.email ||
    primaryContact?.email ||
    "";

  gstDetails.contactNumber =
    gstDetails.contactNumber ||
    billingDepartment?.mobile ||
    primaryContact?.mobile ||
    "";

  // --------------------------------------------------
  // 🟢 CLOUDINARY UPLOAD SECTION (NEW)
  // --------------------------------------------------

  let gstCertificate = {};
  let corporatePanCard = {};

  if (req.files?.gstCertificate?.[0]) {
    const result = await cloudinary.uploader.upload(
      req.files.gstCertificate[0].path,
      {
        folder: "corporates/gst",
        resource_type: "auto",
      },
    );

    gstCertificate = {
      publicId: result.public_id,
      url: result.secure_url,
      uploadedAt: new Date(),
      verified: false,
    };

    fs.unlinkSync(req.files.gstCertificate[0].path);
  }

  if (req.files?.corporatePanCard?.[0]) {
    const result = await cloudinary.uploader.upload(req.files.corporatePanCard[0].path, {
      folder: "corporates/pan",
      resource_type: "auto",
    });

    corporatePanCard = {
      publicId: result.public_id,
      url: result.secure_url,
      uploadedAt: new Date(),
      verified: false,
    };

    fs.unlinkSync(req.files.corporatePanCard[0].path);
  }

  // URL fallback
  if (req.body["gstCertificate[url]"] || req.body.gstCertificate?.url) {
    gstCertificate.url = req.body["gstCertificate[url]"] || req.body.gstCertificate?.url;
  }

  if (req.body["corporatePanCard[url]"] || req.body.corporatePanCard?.url) {
    corporatePanCard.url = req.body["corporatePanCard[url]"] || req.body.corporatePanCard?.url;
  }

  if (req.body["corporatePanCard[number]"] || req.body.corporatePanCard?.number) {
    corporatePanCard.number = req.body["corporatePanCard[number]"] || req.body.corporatePanCard?.number;
  }

  // --------------------------------------------------
  // CREATE CORPORATE (STRUCTURE SAME AS YOUR OLD)
  // --------------------------------------------------

  const corporate = await Corporate.create({
    corporateName,
    corporateType,
    registeredAddress,
    primaryContact,
    // secondaryContact,
    billingDepartment,

    ssoConfig: { ...ssoConfig, verified: false },

    gstDetails: {
      ...gstDetails,
      verified: false,
    },

    gstCertificate,
    corporatePanCard,

    classification,

    defaultApprover,
    status: "pending",
    creditTermsNotes,
    metadata,
  });


  // ── Notify Super Admin: new corporate registered (in-app) ──────
  notify(EVENTS.CORPORATE_REGISTERED, {
    corporateId:    corporate._id,
    corporateName:  corporate.corporateName,
    classification: corporate.classification,
    primaryContactEmail: corporate.primaryContact?.email,
  });

  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        corporate,
        "Corporate onboarded (pending approval).",
      ),
    );
});

// -----------------------------------------------------
// APPROVE CORPORATE (SUPER ADMIN ONLY)
// -----------------------------------------------------
exports.approveCorporate = asyncHandler(async (req, res) => {
  const corporate = await Corporate.findById(req.params.id);
  if (!corporate) throw new ApiError(404, "Corporate not found");

  if (["inactive", "disabled"].includes(corporate.status))
    throw new ApiError(400, "Corporate cannot be approved");

  // ----------------------------
  // 🔹 Extract Financial Config
  // ----------------------------
  const {
    classification,
    billingCycle,
    customBillingDays,
    dueDays,
    creditLimit,
    walletBalance,
    serviceCharges,
  } = req.body;

  if (!classification)
    throw new ApiError(400, "Account classification is required");

  if (!["prepaid", "postpaid"].includes(classification))
    throw new ApiError(400, "Invalid classification");

  // ----------------------------
  // 🔹 Financial Validation
  // ----------------------------
  if (classification === "postpaid") {
    if (!creditLimit || Number(creditLimit) <= 0)
      throw new ApiError(400, "Valid credit limit required for postpaid");

    if (!billingCycle)
      throw new ApiError(400, "Billing cycle required for postpaid");

    corporate.creditLimit = Number(creditLimit);
    corporate.walletBalance = 0;
    corporate.billingCycle = billingCycle;
    corporate.customBillingDays =
      billingCycle === "custom" ? Number(customBillingDays || 0) : null;
    corporate.dueDays = Number(dueDays || 0);

    corporate.nextBillingDate = calculateNextBillingDate(
      billingCycle,
      customBillingDays,
    );
  }

  if (classification === "prepaid") {
    corporate.walletBalance = Number(walletBalance || 0);
    corporate.creditLimit = 0;
    corporate.billingCycle = null;
    corporate.customBillingDays = null;
    corporate.dueDays = null;
    corporate.nextBillingDate = null;
  }

  corporate.classification = classification;
  corporate.serviceCharges = {
    domesticFlight: Number(serviceCharges?.domesticFlight || 0),
    internationalOneWayFlight: Number(serviceCharges?.internationalOneWayFlight || 0),
    internationalReturnFlight: Number(serviceCharges?.internationalReturnFlight || 0),
    domesticHotel: Number(serviceCharges?.domesticHotel || 0),
    internationalHotel: Number(serviceCharges?.internationalHotel || 0),
  };

  if (req.body.serviceFeeRules) {
    corporate.serviceFeeRules = req.body.serviceFeeRules.map(rule => ({
      ...rule,
      cabinClass: rule.productType === "Flight" && typeof rule.cabinClass === "string"
        ? ({"economy":2,"premium economy":3,"business":4,"premium business":5,"first class":6}[rule.cabinClass.toLowerCase()] || 2)
        : rule.cabinClass,
      starRating: rule.productType === "Hotel" && typeof rule.starRating === "string"
        ? (parseInt(rule.starRating.match(/\d+/)?.[0] || 3, 10))
        : rule.starRating
    }));
  }

  // ----------------------------
  // 🔹 Activate Corporate
  // ----------------------------
  corporate.status = "active";
  corporate.isActive = true;
  corporate.onboardedAt = new Date();

  corporate.ssoConfig.verified = true;
  corporate.ssoConfig.verifiedAt = new Date();

  corporate.primaryContact.role = "travel-admin";
  
  // 🔹 Generate Corporate Specific URL Slug & Full URL
  if (!corporate.corporateSlug) {
    corporate.corporateSlug = slugify(corporate.corporateName);
    corporate.corporateUrl = `https://traveamer.com/${corporate.corporateSlug}`;
  }

  await corporate.save();

  // ----------------------------
  // 🔹 Create / Update Users
  // ----------------------------
  const createOrUpdateUserWithRole = async (contact, role) => {
    if (!contact?.email) return null;

    const email = contact.email.toLowerCase().trim();
    const [firstName, ...lastParts] = contact.name?.trim().split(" ") || [];

    const token = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    let user = await User.findOne({
      email,
      corporateId: corporate._id,
    });

    if (!user) {
      user = await User.create({
        email,
        name: {
          firstName: firstName || "",
          lastName: lastParts.join(" ") || "",
        },
        mobile: contact.mobile || "",
        corporateId: corporate._id,
        role,
        isActive: true,
      });
    } else {
      user.role = role;
      user.isActive = true;
      await user.save();
    }

    return { user };
  };

  const primaryAdmin = await createOrUpdateUserWithRole(
    corporate.primaryContact,
    "travel-admin",
  );

  if (corporate.billingDepartment && corporate.billingDepartment.email) {
    await createOrUpdateUserWithRole(
      corporate.billingDepartment,
      "finance_team",
    );
  }

  // const secondaryAdmin = await createOrUpdateUserWithRole(
  //   corporate.secondaryContact,
  //   "travel-admin",
  // );

  try {
    if (primaryAdmin) {
      console.log(`[APPROVAL] Sending activation email to ${corporate.primaryContact.email}`);

      // ── Use orchestrator for email + in-app notification ────────────
      notify(EVENTS.CORPORATE_APPROVED, {
        corporateId:         corporate._id,
        primaryContactEmail: corporate.primaryContact?.email,
        contactName:         corporate.primaryContact?.name || 'Admin',
        corporateName:       corporate.corporateName,
        classification:      corporate.classification,
        domain:              corporate.ssoConfig?.domain,
        creditLimit:         corporate.creditLimit,
        creditCycle:         corporate.billingCycle,
        serviceCharges:      corporate.serviceCharges?.domesticFlight,
        corporateUrl:        corporate.corporateUrl ||
                             `${process.env.FRONTEND_URL}/login?slug=${corporate.corporateSlug}`,
      });

      // ── Notify Super Admin if approved by OPS member ────────────────
      if (req.user.role === 'ops-member') {
        notify(EVENTS.CORPORATE_APPROVED_BY_OPS, {
          corporateId:   corporate._id,
          corporateName: corporate.corporateName,
          opsMemberName: `${req.user.name?.firstName || ''} ${req.user.name?.lastName || ''}`.trim() || req.user.email,
          classification: corporate.classification,
        });
      }
    }
  } catch (err) {
    console.error("Corporate approval notification failed (non-critical):", err.message);
  }

  res
    .status(200)
    .json(new ApiResponse(200, corporate, "Corporate approved & activated"));
});

// -----------------------------------------------------
// GET ALL CORPORATES
// -----------------------------------------------------
exports.getAllCorporates = asyncHandler(async (req, res) => {
  const corporates = await Corporate.find().sort({ createdAt: -1 }).lean();

  const enrichedCorporates = await Promise.all(
    corporates.map(async (corp) => {
      if (corp.classification !== "postpaid") return corp;

      // 🔹 Calculate Current Cycle Start
      const onboardedAt = corp.onboardedAt || corp.createdAt;
      const cycleDays =
        corp.billingCycle === "15days"
          ? 15
          : corp.billingCycle === "30days"
            ? 30
            : corp.customBillingDays || 30;

      const now = new Date();
      const cycleMs = cycleDays * 24 * 60 * 60 * 1000;
      const timeDiff = now.getTime() - new Date(onboardedAt).getTime();

      const cycleIndex = Math.max(0, Math.floor(timeDiff / cycleMs));
      const currentCycleStart = new Date(
        new Date(onboardedAt).getTime() + cycleIndex * cycleMs,
      );

      // 🔹 Aggregate Usage for Current Cycle
      const result = await Ledger.aggregate([
        {
          $match: {
            corporateId: corp._id,
            status: { $ne: "cancelled" },
            createdAt: { $gte: currentCycleStart },
          },
        },
        {
          $group: {
            _id: null,
            totalDebit: {
              $sum: {
                $cond: [{ $eq: ["$transactionType", "debit"] }, "$amount", 0],
              },
            },
            totalCredit: {
              $sum: {
                $cond: [{ $eq: ["$transactionType", "credit"] }, "$amount", 0],
              },
            },
          },
        },
      ]);

      const totalDebit = result[0]?.totalDebit || 0;
      const totalCredit = result[0]?.totalCredit || 0;
      const currentCycleUsage = totalDebit - totalCredit;

      return {
        ...corp,
        currentCredit: currentCycleUsage, // 🔥 Override with Current Cycle usage
      };
    }),
  );

  res
    .status(200)
    .json(new ApiResponse(200, enrichedCorporates, "Corporate list"));
});

// -----------------------------------------------------
// GET SINGLE CORPORATE
// -----------------------------------------------------
exports.getCorporate = asyncHandler(async (req, res) => {
  const corporate = await Corporate.findById(req.params.id);
  if (!corporate) throw new ApiError(404, "Corporate not found");

  res.status(200).json(new ApiResponse(200, corporate, "Corporate details"));
});

// -----------------------------------------------------
// UPDATE CORPORATE
// -----------------------------------------------------
exports.updateCorporate = asyncHandler(async (req, res) => {
  if (req.body.serviceFeeRules) {
    req.body.serviceFeeRules = req.body.serviceFeeRules.map(rule => ({
      ...rule,
      cabinClass: rule.productType === "Flight" && typeof rule.cabinClass === "string"
        ? ({"economy":2,"premium economy":3,"business":4,"premium business":5,"first class":6}[rule.cabinClass.toLowerCase()] || 2)
        : rule.cabinClass,
      starRating: rule.productType === "Hotel" && typeof rule.starRating === "string"
        ? (parseInt(rule.starRating.match(/\d+/)?.[0] || 3, 10))
        : rule.starRating
    }));
  }

  // Handle Base64 file uploads for documents
  if (req.body.gstFileBase64) {
    const result = await cloudinary.uploader.upload(req.body.gstFileBase64, {
      folder: "corporates/gst",
      resource_type: "auto",
    });
    req.body.gstCertificate = {
      publicId: result.public_id,
      url: result.secure_url,
      uploadedAt: new Date(),
      verified: false,
    };
    delete req.body.gstFileBase64;
  }

  if (req.body.corporatePanFileBase64) {
    const result = await cloudinary.uploader.upload(req.body.corporatePanFileBase64, {
      folder: "corporates/pan",
      resource_type: "auto",
    });
    req.body.corporatePanCard = {
      ...req.body.corporatePanCard,
      publicId: result.public_id,
      url: result.secure_url,
      uploadedAt: new Date(),
      verified: false,
    };
    delete req.body.corporatePanFileBase64;
  }

  const corporate = await Corporate.findById(req.params.id);
  if (!corporate) throw new ApiError(404, "Corporate not found");

  const updatableFields = [
    "corporateName", "corporateType", "classification", "billingCycle", "customBillingDays", 
    "dueDays", "creditLimit", "walletBalance", "serviceFeeRules"
  ];
  
  updatableFields.forEach(field => {
    if (req.body[field] !== undefined) corporate[field] = req.body[field];
  });

  const nestedFields = ["primaryContact", "registeredAddress", "billingDepartment", "gstDetails", "gstCertificate", "corporatePanCard"];
  nestedFields.forEach(field => {
    if (req.body[field]) {
      const existing = typeof corporate[field]?.toObject === "function" ? corporate[field].toObject() : (corporate[field] || {});
      corporate[field] = { ...existing, ...req.body[field] };
    }
  });

  const updated = await corporate.save();

  // ── Notify Super Admin if updated by OPS member ──────────────────
  if (req.user.role === 'ops-member') {
    notify(EVENTS.CORPORATE_UPDATED_BY_OPS, {
      corporateId:   updated._id,
      corporateName: updated.corporateName,
      opsMemberName: `${req.user.name?.firstName || ''} ${req.user.name?.lastName || ''}`.trim() || req.user.email,
    });
  }

  res.status(200).json(new ApiResponse(200, updated, "Corporate updated"));
});

// -----------------------------------------------------
// TOGGLE CORPORATE STATUS (PRODUCTION SAFE)
// -----------------------------------------------------
exports.toggleCorporateStatus = asyncHandler(async (req, res) => {
  const corporate = await Corporate.findById(req.params.id);
  if (!corporate) throw new ApiError(404, "Corporate not found");

  corporate.status = corporate.status === "active" ? "inactive" : "active";

  // ✅ Sync isActive with status
  corporate.isActive = corporate.status === "active";

  await corporate.save();

  // ── Notify Super Admin if updated by OPS member ──────────────────
  if (req.user.role === 'ops-member') {
    notify(EVENTS.CORPORATE_UPDATED_BY_OPS, {
      corporateId:   corporate._id,
      corporateName: corporate.corporateName,
      opsMemberName: `${req.user.name?.firstName || ''} ${req.user.name?.lastName || ''}`.trim() || req.user.email,
    });
  }

  res
    .status(200)
    .json(new ApiResponse(200, corporate, "Corporate status updated"));
});

/* =====================================================
   GET BOOKINGS DATA DONE BY CORPORATE (FLIGHT + HOTEL)
===================================================== */

/**
 * ============================================================
 * 🛫 GET ALL FLIGHT BOOKINGS (SUPER ADMIN)
 * ============================================================
 */
const safeCorporateName = (corporate) => {
  if (!corporate) return "N/A";
  if (typeof corporate === "object") {
    return corporate.corporateName || corporate.companyName || corporate.name || "N/A";
  }
  return corporate;
};

const buildCancellationRequestId = (booking) => {
  const latestHistory =
    Array.isArray(booking?.amendmentHistory) && booking.amendmentHistory.length
      ? booking.amendmentHistory[booking.amendmentHistory.length - 1]
      : {};

  return (
    booking?.ChangeRequestId ||
    booking?.changeRequestId ||
    booking?.cancellationRequestId ||
    booking?.cancelRequestId ||
    booking?.amendment?.ChangeRequestId ||
    booking?.amendment?.changeRequestId ||
    latestHistory?.ChangeRequestId ||
    latestHistory?.changeRequestId ||
    booking?.amendment?.response?.[0]?.response?.Response?.TicketCRInfo?.[0]?.ChangeRequestId ||
    latestHistory?.response?.[0]?.response?.Response?.TicketCRInfo?.[0]?.ChangeRequestId ||
    booking?.amendment?.providerResponse?.HotelChangeRequestResult?.ChangeRequestId ||
    latestHistory?.providerResponse?.HotelChangeRequestResult?.ChangeRequestId ||
    null
  );
};

const mapFlightBookingDto = (booking = {}) => {
  const segments = Array.isArray(booking.flightRequest?.segments)
    ? booking.flightRequest.segments
    : [];
  const firstSegment = segments[0] || {};

  return {
    ...booking,
    orderId: booking.orderId || booking.bookingReference,
    paymentId: booking.payment?.paymentId || null,
    paymentMethod: booking.payment?.method || null,
    bookedDate: booking.createdAt,
    corporateName: safeCorporateName(booking.corporateId || booking.corporate),
    cancellationRequestId: buildCancellationRequestId(booking),
    changeRequestId: buildCancellationRequestId(booking),
    travellerDetails: (booking.travellers || []).map((traveller) => ({
      name: [traveller.firstName, traveller.lastName].filter(Boolean).join(" ").trim(),
      email: traveller.email || null,
    })),
    airlineDetails: {
      name: booking.bookingSnapshot?.airline || firstSegment.airlineName || firstSegment.airlineCode || null,
      code: firstSegment.airlineCode || null,
      logo: booking.bookingSnapshot?.airlineLogo || firstSegment.airlineLogo || null,
    },
    route: Array.isArray(booking.bookingSnapshot?.sectors)
      ? booking.bookingSnapshot.sectors
      : segments.map((segment) => ({
          origin: segment?.origin?.airportCode,
          destination: segment?.destination?.airportCode,
        })),
    travelDate:
      booking.bookingSnapshot?.travelDate ||
      firstSegment.departureDateTime ||
      booking.travelDate ||
      null,
  };
};

const resolveFlightRefundStatus = (booking = {}) => {
  const dbStatus = booking.cancellation?.refundStatus || booking.refundStatus;
  if (dbStatus && dbStatus.toLowerCase() !== "pending") return dbStatus;

  const amendment = booking.amendment || {};
  const lastHistory =
    Array.isArray(booking.amendmentHistory) && booking.amendmentHistory.length
      ? booking.amendmentHistory[booking.amendmentHistory.length - 1]
      : {};
  const ticketCrInfo =
    amendment.response?.[0]?.response?.Response?.TicketCRInfo?.[0] ||
    lastHistory.response?.[0]?.response?.Response?.TicketCRInfo?.[0];

  if (ticketCrInfo?.ChangeRequestStatus === 4 || ticketCrInfo?.RefundedAmount > 0) {
    return "Processed";
  }

  return dbStatus || null;
};

/**
 * Safely extract airport code from a segment's origin/destination field.
 * Handles both object form { airportCode: "LHR" } and plain string "LHR".
 */
const resolveAirportCode = (field) => {
  if (!field) return undefined;
  if (typeof field === "string") return field;
  return field.airportCode || field.code || undefined;
};

const mapFlightBookingTableDto = (booking = {}) => {
  const traveler = (booking.travellers || [])[0] || {};
  const travelerName =
    [traveler.firstName, traveler.lastName].filter(Boolean).join(" ").trim() ||
    traveler.email ||
    "N/A";

  // ── Prefer lastTicketedSnapshot.segments for reissued flights ──
  // lastTicketedSnapshot holds the ACTUAL post-reissue segment data
  // (new dates, new flight numbers, correct airport codes).
  // Fall back to flightRequest.segments for non-reissued bookings.
  const isReissued =
    (booking.bookingLineage?.reissueGeneration || 0) > 0 ||
    booking.bookingResult?.reissueMeta != null;

  const ltsSegments = Array.isArray(booking.lastTicketedSnapshot?.segments)
    ? booking.lastTicketedSnapshot.segments
    : [];
  const flightReqSegments = Array.isArray(booking.flightRequest?.segments)
    ? booking.flightRequest.segments
    : [];

  // Use lastTicketedSnapshot segments when available (always preferred for reissued,
  // but also a better source for non-reissued when populated)
  const segments = (isReissued && ltsSegments.length > 0)
    ? ltsSegments
    : (ltsSegments.length > 0 ? ltsSegments : flightReqSegments);

  const firstSegment = segments[0] || {};

  // Build normalised segments that always expose airportCode correctly
  const normalisedSegments = segments.map((seg) => ({
    journeyType: seg.journeyType,
    airlineName: seg.airlineName,
    airlineCode: seg.airlineCode,
    flightNumber: seg.flightNumber,
    cabinClass: seg.cabinClass,
    origin: {
      airportCode: resolveAirportCode(seg.origin),
    },
    destination: {
      airportCode: resolveAirportCode(seg.destination),
    },
    departureDateTime: seg.departureDateTime,
    arrivalDateTime: seg.arrivalDateTime,
  }));

  // Build route array: prefer bookingSnapshot.sectors (already strings),
  // otherwise derive from the best segment source
  const route = Array.isArray(booking.bookingSnapshot?.sectors)
    ? booking.bookingSnapshot.sectors
    : normalisedSegments.map((seg) => {
        const from = seg.origin?.airportCode;
        const to = seg.destination?.airportCode;
        return from && to ? `${from}-${to}` : undefined;
      }).filter(Boolean);

  return {
    _id: booking._id,
    orderId: booking.orderId || booking.bookingReference,
    bookingReference: booking.bookingReference,
    payment: booking.payment || null,
    paymentId: booking.payment?.paymentId || null,
    paymentMethod: booking.payment?.method || null,
    bookedDate: booking.createdAt,
    createdAt: booking.createdAt,
    approvedAt: booking.approvedAt,
    ticketedAt: booking.ticketedAt,
    pnr: booking.bookingResult?.pnr || booking.pnr || null,
    corporateId: booking.corporateId,
    corporateName: safeCorporateName(booking.corporateId || booking.corporate),
    employeeName: booking.employeeName || travelerName,
    userId: booking.userId,
    employeeCode: booking.employeeCode,
    employeeId: booking.employeeId,
    // Expose reissue metadata so the frontend can flag reissued bookings
    reissueGeneration: booking.bookingLineage?.reissueGeneration || 0,
    isReissued,
    travellers: traveler
      ? [
          {
            firstName: traveler.firstName,
            lastName: traveler.lastName,
            email: traveler.email,
          },
        ]
      : [],
    bookingSnapshot: {
      sectors: booking.bookingSnapshot?.sectors,
      city: booking.bookingSnapshot?.city,
      travelDate: booking.bookingSnapshot?.travelDate,
      amount: booking.bookingSnapshot?.amount,
      airline: booking.bookingSnapshot?.airline,
      orderId: booking.bookingSnapshot?.orderId,
    },
    // Always return the best-available segment data
    flightRequest: {
      segments: normalisedSegments,
    },
    pricingSnapshot: {
      totalAmount: booking.pricingSnapshot?.totalAmount,
      currency: booking.pricingSnapshot?.currency,
    },
    totalFare: booking.totalFare,
    executionStatus: booking.executionStatus,
    requestStatus: booking.requestStatus,
    status: booking.status,
    refundStatus: resolveFlightRefundStatus(booking),
    cancellationRequestId: buildCancellationRequestId(booking),
    changeRequestId: buildCancellationRequestId(booking),
    airlineDetails: {
      name:
        booking.bookingSnapshot?.airline ||
        firstSegment.airlineName ||
        firstSegment.airlineCode ||
        null,
      code: firstSegment.airlineCode || null,
      logo: booking.bookingSnapshot?.airlineLogo || firstSegment.airlineLogo || null,
    },
    route,
    travelDate:
      firstSegment.departureDateTime ||
      booking.bookingSnapshot?.travelDate ||
      booking.travelDate ||
      null,
  };
};

const mapHotelBookingDto = (booking = {}) => {
  const selectedHotel = booking.hotelRequest?.selectedHotel || {};

  return {
    ...booking,
    orderId: booking.orderId || booking.bookingReference,
    paymentId: booking.payment?.paymentId || null,
    paymentMethod: booking.payment?.method || null,
    bookedDate: booking.createdAt,
    corporateName: safeCorporateName(booking.corporateId || booking.corporate),
    cancellationRequestId: buildCancellationRequestId(booking),
    changeRequestId: buildCancellationRequestId(booking),
    guestDetails: (booking.travellers || []).map((guest) => ({
      name: [guest.firstName, guest.lastName].filter(Boolean).join(" ").trim(),
      email: guest.email || null,
    })),
    hotelDetails: {
      name: booking.bookingSnapshot?.hotelName || selectedHotel.hotelName || booking.hotelName || null,
      city: booking.bookingSnapshot?.city || selectedHotel.city || booking.hotelRequest?.cityName || null,
      image:
        booking.bookingSnapshot?.hotelImage ||
        selectedHotel.image ||
        selectedHotel.images?.[0] ||
        null,
    },
    stayDate: {
      checkIn:
        booking.bookingSnapshot?.checkInDate ||
        booking.hotelRequest?.checkInDate ||
        booking.checkInDate ||
        null,
      checkOut:
        booking.bookingSnapshot?.checkOutDate ||
        booking.hotelRequest?.checkOutDate ||
        booking.checkOutDate ||
        null,
    },
  };
};

const resolveHotelRefundStatus = (booking = {}) => {
  const dbStatus = booking.cancellation?.refundStatus || booking.refundStatus;
  if (dbStatus && dbStatus.toLowerCase() !== "pending") return dbStatus;

  const amendment = booking.amendment || {};
  const lastHistory =
    Array.isArray(booking.amendmentHistory) && booking.amendmentHistory.length
      ? booking.amendmentHistory[booking.amendmentHistory.length - 1]
      : {};
  const result =
    amendment.providerResponse?.HotelChangeRequestResult ||
    lastHistory.providerResponse?.HotelChangeRequestResult ||
    {};

  if (result.ChangeRequestStatus === 3 || result.RefundedAmount > 0) {
    return "Processed";
  }

  return dbStatus || null;
};

const mapHotelBookingTableDto = (booking = {}) => {
  const selectedHotel = booking.hotelRequest?.selectedHotel || {};
  const selectedRoom = booking.hotelRequest?.selectedRoom || {};
  const traveler = (booking.travellers || booking.guests || [])[0] || {};
  const guestName =
    booking.employeeName ||
    booking.guestName ||
    booking.travelerName ||
    [traveler.firstName, traveler.lastName].filter(Boolean).join(" ").trim() ||
    traveler.email ||
    "N/A";

  return {
    _id: booking._id,
    bookingId: booking.bookingId,
    orderId: booking.orderId || booking.bookingReference,
    bookingReference: booking.bookingReference,
    payment: booking.payment || null,
    paymentId: booking.payment?.paymentId || null,
    paymentMethod: booking.payment?.method || null,
    bookedDate: booking.createdAt,
    createdAt: booking.createdAt,
    approvedAt: booking.approvedAt,
    voucheredAt: booking.voucheredAt,
    corporateId: booking.corporateId,
    corporateName: safeCorporateName(booking.corporateId || booking.corporate),
    employeeName: guestName,
    guestName,
    travelerName: guestName,
    userId: booking.userId,
    employeeCode: booking.employeeCode,
    employeeId: booking.employeeId,
    travellers: traveler
      ? [
          {
            firstName: traveler.firstName,
            lastName: traveler.lastName,
            email: traveler.email,
          },
        ]
      : [],
    guests: [],
    bookingSnapshot: {
      amount: booking.bookingSnapshot?.amount,
      hotelName: booking.bookingSnapshot?.hotelName,
      city: booking.bookingSnapshot?.city,
      checkInDate: booking.bookingSnapshot?.checkInDate,
      checkOutDate: booking.bookingSnapshot?.checkOutDate,
      orderId: booking.bookingSnapshot?.orderId,
    },
    hotelRequest: {
      checkInDate: booking.hotelRequest?.checkInDate,
      checkOutDate: booking.hotelRequest?.checkOutDate,
      cityName: booking.hotelRequest?.cityName,
      selectedHotel: {
        hotelName: selectedHotel.hotelName,
        city: selectedHotel.city,
      },
      selectedRoom: {
        Price: {
          totalFare: selectedRoom.Price?.totalFare,
        },
        rawRoomData: {
          Name: selectedRoom.rawRoomData?.Name,
        },
      },
    },
    pricingSnapshot: {
      totalAmount: booking.pricingSnapshot?.totalAmount,
      currency: booking.pricingSnapshot?.currency,
    },
    selectedRoom: {
      Price: {
        totalFare: booking.selectedRoom?.Price?.totalFare,
      },
    },
    totalFare: booking.totalFare,
    amount: booking.amount,
    roomType: booking.roomType,
    room: booking.room,
    hotelName: booking.hotelName,
    property: booking.property,
    destination: booking.destination,
    checkIn: booking.checkIn,
    checkInDate: booking.checkInDate,
    checkOut: booking.checkOut,
    checkOutDate: booking.checkOutDate,
    endDate: booking.endDate,
    executionStatus: booking.executionStatus,
    requestStatus: booking.requestStatus,
    status: booking.status,
    refundStatus: resolveHotelRefundStatus(booking),
    cancellationRequestId: buildCancellationRequestId(booking),
    changeRequestId: buildCancellationRequestId(booking),
    guestDetails: [
      {
        name: guestName,
        email: traveler.email || null,
      },
    ],
    hotelDetails: {
      name:
        booking.bookingSnapshot?.hotelName ||
        selectedHotel.hotelName ||
        booking.hotelName ||
        null,
      city:
        booking.bookingSnapshot?.city ||
        selectedHotel.city ||
        booking.hotelRequest?.cityName ||
        null,
    },
    stayDate: {
      checkIn:
        booking.bookingSnapshot?.checkInDate ||
        booking.hotelRequest?.checkInDate ||
        booking.checkInDate ||
        null,
      checkOut:
        booking.bookingSnapshot?.checkOutDate ||
        booking.hotelRequest?.checkOutDate ||
        booking.checkOutDate ||
        null,
    },
  };
};

exports.getAllFlightBookings = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 500,
      search,
      status,
      corporateId,
      fromDate,
      toDate,
      view,
    } = req.query;

    const blockedStatuses = ["failed", "not_started"];
    const query = {};

    // 🔎 Search by bookingReference
    if (search) {
      query.bookingReference = { $regex: search, $options: "i" };
    }

    // 📊 Filters
    if (status) {
      query.requestStatus = status;
    } else {
      query.requestStatus = { $nin: blockedStatuses };
      query.executionStatus = { $nin: blockedStatuses };
    }
    if (corporateId) query.corporateId = corporateId;

    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) query.createdAt.$lte = new Date(toDate);
    }

    const skip = (page - 1) * limit;
    const tableOnly = view === "table";
    const mapper = tableOnly ? mapFlightBookingTableDto : mapFlightBookingDto;
    const tableProjection = {
      _id: 1,
      orderId: 1,
      bookingReference: 1,
      payment: 1,
      createdAt: 1,
      approvedAt: 1,
      ticketedAt: 1,
      bookedDate: 1,
      pnr: 1,
      corporateId: 1,
      userId: 1,
      employeeName: 1,
      employeeCode: 1,
      employeeId: 1,
      "travellers.firstName": 1,
      "travellers.lastName": 1,
      "travellers.email": 1,
      "bookingResult.pnr": 1,
      "bookingSnapshot.sectors": 1,
      "bookingSnapshot.city": 1,
      "bookingSnapshot.travelDate": 1,
      "bookingSnapshot.amount": 1,
      "bookingSnapshot.airline": 1,
      "bookingSnapshot.airlineLogo": 1,
      "bookingSnapshot.orderId": 1,
      // flightRequest segments — used as fallback for non-reissued bookings
      "flightRequest.segments.journeyType": 1,
      "flightRequest.segments.airlineName": 1,
      "flightRequest.segments.airlineCode": 1,
      "flightRequest.segments.flightNumber": 1,
      "flightRequest.segments.cabinClass": 1,
      "flightRequest.segments.origin": 1,
      "flightRequest.segments.destination": 1,
      "flightRequest.segments.departureDateTime": 1,
      "flightRequest.segments.arrivalDateTime": 1,
      // lastTicketedSnapshot — authoritative source for reissued flights:
      // contains the NEW dates, NEW flight numbers, NEW routes after reissue
      "lastTicketedSnapshot.segments": 1,
      // bookingLineage — tells us if / how many times this booking was reissued
      "bookingLineage.reissueGeneration": 1,
      // bookingResult.reissueMeta — alternative reissue flag
      "bookingResult.reissueMeta": 1,
      "pricingSnapshot.totalAmount": 1,
      "pricingSnapshot.currency": 1,
      totalFare: 1,
      executionStatus: 1,
      requestStatus: 1,
      status: 1,
      "cancellation.refundStatus": 1,
      refundStatus: 1,
      "amendment.response.response.Response.TicketCRInfo.ChangeRequestId": 1,
      "amendment.response.response.Response.TicketCRInfo.ChangeRequestStatus": 1,
      "amendment.response.response.Response.TicketCRInfo.RefundedAmount": 1,
      "amendmentHistory.response.response.Response.TicketCRInfo.ChangeRequestId": 1,
      "amendmentHistory.response.response.Response.TicketCRInfo.ChangeRequestStatus": 1,
      "amendmentHistory.response.response.Response.TicketCRInfo.RefundedAmount": 1,
      changeRequestId: 1,
      cancellationRequestId: 1,
    };

    const [data, total] = await Promise.all([
      BookingRequest.find(query)
        .select(tableOnly ? tableProjection : undefined)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate({ path: "corporateId", select: "corporateName" })
        .lean(),

      BookingRequest.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: "Flight bookings fetched successfully",
      data: data.map(mapper),
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("SuperAdmin Flight Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch flight bookings",
    });
  }
};

exports.getFlightBookingById = async (req, res) => {
  try {
    const booking = await BookingRequest.findById(req.params.id)
      .populate({ path: "corporateId", select: "corporateName" })
      .lean();

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Flight booking not found",
      });
    }

    const BookingMarkupAudit = require("../modules/markup/schemas/BookingMarkupAudit.model");
    const markupAudit = await BookingMarkupAudit.findOne({ bookingId: req.params.id }).lean();

    return res.status(200).json({
      success: true,
      message: "Flight booking fetched successfully",
      data: {
        ...mapFlightBookingDto(booking),
        markupAudit
      },
    });
  } catch (error) {
    console.error("SuperAdmin Flight Detail Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch flight booking",
    });
  }
};

/**
 * ============================================================
 * 🏨 GET ALL HOTEL BOOKINGS (SUPER ADMIN)
 * ============================================================
 */
exports.getAllHotelBookings = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 500,
      search,
      status,
      corporateId,
      fromDate,
      toDate,
      view,
    } = req.query;

    const blockedStatuses = ["failed", "not_started"];
    const query = {};

    if (search) {
      query.bookingReference = { $regex: search, $options: "i" };
    }

    if (status) {
      query.requestStatus = status;
    } else {
      query.requestStatus = { $nin: blockedStatuses };
      query.executionStatus = { $nin: blockedStatuses };
    }
    if (corporateId) query.corporateId = corporateId;

    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) query.createdAt.$lte = new Date(toDate);
    }

    const skip = (page - 1) * limit;
    const tableOnly = view === "table";
    const mapper = tableOnly ? mapHotelBookingTableDto : mapHotelBookingDto;
    const tableProjection = {
      _id: 1,
      bookingId: 1,
      orderId: 1,
      bookingReference: 1,
      payment: 1,
      createdAt: 1,
      approvedAt: 1,
      voucheredAt: 1,
      corporateId: 1,
      userId: 1,
      employeeName: 1,
      guestName: 1,
      travelerName: 1,
      employeeCode: 1,
      employeeId: 1,
      "travellers.firstName": 1,
      "travellers.lastName": 1,
      "travellers.email": 1,
      "guests.firstName": 1,
      "guests.lastName": 1,
      "guests.email": 1,
      "bookingSnapshot.amount": 1,
      "bookingSnapshot.hotelName": 1,
      "bookingSnapshot.city": 1,
      "bookingSnapshot.checkInDate": 1,
      "bookingSnapshot.checkOutDate": 1,
      "bookingSnapshot.orderId": 1,
      "hotelRequest.checkInDate": 1,
      "hotelRequest.checkOutDate": 1,
      "hotelRequest.cityName": 1,
      "hotelRequest.selectedHotel.hotelName": 1,
      "hotelRequest.selectedHotel.city": 1,
      "hotelRequest.selectedRoom.Price.totalFare": 1,
      "hotelRequest.selectedRoom.rawRoomData.Name": 1,
      "pricingSnapshot.totalAmount": 1,
      "pricingSnapshot.currency": 1,
      "selectedRoom.Price.totalFare": 1,
      totalFare: 1,
      amount: 1,
      roomType: 1,
      room: 1,
      hotelName: 1,
      property: 1,
      destination: 1,
      checkIn: 1,
      checkInDate: 1,
      checkOut: 1,
      checkOutDate: 1,
      endDate: 1,
      executionStatus: 1,
      requestStatus: 1,
      status: 1,
      "cancellation.refundStatus": 1,
      refundStatus: 1,
      "amendment.providerResponse.HotelChangeRequestResult.ChangeRequestId": 1,
      "amendment.providerResponse.HotelChangeRequestResult.ChangeRequestStatus": 1,
      "amendment.providerResponse.HotelChangeRequestResult.RefundedAmount": 1,
      "amendmentHistory.providerResponse.HotelChangeRequestResult.ChangeRequestId": 1,
      "amendmentHistory.providerResponse.HotelChangeRequestResult.ChangeRequestStatus": 1,
      "amendmentHistory.providerResponse.HotelChangeRequestResult.RefundedAmount": 1,
      changeRequestId: 1,
      cancellationRequestId: 1,
    };

    const [data, total] = await Promise.all([
      HotelBookingRequest.find(query)
        .select(tableOnly ? tableProjection : undefined)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate({ path: "corporateId", select: "corporateName" })
        .lean(),

      HotelBookingRequest.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: "Hotel bookings fetched successfully",
      data: data.map(mapper),
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("SuperAdmin Hotel Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch hotel bookings",
    });
  }
};

exports.getHotelBookingById = async (req, res) => {
  try {
    const booking = await HotelBookingRequest.findById(req.params.id)
      .populate({ path: "corporateId", select: "corporateName" })
      .lean();

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Hotel booking not found",
      });
    }

    const BookingMarkupAudit = require("../modules/markup/schemas/BookingMarkupAudit.model");
    const markupAudit = await BookingMarkupAudit.findOne({ bookingId: req.params.id }).lean();

    let liveBookingData = null;
    try {
      const bookResult = booking.bookingResult?.providerResponse?.BookResult;
      if (bookResult && bookResult.BookingId) {
        liveBookingData = await hotelService.getBookingDetails({
          bookingId: bookResult.BookingId,
        });
      } else if (bookResult && bookResult.ConfirmationNo) {
        liveBookingData = await hotelService.getBookingDetails({
          confirmationNo: bookResult.ConfirmationNo,
          firstName: booking.travellers?.[0]?.firstName || "",
          lastName: booking.travellers?.[0]?.lastName || "",
        });
      }
    } catch (apiError) {
      console.error("Failed to fetch live booking details from provider:", apiError.message);
    }

    return res.status(200).json({
      success: true,
      message: "Hotel booking fetched successfully",
      data: {
        ...mapHotelBookingDto(booking),
        liveBookingData,
        markupAudit
      },
    });
  } catch (error) {
    console.error("SuperAdmin Hotel Detail Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch hotel booking",
    });
  }
};

exports.getCancelledOrRequestedFlights = async (req, res) => {
  try {
    const {
      // page = 1,
      // limit = 500,
      search,
      corporateId,
      fromDate,
      toDate,
    } = req.query;

    // Only flights that have a cancel request raised or are fully cancelled
    const query = {
      bookingType: "flight",
      executionStatus: { $in: ["cancel_requested", "cancelled"] },
    };

    // 🔍 Search
    if (search) {
      query.bookingReference = { $regex: search, $options: "i" };
    }

    if (corporateId) query.corporateId = corporateId;

    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) query.createdAt.$lte = new Date(toDate);
    }

    // const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      BookingRequest.find(query)
        .sort({ createdAt: -1 })
        // .skip(skip)
        // .limit(Number(limit))
        .populate({ path: "corporateId", select: "corporateName" })
        .lean(),

      BookingRequest.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: "Cancelled/Requested flight bookings fetched",
      data: data.map(mapFlightBookingDto),
      pagination: {
        total,
        // page: Number(page),
        // limit: Number(limit),
        // totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Flight Cancellation Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch cancelled flight bookings",
    });
  }
};

exports.getCancelledOrRequestedHotels = async (req, res) => {
  try {
    const {
      // page = 1,
      // limit = 500,
      search,
      corporateId,
      fromDate,
      toDate,
    } = req.query;

    // Business rule:
    // 1) Booking must be approved.
    // 2) Execution should have progressed to voucher (i.e., hotel is confirmed).
    // 3) An amendment/cancellation must be in progress or completed (not "not_requested").
    const allowedAmendStatuses = [
      "requested",
      "in_progress",
      "approved",
      "rejected",
      "failed",
    ];

    const query = {
      requestStatus: "approved",
      executionStatus: "voucher_generated",
      "amendment.status": { $in: allowedAmendStatuses },
    };

    if (search) {
      query.bookingReference = { $regex: search, $options: "i" };
    }

    if (corporateId) query.corporateId = corporateId;

    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) query.createdAt.$lte = new Date(toDate);
    }

    // const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      HotelBookingRequest.find(query)
        .sort({ createdAt: -1 })
        // .skip(skip)
        // .limit(Number(limit))
        .populate({ path: "corporateId", select: "corporateName" })
        .lean(),

      HotelBookingRequest.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: "Cancelled/Requested hotel bookings fetched",
      data: data.map(mapHotelBookingDto),
      pagination: {
        total,
        // page: Number(page),
        // limit: Number(limit),
        // totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Hotel Cancellation Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch cancelled hotel bookings",
    });
  }
};

// Get cancellation queries
exports.fetchCancellationQueries = async (req, res) => {
  try {
    const {
      status,
      bookingReference,
      queryId,
    } = req.query;

    const userRole = req.user?.role;
    const userId = req.user?._id;
    const corporateId = req.user?.corporateId;

    let query = {};

    /* ─────────────────────────────
       🔥 ROLE-BASED FILTERING
    ───────────────────────────── */
    const baseQuery = {
      "amendment.type": "OFFLINE_CANCELLATION",
      "amendment.changeRequestId": { $exists: true, $ne: null }
    };

    if (userRole === "employee") {
      // Employee sees only their own requests
      baseQuery.userId = userId;
    } else if (userRole === "manager") {
      // Manager sees their own + their team's requests
      const Employee = require("../models/Employee");
      const teamEmployees = await Employee.find({ managerId: userId }).select("userId").lean();
      const teamUserIds = teamEmployees.map(e => e.userId);
      baseQuery.userId = { $in: [...teamUserIds, userId] };
    } else if (userRole === "travel-admin") {
      // Travel Admin sees all requests for their corporate
      baseQuery.corporateId = corporateId;
    } else if (userRole === "super-admin" || userRole === "ops-member") {
      // Super Admin sees everything or filtered by query params
      if (req.query.corporateId) {
        baseQuery.corporateId = req.query.corporateId;
      }
    } else {
      // Unauthorized or unknown role
      return res.status(403).json({ success: false, message: "Unauthorized role for this action" });
    }

    if (status) baseQuery["amendment.status"] = status;

    if (bookingReference) {
      baseQuery["bookingResult.pnr"] = { $regex: bookingReference, $options: "i" };
    }

    if (queryId) {
      baseQuery["amendment.changeRequestId"] = { $regex: queryId, $options: "i" };
    }

    const [bookings, total] = await Promise.all([
      BookingRequest.find(baseQuery)
        .populate("corporateId", "corporateName")
        .populate("userId", "employeeCode name email")
        .sort({ updatedAt: -1 })
        .lean(),
      BookingRequest.countDocuments(baseQuery),
    ]);

    /* ─────────────────────────────
       🔥 NORMALIZE DATA
    ───────────────────────────── */
    const enrichedData = bookings.map((b) => {
      const requestedAt = b?.amendmentHistory?.find(h => h.type === 'OFFLINE_CANCELLATION')?.createdAt || b.updatedAt;

      const q = {
        _id: b._id,
        queryId: b.amendment?.changeRequestId,
        orderId: b.orderId || "—",
        bookingId: b._id,
        bookingReference: b.bookingResult?.pnr,
        user: { id: b.userId?._id || b.userId },
        corporate: { companyId: b.corporateId?._id || b.corporateId },
        status: b.amendment?.status || "OPEN",
        priority: b.amendment?.priority || "HIGH",
        remarks: b.amendment?.requesterComments,
        createdAt: b.updatedAt,
        requestedAt,
        resolution: b.amendment?.response
      };

      const itinerary =
        b?.bookingResult?.providerResponse?.Response?.Response
          ?.FlightItinerary || {};

      const segments = itinerary?.Segments || b?.flightRequest?.segments || [];

      const firstSegment = Array.isArray(segments)
        ? segments[0]
        : segments?.[0]?.[0] || {};

      const fare = itinerary?.Fare || {};
      const pricing = b?.pricingSnapshot || {};

      return {
        ...q,

        bookingSnapshot: {
          // 🔥 CORE
          airline:
            itinerary?.AirlineCode ||
            firstSegment?.Airline?.AirlineName ||
            b?.flightRequest?.segments?.[0]?.airlineName ||
            "—",

          pnr: itinerary?.PNR || b?.bookingResult?.pnr || "—",

          travelDate:
            firstSegment?.Origin?.DepTime ||
            b?.flightRequest?.segments?.[0]?.departureDateTime ||
            b?.bookingSnapshot?.travelDate,

          returnDate: b?.bookingSnapshot?.returnDate || null,

          // 🔥 SECTORS
          sectors:
            segments?.map((s) => {
              const seg = s?.[0] || s; // handle nested array
              return {
                origin:
                  seg?.Origin?.Airport?.AirportCode || seg?.origin?.airportCode,

                destination:
                  seg?.Destination?.Airport?.AirportCode ||
                  seg?.destination?.airportCode,

                airline: seg?.Airline?.AirlineName || seg?.airlineName,

                flightNumber: seg?.Airline?.FlightNumber || seg?.flightNumber,

                departureTime: seg?.Origin?.DepTime || seg?.departureDateTime,
              };
            }) || [],

          // 🔥 FARE
          totalFare:
            pricing?.totalAmount ||
            fare?.PublishedFare ||
            b?.bookingSnapshot?.amount,

          baseFare: fare?.BaseFare,
          taxes: fare?.Tax,
          serviceFee: fare?.ServiceFee || 0,

          city: b?.bookingSnapshot?.city,
          cabinClass: b?.bookingSnapshot?.cabinClass,
        },

        // 🔥 CORPORATE + USER
        corporate: {
          companyName: b?.corporateId?.corporateName || b?.corporateId || "—",
          employeeName:
            (b?.travellers?.[0]?.firstName ? b.travellers[0].firstName + " " + (b.travellers[0].lastName || "") : b?.userId?.name) || "—",
          employeeEmail: b?.travellers?.[0]?.email || b?.userId?.email || "—",
          employeeId: b?.userId?._id || b?.userId || "—",
        },

        passengers:
          b?.travellers?.map((t) => ({
            name: `${t.firstName} ${t.lastName}`,
            type: t.paxType,
            ticketNumber:
              itinerary?.Passenger?.[0]?.Ticket?.TicketNumber || "—",
          })) || [],
      };
    });

    /* ─────────────────────────────
       ✅ RESPONSE
    ───────────────────────────── */
    return res.status(200).json({
      success: true,
      message: "Cancellation queries fetched successfully",
      data: enrichedData,
    });
  } catch (error) {
    console.error("❌ fetchCancellationQueries:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch cancellation queries",
      error: error.message,
    });
  }
};



// PATCH /api/cancellation-queries/:id/status
exports.updateCancellationQueryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks, resolution } = req.body;

    const normalizedStatus = String(status || "").toUpperCase();

    if (!normalizedStatus) {
      return res.status(400).json({
        success: false,
        message: "Invalid status.",
      });
    }

    let b = await BookingRequest.findById(id);
    if (!b) {
      b = await HotelBookingRequest.findById(id);
    }

    if (!b || !b.amendment || b.amendment.type !== "OFFLINE_CANCELLATION") {
      return res.status(404).json({
        success: false,
        message: "Cancellation query not found",
      });
    }

    const previousStatus = b.amendment.status || "OPEN";
    b.amendment.status = normalizedStatus;

    if (typeof remarks === "string") {
      b.amendment.requesterComments = remarks;
    }

    if (resolution) {
      b.amendment.response = {
        ...(b.amendment.response || {}),
        ...resolution,
      };
      if (normalizedStatus === "RESOLVED" && !b.amendment.response?.resolvedAt) {
        b.amendment.response.resolvedAt = new Date();
      }
    }

    if (normalizedStatus === "RESOLVED") {
      b.executionStatus = "cancelled";
      const existingReason = b.cancellation?.reason || b.amendment?.remarks || b.amendment?.requesterComments || "Offline Cancellation";
      b.cancellation = {
        ...(b.cancellation?.toObject ? b.cancellation.toObject() : b.cancellation || {}),
        cancelledAt: new Date(),
        cancelledBy: req.user?._id,
        reason: existingReason,
        opsRemark: resolution?.message || remarks || "",
        refundAmount: resolution?.refundAmount || 0,
        refundStatus: "processed",
      };
    }

    b.amendmentHistory.push({
      type: "OFFLINE_CANCELLATION",
      changeRequestId: b.amendment.changeRequestId,
      status: normalizedStatus,
      response: {
        action: "STATUS_UPDATED",
        by: req.user?.role === "admin" ? "ADMIN" : "USER",
        message: previousStatus === normalizedStatus
          ? `Query details updated`
          : `Status changed from ${previousStatus} to ${normalizedStatus}`
      },
      createdAt: new Date()
    });

    // Mark the amendment field as modified so Mongoose knows to save it
    b.markModified("amendment");

    // Fix existing invalid priorities that might cause save to fail
    if (b.amendment?.priority) {
      b.amendment.priority = b.amendment.priority.toLowerCase();
    }

    await b.save();

    const updatedQuery = {
      _id: b._id,
      queryId: b.amendment?.changeRequestId,
      bookingId: b._id,
      bookingReference: b.bookingResult?.pnr,
      user: { id: b.userId },
      corporate: { companyId: b.corporateId },
      status: b.amendment?.status,
      remarks: b.amendment?.requesterComments,
      createdAt: b.updatedAt,
      resolution: b.amendment?.response
    };

    return res.status(200).json({
      success: true,
      message: "Cancellation query status updated successfully",
      data: updatedQuery,
    });
  } catch (error) {
    console.error("❌ updateCancellationQueryStatus:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update status",
      error: error.message,
    });
  }
};

// -----------------------------------------------------
// TBO COMMISSIONS AND TAXES 
// -----------------------------------------------------
exports.getTboCommissionsAndTaxes = asyncHandler(async (req, res) => {
  try {
    const flightBookings = await BookingRequest.find({
      bookingType: "flight",
      executionStatus: { $in: ["ticketed", "cancelled_requested", "cancel_requested", "cancelled", "Ticketed", "Cancelled"] }
    })
      .populate("corporateId", "corporateName")
      .lean();

    const hotelBookings = await HotelBookingRequest.find({
      bookingType: "hotel",
      $or: [
        { executionStatus: { $in: ["voucher_generated", "vouchered", "cancelled_requested", "cancel_requested", "cancelled", "Vouchered", "Cancelled"] } },
        { "amendment.status": { $in: ["cancelled", "cancelled_requested", "cancel_requested", "Cancelled"] } },
        { "cancellation.status": { $in: ["cancelled", "cancelled_requested", "cancel_requested", "Cancelled"] } }
      ]
    })
      .populate("corporateId", "corporateName")
      .lean();

    const results = [];

    const getBookingStatus = (booking) => {
      const amnd = booking.cancellation?.status || booking.amendment?.status;
      if (amnd && amnd.toLowerCase().includes("cancel")) return "Cancelled";
      if (booking.executionStatus && booking.executionStatus.toLowerCase().includes("cancel")) return "Cancelled";
      return "Confirmed";
    };

    flightBookings.forEach((booking) => {
      const fare = booking?.bookingResult?.providerResponse?.Response?.FlightItinerary?.Fare || booking?.flightRequest?.fareQuote?.Results?.[0]?.Fare;

      if (fare) {
        results.push({
          bookingId: booking._id,
          orderId: booking.orderId,
          bookingReference: booking.bookingReference,
          bookingType: booking.bookingType,
          corporateName: booking.corporateId?.corporateName || "Unknown",
          createdAt: booking.createdAt,
          status: getBookingStatus(booking),
          fareDetails: fare
        });
      }
    });

    hotelBookings.forEach((booking) => {
      const rooms = booking?.hotelRequest?.preBookResponse?.HotelResult?.[0]?.Rooms || [];
      const allPriceBreakdowns = [];
      rooms.forEach(room => {
        if (room.PriceBreakUp) {
          allPriceBreakdowns.push(...room.PriceBreakUp);
        }
      });

      if (allPriceBreakdowns.length > 0) {
        results.push({
          bookingId: booking._id,
          orderId: booking.orderId,
          bookingReference: booking.bookingReference,
          bookingType: booking.bookingType,
          corporateName: booking.corporateId?.corporateName || "Unknown",
          createdAt: booking.createdAt,
          status: getBookingStatus(booking),
          priceBreakdown: allPriceBreakdowns
        });
      }
    });

    results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.status(200).json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error("❌ getTboCommissionsAndTaxes:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch commissions and taxes",
      error: error.message,
    });
  }
});

// Get single cancellation query details
exports.fetchCancellationQueryById = async (req, res) => {
  try {
    const identifier = req.params.bookingId || req.params.id;

    let b = await BookingRequest.findOne({
      $or: [
        { _id: identifier },
        { orderId: identifier },
        { bookingReference: identifier }
      ]
    })
      .populate("corporateId", "corporateName")
      .populate("userId", "employeeCode name email")
      .lean();

    if (!b) {
      // Fallback to HotelBookingRequest
      const HotelBookingRequest = require("../models/hotelBookingRequest.model");
      b = await HotelBookingRequest.findOne({
        $or: [
          { _id: identifier },
          { orderId: identifier },
          { bookingReference: identifier }
        ]
      })
        .populate("corporateId", "corporateName")
        .populate("userId", "employeeCode name email")
        .lean();
    }

    if (!b) {
      return res.status(404).json({ success: false, message: "Query not found" });
    }

    // Role-based access check
    const userRole = req.user?.role;
    const userId = req.user?._id?.toString();
    const corporateId = req.user?.corporateId?.toString();

    if (userRole === "employee" && b.userId?._id?.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Unauthorized access to this query" });
    }

    if (userRole === "travel-admin" && b.corporateId?._id?.toString() !== corporateId) {
      return res.status(403).json({ success: false, message: "Unauthorized access to this company's query" });
    }

    const itinerary = b?.bookingResult?.providerResponse?.Response?.Response?.FlightItinerary || {};
    const segments = itinerary?.Segments || b?.flightRequest?.segments || [];
    const firstSegment = Array.isArray(segments) ? segments[0] : segments?.[0]?.[0] || {};
    const fare = itinerary?.Fare || {};
    const pricing = b?.pricingSnapshot || {};
    
    const requestedAt = b?.amendmentHistory?.find(h => h.type === 'OFFLINE_CANCELLATION')?.createdAt || b.updatedAt;

    const enrichedData = {
      ...b,
      _id: b._id,
      bookingId: b._id,
      orderId: b.orderId || "—",
      bookingReference: b.bookingReference,
      queryId: b.amendment?.changeRequestId,
      remarks: b.amendment?.requesterComments,
      status: b.amendment?.overallStatus || b.amendment?.status,
      requestedAt,
      resolution: b.amendment?.resolution || {},
      priority: b.amendment?.priority || "MEDIUM",

      bookingSnapshot: {
        hotelName: b?.hotelRequest?.selectedHotel?.hotelName || b?.bookingSnapshot?.hotelName,
        roomType: b?.hotelRequest?.selectedRoom?.roomType || b?.bookingSnapshot?.roomType,
        checkInDate: b?.hotelRequest?.checkInDate || b?.bookingSnapshot?.checkInDate,
        checkOutDate: b?.hotelRequest?.checkOutDate || b?.bookingSnapshot?.checkOutDate,
        airline: itinerary?.AirlineCode || firstSegment?.Airline?.AirlineName || b?.flightRequest?.segments?.[0]?.airlineName || "—",
        airlineCode: itinerary?.AirlineCode || firstSegment?.Airline?.AirlineCode || b?.flightRequest?.segments?.[0]?.airlineCode || "—",
        pnr: itinerary?.PNR || b?.bookingResult?.pnr || "—",
        travelDate: firstSegment?.Origin?.DepTime || b?.flightRequest?.segments?.[0]?.departureDateTime || b?.bookingSnapshot?.travelDate,
        returnDate: b?.bookingSnapshot?.returnDate || null,
        journeyType: b?.flightRequest?.journeyType || b?.bookingSnapshot?.journeyType,
        sectors: segments?.map((s) => {
          const seg = s?.[0] || s;
          return {
            origin: seg?.Origin?.Airport?.AirportCode || seg?.origin?.airportCode || seg?.origin,
            destination: seg?.Destination?.Airport?.AirportCode || seg?.destination?.airportCode || seg?.destination,
            airline: seg?.Airline?.AirlineName || seg?.airlineName || seg?.airline,
            flightNumber: seg?.Airline?.FlightNumber || seg?.flightNumber,
            departureTime: seg?.Origin?.DepTime || seg?.departureDateTime || seg?.departureTime,
          };
        }) || [],
        totalFare: pricing?.totalAmount || fare?.PublishedFare || b?.bookingSnapshot?.amount || b?.bookingSnapshot?.totalFare,
        baseFare: fare?.BaseFare || b?.bookingSnapshot?.baseFare,
        taxes: fare?.Tax || b?.bookingSnapshot?.taxes,
        serviceFee: fare?.ServiceFee || 0,
        city: b?.bookingSnapshot?.city,
        cabinClass: b?.bookingSnapshot?.cabinClass,
      },

      corporate: {
        companyName: b?.corporateId?.corporateName || b?.corporateId || "—",
        employeeName: (b?.travellers?.[0]?.firstName ? b.travellers[0].firstName + " " + (b.travellers[0].lastName||"") : b?.userId?.name) || "—",
        employeeEmail: b?.travellers?.[0]?.email || b?.userId?.email || "—",
        employeeId: b?.userId?.employeeCode || (b?.userId?._id ? b.userId._id.toString() : b?.userId) || "—",
      },

      passengers: b?.amendment?.actionPayload?.passengers || b?.travellers?.map((t) => ({
        name: `${t.firstName} ${t.lastName}`,
        type: t.paxType,
        ticketNumber: itinerary?.Passenger?.[0]?.Ticket?.TicketNumber || "—",
      })) || [],

      logs: b.amendmentHistory || [],
      amendment: b.amendment,
      amendmentHistory: b.amendmentHistory,
    };

    return res.status(200).json({
      success: true,
      message: "Cancellation query fetched successfully",
      data: enrichedData,
    });
  } catch (error) {
    console.error("fetchCancellationQueryById:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch cancellation query details",
      error: error.message,
    });
  }
};

// Fetch eligible Ops members for cancellation queries
exports.getEligibleOpsMembersForCancellations = async (req, res) => {
  try {
    const OpsMember = require("../models/OpsMember");
    // We only fetch active Ops members who explicitly have the permission
    const opsMembers = await OpsMember.find({
      status: "Active",
      permissions: { $in: ["Cancellation Management"] }
    }).select("name email role designation").lean();

    return res.status(200).json({
      success: true,
      message: "Eligible Ops members fetched successfully",
      data: opsMembers,
    });
  } catch (error) {
    console.error("getEligibleOpsMembersForCancellations error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch Ops members",
      error: error.message,
    });
  }
};

// Assign a cancellation query to an Ops member
exports.assignCancellationQuery = async (req, res) => {
  try {
    const identifier = req.params.bookingId || req.params.id;
    const { opsMemberId } = req.body;
    
    if (!opsMemberId) {
      return res.status(400).json({ success: false, message: "opsMemberId is required" });
    }

    const OpsMember = require("../models/OpsMember");
    const opsMember = await OpsMember.findById(opsMemberId).lean();
    if (!opsMember) {
      return res.status(404).json({ success: false, message: "Ops member not found" });
    }

    let b = await BookingRequest.findOne({
      $or: [
        { _id: identifier },
        { orderId: identifier },
        { bookingReference: identifier }
      ]
    });

    if (!b) {
      const HotelBookingRequest = require("../models/hotelBookingRequest.model");
      b = await HotelBookingRequest.findOne({
        $or: [
          { _id: identifier },
          { orderId: identifier },
          { bookingReference: identifier }
        ]
      });
    }

    if (!b) {
      return res.status(404).json({ success: false, message: "Query not found" });
    }

    // Assign
    if (!b.amendment) {
      b.amendment = {};
    }
    b.amendment.assignedTo = opsMember._id;
    b.amendment.assignedAt = new Date();

    // Log the assignment
    const logEntry = {
      type: "ASSIGNMENT",
      status: "ASSIGNED",
      response: {
        action: `Query Assigned to ${opsMember.name}`,
        message: `Assigned to ${opsMember.name} (${opsMember.role})`,
        by: req.user?.name || req.user?.firstName || "Admin",
      },
      createdAt: new Date(),
    };
    
    if (!b.amendmentHistory) {
      b.amendmentHistory = [];
    }
    b.amendmentHistory.push(logEntry);

    // Save bypassing validations that might fail if not updating all required fields
    await b.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      message: "Query assigned successfully",
      data: {
        assignedTo: opsMember,
        log: logEntry
      }
    });

  } catch (error) {
    console.error("assignCancellationQuery error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to assign query",
      error: error.message,
    });
  }
};
