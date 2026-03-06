const { ObjectId } = require("mongodb");

/**
 * Start or get existing conversation with vendor
 */
exports.startConversation = async (req, res) => {
  try {
    const VendorChat = req.app.locals.models.VendorChat;
    const { vendorId, productId, initialMessage, initialImage } = req.body;
    const userId = req.user.uid;

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        error: "Vendor ID is required",
      });
    }

    // Get or create conversation
    const conversation = await VendorChat.getOrCreateConversation(
      userId,
      vendorId,
      productId
    );

    // Add initial message if provided
    if ((initialMessage && initialMessage.trim()) || initialImage) {
      await VendorChat.addMessage(conversation._id, {
        senderId: userId,
        senderType: "user",
        message: initialMessage ? initialMessage.trim() : "",
        image: initialImage || null,
      });
    }

    // Fetch updated conversation with vendor details
    const fullConversation = await VendorChat.getConversationById(
      conversation._id
    );

    res.json({
      success: true,
      data: fullConversation,
    });
  } catch (error) {
    console.error("Error starting conversation:", error);
    res.status(500).json({
      success: false,
      error: "Failed to start conversation",
    });
  }
};

/**
 * Send message in conversation
 */
exports.sendMessage = async (req, res) => {
  try {
    const VendorChat = req.app.locals.models.VendorChat;
    const { conversationId } = req.params;
    const { message, image } = req.body;
    const userId = req.user.uid;
    const vendorId = req.user.vendorId;

    console.log('📨 Sending message:', {
      conversationId,
      hasMessage: !!message,
      hasImage: !!image,
      imageSize: image ? image.length : 0,
      userId,
      vendorId
    });

    // At least message or image must be provided
    if ((!message || !message.trim()) && !image) {
      return res.status(400).json({
        success: false,
        error: "Message or image is required",
      });
    }

    // Validate image size (base64 string should be less than 10MB)
    if (image && image.length > 10 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: "Image size is too large. Maximum 10MB allowed.",
      });
    }

    // Determine sender type
    const senderType = vendorId ? "vendor" : "user";
    const senderId = vendorId ? vendorId.toString() : userId;

    const newMessage = await VendorChat.addMessage(conversationId, {
      senderId,
      senderType,
      message: message ? message.trim() : "",
      image: image || null,
    });

    if (!newMessage) {
      return res.status(404).json({
        success: false,
        error: "Conversation not found",
      });
    }

    console.log('✅ Message sent successfully');

    res.json({
      success: true,
      data: newMessage,
    });
  } catch (error) {
    console.error("❌ Error sending message:", error);
    res.status(500).json({
      success: false,
      error: "Failed to send message",
      details: error.message,
    });
  }
};

/**
 * Get user's conversations
 */
exports.getUserConversations = async (req, res) => {
  try {
    const VendorChat = req.app.locals.models.VendorChat;
    const userId = req.user.uid;

    const conversations = await VendorChat.getUserConversations(userId);

    res.json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    console.error("Error fetching user conversations:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch conversations",
    });
  }
};

/**
 * Get vendor's conversations
 */
