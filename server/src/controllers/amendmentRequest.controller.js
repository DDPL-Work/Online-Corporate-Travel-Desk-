const BookingRequest = require("../models/BookingRequest");
const HotelBookingRequest = require("../models/hotelBookingRequest.model");
const User = require("../models/User");
const flightAmendmentController = require("./flightAmendment.controller");
const hotelAmendmentController = require("./hotelAmendment.controller");
const { sendNotification } = require("../services/notificationDispatcher.service");
const emailService = require("../services/email.service");

// Helper to execute TBO action
const executeTboAction = async (actionType, actionPayload) => {
  return new Promise((resolve, reject) => {
    const mockReq = { body: actionPayload };
    const mockRes = {
      status: function (code) {
        this.statusCode = code;
        return this;
      },
      json: function (data) {
        if (this.statusCode && this.statusCode >= 400) {
          reject(data);
        } else {
          resolve(data);
        }
      },
    };

    try {
      if (actionType === "fullCancellation") {
        if (actionPayload.bookingType === "flight") {
          flightAmendmentController.fullCancellation(mockReq, mockRes);
        } else {
          hotelAmendmentController.cancelBooking(mockReq, mockRes);
        }
      } else if (actionType === "partialCancellation") {
        if (actionPayload.bookingType === "flight") {
          flightAmendmentController.partialCancellation(mockReq, mockRes);
        } else {
          resolve({ success: true, message: "Partial cancellation not supported for hotels" });
        }
      } else if (actionType === "reissue") {
        resolve({ success: true, message: "Reissue initiated" });
      } else {
        reject({ message: "Unknown action type" });
      }
    } catch (error) {
      reject({ message: error.message });
    }
  });
};

const getModel = (bookingType) => {
  return bookingType === "hotel" ? HotelBookingRequest : BookingRequest;
};

exports.sendRequestToManager = async (req, res) => {
  try {
    const { bookingId, bookingType, actionType, actionPayload, requesterComments } = req.body;
    
    if (!bookingType) {
      return res.status(400).json({ success: false, message: "bookingType is required (flight or hotel)" });
    }

    const Model = getModel(bookingType);
    const booking = await Model.findById(bookingId).populate("corporateId");
    
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const managerId = booking.approverId || null;
    if (!managerId) {
      return res.status(400).json({ success: false, message: "No manager assigned to this booking" });
    }

    const travelAdmin = await User.findOne({
      corporateId: booking.corporateId._id,
      role: "travel-admin",
    });
    const travelAdminId = travelAdmin ? travelAdmin._id : null;

    const managerIsAdmin = managerId.toString() === (travelAdminId && travelAdminId.toString());

    booking.amendment = {
      ...booking.amendment,
      type: actionType,
      amendmentType: actionType === "fullCancellation" || actionType === "partialCancellation" ? "cancellation" : "amendment",
      actionPayload,
      managerId,
      travelAdminId,
      managerStatus: managerIsAdmin ? "not_required" : "pending",
      adminStatus: "pending",
      overallStatus: "pending",
      requesterComments,
      status: "requested"
    };

    await booking.save();

    res.status(201).json({
      success: true,
      message: "Amendment request sent to manager for approval",
      data: booking.amendment,
    });

    if (managerId) {
      const manager = await User.findById(managerId);
      if (manager) {
        sendNotification({
          recipient: managerId,
          recipientRole: "manager",
          title: "New Amendment Request",
          message: `An amendment request (${actionType}) has been submitted for booking ${booking.orderId || booking.bookingReference} and requires your approval.`,
          type: "amendment_request",
          relatedId: booking._id,
          corporateId: booking.corporateId._id
        });
        if (manager.email) {
          emailService.sendEmail({
            to: manager.email,
            subject: "Action Required: New Amendment Request",
            html: `<p>Dear ${manager.name?.firstName || "Manager"},</p><p>An amendment request (${actionType}) has been submitted for booking <b>${booking.orderId || booking.bookingReference}</b> and requires your approval.</p>`
          }).catch(err => console.error("Email error:", err));
        }
      }
    }

    const employee = await User.findById(booking.userId);
    if (employee) {
      sendNotification({
        recipient: booking.userId,
        recipientRole: "employee",
        title: "Amendment Request Submitted",
        message: `Your amendment request for booking ${booking.orderId || booking.bookingReference} has been sent to your manager.`,
        type: "amendment_request",
        relatedId: booking._id,
        corporateId: booking.corporateId._id
      });
      if (employee.email) {
        emailService.sendEmail({
          to: employee.email,
          subject: "Amendment Request Submitted",
          html: `<p>Dear ${employee.name?.firstName || "Employee"},</p><p>Your amendment request for booking <b>${booking.orderId || booking.bookingReference}</b> has been successfully submitted and is awaiting manager approval.</p>`
        }).catch(err => console.error("Email error:", err));
      }
    }
  } catch (error) {
    console.error("Send Request To Manager Error:", error);
    res.status(500).json({ success: false, message: "Failed to send amendment request to manager" });
  }
};

