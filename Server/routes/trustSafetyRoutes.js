const express = require("express");
const { verifyOptionalToken, verifyToken } = require("../middleware/auth");
const {
  getMyRiskProfile,
  getTrustPolicies,
  submitAppeal,
  submitReport,
} = require("../controllers/trustSafetyController");

const router = express.Router();

router.get("/policies", getTrustPolicies);
router.post("/reports", verifyOptionalToken, submitReport);
router.post("/appeals", verifyToken, submitAppeal);
router.get("/risk/me", verifyToken, getMyRiskProfile);

module.exports = router;
