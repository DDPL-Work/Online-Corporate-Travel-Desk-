// server/src/controllers/corporate.controller.js

const Corporate = require("../models/Corporate");
const User = require("../models/User");
const BookingRequest = require("../models/BookingRequest");
const CancellationQuery = require("../models/CancellationQuery");
const HotelBookingRequest = require("../models/hotelBookingRequest.model");
const Ledger = require("../models/Ledger");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { calculateNextBillingDate, slugify } = require("../utils/helpers");
const emailService = require("../services/email.service");
const crypto = require("crypto");
const cloudinary = require("../config/cloudinary");
const fs = require("fs");

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

  // --------------------------------------------------
  // 🟢 CLOUDINARY UPLOAD SECTION (NEW)
  // --------------------------------------------------

  let gstCertificate = {};
  let panCard = {};

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

  if (req.files?.panCard?.[0]) {
    const result = await cloudinary.uploader.upload(req.files.panCard[0].path, {
      folder: "corporates/pan",
      resource_type: "auto",
    });

    panCard = {
      publicId: result.public_id,
      url: result.secure_url,
      uploadedAt: new Date(),
      verified: false,
    };

    fs.unlinkSync(req.files.panCard[0].path);
  }

  // URL fallback
  if (req.body["gstCertificate[url]"]) {
    gstCertificate.url = req.body["gstCertificate[url]"];
  }

  if (req.body["panCard[url]"]) {
    panCard.url = req.body["panCard[url]"];
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
    panCard,

    classification,

    defaultApprover,
    status: "pending",
    creditTermsNotes,
    metadata,
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

  // const secondaryAdmin = await createOrUpdateUserWithRole(
  //   corporate.secondaryContact,
  //   "travel-admin",
  // );

  try {
    if (primaryAdmin) {
      console.log(`[APPROVAL] Triggering onboarding email for ${corporate.corporateName} to ${corporate.primaryContact.email}`);
      await emailService.sendCorporateOnboarding(
        corporate,
        primaryAdmin.user,
      );
    }

    // if (secondaryAdmin) {
    //   await emailService.sendCorporateOnboarding(
    //     corporate,
    //     secondaryAdmin.token,
    //     secondaryAdmin.user,
    //   );
    // }
  } catch (err) {
    console.error("Email sending failed:", err);
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
  const updated = await Corporate.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });

  if (!updated) throw new ApiError(404, "Corporate not found");

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

    const [data, total] = await Promise.all([
      BookingRequest.find(query)
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
      data,
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

/**
 * ============================================================
 * 🏨 GET ALL HOTEL BOOKINGS (SUPER ADMIN)
 * ============================================================
 */
exports.getAllHotelBookings = async (req, res) => {
  try {
    const {
      // page = 1,
      // limit = 500,
      search,
      status,
      corporateId,
      fromDate,
      toDate,
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
      message: "Hotel bookings fetched successfully",
      data,
      pagination: {
        total,
        // page: Number(page),
        // limit: Number(limit),
        // totalPages: Math.ceil(total / limit),
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
      data,
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
      data,
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
    if (userRole === "employee") {
      // Employee sees only their own requests
      query["user.id"] = userId;
    } else if (userRole === "manager") {
      // Manager sees their own + their team's requests
      const Employee = require("../models/Employee");
      const teamEmployees = await Employee.find({ managerId: userId }).select("userId").lean();
      const teamUserIds = teamEmployees.map(e => e.userId);
      query["user.id"] = { $in: [...teamUserIds, userId] };
    } else if (userRole === "travel-admin") {
      // Travel Admin sees all requests for their corporate
      query["corporate.companyId"] = corporateId;
    } else if (userRole === "super-admin" || userRole === "ops-member") {
      // Super Admin sees everything or filtered by query params
      if (req.query.corporateId) {
        query["corporate.companyId"] = req.query.corporateId;
      }
    } else {
      // Unauthorized or unknown role
      return res.status(403).json({ success: false, message: "Unauthorized role for this action" });
    }

    if (status) query.status = status;

    if (bookingReference) {
      query.bookingReference = { $regex: bookingReference, $options: "i" };
    }

    if (queryId) {
      query.queryId = { $regex: queryId, $options: "i" };
    }

    const [queries, total] = await Promise.all([
      CancellationQuery.find(query)
        .sort({ createdAt: -1 })
        .lean(),

      CancellationQuery.countDocuments(query),
    ]);

    /* ─────────────────────────────
       🔥 FETCH BOOKINGS
    ───────────────────────────── */
    const bookingIds = queries.map((q) => q.bookingId).filter(Boolean);

    const bookings = await BookingRequest.find({
      _id: { $in: bookingIds },
    }).lean();

    const bookingMap = {};
    bookings.forEach((b) => {
      bookingMap[b._id.toString()] = b;
    });

    /* ─────────────────────────────
       🔥 NORMALIZE DATA
    ───────────────────────────── */
    const enrichedData = queries.map((q) => {
      const b = bookingMap[q.bookingId?.toString()] || {};

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
          companyName: b?.corporateId || "—",
          employeeName:
            b?.travellers?.[0]?.firstName +
              " " +
              b?.travellers?.[0]?.lastName || "—",
          employeeEmail: b?.travellers?.[0]?.email || "—",
          employeeId: b?.userId || "—",
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
      pagination: {
        total,
        // page: Number(page),
        // limit: Number(limit),
        // totalPages: Math.ceil(total / limit),
      },
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

// Get single cancellation query details with booking info
exports.fetchCancellationQueryById = async (req, res) => {
  try {
    const { id } = req.params;
    const query = await CancellationQuery.findById(id).lean();

    if (!query) {
      return res.status(404).json({ success: false, message: "Query not found" });
    }

    // Role-based access check
    const userRole = req.user?.role;
    const userId = req.user?._id?.toString();
    const corporateId = req.user?.corporateId?.toString();

    if (userRole === "employee" && query.user?.id?.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Unauthorized access to this query" });
    }

    if (userRole === "travel-admin" && query.corporate?.companyId?.toString() !== corporateId) {
      return res.status(403).json({ success: false, message: "Unauthorized access to this company's query" });
    }

    let bookingData = null;
    if (query.bookingId) {
      // 1. Try Flight Booking Model
      bookingData = await BookingRequest.findById(query.bookingId).lean();
      
      // 2. If not found, try Hotel Booking Model
      if (!bookingData) {
        bookingData = await HotelBookingRequest.findById(query.bookingId).lean();
      }
    }

    return res.json({
      success: true,
      data: {
        ...query,
        bookingDetails: bookingData
      }
    });
  } catch (error) {
    console.error("Fetch Query Details Error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch query details" });
  }
};

// PATCH /api/cancellation-queries/:id/status
exports.updateCancellationQueryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks, resolution } = req.body;

    /* ─────────────────────────────
       🔥 VALIDATION
    ───────────────────────────── */
    const normalizedStatus = String(status || "").toUpperCase();
    const allowedStatus = ["OPEN", "IN_PROGRESS", "RESOLVED", "REJECTED"];

    if (!normalizedStatus || !allowedStatus.includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${allowedStatus.join(", ")}`,
      });
    }

    /* ─────────────────────────────
       🔍 FIND QUERY
    ───────────────────────────── */
    const query = await CancellationQuery.findById(id);

    if (!query) {
      return res.status(404).json({
        success: false,
        message: "Cancellation query not found",
      });
    }

    const hasResolutionUpdate =
      resolution &&
      typeof resolution === "object" &&
      Object.keys(resolution).some((key) => resolution[key] !== undefined);
    const hasRemarksUpdate =
      typeof remarks === "string" && remarks !== query.remarks;

    /* ─────────────────────────────
       🚫 PREVENT DUPLICATE UPDATE
    ───────────────────────────── */
    if (
      query.status === normalizedStatus &&
      !hasResolutionUpdate &&
      !hasRemarksUpdate
    ) {
      return res.status(400).json({
        success: false,
        message: `Query is already ${normalizedStatus}`,
      });
    }

    /* ─────────────────────────────
       ✏️ UPDATE STATUS
    ───────────────────────────── */
    const previousStatus = query.status;

    query.status = normalizedStatus;

    if (typeof remarks === "string") {
      query.remarks = remarks;
    }

    if (hasResolutionUpdate) {
      query.resolution = {
        ...(query.resolution?.toObject?.() || query.resolution || {}),
        ...resolution,
      };
    }

    if (query.status === "RESOLVED" && !query.resolution?.resolvedAt) {
      query.resolution = {
        ...(query.resolution?.toObject?.() || query.resolution || {}),
        resolvedAt: new Date(),
      };
    }

    /* ─────────────────────────────
       🧾 LOG ENTRY
    ───────────────────────────── */
    query.logs.push({
      action: "STATUS_UPDATED",
      by: req.user?.role === "admin" ? "ADMIN" : "USER",
      message:
        previousStatus === normalizedStatus
          ? `Query details updated while status remained ${normalizedStatus}`
          : `Status changed from ${previousStatus} to ${normalizedStatus}`,
    });

    await query.save();

    /* ─────────────────────────────
       ✅ RESPONSE
    ───────────────────────────── */
    return res.status(200).json({
      success: true,
      message: "Cancellation query status updated successfully",
      data: query,
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
