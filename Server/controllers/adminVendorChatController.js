const { ObjectId } = require("mongodb");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads/chat");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  // Allow images and documents
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|xls|xlsx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only images and documents are allowed!"));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: fileFilter,
});

// Export upload middleware
exports.uploadFiles = upload.array("files", 5); // Max 5 files

/**
 * Get or create chat for vendor (vendor side)
 */
exports.getVendorChat = async (req, res) => {
  try {
    const vendorId = req.user.vendorId;
    if (!vendorId) {
      return res.status(403).json({ 
        success: false, 
        error: "Not a vendor" 
      });
    }

    const AdminVendorChat = req.app.locals.models.AdminVendorChat;
    const Vendor = req.app.locals.models.Vendor;

    const chat = await AdminVendorChat.getOrCreateChat(vendorId);
    const vendor = await Vendor.findById(vendorId);

    // Mark as read for vendor
    await AdminVendorChat.markAsRead(vendorId, "vendor");

    res.json({
      success: true,
      data: {
        ...chat,
        vendorName: vendor?.shopName || "Unknown",
      },
    });
  } catch (error) {
    console.error("Error getting vendor chat:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to get chat" 
    });
  }
};

/**
 * Send message (vendor side)
 */
exports.sendVendorMessage = async (req, res) => {
  try {
    const vendorId = req.user.vendorId;
    if (!vendorId) {
      return res.status(403).json({ 
        success: false, 
        error: "Not a vendor" 
      });
    }

    const { message } = req.body;
    const files = req.files || [];

    if ((!message || !message.trim()) && files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: "Message or files are required" 
      });
    }

    const AdminVendorChat = req.app.locals.models.AdminVendorChat;

    // Process attachments
    const attachments = files.map(file => {
      const fileType = /\.(jpg|jpeg|png|gif)$/i.test(file.originalname) ? 'image' : 'document';
      return {
        type: fileType,
        url: `/uploads/chat/${file.filename}`,
        name: file.originalname,
        size: file.size,
      };
    });

    const newMessage = await AdminVendorChat.sendMessage(vendorId, {
      senderId: req.user.uid,
      senderType: "vendor",
      message: message?.trim() || "",
      attachments,
    });

    res.json({
      success: true,
      data: newMessage,
    });
  } catch (error) {
    console.error("Error sending vendor message:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to send message" 
    });
  }
};

/**
 * Get all chats (admin side)
 */
exports.getAllChats = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const AdminVendorChat = req.app.locals.models.AdminVendorChat;
    const Vendor = req.app.locals.models.Vendor;

    const result = await AdminVendorChat.getAllChats({
      page: parseInt(page),
      limit: parseInt(limit),
      unreadOnly: unreadOnly === "true",
    });

    // Populate vendor info
    const chatsWithVendor = await Promise.all(
      result.chats.map(async (chat) => {
        const vendor = await Vendor.findById(chat.vendorId);
        return {
          ...chat,
          vendorName: vendor?.shopName || "Unknown Vendor",
          vendorEmail: vendor?.email || "",
          vendorPhone: vendor?.phone || "",
        };
      })
    );

    res.json({
      success: true,
      chats: chatsWithVendor,
      total: result.total,
      page: result.page,
      pages: result.pages,
    });
  } catch (error) {
    console.error("Error getting all chats:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to get chats" 
    });
  }
};

/**
 * Get chat by vendor ID (admin side)
 */
exports.getAdminChat = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const AdminVendorChat = req.app.locals.models.AdminVendorChat;
    const Vendor = req.app.locals.models.Vendor;

    const chat = await AdminVendorChat.getOrCreateChat(vendorId);
    const vendor = await Vendor.findById(vendorId);

    // Mark as read for admin
    await AdminVendorChat.markAsRead(vendorId, "admin");

    res.json({
      success: true,
      data: {
        ...chat,
        vendorName: vendor?.shopName || "Unknown Vendor",
        vendorEmail: vendor?.email || "",
        vendorPhone: vendor?.phone || "",
      },
    });
  } catch (error) {
    console.error("Error getting admin chat:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to get chat" 
    });
  }
};

/**
 * Send message (admin side)
 */
exports.sendAdminMessage = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { message } = req.body;
    const files = req.files || [];

    if ((!message || !message.trim()) && files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: "Message or files are required" 
      });
    }

    const AdminVendorChat = req.app.locals.models.AdminVendorChat;

    // Process attachments
    const attachments = files.map(file => {
      const fileType = /\.(jpg|jpeg|png|gif)$/i.test(file.originalname) ? 'image' : 'document';
      return {
        type: fileType,
        url: `/uploads/chat/${file.filename}`,
        name: file.originalname,
        size: file.size,
      };
    });

    const newMessage = await AdminVendorChat.sendMessage(vendorId, {
      senderId: req.user.uid,
      senderType: "admin",
      message: message?.trim() || "",
      attachments,
    });

    res.json({
      success: true,
      data: newMessage,
    });
  } catch (error) {
    console.error("Error sending admin message:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to send message" 
    });
  }
};

/**
 * Get unread count
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const AdminVendorChat = req.app.locals.models.AdminVendorChat;

    if (req.user.role === "admin") {
      const count = await AdminVendorChat.getUnreadCountForAdmin();
      res.json({ success: true, count });
    } else if (req.user.vendorId) {
      const count = await AdminVendorChat.getUnreadCountForVendor(req.user.vendorId);
      res.json({ success: true, count });
    } else {
      res.json({ success: true, count: 0 });
    }
  } catch (error) {
    console.error("Error getting unread count:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to get unread count" 
    });
  }
};

/**
 * Delete message
 */
exports.deleteMessage = async (req, res) => {
  try {
    const { vendorId, messageId } = req.params;
    const AdminVendorChat = req.app.locals.models.AdminVendorChat;

    await AdminVendorChat.deleteMessage(vendorId, messageId);

    res.json({
      success: true,
      message: "Message deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to delete message" 
    });
  }
};
