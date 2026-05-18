const express = require("express");
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const { getUnifiedAuditLogs } = require("../controllers/adminAuditController");

const router = express.Router();

router.get("/", verifyToken, verifyAdmin, getUnifiedAuditLogs);

module.exports = router;