exports.sendRequestToAdmin = async (req, res) => {
  try {
    const { bookingId, bookingType, actionType, actionPayload, requesterComments } = req.body;
    
    if (!bookingType) {
      return res.status(400).json({ success: false, message: "bookingType is required (flight or hotel)" });
    }

    const Model = getModel(bookingType);
    const booking = await Model.findById(bookingId).populate("corporateId");
    
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const managerId = booking.approverId || null;

    const travelAdmin = await User.findOne({
      corporateId: booking.corporateId._id,
      role: "travel-admin",
    });
    const travelAdminId = travelAdmin ? travelAdmin._id : null;

    if (!managerId) {
      // Execute directly
      const result = await executeTboAction(actionType, actionPayload);
      
      booking.amendment = {
         ...booking.amendment,
         type: actionType,
         amendmentType: actionType === "fullCancellation" || actionType === "partialCancellation" ? "cancellation" : "amendment",
         status: "approved", // auto approved
         overallStatus: "completed",
         actionPayload,
         response: result
      };
      await booking.save();
      
      return res.status(200).json({ success: true, data: result, message: "Executed directly" });
    } else {
      booking.amendment = {
        ...booking.amendment,
        type: actionType,
        amendmentType: actionType === "fullCancellation" || actionType === "partialCancellation" ? "cancellation" : "amendment",
        actionPayload,
        managerId,
        travelAdminId,
        managerStatus: "not_required",
        adminStatus: "pending",
        overallStatus: "pending",
        requesterComments,
        status: "requested"
      };

      await booking.save();

      res.status(201).json({
        success: true,
        message: "Amendment request sent to travel admin for approval",
        data: booking.amendment,
      });

      if (travelAdminId) {
        const adminUser = await User.findById(travelAdminId);
        if (adminUser) {
          sendNotification({
            recipient: travelAdminId,
            recipientRole: "travel-admin",
            title: "New Amendment Request",
            message: `An amendment request (${actionType}) is pending your processing for booking ${booking.orderId || booking.bookingReference}.`,
            type: "amendment_request",
            relatedId: booking._id,
            corporateId: booking.corporateId._id
          });
          if (adminUser.email) {
            emailService.sendEmail({
              to: adminUser.email,
              subject: "Action Required: Amendment Request to Process",
              html: `<p>Dear Travel Admin,</p><p>An amendment request (${actionType}) is pending your processing for booking <b>${booking.orderId || booking.bookingReference}</b>.</p>`
            }).catch(err => console.error("Email err:", err));
          }
        }
      }

      const employee = await User.findById(booking.userId);
      if (employee) {
        sendNotification({
          recipient: booking.userId,
          recipientRole: "employee",
          title: "Amendment Request with Travel Admin",
          message: `Your amendment request for booking ${booking.orderId || booking.bookingReference} is now with the Travel Admin.`,
          type: "amendment_request",
          relatedId: booking._id,
          corporateId: booking.corporateId._id
        });
      }
    }
  } catch (error) {
    console.error("Send Request To Admin Error:", error);
    res.status(500).json({ success: false, message: "Failed to send amendment request to admin" });
  }
};

