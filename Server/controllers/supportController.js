const SupportTicket = require("../models/SupportTicket");
const LiveChat = require("../models/LiveChat");

const FAQ_ARTICLES = [
  {
    id: "track-order",
    topic: "Orders",
    title: "Track an order",
    answer: "Open Orders, choose the order, and follow the timeline from confirmed to delivered. Courier links appear there when available.",
    keywords: ["track", "tracking", "where", "order", "delivery", "courier"],
  },
  {
    id: "cancel-order",
    topic: "Orders",
    title: "Cancel an order",
    answer: "You can cancel while the order is still Pending. Choose a cancellation reason from the order detail page.",
    keywords: ["cancel", "cancellation", "pending"],
  },
  {
    id: "start-return",
    topic: "Returns",
    title: "Start a return",
    answer: "Go to Orders, open the delivered order, choose Return, select the item and reason, upload evidence, then confirm.",
    keywords: ["return", "refund", "evidence", "photo", "reject", "dispute"],
  },
  {
    id: "refund-timing",
    topic: "Payments",
    title: "Refund timing",
    answer: "Approved refunds show the amount, method, and expected credit date in the return tracker.",
    keywords: ["refund", "money", "payment", "credit", "bkash", "nagad", "cod"],
  },
  {
    id: "account-security",
    topic: "Account",
    title: "Secure your account",
    answer: "Use a verified phone/email, review login activity, and enable two-factor authentication from Profile settings.",
    keywords: ["login", "security", "2fa", "password", "account"],
  },
  {
    id: "wishlist-alerts",
    topic: "Wishlist",
    title: "Wishlist alerts",
    answer: "Save a product to Wishlist, then enable price-drop, back-in-stock, or flash-sale alerts for that product.",
    keywords: ["wishlist", "price", "stock", "alert", "flash"],
  },
];

const CONTACT_OPTIONS = [
  { channel: "live_chat", label: "Live chat", availability: "10:00 AM - 10:00 PM", value: "Support Center" },
  { channel: "email", label: "Email", availability: "24/7 intake", value: "support@amiyo-go.local" },
  { channel: "phone", label: "Phone", availability: "10:00 AM - 6:00 PM", value: "+880-9600-000000" },
];

const sanitizeText = (value, max = 2000) => String(value || "").trim().slice(0, max);

const normalizeName = (user, fallback = "Customer") => {
  const parts = [user?.profile?.firstName, user?.profile?.lastName]
    .map((part) => sanitizeText(part, 80))
    .filter(Boolean);
  return parts.join(" ") || fallback || "Customer";
};

const searchFaqArticles = ({ query = "", topic = "" } = {}) => {
  const normalizedQuery = sanitizeText(query, 120).toLowerCase();
  const normalizedTopic = sanitizeText(topic, 60).toLowerCase();

  return FAQ_ARTICLES.filter((article) => {
    const topicMatches = !normalizedTopic || article.topic.toLowerCase() === normalizedTopic;
    if (!topicMatches) return false;
    if (!normalizedQuery) return true;

    const haystack = [
      article.title,
      article.answer,
      article.topic,
      ...article.keywords,
    ].join(" ").toLowerCase();
    return haystack.includes(normalizedQuery) ||
      normalizedQuery.split(/\s+/).some((word) => word && haystack.includes(word));
  });
};

const answerFaqBot = (message = "") => {
  const text = sanitizeText(message, 500).toLowerCase();
  const matchedArticles = searchFaqArticles({ query: text }).slice(0, 3);

  if (!text) {
    return {
      answer: "Ask me about orders, returns, refunds, account security, or wishlist alerts.",
      suggestedCategory: "general",
      escalate: false,
      matchedArticles: FAQ_ARTICLES.slice(0, 3),
    };
  }

  if (/\b(where|track|tracking|courier|delivery)\b/.test(text)) {
    return {
      answer: "Open Orders and select the order to see the live timeline, courier name, ETA, and tracking link when available.",
      suggestedCategory: "order",
      escalate: false,
      matchedArticles,
    };
  }

  if (/\b(return|refund|dispute|rejected|evidence)\b/.test(text)) {
    return {
      answer: "Start from the order detail return wizard. If a vendor rejects your return, create a Return dispute ticket with evidence photos.",
      suggestedCategory: "return",
      escalate: text.includes("reject") || text.includes("dispute"),
      matchedArticles,
    };
  }

  if (/\b(payment|bkash|nagad|cod|card|paid)\b/.test(text)) {
    return {
      answer: "Payment and refund status are shown on the order detail page. For failed or duplicate payments, submit a Payment ticket.",
      suggestedCategory: "payment",
      escalate: true,
      matchedArticles,
    };
  }

  if (/\b(cancel|cancellation)\b/.test(text)) {
    return {
      answer: "You can self-cancel while an order is Pending. After processing starts, submit an Order ticket so support can review.",
      suggestedCategory: "order",
      escalate: true,
      matchedArticles,
    };
  }

  return {
    answer: matchedArticles[0]?.answer || "I could not find an exact match. Create a support ticket and our team will help.",
    suggestedCategory: matchedArticles[0]?.topic?.toLowerCase() || "general",
    escalate: matchedArticles.length === 0,
    matchedArticles,
  };
};

