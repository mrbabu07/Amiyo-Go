const express = require("express");
const router = express.Router();
const { verifyToken, verifyAdmin, requireRole } = require("../middleware/auth");
const chatController = require("../controllers/adminVendorChatController");

// Vendor routes
router.get("/vendor/my-chat", verifyToken, requireRole('vendor'), chatController.getVendorChat);
router.post("/vendor/send", verifyToken, requireRole('vendor'), chatController.uploadFiles, chatController.sendVendorMessage);

// Admin routes
router.get("/admin/chats", verifyToken, verifyAdmin, chatController.getAllChats);
router.get("/admin/chat/:vendorId", verifyToken, verifyAdmin, chatController.getAdminChat);
router.post("/admin/send/:vendorId", verifyToken, verifyAdmin, chatController.uploadFiles, chatController.sendAdminMessage);
router.delete("/admin/message/:vendorId/:messageId", verifyToken, verifyAdmin, chatController.deleteMessage);

// Common routes
router.get("/unread-count", verifyToken, chatController.getUnreadCount);

module.exports = router;
