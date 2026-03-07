const { ObjectId } = require("mongodb");

class AdminVendorChat {
  constructor(db) {
    this.collection = db.collection("adminVendorChats");
    this.createIndexes();
  }

  async createIndexes() {
    try {
      await this.collection.createIndex({ vendorId: 1 });
      await this.collection.createIndex({ createdAt: -1 });
      await this.collection.createIndex({ "messages.createdAt": -1 });
      await this.collection.createIndex({ hasUnreadAdmin: 1 });
      await this.collection.createIndex({ hasUnreadVendor: 1 });
    } catch (error) {
      console.error("Error creating Chat indexes:", error);
    }
  }

  /**
   * Get or create chat for a vendor
   */
  async getOrCreateChat(vendorId) {
    let chat = await this.collection.findOne({ 
      vendorId: new ObjectId(vendorId) 
    });

    if (!chat) {
      const result = await this.collection.insertOne({
        vendorId: new ObjectId(vendorId),
        messages: [],
        hasUnreadAdmin: false,
        hasUnreadVendor: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      chat = await this.collection.findOne({ _id: result.insertedId });
    }

    return chat;
  }

  /**
   * Send a message
   */
  async sendMessage(vendorId, messageData) {
    const { senderId, senderType, message, attachments } = messageData;

    const newMessage = {
      _id: new ObjectId(),
      senderId,
      senderType, // 'admin' or 'vendor'
      message,
      attachments: attachments || [], // Array of {type: 'image'|'document', url: string, name: string}
      createdAt: new Date(),
      isRead: false,
    };

    // Update unread flags
    const unreadUpdate = senderType === "admin" 
      ? { hasUnreadVendor: true } 
      : { hasUnreadAdmin: true };

    const result = await this.collection.updateOne(
      { vendorId: new ObjectId(vendorId) },
      {
        $push: { messages: newMessage },
        $set: { 
          ...unreadUpdate,
          updatedAt: new Date() 
        },
      },
      { upsert: true }
    );

    return newMessage;
  }

  /**
   * Mark messages as read
   */
  async markAsRead(vendorId, readerType) {
    const updateField = readerType === "admin" 
      ? "hasUnreadAdmin" 
      : "hasUnreadVendor";

    await this.collection.updateOne(
      { vendorId: new ObjectId(vendorId) },
      { 
        $set: { 
          [updateField]: false,
          updatedAt: new Date() 
        } 
      }
    );
  }

  /**
   * Get all chats (admin view)
   */
  async getAllChats(filter = {}) {
    const { page = 1, limit = 20, unreadOnly = false } = filter;
    const skip = (page - 1) * limit;

    const query = {};
    if (unreadOnly) {
      query.hasUnreadAdmin = true;
    }

    const chats = await this.collection
      .find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await this.collection.countDocuments(query);

    return {
      chats,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get chat by vendor ID
   */
  async getChatByVendorId(vendorId) {
    return await this.collection.findOne({ 
      vendorId: new ObjectId(vendorId) 
    });
  }

  /**
   * Delete a message
   */
  async deleteMessage(vendorId, messageId) {
    return await this.collection.updateOne(
      { vendorId: new ObjectId(vendorId) },
      {
        $pull: { messages: { _id: new ObjectId(messageId) } },
        $set: { updatedAt: new Date() },
      }
    );
  }

  /**
   * Get unread count for admin
   */
  async getUnreadCountForAdmin() {
    return await this.collection.countDocuments({ hasUnreadAdmin: true });
  }

  /**
   * Get unread count for vendor
   */
  async getUnreadCountForVendor(vendorId) {
    const chat = await this.collection.findOne({ 
      vendorId: new ObjectId(vendorId) 
    });
    return chat?.hasUnreadVendor ? 1 : 0;
  }
}

module.exports = AdminVendorChat;
