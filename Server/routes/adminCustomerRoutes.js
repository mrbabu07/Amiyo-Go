const express = require("express");
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const {
  adjustCustomerLoyalty,
  getCustomerAuditLog,
  getCustomerDetail,
  getCustomerList,
  getCustomerLoyaltyLedger,
  getLoyaltyProgram,
  getReferralDashboard,
  mergeDuplicateCustomers,
  updateCustomerStatus,
  updateLoyaltyProgram,
} = require("../controllers/adminCustomerController");

const router = express.Router();

router.get("/", verifyToken, verifyAdmin, getCustomerList);
router.post("/merge", verifyToken, verifyAdmin, mergeDuplicateCustomers);
router.get("/referrals", verifyToken, verifyAdmin, getReferralDashboard);
router.get("/loyalty-program", verifyToken, verifyAdmin, getLoyaltyProgram);
router.put("/loyalty-program", verifyToken, verifyAdmin, updateLoyaltyProgram);
router.get("/audit-log", verifyToken, verifyAdmin, getCustomerAuditLog);

router.get("/:customerId", verifyToken, verifyAdmin, getCustomerDetail);
router.patch("/:customerId/status", verifyToken, verifyAdmin, updateCustomerStatus);
router.get("/:customerId/loyalty", verifyToken, verifyAdmin, getCustomerLoyaltyLedger);
router.post("/:customerId/loyalty/adjust", verifyToken, verifyAdmin, adjustCustomerLoyalty);

module.exports = router;
