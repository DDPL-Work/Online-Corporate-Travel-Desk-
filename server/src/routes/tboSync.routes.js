const router = require("express").Router();
const tboSyncCtrl = require("../controllers/tboSync.controller");
const { verifyToken, authorizeRoles } = require("../middleware/auth.middleware");

// PUBLIC ROUTES
router.get("/search-cities", tboSyncCtrl.searchCities);
router.get("/search-hotels", tboSyncCtrl.searchHotelsLocally);

// ROUTES (Now Public)
router.get("/sync-status", tboSyncCtrl.getSyncStatus);
router.post("/sync-cities", tboSyncCtrl.syncAllTboCities);
router.post("/sync-hotels", tboSyncCtrl.syncAllTboHotels);
router.post("/sync-hotel-details", tboSyncCtrl.syncAllTboHotelDetails);
router.post("/master-sync", tboSyncCtrl.triggerMasterSync);

module.exports = router;
