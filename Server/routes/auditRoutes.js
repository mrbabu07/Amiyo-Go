const express = require("express");
const { verifyToken, verifyAdmin } = require("../middleware/auth");

const router = express.Router();

router.get("/", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const AuditLog = req.app.locals.models.AuditLog;
    const result = await AuditLog.findAll(req.query);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
