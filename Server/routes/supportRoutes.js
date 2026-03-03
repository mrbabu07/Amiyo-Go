const express = require("express");
const router = express.Router();
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const {
  createTicket,
  getUserTickets,
  getAllTickets,
  updateTicketStatus,
  assignTicket,
  addTicketMessage,
  getTicketStats,
  createChatSession,
  getChatSessions,
  assignChatAgent,
  addChatMessage,
  closeChatSession,
} = require("../controllers/supportController");

// Support Tickets Routes
router.post("/tickets", verifyToken, createTicket);
router.get("/tickets/my-tickets", verifyToken, getUserTickets);
router.get("/tickets", verifyToken, verifyAdmin, getAllTickets);
router.patch(
  "/tickets/:id/status",
  verifyToken,
  verifyAdmin,
  updateTicketStatus,
);
router.patch("/tickets/:id/assign", verifyToken, verifyAdmin, assignTicket);
router.post("/tickets/:id/messages", verifyToken, addTicketMessage);
router.get("/tickets/stats", verifyToken, verifyAdmin, getTicketStats);

// Live Chat Routes
router.post("/chat/sessions", verifyToken, createChatSession);
router.get("/chat/sessions", verifyToken, verifyAdmin, getChatSessions);
router.patch(
  "/chat/sessions/:sessionId/assign",
  verifyToken,
  verifyAdmin,
  assignChatAgent,
);
router.post("/chat/sessions/:sessionId/messages", verifyToken, addChatMessage);
router.patch("/chat/sessions/:sessionId/close", verifyToken, closeChatSession);

module.exports = router;
