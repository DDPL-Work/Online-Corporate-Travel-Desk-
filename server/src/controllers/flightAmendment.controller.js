const amendmentService = require("../services/tektravels/flightAmendment.service");

/**
 * 1️⃣ GET CANCELLATION CHARGES
 */
exports.getCancellationCharges = async (req, res) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({ message: "bookingId is required" });
    }

    const result = await amendmentService.getCancellationCharges(bookingId);

    return res.json(result);
  } catch (error) {
    console.error("Cancellation Charges Error:", error.message);
    return res.status(500).json({ message: "Failed to fetch charges" });
  }
};

/**
 * 2️⃣ FULL CANCELLATION
 */
exports.fullCancellation = async (req, res) => {
  try {
    const { bookingId, remarks } = req.body;

    const result = await amendmentService.sendChangeRequest({
      BookingId: bookingId,
      RequestType: 1,
      CancellationType: 1,
      Remarks: remarks || "Full cancellation",
    });

    return res.json(result);
  } catch (error) {
    console.error("Full Cancellation Error:", error.message);
    return res.status(500).json({ message: "Cancellation failed" });
  }
};

/**
 * 3️⃣ PARTIAL CANCELLATION
 */
exports.partialCancellation = async (req, res) => {
  try {
    const { bookingId, passengerIds, segments, remarks } = req.body;

    if (!passengerIds || passengerIds.length === 0) {
      return res.status(400).json({ message: "PassengerIds required" });
    }

    const result = await amendmentService.sendChangeRequest({
      BookingId: bookingId,
      RequestType: 1,
      CancellationType: 1,
      PassengerIds: passengerIds,
      Segments: segments,
      Remarks: remarks || "Partial cancellation",
    });

    return res.json(result);
  } catch (error) {
    console.error("Partial Cancellation Error:", error.message);
    return res.status(500).json({ message: "Partial cancellation failed" });
  }
};

/**
 * 4️⃣ DATE / SECTOR CHANGE (Amendment)
 */
exports.amendBooking = async (req, res) => {
  try {
    const { bookingId, remarks, segments } = req.body;

    const result = await amendmentService.sendChangeRequest({
      BookingId: bookingId,
      RequestType: 2,
      Remarks: remarks || "Date change request",
      Segments: segments,
    });

    return res.json(result);
  } catch (error) {
    console.error("Amendment Error:", error.message);
    return res.status(500).json({ message: "Amendment failed" });
  }
};

/**
 * 5️⃣ CHECK CHANGE REQUEST STATUS
 */
exports.getChangeStatus = async (req, res) => {
  try {
    const { changeRequestId } = req.body;

    if (!changeRequestId) {
      return res.status(400).json({ message: "changeRequestId required" });
    }

    const result = await amendmentService.getChangeRequestStatus({
      ChangeRequestId: changeRequestId,
    });

    return res.json(result);
  } catch (error) {
    console.error("Change Status Error:", error.message);
    return res.status(500).json({ message: "Failed to get status" });
  }
};

/**
 * 6️⃣ RELEASE PNR (Unticketed only)
 */
exports.releasePNR = async (req, res) => {
  try {
    const { bookingId } = req.body;

    const result = await amendmentService.releasePnr({
      BookingId: bookingId,
    });

    return res.json(result);
  } catch (error) {
    console.error("Release PNR Error:", error.message);
    return res.status(500).json({ message: "Release failed" });
  }
};