exports.getManagerRequests = async (req, res) => {
  try {
    const managerId = req.user._id;
    
    const flightRequests = await BookingRequest.find({
      "amendment.managerId": managerId,
      "amendment.managerStatus": "pending",
    }).populate("userId", "firstName lastName email").sort({ updatedAt: -1 });

    const hotelRequests = await HotelBookingRequest.find({
      "amendment.managerId": managerId,
      "amendment.managerStatus": "pending",
    }).populate("userId", "firstName lastName email").sort({ updatedAt: -1 });

    const requests = [...flightRequests, ...hotelRequests].sort((a, b) => b.updatedAt - a.updatedAt);

    res.status(200).json({ success: true, data: requests });
  } catch (error) {
    console.error("Get Manager Requests Error:", error);
    res.status(500).json({ success: false, message: "Failed to get manager requests" });
  }
};

exports.getAdminRequests = async (req, res) => {
  try {
    const corporateId = req.user.corporateId;
    
    const query = {
      corporateId,
      "amendment.adminStatus": "pending",
      $or: [
        { "amendment.managerStatus": "approved" },
        { "amendment.managerStatus": "not_required" }
      ]
    };
    
    const flightRequests = await BookingRequest.find(query)
      .populate("userId", "firstName lastName email")
      .sort({ updatedAt: -1 });

    const hotelRequests = await HotelBookingRequest.find(query)
      .populate("userId", "firstName lastName email")
      .sort({ updatedAt: -1 });
      
    const requests = [...flightRequests, ...hotelRequests].sort((a, b) => b.updatedAt - a.updatedAt);

    res.status(200).json({ success: true, data: requests });
  } catch (error) {
    console.error("Get Admin Requests Error:", error);
    res.status(500).json({ success: false, message: "Failed to get admin requests" });
  }
};

