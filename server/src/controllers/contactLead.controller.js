// server/src/controllers/contactLead.controller.js
const ContactLead = require("../models/ContactLead.model");
const SuperAdmin = require("../models/SuperAdmin.model");
const emailService = require("../services/email.service");

// ─── POST /api/v1/contact-leads/submit ────────────────────────────────────────
const submitContactLead = async (req, res) => {
  try {
    const { fullName, workEmail, phone, companyName, message } = req.body;

    // Basic validation
    if (!fullName || !workEmail || !phone || !companyName || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    // Capture IP address
    const ipAddress =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket?.remoteAddress ||
      "";

    const lead = await ContactLead.create({
      fullName,
      workEmail,
      phone,
      companyName,
      message,
      ipAddress,
    });

    // Send email notifications to super admins & client confirmation
    try {
      // 1. Send confirmation to client
      await emailService.sendLeadConfirmation(lead).catch(err =>
        console.error(`[ContactLead] Failed to send confirmation email to client:`, err)
      );

      // 2. Send alert to super admins
      const superAdmins = await SuperAdmin.find({}, "email").lean();
      const adminEmails = superAdmins.map(admin => admin.email).filter(Boolean);

      // Fallback email
      if (adminEmails.length === 0) {
        adminEmails.push("info.fleetiq@gmail.com");
      }

      // Send to each admin email
      for (const email of adminEmails) {
        await emailService.sendContactLeadAlert(lead, email).catch(err =>
          console.error(`[ContactLead] Failed to send email to ${email}:`, err)
        );
      }
    } catch (emailErr) {
      console.error("[ContactLead] Notification dispatch error:", emailErr);
    }

    return res.status(201).json({
      success: true,
      message: "Thank you! We'll be in touch ASAP.",
      data: { id: lead._id },
    });
  } catch (error) {
    console.error("[ContactLead] Submit error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

// ─── GET /api/v1/contact-leads (Super-Admin / Ops) ────────────────────────────
const getAllLeads = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [leads, total] = await Promise.all([
      ContactLead.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ContactLead.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: leads,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("[ContactLead] GetAll error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// ─── PATCH /api/v1/contact-leads/:id/status (Super-Admin / Ops) ───────────────
const updateLeadStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const allowed = ["new", "contacted", "converted", "closed"];
    if (status && !allowed.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status value." });
    }

    const update = {};
    if (status) update.status = status;
    if (notes !== undefined) update.notes = notes;

    const lead = await ContactLead.findByIdAndUpdate(id, update, { new: true });
    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found." });
    }

    return res.status(200).json({ success: true, data: lead });
  } catch (error) {
    console.error("[ContactLead] UpdateStatus error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

module.exports = {
  submitContactLead,
  getAllLeads,
  updateLeadStatus,
};
