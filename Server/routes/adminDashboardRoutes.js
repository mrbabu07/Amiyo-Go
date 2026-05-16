const express = require("express");
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const adminDashboardController = require("../controllers/adminDashboardController");

const router = express.Router();

router.get("/overview", verifyToken, verifyAdmin, adminDashboardController.getAdminDashboardOverview);

module.exports = router;
