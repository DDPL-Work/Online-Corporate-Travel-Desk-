//server\src\controllers\hotelBooking.controller.js
const Corporate = require("../models/Corporate");
const HotelBookingRequest = require("../models/hotelBookingRequest.model");
const paymentService = require("../services/payment.service");
const pdfService = require("../services/pdf.service");
const hotelService = require("../services/tektravels/hotel.service");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/ApiResponse");
const { generateBookingReference } = require("../utils/helpers");
const { generateSequentialOrderId } = require("../utils/orderIdGenerator");
const notificationService = require("../services/notification.service");
const { notify } = require("../notifications/orchestrator");
const EVENTS = require("../events/eventConstants");
const User = require("../models/User");
const EmployeeSsrPolicy = require("../models/EmployeeSsrPolicy.model");
const logger = require("../utils/logger");
const MarkupAccountingService = require("../modules/markup/services/markupAccounting.service");
const serviceFeeService = require("../services/serviceFee.service");
const TBOHotelDetails = require("../models/TBOHotelDetails");

// @desc    PreBook Hotel (TBO)
// @route   POST /api/v1/hotel-bookings/prebook
// @access  Private

exports.preBookHotel = asyncHandler(async (req, res) => {
  const { 
    BookingCode, 
    corporateId, 
    hotelRequest,
    CityCode, cityCode, city,
    CityName, cityName,
    CountryCode, countryCode, country,
    CountryName, countryName,
    StarRating, starRating
  } = req.body;

  /* ================= VALIDATION ================= */
  if (!BookingCode) {
    throw new ApiError(400, "BookingCode is required");
  }

  /* ================= BUILD PAYLOAD ================= */
  const payload = {
    BookingCode: Array.isArray(BookingCode)
      ? BookingCode.join(",")
      : BookingCode,
    EndUserIp: process.env.TBO_END_USER_IP,
    corporateId: corporateId || req.corporate?._id,
    CityCode: CityCode || cityCode || hotelRequest?.cityCode || hotelRequest?.CityCode || "",
    CityName: CityName || cityName || city || hotelRequest?.city || hotelRequest?.cityName || hotelRequest?.rawHotelData?.CityName || "",
    CountryCode: CountryCode || countryCode || hotelRequest?.countryCode || hotelRequest?.CountryCode || "",
    CountryName: CountryName || countryName || country || hotelRequest?.country || hotelRequest?.countryName || hotelRequest?.rawHotelData?.CountryName || "",
    StarRating: StarRating || starRating || hotelRequest?.starRating || hotelRequest?.StarRating || 0
  };

  // console.log("PREBOOK PAYLOAD:", payload);

  /* ================= CALL SERVICE ================= */
  const preBookResp = await hotelService.preBookHotel(payload);

  // console.log("PREBOOK RESPONSE:", JSON.stringify(preBookResp, null, 2));

  /* ================= VALIDATION ================= */
  if (preBookResp?.Status?.Code !== 200 && preBookResp?.Status !== 1) {
    return res.status(200).json({
      success: false,
      message:
        preBookResp?.Status?.Description ||
        preBookResp?.Error?.ErrorMessage ||
        "PreBook failed",
      data: preBookResp,
    });
  }

  const result = preBookResp?.HotelResult?.[0];

  if (!result) {
    throw new ApiError(500, "Invalid PreBook response: HotelResult missing");
  }

  const isPriceChanged = result?.IsPriceChanged;
  const isPolicyChanged = result?.IsCancellationPolicyChanged;

  /* ================= EDGE CASES ================= */

  if (isPriceChanged) {
    return res.status(200).json({
      success: false,
      message: "Price changed",
      data: preBookResp,
    });
  }

  if (isPolicyChanged) {
    return res.status(200).json({
      success: false,
      message: "Cancellation policy changed",
      data: preBookResp,
    });
  }

  /* ================= SUCCESS ================= */

  return res.status(200).json({
    success: true,
    message: "PreBook successful",
    data: preBookResp,
  });
});

/* ======================================================
   DIRECT HOTEL BOOKING (AUTO-APPROVED)
====================================================== */


