// server/src/routes/ssrPolicy.routes.js

const router = require("express").Router();
const { verifyToken } = require("../middleware/auth.middleware");
const ssrPolicyController = require("../controllers/ssrPolicy.controller");

// All routes require authentication
router.use(verifyToken);

// ── Admin routes ─────────────────────────────────────────────────────────────
// Upsert (create or update) a policy for an employee
router.post("/", ssrPolicyController.upsertPolicy);

// List all policies for the corporate
router.get("/", ssrPolicyController.listPolicies);

// Fetch a single policy by employee email  ?email=...
router.get("/by-email", ssrPolicyController.getPolicyByEmail);

// Delete a policy by _id
router.delete("/:id", ssrPolicyController.deletePolicy);

// ── Employee/SSR modal route ─────────────────────────────────────────────────
// Employee fetches their own policy when SSR modal opens
router.get("/my-policy", ssrPolicyController.getMyPolicy);

// Backend SSR validation (called before booking is saved)
router.post("/validate-ssr", ssrPolicyController.validateSsrSelections);

module.exports = router;
