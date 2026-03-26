const { default: mongoose } = require("mongoose");
const BookingRequest = require("../models/BookingRequest");
const HotelBooking = require("../models/hotelBookingRequest.model"); // if separate model exists

/**
 * ============================================================
 * 🛡️ COMMON ADMIN VALIDATION
 * ============================================================
 */
const validateTravelAdmin = (req) => {
  if (!req.user || req.user.role !== "travel-admin") {
    const error = new Error("Access denied. Travel Admin only.");
    error.statusCode = 403;
    throw error;
  }

  if (!req.user.corporateId) {
    const error = new Error("Corporate context missing (SSO failure)");
    error.statusCode = 400;
    throw error;
  }

  return req.user.corporateId;
};

/**
 * ============================================================
 * ✈️ FETCH ALL FLIGHT BOOKINGS (ADMIN - SSO SCOPED)
 * ============================================================
 */
exports.getAllFlightBookingsAdmin = async (req, res) => {
  try {
    const corporateId = validateTravelAdmin(req);

    const bookings = await BookingRequest.find({
      corporateId,
      bookingType: "flight",
    })
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.error("Flight Admin Fetch Error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch flight bookings",
    });
  }
};

/**
 * ============================================================
 * 🏨 FETCH ALL HOTEL BOOKINGS (ADMIN - SSO SCOPED)
 * ============================================================
 */
exports.getAllHotelBookingsAdmin = async (req, res) => {
  try {
    const corporateId = new mongoose.Types.ObjectId(validateTravelAdmin(req));

    const bookings = await HotelBooking.find({
      corporateId,
      // bookingType: "hotel",
      requestStatus: "approved",
    })
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.error("Hotel Admin Fetch Error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch hotel bookings",
    });
  }
};

/**
 * ============================================================
 * ❌ FETCH CANCELLED / CANCELLING HOTEL BOOKINGS (ADMIN)
 * ============================================================
 */
exports.getCancelledHotelBookingsAdmin = async (req, res) => {
  try {
    const corporateId = new mongoose.Types.ObjectId(
      validateTravelAdmin(req)
    );

    const bookings = await HotelBooking.find({
      corporateId,
      requestStatus: "approved",

      // ✅ CORRECT LOGIC (BASED ON YOUR DB)
      $or: [
        {
          executionStatus: {
            $in: ["failed", "cancelled"],
          },
        },
        {
          "amendment.status": "requested",
        },
      ],
    })
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.error("Cancelled Hotel Fetch Error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.message || "Failed to fetch cancelled hotel bookings",
    });
  }
};


// Manager Onboarding process

