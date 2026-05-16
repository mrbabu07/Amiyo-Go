const { ObjectId } = require("mongodb");

const DEFAULT_QUICK_REPLIES = [
  {
    _id: "default-ship-24h",
    title: "Ship within 24h",
    message: "Will ship within 24h. You will receive the tracking update once the parcel is handed over.",
    isDefault: true,
  },
  {
    _id: "default-restock",
    title: "Restock update",
    message: "This item is currently out of stock. We expect to restock it soon and will update the listing immediately.",
    isDefault: true,
  },
  {
    _id: "default-thanks",
    title: "Thanks for ordering",
    message: "Thanks for shopping with us. We are checking your order now and will update you shortly.",
    isDefault: true,
  },
];

const DEFAULT_TEMPLATES = [
  {
    _id: "default-packed",
    title: "Order packed",
    body: "Hi {customer_name}, your order #{order_id} has been packed. We will hand it over for delivery soon.",
    variables: ["customer_name", "order_id"],
    isDefault: true,
  },
  {
    _id: "default-product-help",
    title: "Product help",
    body: "Hi {customer_name}, thanks for asking about {product_name}. I am checking the details and will update you shortly.",
    variables: ["customer_name", "product_name"],
    isDefault: true,
  },
];

const round2 = (value) => Math.round(((Number(value) || 0) + Number.EPSILON) * 100) / 100;

const toObjectId = (value) => {
  if (!value) return null;
  if (value instanceof ObjectId) return value;
  const stringValue = value.toString();
  return ObjectId.isValid(stringValue) ? new ObjectId(stringValue) : null;
};

const idVariants = (value) => {
  const objectId = toObjectId(value);
  return [value?.toString?.() || value, objectId].filter(Boolean);
};

const getVendorId = (req) => req.user?.vendorId || req.vendor?._id;

const readCursor = async (cursor) => {
  if (!cursor || typeof cursor.toArray !== "function") return [];
  return cursor.toArray();
};

const getVendorSettingsCollection = (req) => req.app.locals.db.collection("vendorMessageSettings");