exports.instantHotelBooking = asyncHandler(async (req, res) => {
  const {
    hotelRequest,
    travellers,
    purposeOfTravel,
    pricingSnapshot,
    gstDetails,
    projectName,
    projectId,
    projectClient,
    approverId,
    approverEmail,
    approverName,
    approverRole,
    requesterDetails,
  } = req.body;

  const user = req.user;
  const corporate = req.corporate;

  /* ================= DEFENSIVE CHECKS ================= */
  if (!user) throw new ApiError(401, "User not authenticated");
  if (!corporate) throw new ApiError(400, "Corporate context missing");
  if (!hotelRequest) throw new ApiError(400, "Hotel request data missing");
  if (!travellers?.length)
    throw new ApiError(400, "At least one guest required");

  // ── SERVICE FEE CALCULATION ──
  const b = req.body;
  const cCode = (b.CountryCode || b.countryCode || b.country || b.CountryName || b.countryName || hotelRequest?.countryCode || hotelRequest?.selectedHotel?.country || hotelRequest?.preBookResponse?.HotelResult?.[0]?.CountryCode || hotelRequest?.hotelDetails?.CountryCode || hotelRequest?.hotelDetails?.CountryName || "in").toLowerCase();
  const isDomesticHotel = ["in", "ind", "india"].includes(cCode);
  const sRating = b.StarRating || b.starRating || hotelRequest?.selectedHotel?.starRating || hotelRequest?.selectedHotel?.StarRating || hotelRequest?.preBookResponse?.HotelResult?.[0]?.StarRating || hotelRequest?.starRating || hotelRequest?.hotelDetails?.StarRating || 1; // Default to 1 if unknown, though better to pass it.

  const serviceFeePayload = {
    productType: "Hotel",
    operation: "Book",
    tripType: isDomesticHotel ? "Domestic" : "International",
    starRating: Number(sRating),
    roomCount: hotelRequest?.noOfRooms || hotelRequest?.roomGuests?.length || hotelRequest?.roomDetails?.length || 1,
    baseFare: Number(pricingSnapshot?.totalAmount || 0)
  };

  const serviceFeeDetails = serviceFeeService.calculateServiceFee(corporate, serviceFeePayload);
  let totalServiceFee = 0;
  if (serviceFeeDetails && serviceFeeDetails.feeAmount > 0) {
    totalServiceFee = serviceFeeDetails.feeAmount;
    pricingSnapshot.totalAmount = Number(pricingSnapshot.totalAmount || 0) + totalServiceFee;
    pricingSnapshot.serviceFeeDetails = serviceFeeDetails;
  }

  // ── BALANCE CHECK START ──
  const env = process.env.TBO_ENV || "live";
  // const env = "dummy";
  const requiredAmount = Number(pricingSnapshot?.totalAmount || 0);

  const { getAgencyBalance } = require("../services/tboBalance.service");
  const balance = await getAgencyBalance(env);

  if (balance.availableBalance < requiredAmount) {
    throw new ApiError(
      400,
      `Insufficient agency balance. Available ₹${balance.availableBalance}, Required ₹${requiredAmount}`
    );
  }

  if (corporate.classification === "prepaid") {
    if ((corporate.walletBalance || 0) < requiredAmount) {
      throw new ApiError(400, `Insufficient corporate wallet balance. Available ₹${corporate.walletBalance || 0}, Required ₹${requiredAmount}`);
    }
  } else {
    const availableCredit = (corporate.creditLimit || 0) - (corporate.currentCredit || 0);
    if (availableCredit < requiredAmount) {
      throw new ApiError(400, `Insufficient corporate credit limit. Available ₹${availableCredit}, Required ₹${requiredAmount}`);
    }
  }
  // ── BALANCE CHECK END ──

  /* ================= APPROVER RESOLUTION ================= */
  let resolvedApproverId = approverId;
  let resolvedApproverName = approverName;
  let resolvedApproverRole = approverRole;

  if (!resolvedApproverId && approverEmail) {
    const normalizedEmail = approverEmail.trim().toLowerCase();
    let approverUser = await User.findOne({ email: normalizedEmail });

    if (!approverUser) {
      const firstName = normalizedEmail.split("@")[0] || "Manager";
      approverUser = await User.create({
        corporateId: corporate._id,
        email: normalizedEmail,
        name: { firstName, lastName: "" },
        role: "manager",
        isTempManager: true,
        managerRequestStatus: "pending",
      });
    }

    resolvedApproverId = approverUser._id;
    resolvedApproverName =
      resolvedApproverName ||
      `${approverUser.name?.firstName || ""} ${approverUser.name?.lastName || ""}`.trim();
    resolvedApproverRole =
      resolvedApproverRole || approverUser.role || "manager";
  }

  /* ================= TRANSFORM DATA ================= */
  const paxRooms = hotelRequest?.PaxRooms || hotelRequest?.paxRooms || [];
  if (!paxRooms.length) {
    throw new ApiError(400, "PaxRooms is required from frontend");
  }

  const roomsCount = paxRooms.length;
  const roomGuests = paxRooms.map((r) => ({
    noOfAdults: Number(r.Adults || 0),
    noOfChild: Number(r.Children || 0),
    childAge: r.ChildrenAges || [],
  }));

  const transformedHotelRequest = {
    checkInDate: hotelRequest.checkIn,
    checkOutDate: hotelRequest.checkOut,
    noOfRooms: roomsCount,
    noOfNights: hotelRequest?.nights || 1,
    cityName: hotelRequest.city || hotelRequest.rawHotelData?.CityName,
    countryName: hotelRequest.country || hotelRequest.rawHotelData?.CountryName,
    guestNationality: hotelRequest.guestNationality || "IN",
    roomGuests,
    paxRooms,
    selectedHotel: {
      hotelCode: hotelRequest.hotelCode,
    },
    allRooms: [], // Removed to save DB space
    // selectedRoom: {
      // roomIndex: hotelRequest.roomIndex,
      // bookingCode: hotelRequest.selectedRoom?.bookingCode || hotelRequest.selectedRoom?.BookingCode,
    // },
    providerBookingId: hotelRequest.bookingCode || null,
    preBookResponse: hotelRequest.preBookResponse || null,
    ...(hotelRequest.IsCorporate && { IsCorporate: true }),
  };

  const bookingSnapshot = {
    hotelName: req.body.bookingSnapshot?.hotelName || hotelRequest.hotelName?.trim() || hotelRequest.rawHotelData?.HotelName || "Unknown Hotel",
    city: req.body.bookingSnapshot?.city || hotelRequest.city || hotelRequest.rawHotelData?.CityName,
    country: req.body.bookingSnapshot?.country || hotelRequest.country || "",
    checkInDate: transformedHotelRequest.checkInDate,
    checkOutDate: transformedHotelRequest.checkOutDate,
    roomCount: transformedHotelRequest.noOfRooms,
    nights: transformedHotelRequest.noOfNights,
    amount: pricingSnapshot?.totalAmount || 0,
    currency: pricingSnapshot?.currency || "INR",
    hotelImage:
      req.body.bookingSnapshot?.hotelImage ||
      hotelRequest.images?.[0] ||
      hotelRequest.rawHotelData?.Images?.[0] ||
      "",
  };

  const transformedTravellers = travellers.map((t, index) => {
    const incomingPaxType = (t.paxType || t.PaxType || "")
      .toString()
      .toLowerCase();
    const isChild =
      incomingPaxType === "child" ||
      incomingPaxType === "2" ||
      (t.age !== "" && t.age != null && !isNaN(t.age) && Number(t.age) < 18);
    const paxType = isChild ? "child" : index === 0 ? "lead" : "adult";

    return {
      title: t.title,
      firstName: t.firstName,
      lastName: t.lastName,
      gender: t.gender,
      dob: t.dob,
      age: t.age,
      email: t.email,
      phoneWithCode: t.phoneWithCode,
      nationality: t.nationality,
      countryCode: t.countryCode,
      panCard: t.panCard || "",
      PassportNo: t.PassportNo || "",
      PassportIssueDate: t.PassportIssueDate || "",
      PassportExpDate: t.PassportExpDate || "",
      isLeadPassenger: paxType === "lead",
      paxType,
      raw: t,
    };
  });

  /* ================= SSR POLICY: AUTO-APPROVE CHECK ================= */
  let requestStatus = "pending_approval";
  let finalApproverName = approverName;
  let finalApprovedAt = null;

  const isAutoApproveIntent = !approverId || (approverName && String(approverName).trim().toLowerCase() === "auto approve");

  if (isAutoApproveIntent && user.role === "travel-admin") {
    requestStatus = "approved";
    finalApproverName = "Auto Approve (Travel Admin)";
    finalApprovedAt = new Date();
  } else {
    try {
      const ssrPolicy = await EmployeeSsrPolicy.findOne({
        corporateId: corporate._id,
        employeeEmail: user.email?.toLowerCase().trim(),
      }).lean();

      if (isAutoApproveIntent && ssrPolicy && ssrPolicy.approvalRequired === false) {
        requestStatus = "approved";
        finalApproverName = "Auto Approve";
        finalApprovedAt = new Date();
      }
    } catch (policyErr) {
      // Safe fallback
    }
  }

  const orderId = await generateSequentialOrderId("hotel");

  const bookingRequest = await HotelBookingRequest.create({
    bookingReference: generateBookingReference(),
    orderId,
    corporateId: corporate._id,
    userId: user._id,
    bookingType: "hotel",
    requestStatus,
    purposeOfTravel,
    projectName,
    projectId,
    projectClient,
    approverId,
    approverEmail,
    approverName: finalApproverName,
    approverRole,
    approvedAt: finalApprovedAt,
    requesterDetails,
    gstDetails: {
      gstin: gstDetails?.gstin || "",
      legalName: gstDetails?.legalName || "",
      address: gstDetails?.address || "",
      gstEmail: gstDetails?.gstEmail || "",
    },
    travellers: transformedTravellers,
    hotelRequest: transformedHotelRequest,
    pricingSnapshot: {
      ...pricingSnapshot,
      capturedAt: new Date(),
    },
    markupSnapshot: (() => {
      let snapshot = req.body.markupSnapshot || null;
      
      // The frontend might pass the raw room data inside hotelRequest.selectedRoom.rawRoomData
      // Due to transformation, it might be nested at transformedHotelRequest.selectedRoom.rawRoomData.rawRoomData
      // or transformedHotelRequest.selectedRoom.rawRoomData
      const roomData = transformedHotelRequest?.selectedRoom?.rawRoomData;
      const actualRawRoom = roomData?.rawRoomData || roomData || {};
      
      if (!snapshot && actualRawRoom?.markupAmount > 0) {
        snapshot = {
          supplierFare: actualRawRoom?.supplierFare || 0,
          finalFare: actualRawRoom?.TotalFare || actualRawRoom?.totalFare || transformedHotelRequest?.selectedRoom?.totalFare || 0,
          markupAmount: actualRawRoom.markupAmount,
          markupBreakdown: actualRawRoom.markupBreakdown || []
        };
      }
      
      // Ensure markupBreakdown is included
      if (snapshot && (!snapshot.markupBreakdown || snapshot.markupBreakdown.length === 0)) {
        snapshot.markupBreakdown = actualRawRoom?.markupBreakdown || [];
      }
      
      return snapshot;
    })(),
    bookingSnapshot,
  });


  const isAutoApproved = requestStatus === "approved";

  // ── Notify ──
  const _hotelRequesterName = user.name?.firstName
    ? `${user.name.firstName} ${user.name.lastName || ""}`.trim()
    : user.name || "Employee";
  const _hotelOrderId =
    bookingRequest.orderId || bookingRequest.bookingReference;

  notify(EVENTS.BOOKING_REQUEST_CREATED, {
    corporateId: corporate._id,
    employeeId: user._id,
    employeeEmail: user.email,
    employeeName: _hotelRequesterName,
    managerId: approverId || null,
    orderId: _hotelOrderId,
    bookingType: "hotel",
    amount: bookingRequest.pricingSnapshot?.totalAmount,
    relatedId: bookingRequest._id,
  });

  if (approverId) {
    notify(EVENTS.BOOKING_APPROVAL_REQUIRED, {
      corporateId: corporate._id,
      managerId: approverId,
      employeeName: _hotelRequesterName,
      orderId: _hotelOrderId,
      bookingType: "hotel",
      amount: bookingRequest.pricingSnapshot?.totalAmount,
      relatedId: bookingRequest._id,
    });
  }

  /* ======================================================
     🔥🔥 EXECUTION LOGIC (IF AUTO-APPROVED)
  ====================================================== */
  if (isAutoApproved) {
    try {
      bookingRequest.executionStatus = "booking_initiated";
      await bookingRequest.save();

      const bookingCodes = transformedHotelRequest.providerBookingId ? [transformedHotelRequest.providerBookingId] : [];
      const leadTraveller = transformedTravellers.find(
        (t) => t.isLeadPassenger,
      );
      const bookingPAN = leadTraveller.panCard;

      const adultTravellers = transformedTravellers.filter(
        (t) => t.paxType !== "child",
      );
      const childTravellers = transformedTravellers.filter(
        (t) => t.paxType === "child",
      );

      let adultIdx = 0;
      let childIdx = 0;

      const HotelRoomsDetails = roomGuests.map((room, idx) => {
        const passengers = [];
        for (let i = 0; i < room.noOfAdults; i++) {
          const traveller = adultTravellers[adultIdx];
          const passenger = {
            Title: traveller.title,
            FirstName: traveller.firstName,
            LastName: traveller.lastName,
            Email: traveller.email || leadTraveller.email,
            Phoneno: String(traveller.phoneWithCode || "")
              .replace(/\D/g, "")
              .slice(-10),
            PaxType: 1,
            LeadPassenger: passengers.length === 0,
            PAN: traveller.panCard || bookingPAN,
            PassportNo: traveller.PassportNo || null,
            PassportIssueDate: traveller.PassportIssueDate || null,
            PassportExpDate: traveller.PassportExpDate || null,
          };
          if (traveller.age) passenger.Age = parseInt(traveller.age);
          passengers.push(passenger);
          adultIdx++;
        }
        for (let i = 0; i < room.noOfChild; i++) {
          const traveller = childTravellers[childIdx];
          const passenger = {
            Title: traveller.title || "Master",
            FirstName: traveller.firstName,
            LastName: traveller.lastName,
            PaxType: 2,
            LeadPassenger: false,
            Email: null,
            Phoneno: String(leadTraveller.phoneWithCode || "")
              .replace(/\D/g, "")
              .slice(-10),
            PAN: bookingPAN,
            PassportNo: traveller.PassportNo || null,
            PassportIssueDate: traveller.PassportIssueDate || null,
            PassportExpDate: traveller.PassportExpDate || null,
          };
          const ages = room.childAge || [];
          passenger.Age =
            traveller.age != null && traveller.age !== ""
              ? parseInt(traveller.age)
              : ages[i]
                ? parseInt(ages[i])
                : 10;
          passengers.push(passenger);
          childIdx++;
        }
        return { RoomIndex: idx + 1, HotelPassenger: passengers };
      });

      const bookResp = await hotelService.bookHotel({
        BookingCode: bookingCodes.join(","),
        IsVoucherBooking: true,
        GuestNationality: transformedHotelRequest.guestNationality,
        EndUserIp: process.env.TBO_END_USER_IP,
        NetAmount: hotelRequest?.preBookResponse?.HotelResult?.[0]?.Rooms?.[0]?.NetAmount,
        ClientReferenceId: bookingRequest.bookingReference,
        TraceId: hotelRequest.traceId || hotelRequest.TraceId,
        HotelRoomsDetails,
        ...(hotelRequest.IsCorporate && { IsCorporate: true }),
        ...(gstDetails?.gstin && {
          GSTCompanyInformation: {
            GSTNumber: gstDetails.gstin,
            GSTCompanyName: gstDetails.legalName || "NA",
            GSTCompanyAddress: gstDetails.address || "NA",
            GSTCompanyEmail: gstDetails.gstEmail || leadTraveller?.email,
          },
        }),
      });

      const bookResult = bookResp?.BookResult || bookResp;
      if (bookResult?.Status === 1) {
        const confirmationNumber =
          bookResult?.ConfirmationNo ||
          bookResult?.BookingRefNo ||
          bookResult?.BookingId;
        bookingRequest.bookingResult = {
          hotelBookingId: confirmationNumber,
          providerResponse: bookResp,
        };
        bookingRequest.executionStatus = "booked";
        await bookingRequest.save();

        await paymentService.processBookingPayment({
          booking: bookingRequest,
          corporate,
        });
        bookingRequest.executionStatus = "voucher_generated";
        bookingRequest.voucheredAt = new Date();
        await bookingRequest.save();

        await MarkupAccountingService.recordBookingRevenue(bookingRequest, corporate).catch(err => {
          logger.error("Failed to record markup revenue for instant hotel booking", err);
        });

        try {
          await serviceFeeService.applyServiceFee(
            corporate._id,
            user._id,
            bookingRequest._id,
            bookingRequest.orderId,
            {
              productType: "Hotel",
              operation: "Book",
              tripType: (() => {
                const cCode = (bookingRequest.hotelRequest?.countryCode || bookingRequest.hotelRequest?.selectedHotel?.country || bookingRequest.hotelRequest?.preBookResponse?.HotelResult?.[0]?.CountryCode || bookingRequest.hotelRequest?.hotelDetails?.CountryCode || bookingRequest.hotelRequest?.hotelDetails?.CountryName || bookingRequest.bookingSnapshot?.country || "in").toLowerCase();
                return ["in", "ind", "india"].includes(cCode) ? "Domestic" : "International";
              })(),
              starRating: bookingRequest.hotelRequest?.selectedHotel?.starRating || bookingRequest.hotelRequest?.selectedHotel?.StarRating || bookingRequest.hotelRequest?.preBookResponse?.HotelResult?.[0]?.StarRating || bookingRequest.hotelRequest?.hotelDetails?.StarRating || bookingRequest.hotelRequest?.starRating || 1,
              roomCount: bookingRequest.hotelRequest?.noOfRooms || bookingRequest.hotelRequest?.roomGuests?.length || bookingRequest.hotelRequest?.roomDetails?.length || 1,
              baseFare: Number(bookingRequest.pricingSnapshot?.totalAmount || 0)
            },
            null
          );
        } catch (feeErr) {
          logger.error("Failed to apply service fee ledger for hotel booking", {
            bookingId: bookingRequest._id,
            error: feeErr.message,
          });
        }

        await notificationService.sendBookingNotification(
          bookingRequest,
          { _id: user._id },
          "confirmation",
        );

        return res.status(201).json({
          success: true,
          message: "Hotel booked instantly successfully",
          data: {
            bookingRequestId: bookingRequest._id,
            bookingReference: bookingRequest.bookingReference,
            confirmationNumber,
            status: "booked",
          },
        });
      } else {
        throw new Error(
          bookResult?.Error?.ErrorMessage ||
            "Instant booking failed at provider",
        );
      }
    } catch (execErr) {
      console.error("❌ Instant hotel booking execution failed", {
        bookingId: bookingRequest._id,
        error: execErr.message,
      });
      // Delete the created booking request so it is not saved in DB
      await HotelBookingRequest.deleteOne({ _id: bookingRequest._id });
      throw new ApiError(
        400,
        execErr.message || "Instant hotel booking failed on TBO"
      );
    }
  }

  return res.status(201).json({
    success: true,
    data: {
      bookingRequestId: bookingRequest._id,
      bookingReference: bookingRequest.bookingReference,
      orderId: bookingRequest.orderId,
      requestStatus: bookingRequest.requestStatus,
      autoApproved: isAutoApproved,
    },
    message: isAutoApproved
      ? "Hotel booking request auto-approved but requires manual execution"
      : "Hotel booking request submitted for approval",
  });
});

