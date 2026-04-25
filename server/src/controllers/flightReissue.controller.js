const FlightReissueRequest = require("../models/FlightReissueRequest");
const BookingRequest = require("../models/BookingRequest");
const amendmentService = require("../services/tektravels/flightAmendment.service");

/* ======================================================
   🔧 HELPER: GENERATE REISSUE ID
====================================================== */
const generateReissueId = async () => {
  const count = await FlightReissueRequest.countDocuments();
  return `RE-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;
};

/* ======================================================
   1️⃣ CREATE REISSUE REQUEST (User/Employee)
====================================================== */
exports.createReissueRequest = async (req, res) => {
  try {
    const {
      bookingId,
      bookingReference,
      reissueType,
      reason,
      segments,
      passengers,
      corporate,
      bookingSnapshot,
      user
    } = req.body;

    // 1. Validation
    if (!bookingId || !bookingReference || !reissueType || !reason) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (bookingId, bookingReference, reissueType, reason)"
      });
    }

    // 2. Check if booking exists and is ticketed (status check)
    const booking = await BookingRequest.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Only allow reissue for ticketed/confirmed bookings
    if (booking.status !== "confirmed" && booking.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Only confirmed or completed bookings can be reissued."
      });
    }

    // 3. Prevent duplicate PENDING requests
    const existing = await FlightReissueRequest.findOne({
      bookingId,
      status: "PENDING"
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "A pending reissue request already exists for this booking."
      });
    }

    // 4. Create request
    const reissueId = await generateReissueId();
    
    const request = await FlightReissueRequest.create({
      bookingId,
      bookingReference,
      reissueId,
      reissueType,
      reason,
      segments: segments || [],
      passengers: passengers || [],
      corporate: corporate || {},
      bookingSnapshot: bookingSnapshot || {},
      user: user || {},
      logs: [{
        action: "CREATED",
        by: user?.name || "User",
        message: "Reissue request submitted"
      }]
    });

    return res.status(201).json({
      success: true,
      message: "Reissue request submitted successfully",
      data: request
    });

  } catch (error) {
    console.error("Create Reissue Request Error:", error.message);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/* ======================================================
   2️⃣ GET REISSUE REQUESTS (Generic with filters)
====================================================== */
exports.getReissueRequests = async (req, res) => {
  try {
    const { 
      status, 
      companyId, 
      employeeId, 
      userId,
      page = 1, 
      limit = 10 
    } = req.query;

    const query = {};
    if (status) query.status = status;
    if (companyId) query["corporate.companyId"] = companyId;
    if (employeeId) query["corporate.employeeId"] = employeeId;
    if (userId) query["user.id"] = userId;

    const skip = (page - 1) * limit;
    
    const requests = await FlightReissueRequest.find(query)
      .populate("bookingId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await FlightReissueRequest.countDocuments(query);

    return res.json({
      success: true,
      data: requests,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error("Get Reissue Requests Error:", error.message);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/* ======================================================
   3️⃣ UPDATE REISSUE STATUS (Approve/Reject - Corp Admin)
====================================================== */
exports.updateReissueStatus = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, message, actionBy, actionByName } = req.body;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const request = await FlightReissueRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    if (request.status !== "PENDING") {
      return res.status(400).json({ 
        success: false, 
        message: `Request is already ${request.status}` 
      });
    }

    request.status = status;
    request.resolution = {
      actionBy,
      actionByName,
      actionAt: new Date(),
      message: message || `Request ${status.toLowerCase()} by admin`
    };

    request.logs.push({
      action: status,
      by: actionByName || "Admin",
      message: message || `Request ${status.toLowerCase()}`
    });

    await request.save();

    return res.json({
      success: true,
      message: `Request ${status.toLowerCase()} successfully`,
      data: request
    });

  } catch (error) {
    console.error("Update Reissue Status Error:", error.message);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/* ======================================================
   4️⃣ EXECUTE REISSUE (Final TBO Call - Super Admin)
====================================================== */
exports.executeReissue = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { actionBy, actionByName, remarks } = req.body;

    const request = await FlightReissueRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    if (request.status !== "APPROVED") {
      return res.status(400).json({ 
        success: false, 
        message: "Only approved requests can be executed." 
      });
    }

    const booking = await BookingRequest.findById(request.bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Original booking not found" });
    }

    // TBO Logic (extracted from flightAmendment.controller)
    const extractBookingId = (b) => {
        return b?.bookingResult?.providerResponse?.Response?.Response?.FlightItinerary?.BookingId ||
               b?.bookingResult?.onwardResponse?.raw?.Response?.Response?.FlightItinerary?.BookingId ||
               b?.bookingResult?.bookingId ||
               b?.tboBookingId;
    };

    const tboBookingId = extractBookingId(booking);
    if (!tboBookingId) {
        return res.status(400).json({ success: false, message: "TBO Booking ID not found" });
    }

    const ticketIds = booking?.bookingResult?.providerResponse?.Response?.Response?.FlightItinerary?.Passenger?.map(
        (p) => p?.Ticket?.TicketId
    ).filter(Boolean) || [];

    if (!ticketIds.length) {
        return res.status(400).json({ success: false, message: "Ticket IDs not found" });
    }

    const sectors = request.segments.map(seg => ({
        Origin: seg.origin,
        Destination: seg.destination
    }));

    // 🚀 CALL TBO
    const result = await amendmentService.sendChangeRequest({
      BookingId: tboBookingId,
      RequestType: 3, // REISSUE
      TicketId: ticketIds.join(","),
      Sectors: sectors,
      Remarks: remarks || request.reason || "Reissue request"
    });

    const responseStatus = result?.Response?.ResponseStatus;
    const changeRequestId = result?.Response?.ChangeRequestId || result?.Response?.TicketCRInfo?.[0]?.ChangeRequestId;

    if (responseStatus === 1) {
        // Success
        request.status = "COMPLETED";
        request.resolution.apiResponse = result;
        request.resolution.changeRequestId = changeRequestId;
        request.resolution.executedBy = actionBy;
        request.resolution.executedAt = new Date();

        request.logs.push({
            action: "COMPLETED",
            by: actionByName || "Super Admin",
            message: "Reissue executed successfully via TBO"
        });

        // Also update the original booking's amendment history
        await BookingRequest.findByIdAndUpdate(booking._id, {
            $push: {
                amendments: {
                    amendedAt: new Date(),
                    amendedBy: actionBy,
                    changes: `Reissue (Request ${request.reissueId})`,
                    charges: 0 // Will be updated via status check later
                }
            }
        });

    } else {
        // Failed at TBO level
        request.logs.push({
            action: "EXECUTION_FAILED",
            by: actionByName || "Super Admin",
            message: result?.Response?.Error?.ErrorMessage || "TBO Execution Failed"
        });
        request.resolution.apiResponse = result;
    }

    await request.save();

    return res.json({
        success: responseStatus === 1,
        message: responseStatus === 1 ? "Reissue executed successfully" : "TBO execution failed",
        data: result
    });

  } catch (error) {
    console.error("Execute Reissue Error:", error.message);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
