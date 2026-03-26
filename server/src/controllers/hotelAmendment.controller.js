//server\src\controllers\hotelAmendment.controller.js
const hotelAmendmentService = require("../services/tektravels/hotelAmendment.service");
const HotelBookingRequest = require("../models/hotelBookingRequest.model");

exports.amendHotelBooking = async (req, res) => {
  try {
    const { bookingId, remarks } = req.body;

    /* 1. FETCH BOOKING FROM DB */
    const booking = await HotelBookingRequest.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (
      booking.amendment?.status === "requested" ||
      booking.amendment?.status === "in_progress"
    ) {
      return res.status(400).json({
        success: false,
        message: "Amendment already in progress",
      });
    }

    /* 2. VALIDATION */
    if (booking.executionStatus !== "voucher_generated") {
      return res.status(400).json({
        success: false,
        message: "Only booked hotels can be amended",
      });
    }

    /* 3. CALL TBO */
    /* 🔥 GET CORRECT TBO BOOKING ID */
    const providerBookingId =
      booking.bookingResult?.providerResponse?.BookResult?.BookingId;

    if (!providerBookingId) {
      return res.status(400).json({
        success: false,
        message: "Provider BookingId not found",
      });
    }

    const response = await hotelAmendmentService.sendChangeRequest({
      BookingId: Number(providerBookingId),
      Remarks: remarks,
      RequestType: 4,
    });

    /* 🔥 VALIDATE TBO RESPONSE */
    const isSuccess = response?.HotelChangeRequestResult?.ResponseStatus === 1;

    if (!isSuccess) {
      const errMsg =
        response?.HotelChangeRequestResult?.Error?.ErrorMessage ||
        "TBO amendment failed";

      return res.status(400).json({
        success: false,
        message: errMsg,
        raw: response,
      });
    }

    /* 4. EXTRACT CHANGE REQUEST ID */
    const changeRequestId = response?.HotelChangeRequestResult?.ChangeRequestId;

    if (!changeRequestId) {
      throw new Error("No ChangeRequestId received from TBO");
    }

    /* 5. SAVE IN DB */
    booking.amendment = {
      changeRequestId,
      status: "requested",
      remarks,
      requestedAt: new Date(),
      providerResponse: response,
    };

    await booking.save();

    res.json({
      success: true,
      message: "Amendment request sent successfully",
      data: {
        changeRequestId,
        response,
      },
    });
  } catch (err) {
    console.error("AMEND ERROR:", err);

    if (booking) {
      booking.amendment = {
        status: "failed",
        remarks,
        requestedAt: new Date(),
        providerResponse: err?.response?.data || err.message,
      };

      await booking.save();
    }

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* GET STATUS */
exports.getAmendmentStatus = async (req, res) => {
  try {
    const { bookingId } = req.body;

    /* 1. FETCH BOOKING */
    const booking = await HotelBookingRequest.findById(bookingId);

    if (!booking || !booking.amendment?.changeRequestId) {
      return res.status(404).json({
        success: false,
        message: "Amendment not found",
      });
    }

    /* 2. CALL TBO STATUS API */
    const response = await hotelAmendmentService.getChangeRequestStatus({
      ChangeRequestId: booking.amendment.changeRequestId,
    });

    /* 3. MAP STATUS */
    let status = booking.amendment.status || "requested";

    const tboStatus = response?.HotelChangeRequestResult?.ChangeRequestStatus;

    if (tboStatus !== undefined && tboStatus !== null) {
      if (tboStatus === 0 || tboStatus === "Requested") status = "requested";
      else if (tboStatus === 1 || tboStatus === "InProgress")
        status = "in_progress";
      else if (tboStatus === 2 || tboStatus === "Processed")
        status = "approved";
      else if (tboStatus === 3 || tboStatus === "Rejected") status = "rejected";
    } else {
      console.warn("TBO status not available yet");
    }

    /* 4. UPDATE DB */
    booking.amendment.status = status;
    booking.amendment.lastCheckedAt = new Date();
    booking.amendment.providerResponse = response;

    await booking.save();

    res.json({
      success: true,
      data: {
        status,
        response,
      },
    });
  } catch (err) {
    console.error("STATUS ERROR:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
