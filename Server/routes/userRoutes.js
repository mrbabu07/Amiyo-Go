const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const {
  getOrCreateUser,
  getUserStatus,
  getAccountProfile,
  updateAccountProfile,
  updateAccountPreferences,
  addSavedPaymentMethod,
  deleteSavedPaymentMethod,
  setupAccountTwoFactor,
  verifyAccountTwoFactor,
  disableAccountTwoFactor,
  getLoginActivity,
  exportAccountData,
  requestAccountDeletion,
  cancelAccountDeletion,
} = require("../controllers/userController");
const {
  getPreferences,
  updatePreferences,
} = require("../controllers/notificationController");

router.get("/me", verifyToken, getOrCreateUser);
router.get("/status", verifyToken, getUserStatus);
router.get("/account", verifyToken, getAccountProfile);
router.patch("/account/profile", verifyToken, updateAccountProfile);
router.patch("/account/preferences", verifyToken, updateAccountPreferences);
router.post("/account/payment-methods", verifyToken, addSavedPaymentMethod);
router.delete("/account/payment-methods/:methodId", verifyToken, deleteSavedPaymentMethod);
router.post("/account/2fa/setup", verifyToken, setupAccountTwoFactor);
router.post("/account/2fa/verify", verifyToken, verifyAccountTwoFactor);
router.post("/account/2fa/disable", verifyToken, disableAccountTwoFactor);
router.get("/account/login-activity", verifyToken, getLoginActivity);
router.get("/account/export", verifyToken, exportAccountData);
router.post("/account/delete", verifyToken, requestAccountDeletion);
router.post("/account/delete/cancel", verifyToken, cancelAccountDeletion);
router.get("/notification-preferences", verifyToken, getPreferences);
router.post("/notification-preferences", verifyToken, updatePreferences);

module.exports = router;