/* ======================================================
   CREATE HOTEL BOOKING REQUEST (Approval First)
====================================================== */
exports.createHotelBookingRequest = asyncHandler(async (req, res) => {
  const {
    hotelRequest,
    travellers,
    purposeOfTravel,
    pricingSnapshot,
    gstDetails,
    projectName,
    projectId,
    projectClient,
    approverId,
    approverEmail,
    approverName,
    approverRole,
    requesterDetails,
  } = req.body;

  const user = req.user;
  const corporate = req.corporate;

  /* ================= DEFENSIVE CHECKS ================= */

  if (!user) throw new ApiError(401, "User not authenticated");
  if (!corporate) throw new ApiError(400, "Corporate context missing");

  if (!hotelRequest) throw new ApiError(400, "Hotel request data missing");

  if (!travellers?.length)
    throw new ApiError(400, "At least one guest required");

  /* ================= APPROVER RESOLUTION ================= */
  let resolvedApproverId = approverId;
  let resolvedApproverName = approverName;
  let resolvedApproverRole = approverRole;

  if (!resolvedApproverId && approverEmail) {
    const normalizedEmail = approverEmail.trim().toLowerCase();
    let approverUser = await User.findOne({ email: normalizedEmail });

    if (!approverUser) {
      // bootstrap temp manager user
      const firstName = normalizedEmail.split("@")[0] || "Manager";
      approverUser = await User.create({
        corporateId: corporate._id,
        email: normalizedEmail,
        name: { firstName, lastName: "" },
        role: "manager",
        isTempManager: true,
        managerRequestStatus: "pending",
      });
    }

    resolvedApproverId = approverUser._id;
    resolvedApproverName =
      resolvedApproverName ||
      `${approverUser.name?.firstName || ""} ${approverUser.name?.lastName || ""}`.trim();
    resolvedApproverRole =
      resolvedApproverRole || approverUser.role || "manager";
  }

  /* ================= TRANSFORM DATA ================= */

  // ✅ STRICT STRING BASED (MATCHES YOUR DB)

  const totalAdults = travellers.filter(
    (t) =>
      (t.paxType || t.PaxType || "")
        .toString()
        .toLowerCase()
        .startsWith("adult") ||
      (t.paxType || t.PaxType || "").toString().toLowerCase() === "lead" ||
      (t.paxType || t.PaxType || "") === 1,
  ).length;

  const totalChildren = travellers.filter(
    (t) =>
      (t.paxType || t.PaxType || "").toString().toLowerCase() === "child" ||
      (t.paxType || t.PaxType || "") === 2,
  ).length;

  // const roomsCount =
  // hotelRequest?.allRooms?.length ||
  // hotelRequest.noOfRooms ||
  // 1;

  console.log("Travellers:", travellers);
  console.log("Rooms:", hotelRequest.rooms);

  // ✅ ALWAYS TRUST FRONTEND PaxRooms
  const paxRooms = hotelRequest?.PaxRooms || hotelRequest?.paxRooms || [];

  if (!paxRooms.length) {
    throw new ApiError(400, "PaxRooms is required from frontend");
  }

  // ✅ derive correct room count
  const roomsCount = paxRooms.length;

  // ✅ build exact roomGuests
  const roomGuests = paxRooms.map((r) => ({
    noOfAdults: Number(r.Adults || 0),
    noOfChild: Number(r.Children || 0),
    childAge: r.ChildrenAges || [],
  }));

  // build default if missing
  if (!roomGuests) {
    roomGuests = Array.from({ length: roomsCount }).map((_, index) => ({
      noOfAdults:
        Math.floor(totalAdults / roomsCount) +
        (index < totalAdults % roomsCount ? 1 : 0),
      noOfChild:
        Math.floor(totalChildren / roomsCount) +
        (index < totalChildren % roomsCount ? 1 : 0),
      childAge: [],
    }));
  }

  const transformedHotelRequest = {
    checkInDate: hotelRequest.checkIn,
    checkOutDate: hotelRequest.checkOut,

    noOfRooms: roomsCount,
    noOfNights: hotelRequest?.nights || 1,

    cityName: hotelRequest.city || hotelRequest.rawHotelData?.CityName,
    countryName: hotelRequest.country || hotelRequest.rawHotelData?.CountryName,
    guestNationality: hotelRequest.guestNationality,

    roomGuests,
    paxRooms,

    selectedHotel: {
      hotelCode: hotelRequest.hotelCode,
    },

    // allRooms: [], // Removed to save DB space

    // selectedRoom: {
    //   roomIndex: hotelRequest.roomIndex,
    //   bookingCode: hotelRequest.selectedRoom?.bookingCode || hotelRequest.selectedRoom?.BookingCode,
    // },
    providerBookingId: hotelRequest.bookingCode || null,
    preBookResponse: hotelRequest.preBookResponse || null,
  };

  /* ================= SNAPSHOT ================= */

  const bookingSnapshot = {
    hotelName: req.body.bookingSnapshot?.hotelName || hotelRequest.hotelName?.trim() || hotelRequest.rawHotelData?.HotelName || "Unknown Hotel",
    city: req.body.bookingSnapshot?.city || hotelRequest.city || hotelRequest.rawHotelData?.CityName,
    country: req.body.bookingSnapshot?.country || hotelRequest.country || "",
    checkInDate: transformedHotelRequest.checkInDate,
    checkOutDate: transformedHotelRequest.checkOutDate,
    roomCount: transformedHotelRequest.noOfRooms,
    nights: transformedHotelRequest.noOfNights,
    amount: pricingSnapshot?.totalAmount || 0,
    currency: pricingSnapshot?.currency || "INR",
    // hotelImage:
    //   req.body.bookingSnapshot?.hotelImage ||
    //   hotelRequest.images?.[0] ||
    //   hotelRequest.rawHotelData?.Images?.[0] ||
    //   "",
  };

  /* ================= SAVE ================= */

  const transformedTravellers = travellers.map((t, index) => {
    const incomingPaxType = (t.paxType || t.PaxType || "")
      .toString()
      .toLowerCase();
    const isChild =
      incomingPaxType === "child" ||
      incomingPaxType === "2" ||
      (t.age !== "" && t.age != null && !isNaN(t.age) && Number(t.age) < 18);
    const paxType = isChild ? "child" : index === 0 ? "lead" : "adult";

    return {
      title: t.title,
      firstName: t.firstName,
      lastName: t.lastName,

      gender: t.gender,
      dob: t.dob,
      age: t.age,

      email: t.email,
      phoneWithCode: t.phoneWithCode,

      nationality: t.nationality,
      countryCode: t.countryCode,

      panCard: t.panCard || "",
      PassportNo: t.PassportNo || "",
      PassportIssueDate: t.PassportIssueDate || "",
      PassportExpDate: t.PassportExpDate || "",

      isLeadPassenger: paxType === "lead",
      paxType,

      raw: t,
    };
  });

  /* ================= SSR POLICY: AUTO-APPROVE CHECK ================= */
  let requestStatus = "pending_approval"; // default
  let finalApproverName = approverName;
  let finalApprovedAt = null;

  const isAutoApproveIntent = !approverId || (approverName && String(approverName).trim().toLowerCase() === "auto approve");

  if (isAutoApproveIntent && user.role === "travel-admin") {
    requestStatus = "approved";
    finalApproverName = "Auto Approve (Travel Admin)";
    finalApprovedAt = new Date();
  } else {
    try {
      const ssrPolicy = await EmployeeSsrPolicy.findOne({
        corporateId: corporate._id,
        employeeEmail: user.email?.toLowerCase().trim(),
      }).lean();

      if (isAutoApproveIntent && ssrPolicy && ssrPolicy.approvalRequired === false) {
        requestStatus = "approved";
        finalApproverName = "Auto Approve";
        finalApprovedAt = new Date();
      }
    } catch (policyErr) {
      // Safe fallback
    }
  }

  const orderId = await generateSequentialOrderId("hotel");

  const bookingRequest = await HotelBookingRequest.create({
    bookingReference: generateBookingReference(),
    orderId,
    corporateId: corporate._id,
    userId: user._id,

    bookingType: "hotel",

    requestStatus,

    purposeOfTravel,

    projectName,
    projectId,
    projectClient,
    approverId,
    approverEmail,
    approverName: finalApproverName,
    approverRole,
    approvedAt: finalApprovedAt,
    requesterDetails,

    gstDetails: {
      gstin: gstDetails?.gstin || "",
      legalName: gstDetails?.legalName || "",
      address: gstDetails?.address || "",
      gstEmail: gstDetails?.gstEmail || "",
    },
    travellers: transformedTravellers,

    hotelRequest: transformedHotelRequest,
    pricingSnapshot: {
      ...pricingSnapshot,
      capturedAt: new Date(),
    },
    markupSnapshot: req.body.markupSnapshot || (transformedHotelRequest?.selectedRoom?.rawRoomData?.markupAmount > 0 ? {
      supplierFare: transformedHotelRequest.selectedRoom.rawRoomData?.supplierFare || 0,
      finalFare: transformedHotelRequest.selectedRoom.rawRoomData?.TotalFare || transformedHotelRequest.selectedRoom.totalFare || 0,
      markupAmount: transformedHotelRequest.selectedRoom.rawRoomData.markupAmount,
      markupBreakdown: transformedHotelRequest.selectedRoom.rawRoomData.markupBreakdown || []
    } : null),
    bookingSnapshot,
  });


  const isAutoApproved = requestStatus === "approved";

  // ── Notify Travel Admin + Manager of new hotel booking request ──
  const _hotelRequesterName = user.name?.firstName
    ? `${user.name.firstName} ${user.name.lastName || ""}`.trim()
    : user.name || "Employee";
  const _hotelOrderId =
    bookingRequest.orderId || bookingRequest.bookingReference;

  notify(EVENTS.BOOKING_REQUEST_CREATED, {
    corporateId: corporate._id,
    employeeId: user._id,
    employeeEmail: user.email,
    employeeName: _hotelRequesterName,
    managerId: approverId || null,
    orderId: _hotelOrderId,
    bookingType: "hotel",
    amount: bookingRequest.pricingSnapshot?.totalAmount,
    relatedId: bookingRequest._id,
  });

  // If a manager is selected, send BOOKING_APPROVAL_REQUIRED to them specifically
  if (approverId) {
    notify(EVENTS.BOOKING_APPROVAL_REQUIRED, {
      corporateId: corporate._id,
      managerId: approverId,
      employeeName: _hotelRequesterName,
      orderId: _hotelOrderId,
      bookingType: "hotel",
      amount: bookingRequest.pricingSnapshot?.totalAmount,
      relatedId: bookingRequest._id,
    });
  }

  return res.status(201).json({
    success: true,
    data: {
      bookingRequestId: bookingRequest._id,
      bookingReference: bookingRequest.bookingReference,
      orderId: bookingRequest.orderId,
      requestStatus: bookingRequest.requestStatus,
      autoApproved: isAutoApproved,
    },
    message: isAutoApproved
      ? "Hotel booking request auto-approved (no approval required per policy)"
      : "Hotel booking request submitted for approval",
  });
});



