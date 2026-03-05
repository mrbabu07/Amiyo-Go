const express = require("express");
const router = express.Router();
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const { getFinanceOverview } = require("../controllers/adminFinanceController");

router.get("/overview", verifyToken, verifyAdmin, getFinanceOverview);

module.exports = router;
