// server/src/routes/contactLead.routes.js
const express = require("express");
const router = express.Router();

const {
  submitContactLead,
  getAllLeads,
  updateLeadStatus,
} = require("../controllers/contactLead.controller");

const { verifyToken } = require("../middleware/auth.middleware");

// ─── PUBLIC ───────────────────────────────────────────────────────────────────
// POST /api/v1/contact-leads/submit
// Called from the Traveamer landing page contact form — no auth required
router.post("/submit", submitContactLead);

// ─── PROTECTED (Super-Admin / Ops) ────────────────────────────────────────────
// GET  /api/v1/contact-leads?status=new&page=1&limit=20
router.get("/", verifyToken, getAllLeads);

// PATCH /api/v1/contact-leads/:id/status
router.patch("/:id/status", verifyToken, updateLeadStatus);

module.exports = router;