exports.approveRequest = async (req, res) => {
  try {
    const { bookingId, bookingType, comments } = req.body;
    const userId = req.user._id;
    const role = req.user.role; // manager or travel-admin

    if (!bookingType) {
      return res.status(400).json({ success: false, message: "bookingType is required" });
    }

    const Model = getModel(bookingType);
    const request = await Model.findById(bookingId);
    
    if (!request || !request.amendment || request.amendment.overallStatus === "not_requested") {
      return res.status(404).json({ message: "Amendment Request not found" });
    }

    if (role === "manager" && request.amendment.managerStatus === "pending") {
      request.amendment.managerStatus = "approved";
      request.amendment.managerComments = comments;
      await request.save();

      const employee = await User.findById(request.userId);
      if (employee) {
        sendNotification({
          recipient: request.userId,
          recipientRole: "employee",
          title: "Amendment Approved by Manager",
          message: `Your amendment request for booking ${request.orderId || request.bookingReference} has been approved by your manager and forwarded to Travel Admin.`,
          type: "amendment_request",
          relatedId: request._id,
          corporateId: request.corporateId
        });
        if (employee.email) {
          emailService.sendEmail({
            to: employee.email,
            subject: "Amendment Request Approved by Manager",
            html: `<p>Dear ${employee.name?.firstName || "Employee"},</p><p>Your amendment request for booking <b>${request.orderId || request.bookingReference}</b> has been approved by your manager and is now with the Travel Admin.</p>`
          }).catch(err => console.error("Email err:", err));
        }
      }
      if (request.amendment.travelAdminId) {
        const adminUser = await User.findById(request.amendment.travelAdminId);
        if (adminUser) {
          sendNotification({
            recipient: request.amendment.travelAdminId,
            recipientRole: "travel-admin",
            title: "New Amendment Request",
            message: `An amendment request is pending your processing for booking ${request.orderId || request.bookingReference}.`,
            type: "amendment_request",
            relatedId: request._id,
            corporateId: request.corporateId
          });
          if (adminUser.email) {
            emailService.sendEmail({
              to: adminUser.email,
              subject: "Action Required: Amendment Request to Process",
              html: `<p>Dear Travel Admin,</p><p>A manager has approved an amendment request for booking <b>${request.orderId || request.bookingReference}</b>. Please process it.</p>`
            }).catch(e=>console.error(e));
          }
        }
      }

      return res.status(200).json({ success: true, message: "Manager approved" });
    }

    if (role === "travel-admin" && request.amendment.adminStatus === "pending") {
      request.amendment.adminStatus = "approved";
      request.amendment.overallStatus = "approved";
      request.amendment.adminComments = comments;

      // Execute actual action
      try {
        const result = await executeTboAction(request.amendment.type, request.amendment.actionPayload);
        
        request.amendment.status = "completed";
        request.amendment.response = result;
        await request.save();

        const employee = await User.findById(request.userId);
        if (employee) {
          sendNotification({
            recipient: request.userId,
            recipientRole: "employee",
            title: "Amendment Processed",
            message: `Your amendment request for booking ${request.orderId || request.bookingReference} has been fully processed by the Travel Admin.`,
            type: "amendment_request",
            relatedId: request._id,
            corporateId: request.corporateId
          });
          if (employee.email) {
            emailService.sendEmail({
              to: employee.email,
              subject: "Amendment Processed successfully",
              html: `<p>Dear ${employee.name?.firstName || "Employee"},</p><p>Your amendment request for booking <b>${request.orderId || request.bookingReference}</b> has been successfully processed.</p>`
            }).catch(e=>console.error(e));
          }
        }

        return res.status(200).json({ success: true, message: "Admin approved and executed", data: result });
      } catch (err) {
        request.amendment.overallStatus = "failed";
        request.amendment.adminStatus = "pending";
        request.amendment.status = "failed";
        console.error("Execution failed:", err);
        return res.status(500).json({ success: false, message: "Execution failed", error: err });
      }
    }

    res.status(400).json({ success: false, message: "Invalid approval action" });
  } catch (error) {
    console.error("Approve Request Error:", error);
    res.status(500).json({ success: false, message: "Failed to approve request" });
  }
};

exports.rejectRequest = async (req, res) => {
  try {
    const { bookingId, bookingType, comments } = req.body;
    const role = req.user.role;

    if (!bookingType) {
      return res.status(400).json({ success: false, message: "bookingType is required" });
    }

    const Model = getModel(bookingType);
    const request = await Model.findById(bookingId);
    
    if (!request || !request.amendment) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (role === "manager") {
      request.amendment.managerStatus = "rejected";
      request.amendment.managerComments = comments;
    } else if (role === "travel-admin") {
      request.amendment.adminStatus = "rejected";
      request.amendment.adminComments = comments;
    }

    request.amendment.overallStatus = "rejected";
    request.amendment.status = "rejected";
    await request.save();

    const employee = await User.findById(request.userId);
    if (employee) {
      sendNotification({
        recipient: request.userId,
        recipientRole: "employee",
        title: "Amendment Request Rejected",
        message: `Your amendment request for booking ${request.orderId || request.bookingReference} was rejected.`,
        type: "amendment_request",
        relatedId: request._id,
        corporateId: request.corporateId
      });
      if (employee.email) {
        emailService.sendEmail({
          to: employee.email,
          subject: "Amendment Request Rejected",
          html: `<p>Dear ${employee.name?.firstName || "Employee"},</p><p>Your amendment request for booking <b>${request.orderId || request.bookingReference}</b> has been rejected.</p><p>Reason: ${comments || "Not provided"}</p>`
        }).catch(e=>console.error(e));
      }
    }

    res.status(200).json({ success: true, message: "Request rejected" });
  } catch (error) {
    console.error("Reject Request Error:", error);
    res.status(500).json({ success: false, message: "Failed to reject request" });
  }
};
