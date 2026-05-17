const express = require("express");
const { verifyAdmin, verifyToken } = require("../middleware/auth");
const {
  createEmailCampaign,
  getPlatformConfig,
  getPlatformControlOverview,
  getStaffActivityLog,
  inviteStaffAccount,
  listAnnouncements,
  listEmailCampaigns,
  listMessageTemplates,
  listNotificationBroadcasts,
  listStaffAccess,
  sendNotificationBroadcast,
  setupAdminTwoFactor,
  updateCommissionRuleTable,
  updatePlatformConfig,
  updateRoleSessionPolicy,
  updateStaffRole,
  upsertAnnouncement,
  upsertCategoryAttributes,
  upsertCategoryNode,
  upsertMessageTemplate,
  verifyAdminTwoFactor,
} = require("../controllers/adminPlatformController");

const router = express.Router();

router.get("/overview", verifyToken, verifyAdmin, getPlatformControlOverview);

router.get("/broadcasts", verifyToken, verifyAdmin, listNotificationBroadcasts);
router.post("/broadcasts", verifyToken, verifyAdmin, sendNotificationBroadcast);

router.get("/templates", verifyToken, verifyAdmin, listMessageTemplates);
router.put("/templates/:templateKey", verifyToken, verifyAdmin, upsertMessageTemplate);

router.get("/email-campaigns", verifyToken, verifyAdmin, listEmailCampaigns);
router.post("/email-campaigns", verifyToken, verifyAdmin, createEmailCampaign);

router.get("/announcements", verifyToken, verifyAdmin, listAnnouncements);
router.post("/announcements", verifyToken, verifyAdmin, upsertAnnouncement);
router.patch("/announcements/:announcementId", verifyToken, verifyAdmin, upsertAnnouncement);

router.get("/config", verifyToken, verifyAdmin, getPlatformConfig);
router.put("/config", verifyToken, verifyAdmin, updatePlatformConfig);
router.post("/categories", verifyToken, verifyAdmin, upsertCategoryNode);
router.patch("/categories/:categoryId", verifyToken, verifyAdmin, upsertCategoryNode);
router.put("/categories/:categoryId/attributes", verifyToken, verifyAdmin, upsertCategoryAttributes);
router.put("/commission-rules", verifyToken, verifyAdmin, updateCommissionRuleTable);

router.get("/staff", verifyToken, verifyAdmin, listStaffAccess);
router.post("/staff", verifyToken, verifyAdmin, inviteStaffAccount);
router.patch("/staff/:staffId/role", verifyToken, verifyAdmin, updateStaffRole);
router.get("/staff/activity-log", verifyToken, verifyAdmin, getStaffActivityLog);
router.post("/staff/:staffId/2fa/setup", verifyToken, verifyAdmin, setupAdminTwoFactor);
router.post("/staff/:staffId/2fa/verify", verifyToken, verifyAdmin, verifyAdminTwoFactor);
router.put("/roles/:role/session-policy", verifyToken, verifyAdmin, updateRoleSessionPolicy);

module.exports = router;
