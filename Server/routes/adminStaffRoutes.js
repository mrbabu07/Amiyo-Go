const express = require("express");
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const {
  getStaffActivityLog,
  inviteStaffAccount,
  listStaffAccess,
  setupAdminTwoFactor,
  updateRoleSessionPolicy,
  updateStaffRole,
  verifyAdminTwoFactor,
} = require("../controllers/adminPlatformController");

const router = express.Router();

router.get("/", verifyToken, verifyAdmin, listStaffAccess);
router.post("/", verifyToken, verifyAdmin, inviteStaffAccount);
router.patch("/:staffId/role", verifyToken, verifyAdmin, updateStaffRole);
router.get("/activity-log", verifyToken, verifyAdmin, getStaffActivityLog);
router.post("/:staffId/2fa/setup", verifyToken, verifyAdmin, setupAdminTwoFactor);
router.post("/:staffId/2fa/verify", verifyToken, verifyAdmin, verifyAdminTwoFactor);
router.put("/roles/:role/session-policy", verifyToken, verifyAdmin, updateRoleSessionPolicy);

module.exports = router;
