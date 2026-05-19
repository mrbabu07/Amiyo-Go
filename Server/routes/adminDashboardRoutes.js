const express = require("express");
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const adminDashboardController = require("../controllers/adminDashboardController");

const router = express.Router();

router.get("/overview", verifyToken, verifyAdmin, adminDashboardController.getAdminDashboardOverview);
router.get("/operations", verifyToken, verifyAdmin, adminDashboardController.getAdminOperationsOverview);
router.get("/cases/:caseKey", verifyToken, verifyAdmin, adminDashboardController.getAdminCaseAssignment);
router.patch("/cases/:caseKey", verifyToken, verifyAdmin, adminDashboardController.updateAdminCaseAssignment);

module.exports = router;
