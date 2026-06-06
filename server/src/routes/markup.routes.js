const router = require("express").Router();
const markupCtrl = require("../controllers/markup.controller");

// ─────────────────────────────────────────────────────────────────────────────
// AIRLINE ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/markup/airlines?search=indigo&limit=100
router.get("/airlines", markupCtrl.getAirlines);

// GET /api/markup/countries?search=india&limit=100
router.get("/countries", markupCtrl.getCountries);

// GET /api/markup/cities?search=mumbai&limit=100
router.get("/cities", markupCtrl.getCities);

// GET /api/markup/hotels?search=taj&limit=100
router.get("/hotels", markupCtrl.getHotels);
// GET /api/markup/airports?search=del&limit=100
router.get("/airports", markupCtrl.getAirports);

// ─────────────────────────────────────────────────────────────────────────────
// CRUD OPS FOR CORPORATE MARKUP
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/markup/save (Create or Update)
router.post("/save", markupCtrl.saveCorporateMarkup);

// GET /api/markup/corporate?corporateId=...&productType=flight
router.get("/corporate", markupCtrl.getCorporateMarkup);

// GET /api/markup/corporate/all?corporateId=...
router.get("/corporate/all", markupCtrl.getAllCorporateMarkups);

// DELETE /api/markup/corporate
router.delete("/corporate", markupCtrl.deleteCorporateMarkup);

// GET /api/markup/revenue
router.get("/revenue", markupCtrl.getMarkupRevenue);

// GET /api/markup/audit
router.get("/audit", markupCtrl.getBookingMarkupAudit);

module.exports = router;