// @desc    Get my hotel booking requests (pending + approved)
// @route   GET /api/v1/hotel-bookings/my
// @access  Private (Employee)

exports.getMyHotelRequests = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const requests = await HotelBookingRequest.find({
    userId,
    requestStatus: { $in: ["pending_approval", "pending_second_approval", "manager_approved", "approved"] },
    executionStatus: { $ne: "voucher_generated" }, // not completed yet
  })
    .select("orderId requestStatus pricingSnapshot.totalAmount hotelRequest.checkInDate hotelRequest.selectedHotel.hotelCode hotelRequest.hotelCode bookingSnapshot")
    .sort({ createdAt: -1 })
    .lean();

  return res.status(200).json({
    success: true,
    count: requests.length,
    data: requests,
    message: "Hotel booking requests fetched successfully",
  });
});

// @desc    Get single hotel booking request
// @route   GET /api/v1/hotel-bookings/my/:id
// @access  Private (Employee)

exports.getMyHotelRequestById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const booking = await HotelBookingRequest.findById(id)
    .populate("approvedBy", "name email role")
    .populate("rejectedBy", "name email role")
    .lean();

  if (booking) {
    const hotelCode = booking.hotelRequest?.selectedHotel?.hotelCode || booking.hotelRequest?.hotelCode;
    if (hotelCode) {
      // Fetch full hotel details from TBOHotelDetails
      const details = await TBOHotelDetails.findOne({ hotelCode }).lean();
      if (details) {
        // Attach the full details to the booking object
        booking.hotelDetails = details;

        // Also ensure bookingSnapshot is hydrated
        if (!booking.bookingSnapshot) booking.bookingSnapshot = {};
        booking.bookingSnapshot.hotelName = details.hotelName || booking.bookingSnapshot.hotelName;
        booking.bookingSnapshot.city = details.cityName || booking.bookingSnapshot.city;
        booking.bookingSnapshot.country = details.countryName || booking.bookingSnapshot.country;
        booking.bookingSnapshot.hotelImage = details.image || details.images?.[0] || booking.bookingSnapshot.hotelImage;
      }
    }
  }

  if (!booking) {
    throw new ApiError(404, "Hotel booking request not found");
  }

  // 🔐 Ownership check
  if (booking.userId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized to view this request");
  }

  return res.status(200).json({
    success: true,
    data: booking,
    message: "Hotel booking request fetched successfully",
  });
});

