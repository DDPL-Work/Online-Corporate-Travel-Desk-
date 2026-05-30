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

module.exports = router;
