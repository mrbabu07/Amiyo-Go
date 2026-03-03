const express = require("express");
const router = express.Router();
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const adminUserController = require("../controllers/adminUserController");

// All routes require admin access
router.use(verifyToken);
router.use(verifyAdmin);

// User management
router.get("/", adminUserController.getAllUsers);
router.get("/stats", adminUserController.getUserStats);
router.get("/:id", adminUserController.getUserById);
router.patch("/:id/role", adminUserController.updateUserRole);
router.patch("/:id/status", adminUserController.updateUserStatus);
router.post("/:id/promote-to-vendor", adminUserController.promoteToVendor);

module.exports = router;