// @desc    Get my rejected hotel booking requests
// @route   GET /api/v1/hotel-bookings/my/rejected
// @access  Private

exports.getMyRejectedHotelRequests = asyncHandler(async (req, res) => {
  const requests = await HotelBookingRequest.find({
    userId: req.user._id,
    requestStatus: "rejected",
  })
    .select("orderId requestStatus rejectedAt rejectionReason hotelRequest.selectedHotel.hotelCode hotelRequest.hotelCode bookingSnapshot")
    .sort({ rejectedAt: -1 })
    .lean();

  for (let req of requests) {
    const hotelCode = req.hotelRequest?.selectedHotel?.hotelCode || req.hotelRequest?.hotelCode;
    if (hotelCode) {
      // Only fetch exactly what is needed for the snapshot
      const details = await TBOHotelDetails.findOne({ hotelCode })
        .select("hotelName cityName countryName image images")
        .lean();
      if (details) {
        if (!req.bookingSnapshot) req.bookingSnapshot = {};
        req.bookingSnapshot.hotelName = details.hotelName || req.bookingSnapshot.hotelName;
        req.bookingSnapshot.city = details.cityName || req.bookingSnapshot.city;
        req.bookingSnapshot.country = details.countryName || req.bookingSnapshot.country;
        req.bookingSnapshot.hotelImage = details.image || details.images?.[0] || req.bookingSnapshot.hotelImage;
      }
    }
  }

  return res.status(200).json({
    success: true,
    count: requests.length,
    data: requests,
    message: "Rejected hotel requests fetched successfully",
  });
});

