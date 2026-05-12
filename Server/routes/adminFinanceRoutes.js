const express = require("express");
const router = express.Router();
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const {
  getFinanceOverview,
  getCommissionSummary,
} = require("../controllers/adminFinanceController");

router.get("/overview", verifyToken, verifyAdmin, getFinanceOverview);
router.get("/commission-summary", verifyToken, verifyAdmin, getCommissionSummary);

module.exports = router;