const getCustomerName = (user = {}, fallback = "Customer") => {
  const profileName = [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(" ").trim();
  return user.name || profileName || user.displayName || user.email || fallback;
};

const getVendorItems = (order = {}, vendorId) => {
  const variants = idVariants(vendorId).map((item) => item.toString());
  return (order.products || []).filter((product) => (
    product.vendorId && variants.includes(product.vendorId.toString())
  ));
};

const getItemTotal = (item) => (Number(item.price) || 0) * (Number(item.quantity) || 0);

const getCustomerTier = ({ orderCount = 0, totalSpent = 0 } = {}) => {
  if (orderCount >= 10 || totalSpent >= 50000) return "VIP";
  if (orderCount >= 3 || totalSpent >= 10000) return "Repeat";
  return "New";
};

const getConversationCustomerKey = (conversation = {}) => (
  conversation.userId ||
  conversation.user?.firebaseUid ||
  conversation.user?._id ||
  conversation.user?.email ||
  ""
).toString();

const orderMatchesCustomer = (order = {}, conversation = {}) => {
  const keys = [
    order.userId,
    order.firebaseUid,
    order.customerId,
    order.customer?.firebaseUid,
    order.customer?.email,
    order.shippingInfo?.email,
    order.shippingAddress?.email,
  ].filter(Boolean).map((value) => value.toString());

  const conversationKeys = [
    conversation.userId,
    conversation.user?.firebaseUid,
    conversation.user?._id,
    conversation.user?.email,
  ].filter(Boolean).map((value) => value.toString());

  return conversationKeys.some((key) => keys.includes(key));
};

const summarizeOrderContext = (order, vendorId) => {
  if (!order) return null;
  const vendorItems = getVendorItems(order, vendorId);
  const total = vendorItems.reduce((sum, item) => sum + getItemTotal(item), 0);
  const firstItem = vendorItems[0] || order.products?.[0] || {};

  return {
    orderId: order._id?.toString?.() || "",
    orderNumber: order.orderNumber || order.invoiceNumber || order._id?.toString?.().slice(-8) || "",
    status: order.status || "pending",
    placedAt: order.createdAt || null,
    itemCount: vendorItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
    total: round2(total),
    paymentMethod: order.paymentMethod || "",
    productName: firstItem.title || firstItem.name || firstItem.productName || "",
  };
};

const summarizeProductContext = (product, fallbackItem = {}) => {
  if (!product && (!fallbackItem || Object.keys(fallbackItem).length === 0)) return null;
  const source = product || fallbackItem;

  return {
    productId: source._id?.toString?.() || source.productId?.toString?.() || "",
    name: source.title || source.name || source.productName || "Product",
    sku: source.sku || source.variantSku || "",
    status: source.approvalStatus || source.status || "",
    stock: Number(source.stock || 0),
    image: Array.isArray(source.images) ? source.images[0]?.url || source.images[0] : source.image || source.imageUrl || "",
  };
};

const calculateResponseMetrics = (conversations = [], now = new Date()) => {
  const responseTimes = [];
  let pendingResponseCount = 0;
  let pendingOver24hCount = 0;
  let oldestPendingMinutes = 0;

  conversations.forEach((conversation) => {
    const sortedMessages = [...(conversation.messages || [])]
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    let pendingCustomerMessage = null;

    sortedMessages.forEach((message) => {
      if (message.senderType === "user") {
        pendingCustomerMessage = message;
      }

      if (message.senderType === "vendor" && pendingCustomerMessage) {
        const minutes = (new Date(message.createdAt) - new Date(pendingCustomerMessage.createdAt)) / 60000;
        if (minutes >= 0) responseTimes.push(minutes);
        pendingCustomerMessage = null;
      }
    });

    if (pendingCustomerMessage) {
      pendingResponseCount += 1;
      const pendingMinutes = Math.max(0, (now - new Date(pendingCustomerMessage.createdAt)) / 60000);
      oldestPendingMinutes = Math.max(oldestPendingMinutes, pendingMinutes);
      if (pendingMinutes > 1440) pendingOver24hCount += 1;
    }
  });

  const averageReplyMinutes = responseTimes.length
    ? responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length
    : null;
  const averageReplyHours = averageReplyMinutes === null ? null : round2(averageReplyMinutes / 60);
  const baseScore = averageReplyMinutes === null
    ? 100
    : Math.max(40, 100 - Math.max(0, (averageReplyMinutes - 60) / 60) * 2);
  const slaPenalty = averageReplyMinutes !== null && averageReplyMinutes > 1440 ? 25 : 0;
  const pendingPenalty = pendingOver24hCount * 10;
  const healthScore = Math.max(0, Math.round(baseScore - slaPenalty - pendingPenalty));
  const tone = healthScore >= 85 ? "green" : healthScore >= 65 ? "yellow" : "red";

  return {
    averageReplyMinutes: averageReplyMinutes === null ? null : Math.round(averageReplyMinutes),
    averageReplyHours,
    responseCount: responseTimes.length,
    pendingResponseCount,
    pendingOver24hCount,
    oldestPendingHours: oldestPendingMinutes ? round2(oldestPendingMinutes / 60) : 0,
    healthScore,
    tone,
    slaLimitHours: 24,
    isBreachingSla: tone === "red" || pendingOver24hCount > 0,
  };
};

const loadVendorMessageSettings = async (req, vendorId) => {
  const settings = await getVendorSettingsCollection(req).findOne({ vendorId: vendorId.toString() });
  return {
    quickReplies: [...DEFAULT_QUICK_REPLIES, ...(settings?.quickReplies || [])],
    templates: [...DEFAULT_TEMPLATES, ...(settings?.templates || [])],
    savedQuickReplies: settings?.quickReplies || [],
    savedTemplates: settings?.templates || [],
  };
};

const enrichVendorConversations = async (req, vendorId, conversations = []) => {
  const db = req.app.locals.db;
  const productIds = conversations.map((conversation) => toObjectId(conversation.productId)).filter(Boolean);

  const vendorOrders = await readCursor(
    db.collection("orders")
      .find({ "products.vendorId": { $in: idVariants(vendorId) } })
      .sort({ createdAt: -1 })
      .limit(500),
  );

  vendorOrders.forEach((order) => {
    getVendorItems(order, vendorId).forEach((item) => {
      const productId = toObjectId(item.productId || item._id);
      if (productId) productIds.push(productId);
    });
  });

  const uniqueProductIds = [...new Map(productIds.map((id) => [id.toString(), id])).values()];
  const products = uniqueProductIds.length
    ? await readCursor(db.collection("products").find({ _id: { $in: uniqueProductIds } }))
    : [];
  const productMap = new Map(products.map((product) => [product._id.toString(), product]));

  return conversations.map((conversation) => {
    const exactOrderId = conversation.orderId?.toString?.();
    const linkedOrder = vendorOrders.find((order) => (
      exactOrderId && order._id?.toString?.() === exactOrderId
    )) || vendorOrders.find((order) => orderMatchesCustomer(order, conversation));
    const vendorItems = linkedOrder ? getVendorItems(linkedOrder, vendorId) : [];
    const fallbackItem = vendorItems[0] || {};
    const productKey = conversation.productId?.toString?.() || fallbackItem.productId?.toString?.() || fallbackItem._id?.toString?.();
    const product = productKey ? productMap.get(productKey) : null;
    const customerOrders = vendorOrders.filter((order) => orderMatchesCustomer(order, conversation));
    const totalSpent = customerOrders.reduce((sum, order) => (
      sum + getVendorItems(order, vendorId).reduce((itemSum, item) => itemSum + getItemTotal(item), 0)
    ), 0);
    const customer = {
      id: getConversationCustomerKey(conversation),
      name: getCustomerName(conversation.user, "Customer"),
      email: conversation.user?.email || linkedOrder?.shippingInfo?.email || "",
      phone: conversation.user?.profile?.phone || linkedOrder?.shippingInfo?.phone || "",
      tier: getCustomerTier({ orderCount: customerOrders.length, totalSpent }),
      orderCount: customerOrders.length,
      totalSpent: round2(totalSpent),
    };

    return {
      ...conversation,
      customerTier: customer.tier,
      orderContext: summarizeOrderContext(linkedOrder, vendorId),
      productContext: summarizeProductContext(product, fallbackItem),
      context: {
        customer,
        order: summarizeOrderContext(linkedOrder, vendorId),
        product: summarizeProductContext(product, fallbackItem),
      },
    };
  });
};

const validateToolText = (res, { title, message, body }) => {
  if (!title || !title.trim()) {
    res.status(400).json({ success: false, error: "Title is required" });
    return false;
  }

  const text = message ?? body;
  if (!text || !text.trim()) {
    res.status(400).json({ success: false, error: "Message text is required" });
    return false;
  }

  if (title.length > 80 || text.length > 1000) {
    res.status(400).json({ success: false, error: "Title or message is too long" });
    return false;
  }

  return true;
};

/**
 * Start or get existing conversation with vendor
 */
exports.startConversation = async (req, res) => {
  try {
    const VendorChat = req.app.locals.models.VendorChat;
    const { vendorId, productId, orderId, initialMessage, initialImage } = req.body;
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
      productId,
      orderId,
    );

    // Add initial message if provided
    let newMessage = null;
    if ((initialMessage && initialMessage.trim()) || initialImage) {
      newMessage = await VendorChat.addMessage(conversation._id, {
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

    if (newMessage) {
      req.app.locals.realtime?.broadcast(`vendor-chat:${conversation._id.toString()}`, "message.created", {
        conversationId: conversation._id.toString(),
        message: newMessage,
      });
      req.app.locals.realtime?.broadcast(`vendor-chat-list:vendor:${vendorId}`, "chat.updated", {
        conversationId: conversation._id.toString(),
      });
    }

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

    const conversation = await VendorChat.getConversationById(conversationId);
    req.app.locals.realtime?.broadcast(`vendor-chat:${conversationId}`, "message.created", {
      conversationId,
      message: newMessage,
    });
    if (conversation) {
      req.app.locals.realtime?.broadcast(`vendor-chat-list:user:${conversation.userId}`, "chat.updated", {
        conversationId,
      });
      req.app.locals.realtime?.broadcast(`vendor-chat-list:vendor:${conversation.vendorId?.toString()}`, "chat.updated", {
        conversationId,
      });
    }

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

    // If admin and no vendorId, get all conversations
    if (!vendorId && req.user.role === 'admin') {
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

    const rawConversations = await VendorChat.getVendorConversations(vendorId);
    const conversations = await enrichVendorConversations(req, vendorId, rawConversations);
    const responseMetrics = calculateResponseMetrics(conversations);

    res.json({
      success: true,
      data: conversations,
      meta: {
        responseMetrics,
      },
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
    const senderType = vendorId ? "vendor" : "user";
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
    const senderType = vendorId ? "vendor" : "user";

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

exports.getVendorSupportTools = async (req, res) => {
  try {
    const VendorChat = req.app.locals.models.VendorChat;
    const vendorId = getVendorId(req);
    if (!vendorId) {
      return res.status(403).json({
        success: false,
        error: "Vendor profile not found",
      });
    }

    const settings = await loadVendorMessageSettings(req, vendorId);
    const conversations = await readCursor(
      VendorChat.collection
        .find({ vendorId: toObjectId(vendorId) })
        .sort({ lastMessageAt: -1 }),
    );

    res.json({
      success: true,
      data: {
        quickReplies: settings.quickReplies,
        templates: settings.templates,
        responseMetrics: calculateResponseMetrics(conversations),
      },
    });
  } catch (error) {
    console.error("Error fetching vendor support tools:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch support tools",
    });
  }
};

exports.createVendorQuickReply = async (req, res) => {
  try {
    const vendorId = getVendorId(req);
    if (!vendorId) {
      return res.status(403).json({ success: false, error: "Vendor profile not found" });
    }

    const { title, message } = req.body;
    if (!validateToolText(res, { title, message })) return;

    const quickReply = {
      _id: new ObjectId().toString(),
      title: title.trim(),
      message: message.trim(),
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await getVendorSettingsCollection(req).updateOne(
      { vendorId: vendorId.toString() },
      {
        $setOnInsert: { vendorId: vendorId.toString(), createdAt: new Date() },
        $push: { quickReplies: quickReply },
        $set: { updatedAt: new Date() },
      },
      { upsert: true },
    );

    res.status(201).json({ success: true, data: quickReply });
  } catch (error) {
    console.error("Error creating quick reply:", error);
    res.status(500).json({ success: false, error: "Failed to create quick reply" });
  }
};

exports.updateVendorQuickReply = async (req, res) => {
  try {
    const vendorId = getVendorId(req);
    if (!vendorId) {
      return res.status(403).json({ success: false, error: "Vendor profile not found" });
    }

    const { title, message } = req.body;
    if (!validateToolText(res, { title, message })) return;

    const result = await getVendorSettingsCollection(req).updateOne(
      { vendorId: vendorId.toString(), "quickReplies._id": req.params.replyId },
      {
        $set: {
          "quickReplies.$.title": title.trim(),
          "quickReplies.$.message": message.trim(),
          "quickReplies.$.updatedAt": new Date(),
          updatedAt: new Date(),
        },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, error: "Quick reply not found" });
    }

    res.json({ success: true, message: "Quick reply updated" });
  } catch (error) {
    console.error("Error updating quick reply:", error);
    res.status(500).json({ success: false, error: "Failed to update quick reply" });
  }
};

exports.deleteVendorQuickReply = async (req, res) => {
  try {
    const vendorId = getVendorId(req);
    if (!vendorId) {
      return res.status(403).json({ success: false, error: "Vendor profile not found" });
    }

    const result = await getVendorSettingsCollection(req).updateOne(
      { vendorId: vendorId.toString() },
      {
        $pull: { quickReplies: { _id: req.params.replyId } },
        $set: { updatedAt: new Date() },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, error: "Quick reply not found" });
    }

    res.json({ success: true, message: "Quick reply deleted" });
  } catch (error) {
    console.error("Error deleting quick reply:", error);
    res.status(500).json({ success: false, error: "Failed to delete quick reply" });
  }
};

exports.createVendorMessageTemplate = async (req, res) => {
  try {
    const vendorId = getVendorId(req);
    if (!vendorId) {
      return res.status(403).json({ success: false, error: "Vendor profile not found" });
    }

    const { title, body, variables = [] } = req.body;
    if (!validateToolText(res, { title, body })) return;

    const template = {
      _id: new ObjectId().toString(),
      title: title.trim(),
      body: body.trim(),
      variables: Array.isArray(variables) ? variables.slice(0, 10).map((item) => item.toString()) : [],
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await getVendorSettingsCollection(req).updateOne(
      { vendorId: vendorId.toString() },
      {
        $setOnInsert: { vendorId: vendorId.toString(), createdAt: new Date() },
        $push: { templates: template },
        $set: { updatedAt: new Date() },
      },
      { upsert: true },
    );

    res.status(201).json({ success: true, data: template });
  } catch (error) {
    console.error("Error creating message template:", error);
    res.status(500).json({ success: false, error: "Failed to create message template" });
  }
};

exports.updateVendorMessageTemplate = async (req, res) => {
  try {
    const vendorId = getVendorId(req);
    if (!vendorId) {
      return res.status(403).json({ success: false, error: "Vendor profile not found" });
    }

    const { title, body, variables = [] } = req.body;
    if (!validateToolText(res, { title, body })) return;

    const result = await getVendorSettingsCollection(req).updateOne(
      { vendorId: vendorId.toString(), "templates._id": req.params.templateId },
      {
        $set: {
          "templates.$.title": title.trim(),
          "templates.$.body": body.trim(),
          "templates.$.variables": Array.isArray(variables) ? variables.slice(0, 10).map((item) => item.toString()) : [],
          "templates.$.updatedAt": new Date(),
          updatedAt: new Date(),
        },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, error: "Template not found" });
    }

    res.json({ success: true, message: "Template updated" });
  } catch (error) {
    console.error("Error updating message template:", error);
    res.status(500).json({ success: false, error: "Failed to update message template" });
  }
};

exports.deleteVendorMessageTemplate = async (req, res) => {
  try {
    const vendorId = getVendorId(req);
    if (!vendorId) {
      return res.status(403).json({ success: false, error: "Vendor profile not found" });
    }

    const result = await getVendorSettingsCollection(req).updateOne(
      { vendorId: vendorId.toString() },
      {
        $pull: { templates: { _id: req.params.templateId } },
        $set: { updatedAt: new Date() },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, error: "Template not found" });
    }

    res.json({ success: true, message: "Template deleted" });
  } catch (error) {
    console.error("Error deleting message template:", error);
    res.status(500).json({ success: false, error: "Failed to delete message template" });
  }
};