/* ======================================================
   EXECUTE APPROVED HOTEL BOOKING
====================================================== */
exports.executeApprovedHotelBooking = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;

  if (!bookingId) {
    throw new ApiError(400, "Booking ID is required");
  }

  const booking = await HotelBookingRequest.findById(bookingId);

  if (!booking) throw new ApiError(404, "Booking not found");

  if (booking.requestStatus !== "approved") {
    throw new ApiError(400, "Booking not approved");
  }

  // ── BALANCE CHECK START ──
  const corporate = await Corporate.findById(booking.corporateId);
  if (!corporate) {
    throw new ApiError(404, "Corporate not found");
  }

  const env = process.env.TBO_ENV || "live";
  // const env = "dummy";
  const requiredAmount = Number(booking.pricingSnapshot?.totalAmount || 0);

  const { getAgencyBalance } = require("../services/tboBalance.service");
  const balance = await getAgencyBalance(env);

  if (balance.availableBalance < requiredAmount) {
    throw new ApiError(
      400,
      `Insufficient agency balance. Available ₹${balance.availableBalance}, Required ₹${requiredAmount}`
    );
  }

  if (corporate.classification === "prepaid") {
    if ((corporate.walletBalance || 0) < requiredAmount) {
      throw new ApiError(400, `Insufficient corporate wallet balance. Available ₹${corporate.walletBalance || 0}, Required ₹${requiredAmount}`);
    }
  } else {
    const availableCredit = (corporate.creditLimit || 0) - (corporate.currentCredit || 0);
    if (availableCredit < requiredAmount) {
      throw new ApiError(400, `Insufficient corporate credit limit. Available ₹${availableCredit}, Required ₹${requiredAmount}`);
    }
  }
  // ── BALANCE CHECK END ──

  booking.executionStatus = "booking_initiated";
  await booking.save();

  try {
    /* ================= STEP 1: GET BOOKING CODE ================= */

    const selectedRooms = booking.hotelRequest?.allRooms || [];

    // derive booking codes and room count safely
    let bookingCodes = selectedRooms
      .map((r) => r.bookingCode)
      .filter(Boolean);

    if (!bookingCodes.length && booking.hotelRequest?.preBookResponse?.HotelResult?.[0]?.Rooms) {
      bookingCodes = booking.hotelRequest.preBookResponse.HotelResult[0].Rooms
        .map(r => r.BookingCode)
        .filter(Boolean);
    }

    if (!bookingCodes.length) {
      throw new ApiError(400, "BookingCode missing");
    }

    if (!bookingCodes) {
      throw new ApiError(400, "BookingCode missing");
    }

    console.log("INITIAL BOOKING CODE:", bookingCodes);

    /* ================= STEP 2: PREBOOK ================= */

    const preBookResp = await hotelService.preBookHotel({
      BookingCode: bookingCodes.join(","), // 🔥 MULTI ROOM FIX
      EndUserIp: process.env.TBO_END_USER_IP,
    });

    console.log("PREBOOK RESPONSE:", JSON.stringify(preBookResp, null, 2));

    const preBookRooms = preBookResp?.HotelResult?.[0]?.Rooms || [];

    const isPriceChanged =
      preBookResp?.HotelResult?.[0]?.IsPriceChanged || false;

    const isPolicyChanged =
      preBookResp?.HotelResult?.[0]?.IsCancellationPolicyChanged || false;

    if (isPriceChanged) {
      throw new ApiError(400, "Price changed. Please refresh booking.");
    }

    if (isPolicyChanged) {
      throw new ApiError(400, "Cancellation policy changed. Please review.");
    }

    const freshBookingCode = preBookRooms
      .map((r) => r.BookingCode)
      .filter(Boolean);

    if (!freshBookingCode.length) {
      throw new ApiError(500, "PreBook failed - BookingCode missing");
    }

    const netAmount = preBookResp?.HotelResult?.[0]?.Rooms?.[0]?.NetAmount;

    // 🔥 TBO PREBOOK SUCCESS CHECK (CORRECT)
    if (preBookResp?.Status?.Code !== 200 && preBookResp?.Status !== 1) {
      console.error("PREBOOK FAILED:", preBookResp);

      throw new ApiError(
        500,
        preBookResp?.Status?.Description ||
          preBookResp?.Error?.ErrorMessage ||
          "PreBook failed",
      );
    }

    console.log("FRESH BOOKING CODE:", freshBookingCode);

    /* ================= STEP 5: BOOK ================= */

    const travellers = booking.travellers || [];

    // 🔥 STEP 1: GET LEAD PASSENGER PAN
    const leadTraveller = travellers.find((t) => t.isLeadPassenger);

    const guestNationality = booking.hotelRequest?.guestNationality || "IN";
    const hotelCountryInfo =
      booking.hotelRequest?.selectedHotel?.country || "IN";

    // TBO considers booking international if the hotel's country does not match the guest's nationality
    const isInternationalBooking =
      guestNationality.toLowerCase() !== hotelCountryInfo.toLowerCase() &&
      !(
        guestNationality.toLowerCase() === "in" &&
        hotelCountryInfo.toLowerCase() === "india"
      );

    if (isInternationalBooking && (!leadTraveller || !leadTraveller.panCard)) {
      throw new ApiError(
        400,
        "Lead passenger PAN is required to proceed with international booking",
      );
    }

    const leadPhoneRaw = String(leadTraveller?.phoneWithCode || "").replace(
      /\D/g,
      "",
    );
    const leadPhone = leadPhoneRaw.slice(-10);

    if (!leadTraveller?.email) {
      throw new ApiError(400, "Lead passenger email is required");
    }

    if (leadPhone.length !== 10) {
      throw new ApiError(400, "Lead passenger must have valid 10 digit phone");
    }

    const bookingPAN = leadTraveller.panCard;

    // derive room count from booking codes (handle comma-combined codes)
    const countCodes = (codes) =>
      (codes || []).reduce(
        (sum, code) => sum + code.split(",").filter(Boolean).length,
        0,
      );

    const roomsCount =
      booking.hotelRequest?.noOfRooms ||
      booking.hotelRequest?.NoOfRooms ||
      countCodes(freshBookingCode) ||
      countCodes(bookingCodes) ||
      selectedRooms.length ||
      1;

    // split travellers into adults/children
    const adultTravellers = travellers.filter((t) => {
      const pax = (t.paxType || t.PaxType || "").toString().toLowerCase();
      const age = t.age != null ? Number(t.age) : null;
      return !(pax === "child" || pax === "2" || (age != null && age < 12));
    });

    const childTravellers = travellers.filter((t) => {
      const pax = (t.paxType || t.PaxType || "").toString().toLowerCase();
      const age = t.age != null ? Number(t.age) : null;
      return pax === "child" || pax === "2" || (age != null && age < 12);
    });

    // 🔥 AUTO FIX roomGuests
    let paxRooms =
      booking.hotelRequest?.paxRooms || booking.hotelRequest?.PaxRooms || [];

    // ✅ fallback for OLD bookings
    let roomGuests = booking.hotelRequest?.roomGuests || [];

    // ✅ PRIORITY 1 → use saved correct data
    if (roomGuests.length === roomsCount) {
      // perfect → do nothing
    } else {
      // fallback ONLY if completely broken
      console.warn("⚠️ roomGuests invalid → fallback");

      roomGuests = Array.from({ length: roomsCount }).map(() => ({
        noOfAdults: Math.floor(adultTravellers.length / roomsCount),
        noOfChild: Math.floor(childTravellers.length / roomsCount),
        childAge: [],
      }));

      for (let i = 0; i < adultTravellers.length % roomsCount; i++) {
        roomGuests[i].noOfAdults += 1;
      }

      for (let i = 0; i < childTravellers.length % roomsCount; i++) {
        roomGuests[i].noOfChild += 1;
      }
    }

    // ✅ ADD THIS BLOCK HERE (EXACT PLACE)

    // 🔥 VALIDATION (CRITICAL FIX)
    const totalGuestsFromRooms = roomGuests.reduce(
      (sum, r) => sum + r.noOfAdults + r.noOfChild,
      0,
    );

    const totalTravellers = adultTravellers.length + childTravellers.length;

    if (totalGuestsFromRooms !== totalTravellers) {
      throw new ApiError(
        400,
        `Mismatch: roomGuests=${totalGuestsFromRooms}, travellers=${totalTravellers}`,
      );
    }
    let adultIdx = 0;
    let childIdx = 0;

    const HotelRoomsDetails = roomGuests.map((room, idx) => {
      const passengers = [];

      // Adults first
      for (let i = 0; i < room.noOfAdults; i++) {
        const traveller = adultTravellers[adultIdx];

        if (!traveller) {
          throw new ApiError(400, "Adult traveller count mismatch with rooms");
        }

        const rawPhone = String(traveller.phoneWithCode || "").replace(
          /\D/g,
          "",
        );
        const phone = rawPhone.slice(-10);

        const passenger = {
          Title: traveller.title,
          FirstName: traveller.firstName,
          MiddleName: traveller.middleName || "",
          LastName: traveller.lastName,
          Email: traveller.email || leadTraveller.email,
          // Phoneno: String(traveller.phoneWithCode || "").replace(/\D/g, ""),
          Phoneno: phone,

          PaxType: 1,

          // ✅ Lead per room (first passenger)
          LeadPassenger: passengers.length === 0,

          // 🔥 PAN Card for domestic bookings
          PAN: traveller.panCard || bookingPAN,
          PassportNo: traveller.PassportNo || null,
          PassportIssueDate: traveller.PassportIssueDate || null,
          PassportExpDate: traveller.PassportExpDate || null,
        };

        if (traveller.age) passenger.Age = parseInt(traveller.age);

        passengers.push(passenger);
        adultIdx++;
      }

      // Children
      for (let i = 0; i < room.noOfChild; i++) {
        const traveller = childTravellers[childIdx];
        if (!traveller) break;

        const passenger = {
          Title: traveller.title || "Master",
          FirstName: traveller.firstName,
          MiddleName: traveller.middleName || "",
          LastName: traveller.lastName,
          PaxType: 2,
          LeadPassenger: false,
          Email: null,
          Phoneno: String(leadTraveller.phoneWithCode || "")
            .replace(/\D/g, "")
            .slice(-10),
          PAN: bookingPAN,
          PassportNo: traveller.PassportNo || null,
          PassportIssueDate: traveller.PassportIssueDate || null,
          PassportExpDate: traveller.PassportExpDate || null,
        };

        const ages = room.childAge || [];
        if (ages[i]) passenger.Age = parseInt(ages[i]);
        else if (traveller.age) passenger.Age = parseInt(traveller.age);
        else passenger.Age = 10; // safe default

        passengers.push(passenger);
        childIdx++;
      }

      return {
        // TBO expects RoomIndex (1-based) alongside passengers
        RoomIndex: idx + 1,
        HotelPassenger: passengers,
      };
    });

    const bookResp = await hotelService.bookHotel({
      BookingCode: freshBookingCode.join(","),
      IsVoucherBooking: true,
      GuestNationality: booking.hotelRequest?.guestNationality || "IN",
      EndUserIp: process.env.TBO_END_USER_IP,
      // RequestedBookingMode: 5, // optional; omit to mirror Postman success cases
      NetAmount: netAmount,
      ClientReferenceId: booking.bookingReference,
      TraceId:
        preBookResp?.TraceId ||
        booking.hotelRequest?.traceId ||
        booking.hotelRequest?.TraceId,

      HotelRoomsDetails,
      ...(booking.hotelRequest?.IsCorporate && { IsCorporate: true }),
      ...(booking.gstDetails?.gstin && {
        GSTCompanyInformation: {
          GSTNumber: booking.gstDetails.gstin || "",
          GSTCompanyName: booking.gstDetails.legalName || "NA",
          GSTCompanyAddress: booking.gstDetails.address || "NA",
          GSTCompanyEmail:
            booking.gstDetails.gstEmail ||
            leadTraveller?.email ||
            "info@domain.com",
        },
      }),
    });

    console.log("BOOK RESPONSE:", JSON.stringify(bookResp, null, 2));

    const bookResult = bookResp?.BookResult || bookResp;

    /* ================= STEP 6: VALIDATE BOOK ================= */

    if (bookResult?.Status !== 1) {
      throw new ApiError(
        500,
        bookResult?.Error?.ErrorMessage || "TBO hotel booking failed",
      );
    }

    /* ================= STEP 7: HANDLE PENDING ================= */

    if (bookResult?.HotelBookingStatus === "Pending") {
      console.warn("Booking is pending. Poll after 120 seconds.");
    }

    /* ================= STEP 8: EXTRACT CONFIRMATION ================= */

    const confirmationNumber =
      bookResult?.ConfirmationNo ||
      bookResult?.BookingRefNo ||
      bookResult?.BookingId;

    if (!confirmationNumber) {
      throw new ApiError(500, "Hotel booking failed - no confirmation number");
    }

    /* ================= STEP 9: SAVE RESULT ================= */

    booking.bookingResult = {
      hotelBookingId: confirmationNumber,
      providerResponse: bookResp,
    };

    booking.executionStatus = "booked";
    await booking.save();

    /* ================= STEP 10: PAYMENT ================= */

    // 🔥 FIX: Ensure pricingSnapshot has totalAmount
    if (!booking.pricingSnapshot?.totalAmount) {
      const totalFare =
        booking.hotelRequest?.allRooms?.[0]?.price?.totalFare ||
        booking.hotelRequest?.selectedRoom?.rawRoomData?.[0]?.TotalFare ||
        0;

      const roomCount = booking.hotelRequest?.noOfRooms || 1;

      booking.pricingSnapshot = {
        ...booking.pricingSnapshot,
        totalAmount: totalFare * roomCount,
        currency: booking.pricingSnapshot?.currency || "INR",
      };

      await booking.save();
    }

    const corporate = await Corporate.findById(booking.corporateId);

    if (!corporate) {
      throw new ApiError(404, "Corporate not found");
    }

    await paymentService.processBookingPayment({
      booking,
      corporate,
    });

    booking.executionStatus = "voucher_generated";
    booking.voucheredAt = new Date();
    await booking.save();

    await MarkupAccountingService.recordBookingRevenue(booking, corporate).catch(err => {
      console.error("Failed to record markup revenue for approved hotel booking", err);
    });

    try {
      await serviceFeeService.applyServiceFee(
        corporate._id,
        booking.userId,
        booking._id,
        booking.orderId,
        {
          productType: "Hotel",
          operation: "Book",
          tripType: (() => {
            const cCode = (booking.hotelRequest?.countryCode || booking.hotelRequest?.selectedHotel?.country || booking.hotelRequest?.preBookResponse?.HotelResult?.[0]?.CountryCode || booking.hotelRequest?.hotelDetails?.CountryCode || booking.hotelRequest?.hotelDetails?.CountryName || booking.bookingSnapshot?.country || "in").toLowerCase();
            return ["in", "ind", "india"].includes(cCode) ? "Domestic" : "International";
          })(),
          starRating: booking.hotelRequest?.selectedHotel?.starRating || booking.hotelRequest?.selectedHotel?.StarRating || booking.hotelRequest?.preBookResponse?.HotelResult?.[0]?.StarRating || booking.hotelRequest?.hotelDetails?.StarRating || booking.hotelRequest?.starRating || 1,
          roomCount: booking.hotelRequest?.noOfRooms || booking.hotelRequest?.roomGuests?.length || booking.hotelRequest?.roomDetails?.length || 1,
          baseFare: Number(booking.pricingSnapshot?.totalAmount || 0)
        },
        null
      );
    } catch (feeErr) {
      console.error("Failed to apply service fee ledger for approved hotel booking:", feeErr.message);
    }

    // Notify User
    await notificationService.sendBookingNotification(
      booking,
      { _id: booking.userId },
      "confirmation",
    );

    /* ================= SUCCESS ================= */

    return res.status(200).json({
      success: true,
      message: "Hotel booked successfully",
      data: {
        bookingId: booking._id,
        confirmationNumber,
      },
    });
  } catch (err) {
    booking.executionStatus = "failed";
    await booking.save();

    console.error("BOOKING FAILED:", err.message);

    throw err;
  }
});