// Support Tickets
const createTicket = async (req, res) => {
  try {
    const {
      subject,
      description,
      priority,
      category,
      orderId,
      issueType,
      returnId,
      escalationReason,
      contactPreference,
      attachments,
      evidenceFiles,
    } = req.body;
    const userId = req.user.uid;

    if (!sanitizeText(subject, 200) || !sanitizeText(description, 2000)) {
      return res.status(400).json({
        success: false,
        error: "Subject and description are required",
      });
    }

    // Get user info from database
    const User = req.app.locals.models.User;
    const user = await User.findByFirebaseUid(userId);

    const SupportTicketModel = new SupportTicket(req.app.locals.db);
    const now = new Date();
    const sanitizedAttachments = [
      ...(Array.isArray(attachments) ? attachments : []),
      ...(Array.isArray(evidenceFiles) ? evidenceFiles : []),
    ]
      .map((file) => {
        if (typeof file === "string") return { url: file };
        return {
          url: sanitizeText(file?.url, 1000),
          name: sanitizeText(file?.name || file?.filename, 180),
          type: sanitizeText(file?.type || file?.mimeType, 80),
        };
      })
      .filter((file) => file.url);
    const isReturnDispute =
      category === "return" ||
      issueType === "return_dispute" ||
      Boolean(returnId || escalationReason);

    const ticketData = {
      userId,
      subject: sanitizeText(subject, 200),
      description: sanitizeText(description, 3000),
      priority: priority || "medium",
      category: category || "general",
      orderId: sanitizeText(orderId, 120) || null,
      issueType: sanitizeText(issueType, 80) || (isReturnDispute ? "return_dispute" : "general"),
      returnId: sanitizeText(returnId, 120) || null,
      contactPreference: sanitizeText(contactPreference, 80) || "in_app",
      escalation: isReturnDispute
        ? {
            type: "return_dispute",
            reason: sanitizeText(escalationReason || description, 1000),
            status: "submitted",
            submittedAt: now,
          }
        : null,
      statusTimeline: [
        {
          status: "open",
          label: "Ticket submitted",
          actorId: userId,
          actorType: "customer",
          createdAt: now,
        },
      ],
      customerInfo: {
        email: req.user.email,
        name: normalizeName(user, req.user.name),
        userId: user?._id,
      },
      initialMessage: description,
      attachments: sanitizedAttachments,
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
      senderName: normalizeName(user, req.user.name),
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

const getFaqArticles = async (req, res) => {
  try {
    const articles = searchFaqArticles({
      query: req.query.q,
      topic: req.query.topic,
    });

    res.json({
      success: true,
      data: articles,
      topics: [...new Set(FAQ_ARTICLES.map((article) => article.topic))],
    });
  } catch (error) {
    console.error("Error loading FAQ articles:", error);
    res.status(500).json({ success: false, error: "Failed to load help articles" });
  }
};

const answerSupportBot = async (req, res) => {
  try {
    const response = answerFaqBot(req.body?.message || req.body?.query || "");
    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error("Error answering support bot message:", error);
    res.status(500).json({ success: false, error: "Failed to answer support question" });
  }
};

const getContactOptions = async (req, res) => {
  res.json({
    success: true,
    data: CONTACT_OPTIONS,
  });
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
      senderName: normalizeName(user, req.user.name),
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
  getFaqArticles,
  answerSupportBot,
  getContactOptions,

  // Live Chat
  createChatSession,
  getChatSessions,
  assignChatAgent,
  addChatMessage,
  closeChatSession,
  __test__: {
    FAQ_ARTICLES,
    CONTACT_OPTIONS,
    searchFaqArticles,
    answerFaqBot,
    normalizeName,
  },
};
