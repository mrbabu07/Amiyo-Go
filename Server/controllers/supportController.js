const SupportTicket = require("../models/SupportTicket");
const LiveChat = require("../models/LiveChat");

// Support Tickets
const createTicket = async (req, res) => {
  try {
    const { subject, description, priority, category } = req.body;
    const userId = req.user.uid;

    // Get user info from database
    const User = req.app.locals.models.User;
    const user = await User.findByFirebaseUid(userId);

    const SupportTicketModel = new SupportTicket(req.app.locals.db);

    const ticketData = {
      userId,
      subject,
      description,
      priority: priority || "medium",
      category: category || "general",
      customerInfo: {
        email: req.user.email,
        name:
          user?.profile?.firstName + " " + user?.profile?.lastName ||
          req.user.name,
        userId: user?._id,
      },
      initialMessage: description,
    };

    const ticket = await SupportTicketModel.create(ticketData);

    res.status(201).json({
      success: true,
      message: "Support ticket created successfully",
      ticket,
    });
  } catch (error) {
    console.error("Error creating support ticket:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create support ticket",
    });
  }
};

const getUserTickets = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { page = 1, limit = 10, status } = req.query;

    const SupportTicketModel = new SupportTicket(req.app.locals.db);
    const result = await SupportTicketModel.findByUserId(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error fetching user tickets:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch tickets",
    });
  }
};

const getAllTickets = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      priority,
      assignedTo,
      search,
    } = req.query;

    const SupportTicketModel = new SupportTicket(req.app.locals.db);
    const result = await SupportTicketModel.findAll({
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      priority,
      assignedTo,
      search,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error fetching all tickets:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch tickets",
    });
  }
};

const updateTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updatedBy = req.user.uid;

    const SupportTicketModel = new SupportTicket(req.app.locals.db);
    await SupportTicketModel.updateStatus(id, status, updatedBy);

    res.json({
      success: true,
      message: "Ticket status updated successfully",
    });
  } catch (error) {
    console.error("Error updating ticket status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update ticket status",
    });
  }
};

const assignTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;
    const assignedBy = req.user.uid;

    const SupportTicketModel = new SupportTicket(req.app.locals.db);
    await SupportTicketModel.assignTicket(id, assignedTo, assignedBy);

    res.json({
      success: true,
      message: "Ticket assigned successfully",
    });
  } catch (error) {
    console.error("Error assigning ticket:", error);
    res.status(500).json({
      success: false,
      error: "Failed to assign ticket",
    });
  }
};

const addTicketMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, attachments } = req.body;
    const senderId = req.user.uid;

    // Get user info
    const User = req.app.locals.models.User;
    const user = await User.findByFirebaseUid(senderId);

    const messageData = {
      senderId,
      senderType: user?.role === "customer" ? "customer" : "agent",
      senderName:
        user?.profile?.firstName + " " + user?.profile?.lastName ||
        req.user.name,
      message,
      attachments: attachments || [],
    };

    const SupportTicketModel = new SupportTicket(req.app.locals.db);
    await SupportTicketModel.addMessage(id, messageData);

    res.json({
      success: true,
      message: "Message added successfully",
    });
  } catch (error) {
    console.error("Error adding ticket message:", error);
    res.status(500).json({
      success: false,
      error: "Failed to add message",
    });
  }
};

const getTicketStats = async (req, res) => {
  try {
    const SupportTicketModel = new SupportTicket(req.app.locals.db);
    const stats = await SupportTicketModel.getTicketStats();

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error fetching ticket stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch ticket stats",
    });
  }
};

// Live Chat
const createChatSession = async (req, res) => {
  try {
    const { message, customerInfo } = req.body;
    const userId = req.user?.uid;

    const LiveChatModel = new LiveChat(req.app.locals.db);

    const sessionData = {
      userId,
      customerInfo: {
        ...customerInfo,
        email: req.user?.email,
        name: req.user?.name,
      },
    };

    const session = await LiveChatModel.createSession(sessionData);

    // Add initial message if provided
    if (message) {
      await LiveChatModel.addMessage(session.sessionId, {
        senderId: userId,
        senderType: "customer",
        senderName: customerInfo?.name || req.user?.name,
        message,
      });
    }

    res.status(201).json({
      success: true,
      session,
    });
  } catch (error) {
    console.error("Error creating chat session:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create chat session",
    });
  }
};

const getChatSessions = async (req, res) => {
  try {
    const { agentId } = req.query;

    const LiveChatModel = new LiveChat(req.app.locals.db);
    const sessions = await LiveChatModel.findActiveSessions(agentId);

    res.json({
      success: true,
      sessions,
    });
  } catch (error) {
    console.error("Error fetching chat sessions:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch chat sessions",
    });
  }
};

const assignChatAgent = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const agentId = req.user.uid;

    // Get agent info
    const User = req.app.locals.models.User;
    const agent = await User.findByFirebaseUid(agentId);

    const agentInfo = {
      id: agentId,
      name:
        agent?.profile?.firstName + " " + agent?.profile?.lastName ||
        req.user.name,
      email: req.user.email,
    };

    const LiveChatModel = new LiveChat(req.app.locals.db);
    await LiveChatModel.assignAgent(sessionId, agentId, agentInfo);

    res.json({
      success: true,
      message: "Agent assigned to chat session",
    });
  } catch (error) {
    console.error("Error assigning chat agent:", error);
    res.status(500).json({
      success: false,
      error: "Failed to assign agent",
    });
  }
};

const addChatMessage = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message } = req.body;
    const senderId = req.user.uid;

    // Get user info
    const User = req.app.locals.models.User;
    const user = await User.findByFirebaseUid(senderId);

    const messageData = {
      senderId,
      senderType: user?.role === "customer" ? "customer" : "agent",
      senderName:
        user?.profile?.firstName + " " + user?.profile?.lastName ||
        req.user.name,
      message,
    };

    const LiveChatModel = new LiveChat(req.app.locals.db);
    await LiveChatModel.addMessage(sessionId, messageData);

    res.json({
      success: true,
      message: "Message sent successfully",
    });
  } catch (error) {
    console.error("Error adding chat message:", error);
    res.status(500).json({
      success: false,
      error: "Failed to send message",
    });
  }
};

const closeChatSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const LiveChatModel = new LiveChat(req.app.locals.db);
    await LiveChatModel.updateStatus(sessionId, "closed");

    res.json({
      success: true,
      message: "Chat session closed",
    });
  } catch (error) {
    console.error("Error closing chat session:", error);
    res.status(500).json({
      success: false,
      error: "Failed to close chat session",
    });
  }
};

module.exports = {
  // Support Tickets
  createTicket,
  getUserTickets,
  getAllTickets,
  updateTicketStatus,
  assignTicket,
  addTicketMessage,
  getTicketStats,

  // Live Chat
  createChatSession,
  getChatSessions,
  assignChatAgent,
  addChatMessage,
  closeChatSession,
};