// @desc    Employee - Get my Hotel bookings (all statuses)
// @route   GET /api/v1/hotel-bookings/my
// @access  Private (Employee)
exports.getMyHotelBookings = asyncHandler(async (req, res) => {
  // const { page = 1, limit = 10 } = req.query;

  const query = {
    userId: req.user._id,
    // bookingType: "hotel",
    executionStatus: { $in: ["voucher_generated"] }, // ✅ FIXED
  };

  // const skip = (Number(page) - 1) * Number(limit);

  const [rawBookings, total] = await Promise.all([
    HotelBookingRequest.find(query)
      .select(
        `
  bookingReference
  bookingType
  requestStatus
  executionStatus
  orderId
  bookingSnapshot
  pricingSnapshot
  createdAt
  bookingResult
  hotelRequest.selectedRoom
  hotelRequest.selectedHotel
  hotelRequest.checkInDate
  hotelRequest.checkOutDate
  hotelRequest.noOfNights
  hotelRequest.noOfRooms
  amendment
  travellers
  requesterDetails
  `,
      )
      .sort({ createdAt: -1 })
      // .skip(skip)
      // .limit(Number(limit))
      .lean(),
    HotelBookingRequest.countDocuments(query),
  ]);

  const bookings = rawBookings.map((booking) => {
    const result =
      booking?.bookingResult?.providerResponse?.BookResult ||
      booking?.bookingResult?.providerResponse;

    const selectedRoom = booking?.hotelRequest?.selectedRoom || {};
    const rawRoom = selectedRoom?.rawRoomData || {};

    // 🔥 Extract images safely (cover all cases)
    const images =
      booking?.hotelRequest?.selectedRoom?.rawRoomData?.images || [];

    return {
      ...booking,

      // existing fields
      hotelName: result?.HotelName,
      city: result?.City,
      checkIn: result?.CheckInDate,
      checkOut: result?.CheckOutDate,
      status: result?.HotelBookingStatus,
      confirmationNo: result?.ConfirmationNo,

      // ✅ ROOM DETAILS (IMPORTANT)
      roomType: rawRoom?.Name?.[0] || selectedRoom?.roomTypeName || null,
      mealType: selectedRoom?.mealType || rawRoom?.MealType || null,
      isRefundable: selectedRoom?.isRefundable ?? rawRoom?.IsRefundable ?? null,
      cancelPolicies: rawRoom?.CancelPolicies || selectedRoom?.cancelPolicies || [],

      // ✅ images
      images,
      heroImage: images?.[0] || null,

      orderId: booking.orderId,
      amendment: booking.amendment || null,

      // ✅ Guest / requester info (used by frontend table for Guest column)
      travellers: booking.travellers || [],
      requesterDetails: booking.requesterDetails || null,
    };
  });

  // const pagination = {
  //   total,
  //   // page: Number(page),
  //   // pages: Math.ceil(total / limit),
  // };

  res.status(200).json({
    success: true,
    message: "Hotel bookings fetched successfully",
    data: {
      bookings,
      // pagination,
    },
  });
});

// @desc    Get booked hotel details (TBO)
// @route   GET /api/v1/hotel-bookings/:id/details
// @access  Private
exports.getBookedHotelDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const booking = await HotelBookingRequest.findById(id)
    .populate("approvedBy", "name email role")
    .populate("rejectedBy", "name email role")
    .lean();

  if (!booking) throw new ApiError(404, "Booking not found");

  // 🔐 Ownership check
  if (booking.userId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized");
  }

  if (booking.executionStatus !== "voucher_generated") {
    throw new ApiError(400, "Booking not completed yet");
  }

  /* ================= DB DATA ================= */

  const {
    bookingReference,
    executionStatus,
    requestStatus,
    bookingSnapshot = {},
    pricingSnapshot = {},
    travellers = [],
    bookingResult = {},
    approvedAt,
    voucheredAt,
    createdAt,
    updatedAt,
    corporateId,
    userId,
    projectName,
    projectId,
    projectClient,
    approverId,
    approverEmail,
    approverName,
    approverRole,
    requesterDetails,
    gstDetails,
  } = booking;

  const amendment = booking.amendment || null;

  /* ================= EXTRACT IDENTIFIERS ================= */

  const rawResponse = bookingResult.providerResponse || {};
  const bookResult = rawResponse.BookResult || rawResponse;

  const bookingIdTBO = bookResult?.BookingId;
  const confirmationNo = bookResult?.ConfirmationNo;
  const traceId = bookResult?.TraceId;

  const leadPassenger = travellers.find((t) => t.isLeadPassenger);

  /* ================= CALL TBO ================= */

  let tboResponse = null;
  let result = null;

  try {
    tboResponse = await hotelService.getBookingDetails({
      bookingId: bookingIdTBO,
      confirmationNo,
      traceId,
      firstName: leadPassenger?.firstName,
      lastName: leadPassenger?.lastName,
    });

    result = tboResponse?.GetBookingDetailResult || tboResponse;
  } catch (err) {
    console.log("TBO FAILED → fallback to DB");
  }

  /* ================= ROOMS NORMALIZATION ================= */

  // ✅ TBO rooms
  const tboRooms = Array.isArray(result?.Rooms) ? result.Rooms : [];

  // ✅ DB rooms (rawRoomData can be array or object)
  const dbRoomsRaw = booking?.hotelRequest?.selectedRoom?.rawRoomData;

  const dbRooms = Array.isArray(dbRoomsRaw)
    ? dbRoomsRaw
    : dbRoomsRaw
      ? [dbRoomsRaw]
      : [];

  // ✅ FINAL ROOMS (TBO priority)
  let rooms = [];

  if (tboRooms.length > 0 && dbRooms.length > 0) {
    // 🔥 MERGE TBO + DB (KEEP ORIGINAL ROOM TYPES)
    rooms = tboRooms.map((tboRoom, index) => {
      const dbRoom = dbRooms[index] || {};

      return {
        ...tboRoom,

        // ✅ FIX ROOM NAME FROM DB
        RoomTypeName: dbRoom?.Name?.[0] || tboRoom.RoomTypeName,

        // ✅ FIX MEAL
        Inclusion: dbRoom?.Inclusion || tboRoom.Inclusion,

        // ✅ FIX REFUNDABLE
        IsRefundable: dbRoom?.IsRefundable ?? tboRoom.IsRefundable,
      };
    });
  } else {
    rooms = tboRooms.length > 0 ? tboRooms : dbRooms;
  }

  /* ================= FETCH TBOHotelDetails FROM DB ================= */

  const possibleCodes = [
    result?.TBOHotelCode,
    result?.HotelCode,
    booking.hotelRequest?.selectedHotel?.hotelCode,
    booking.hotelRequest?.hotelCode,
  ].filter(Boolean);

  let tboHotelDetails = null;

  for (const hCode of possibleCodes) {
    try {
      tboHotelDetails = await TBOHotelDetails.findOne({ hotelCode: hCode }).lean();
      if (tboHotelDetails) break;
    } catch (err) {
      console.error(`DB TBOHotelDetails FETCH FAILED for code ${hCode}:`, err.message);
    }
  }

  /* ================= IMAGES ================= */

  let images = rooms.flatMap((r) => r?.images || r?.Images || []);

  // 🔥 Fallback 1: Hit the DB for saved hotel images
  if (images.length === 0) {
    images =
      booking.hotelRequest?.selectedHotel?.images ||
      booking.hotelRequest?.rawHotelData?.Images ||
      booking.hotelRequest?.rawHotelData?.images ||
      [];
  }

  // 🔥 Fallback 2: Check the snapshot image
  if (images.length === 0 && booking.bookingSnapshot?.hotelImage) {
    images = [booking.bookingSnapshot.hotelImage];
  }

  // 🔥 Fallback 3: LAST RESORT - FETCH FROM TBOHotelDetails DB
  if (images.length === 0 && tboHotelDetails) {
    const foundImages = tboHotelDetails.images?.length 
      ? tboHotelDetails.images 
      : (tboHotelDetails.image ? [tboHotelDetails.image] : []);

    if (foundImages.length > 0) {
      images = foundImages;
      // 🔥 Save back to DB for future hits
      try {
        await HotelBookingRequest.findByIdAndUpdate(booking._id, {
          $set: {
            "hotelRequest.selectedHotel.images": foundImages,
            "bookingSnapshot.hotelImage": foundImages[0],
          },
        });
      } catch (dbErr) {
        console.error(
          "FAILED TO SAVE RECOVERED IMAGES TO DB:",
          dbErr.message,
        );
      }
    }
  }

  const heroImage = images[0] || null;
  /* ================= GUESTS ================= */
  const guests =
    rooms.flatMap((room) => room?.HotelPassenger || []) || travellers || [];
  /* ================= PRICING ================= */
  const totalFare = result?.InvoiceAmount || pricingSnapshot?.totalAmount || 0;
  const currency = result?.Currency || pricingSnapshot?.currency || "INR";
  /* ================= DATES ================= */
  const checkIn = result?.CheckInDate || bookingSnapshot?.checkInDate;
  const checkOut = result?.CheckOutDate || bookingSnapshot?.checkOutDate;
  /* ================= HOTEL INFO ================= */
  const hotelName = result?.HotelName || bookingSnapshot?.hotelName;
  const city = result?.City || bookingSnapshot?.city;
  const status = result?.HotelBookingStatus || executionStatus;

  /* ================= FINAL RESPONSE ================= */

  return res.status(200).json({
    success: true,
    message: "Booking details fetched successfully",
    data: {
      bookingId: booking._id,
      bookingReference,
      orderId: booking.orderId,
      purposeOfTravel: booking.purposeOfTravel,

      corporateId,
      userId,
      projectName,
      projectId,
      projectClient,
      approverId,
      approverEmail,
      approverName,
      approverRole,
      requesterDetails,
      gstDetails,
      // 📌 DB (stable)
      executionStatus,
      requestStatus,
      bookingSnapshot,
      pricingSnapshot,
      travellers,
      approvedAt,
      voucheredAt,
      createdAt,
      updatedAt,
      // ✅ NEW (CRITICAL FIX)
      rooms,
      // ✅ TBO HOTEL DETAILS (DB)
      tboHotelDetails,
      // ✅ MEDIA
      images,
      heroImage,
      // ✅ TBO (live)
      confirmationNo: result?.ConfirmationNo || confirmationNo,
      hotelName,
      city,
      checkIn,
      checkOut,
      status,
      // ✅ merged
      guests,
      totalFare,
      currency,
      // ✅ raw (optional)
      raw: result || null,
      amendment,
      // ✅ audit fields
      createdAt: booking.createdAt,
      approvedAt: booking.approvedAt,
      approvedBy: booking.approvedBy,
      rejectedAt: booking.rejectedAt,
      rejectedBy: booking.rejectedBy,
    },
  });
});