exports.getVendorConversations = async (req, res) => {
  try {
    const VendorChat = req.app.locals.models.VendorChat;
    let vendorId = req.user.vendorId;

    console.log('🔍 getVendorConversations called');
    console.log('   req.user:', {
      uid: req.user.uid,
      role: req.user.role,
      vendorId: req.user.vendorId,
      _id: req.user._id
    });

    // If admin and no vendorId, get all conversations
    if (!vendorId && req.user.role === 'admin') {
      console.log('✅ Admin user - fetching all conversations');
      const allConversations = await VendorChat.collection
        .aggregate([
          { $sort: { lastMessageAt: -1 } },
          {
            $lookup: {
              from: "vendors",
              localField: "vendorId",
              foreignField: "_id",
              as: "vendor",
            },
          },
          {
            $unwind: {
              path: "$vendor",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "userId",
              foreignField: "firebaseUid",
              as: "user",
            },
          },
          {
            $unwind: {
              path: "$user",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $addFields: {
              lastMessage: {
                $cond: {
                  if: { $gt: [{ $size: "$messages" }, 0] },
                  then: { $arrayElemAt: ["$messages.message", -1] },
                  else: null,
                },
              },
              unreadCount: {
                $size: {
                  $filter: {
                    input: "$messages",
                    as: "msg",
                    cond: {
                      $and: [
                        { $eq: ["$$msg.senderType", "user"] },
                        { $eq: ["$$msg.read", false] },
                      ],
                    },
                  },
                },
              },
            },
          },
        ])
        .toArray();

      return res.json({
        success: true,
        data: allConversations,
      });
    }

    if (!vendorId) {
      console.log('❌ No vendorId found in req.user');
      return res.status(403).json({
        success: false,
        error: "Not a vendor or vendor profile not found",
        debug: {
          hasUser: !!req.user,
          userRole: req.user?.role,
          hasVendorId: !!req.user?.vendorId
        }
      });
    }

    console.log('✅ Fetching conversations for vendorId:', vendorId);
    const conversations = await VendorChat.getVendorConversations(vendorId);
    console.log('✅ Found', conversations.length, 'conversations');

    res.json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    console.error("❌ Error fetching vendor conversations:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch conversations",
      details: error.message
    });
  }
};

/**
 * Get conversation by ID
 */
exports.getConversation = async (req, res) => {
  try {
    const VendorChat = req.app.locals.models.VendorChat;
    const { conversationId } = req.params;
    const userId = req.user.uid;
    const vendorId = req.user.vendorId;

    const conversation = await VendorChat.getConversationById(conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: "Conversation not found",
      });
    }

    // Verify user has access to this conversation
    const isAdmin = req.user.role === 'admin';
    const hasAccess =
      isAdmin ||
      conversation.userId === userId ||
      (vendorId && conversation.vendorId.toString() === vendorId.toString());

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    // Mark messages as read
    const senderType = vendorId ? "vendor" : "user";
    await VendorChat.markMessagesAsRead(conversationId, senderType);

    res.json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    console.error("Error fetching conversation:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch conversation",
    });
  }
};

/**
 * Get messages in a conversation
 */
exports.getConversationMessages = async (req, res) => {
  try {
    const VendorChat = req.app.locals.models.VendorChat;
    const { conversationId } = req.params;
    const userId = req.user.uid;
    const vendorId = req.user.vendorId;

    const conversation = await VendorChat.getConversationById(conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: "Conversation not found",
      });
    }

    // Verify user has access to this conversation
    const isAdmin = req.user.role === 'admin';
    const hasAccess =
      isAdmin ||
      conversation.userId === userId ||
      (vendorId && conversation.vendorId.toString() === vendorId.toString());

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    // Mark messages as read
    const senderType = vendorId ? "vendor" : "customer";
    await VendorChat.markMessagesAsRead(conversationId, senderType);

    res.json({
      success: true,
      data: conversation.messages || [],
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch messages",
    });
  }
};

/**
 * Mark messages as read
 */
exports.markConversationAsRead = async (req, res) => {
  try {
    const VendorChat = req.app.locals.models.VendorChat;
    const { conversationId } = req.params;
    const vendorId = req.user.vendorId;
    const userId = req.user.uid;

    // Determine sender type
    const senderType = vendorId ? "vendor" : "customer";

    const result = await VendorChat.markMessagesAsRead(conversationId, senderType);

    res.json({
      success: true,
      message: "Messages marked as read",
    });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({
      success: false,
      error: "Failed to mark messages as read",
    });
  }
};

/**
 * Close conversation
 */
exports.closeConversation = async (req, res) => {
  try {
    const VendorChat = req.app.locals.models.VendorChat;
    const { conversationId } = req.params;

    const result = await VendorChat.closeConversation(conversationId);

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Conversation not found",
      });
    }

    res.json({
      success: true,
      message: "Conversation closed successfully",
    });
  } catch (error) {
    console.error("Error closing conversation:", error);
    res.status(500).json({
      success: false,
      error: "Failed to close conversation",
    });
  }
};
