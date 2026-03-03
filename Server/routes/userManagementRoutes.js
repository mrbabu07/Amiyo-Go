const express = require("express");
const router = express.Router();
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const {
  getAllUsers,
  getUserById,
  updateUserRole,
  updateUserStatus,
  updateUserPermissions,
  getStaffUsers,
  getUserStats,
  getCustomerInsight,
  getAllCustomerInsights,
  generateCustomerInsight,
  getCustomerSegmentStats,
} = require("../controllers/userManagementController");

// User Management Routes
router.get("/users", verifyToken, verifyAdmin, getAllUsers);
router.get("/users/staff", verifyToken, verifyAdmin, getStaffUsers);
router.get("/users/stats", verifyToken, verifyAdmin, getUserStats);
router.get("/users/:id", verifyToken, verifyAdmin, getUserById);
router.patch("/users/:id/role", verifyToken, verifyAdmin, updateUserRole);
router.patch("/users/:id/status", verifyToken, verifyAdmin, updateUserStatus);
router.patch(
  "/users/:id/permissions",
  verifyToken,
  verifyAdmin,
  updateUserPermissions,
);

// Customer Insights Routes
router.get("/insights", verifyToken, verifyAdmin, getAllCustomerInsights);
router.get(
  "/insights/segments",
  verifyToken,
  verifyAdmin,
  getCustomerSegmentStats,
);
router.get("/insights/:userId", verifyToken, verifyAdmin, getCustomerInsight);
router.post(
  "/insights/:userId/generate",
  verifyToken,
  verifyAdmin,
  generateCustomerInsight,
);

module.exports = router;