// @desc    Generate Voucher for booked hotel
// @route   POST /api/v1/hotel-bookings/:id/voucher
// @access  Private

exports.generateHotelVoucher = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const booking = await HotelBookingRequest.findById(id);

  if (!booking) throw new ApiError(404, "Booking not found");

  const isAdmin = ["super-admin", "ops-member", "manager", "travel-admin", "finance_team"].includes(req.user.role);
  if (booking.userId.toString() !== req.user._id.toString() && !isAdmin) {
    throw new ApiError(403, "Not authorized");
  }

  /* =====================================================
     ✅ STEP 2: ALLOW BOTH STATES
  ====================================================== */

  if (!["booked", "voucher_generated"].includes(booking.executionStatus)) {
    throw new ApiError(400, "Booking not ready for voucher");
  }

  /* =====================================================
     ✅ STEP 3: CALL LIVE BOOKING DETAILS API & LOG RESPONSE
  ====================================================== */
  const leadPassenger = booking.travellers?.find((t) => t.isLeadPassenger) || booking.travellers?.[0] || {};
  const bookResult = booking.bookingResult?.providerResponse?.BookResult || {};
  const bookingIdTBO = bookResult?.BookingId || booking.bookingResult?.hotelBookingId;
  const confirmationNo = bookResult?.ConfirmationNo || booking.bookingResult?.hotelBookingId;
  const traceId = bookResult?.TraceId;

  console.log("------------------- [TBO DETAILS API REQUEST] -------------------");
  console.log({
    bookingId: bookingIdTBO,
    confirmationNo,
    traceId,
    firstName: leadPassenger?.firstName,
    lastName: leadPassenger?.lastName,
  });

  try {
    const tboBookingDetails = await hotelService.getBookingDetails({
      bookingId: bookingIdTBO,
      confirmationNo,
      traceId,
      firstName: leadPassenger?.firstName,
      lastName: leadPassenger?.lastName,
    });

    const detailResult = tboBookingDetails?.GetBookingDetailResult || tboBookingDetails || {};
    const liveRooms = Array.isArray(detailResult.Rooms) ? detailResult.Rooms : [];
    
    if (liveRooms.length > 0) {
      // Merge live rooms data into selectedRoom.rawRoomData!
      const normalizedRoomsRaw = liveRooms.map((liveRoom) => {
        const hasBreakfast = liveRoom.Inclusion && liveRoom.Inclusion.toLowerCase().includes("breakfast");
        return {
          Name: [liveRoom.RoomTypeName || liveRoom.Name || "Standard Room"],
          Inclusion: liveRoom.Inclusion || liveRoom.Inclusions || "Room Only",
          MealType: liveRoom.MealType || (hasBreakfast ? "Breakfast Included" : "Room Only"),
          IsRefundable: liveRoom.IsRefundable ?? true,
          DayRates: liveRoom.DayRates || [],
          Description: liveRoom.RoomDescription || "",
          Amenities: Array.isArray(liveRoom.Amenities) ? liveRoom.Amenities : []
        };
      });
      
      booking.hotelRequest.selectedRoom.rawRoomData = normalizedRoomsRaw;
      booking.hotelRequest.selectedRoom.roomTypeName = liveRooms[0].RoomTypeName;
      booking.hotelRequest.selectedRoom.inclusion = liveRooms[0].Inclusion || liveRooms[0].Inclusions;
      booking.hotelRequest.selectedRoom.mealType = normalizedRoomsRaw[0].MealType;
      booking.hotelRequest.selectedRoom.isRefundable = liveRooms[0].IsRefundable;
      
      // Mark selectedRoom as modified for mongoose to pick up changes
      booking.markModified("hotelRequest.selectedRoom");
    }
  } catch (err) {
    console.error("FAILED TO FETCH LIVE TBO BOOKED DETAILS:", err.message);
    logger.error("FAILED TO FETCH LIVE TBO BOOKED DETAILS:", err);
  }

  /* =====================================================
     ✅ STEP 4: PDF CACHE BYPASS (DISABLED PER USER REQUEST)
  ====================================================== */
  // Caching disabled: We generate a fresh PDF on every single download request.

  /* =====================================================
     ✅ STEP 5: CALL TBO ONLY IF NOT VOUCHERED
  ====================================================== */

  let voucherResp = booking.voucher?.raw || null;

  // STRICT BYPASS: If executionStatus is already voucher_generated, or the voucher raw response is already stored,
  // do NOT call the live TBO API! We will compile the PDF directly using the cached data.
  if (booking.executionStatus === "voucher_generated" || voucherResp) {
    if (!voucherResp) {
      // Fallback: If raw is empty but it was vouchered, reconstruct from BookResult
      const rawResponse = booking.bookingResult?.providerResponse || {};
      const bookResult = rawResponse.BookResult || rawResponse || {};
      voucherResp = bookResult;
    }
  } else {
    // This is the FIRST time downloading/generating the voucher!
    const rawResponse = booking.bookingResult?.providerResponse || {};
    const bookResult = rawResponse.BookResult || rawResponse || {};
    const bookingIdTBO = bookResult?.BookingId;

    if (!bookingIdTBO) {
      throw new ApiError(400, "TBO BookingId not found");
    }

    // HIT TBO API ONCE ON THE FIRST REQUEST!
    const liveVoucherResp = await hotelService.generateVoucher({
      BookingId: bookingIdTBO,
      EndUserIp: process.env.TBO_END_USER_IP,
    });

    const result = liveVoucherResp?.GenerateVoucherResult || liveVoucherResp;

    if (!result?.VoucherStatus) {
      throw new ApiError(500, result?.Error?.ErrorMessage || "Voucher failed");
    }

    // Save the raw response and confirmation details back to DB
    booking.voucher = {
      bookingRefNo: result.BookingRefNo || bookResult.BookingRefNo,
      confirmationNo: result.ConfirmationNo || bookResult.ConfirmationNo,
      invoiceNumber: result.InvoiceNumber || null,
      raw: result,
      filePath: ""
    };
    voucherResp = result;
  }

  /* =====================================================
     ✅ STEP 6: GENERATE PDF
  ====================================================== */

  const filePath = await pdfService.generateHotelVoucher(booking);

  // Initialize voucher structure if not present
  if (!booking.voucher) {
    booking.voucher = {};
  }
  booking.voucher.filePath = ""; // Caching disabled: do not persist file path in database
  booking.executionStatus = "voucher_generated";
  booking.voucheredAt = new Date();

  await booking.save();

  /* =====================================================
     ✅ STEP 7: DIRECT DOWNLOAD & CLEANUP (BEST UX)
  ====================================================== */

  return res.download(filePath, (err) => {
    if (err) {
      console.error("Voucher download completed with response check:", err.message);
    }
    // Delete temporary PDF from disk immediately after serving to avoid disk storage leaks
    const fs = require("fs");
    fs.unlink(filePath, (unlinkErr) => {
      if (unlinkErr && unlinkErr.code !== 'ENOENT') {
        console.error("Failed to delete temporary voucher PDF:", unlinkErr.message);
      }
    });
  });
});

exports.getProjectHotelExpenses = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  if (!projectId) {
    throw new ApiError(400, "Project ID is required");
  }

  const query = {
    corporateId: req.user.corporateId,
    executionStatus: "voucher_generated",
  };

  if (projectId !== "all") {
    query.projectId = projectId;
  }

  const expenses = await HotelBookingRequest.find(query)
    .select(
      "_id userId executionStatus status cancelStatus amendment.status hotelRequest.purposeOfTravel pricingSnapshot.totalAmount bookingSnapshot.amount bookingSnapshot.hotelName hotelRequest.selectedHotel.hotelName hotelRequest.city hotelRequest.cityName hotelRequest.selectedHotel.city hotelRequest.selectedHotel.cityName bookingSnapshot.city createdAt orderId travellers bookingType"
    )
    .populate("userId", "name email")
    .sort({ createdAt: -1 });

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        expenses,
        "Project hotel expenses fetched successfully",
      ),
    );
});
