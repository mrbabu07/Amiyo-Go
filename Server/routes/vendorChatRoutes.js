const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const {
  startConversation,
  sendMessage,
  getUserConversations,
  getVendorConversations,
  getConversation,
  getConversationMessages,
  markConversationAsRead,
  closeConversation,
} = require("../controllers/vendorChatController");

// User/Customer routes
router.post("/start", verifyToken, startConversation);
router.get("/user", verifyToken, getUserConversations);
router.get("/customer/conversations", verifyToken, getUserConversations);

// Vendor routes
router.get("/vendor", verifyToken, getVendorConversations);

// Shared routes
router.get("/conversation/:conversationId", verifyToken, getConversation);
router.get("/conversation/:conversationId/messages", verifyToken, getConversationMessages);
router.post("/conversation/:conversationId/message", verifyToken, sendMessage);
router.patch("/conversation/:conversationId/mark-read", verifyToken, markConversationAsRead);
router.patch("/conversation/:conversationId/close", verifyToken, closeConversation);

// Legacy routes (keep for backward compatibility)
router.get("/:conversationId", verifyToken, getConversation);
router.post("/:conversationId/message", verifyToken, sendMessage);
router.patch("/:conversationId/close", verifyToken, closeConversation);

module.exports = router;
