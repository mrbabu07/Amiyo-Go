const { ObjectId } = require("mongodb");

class VendorChat {
  constructor(db) {
    this.collection = db.collection("vendorChats");
    this.createIndexes();
  }

  async createIndexes() {
    try {
      await this.collection.createIndex({ userId: 1, vendorId: 1 });
      await this.collection.createIndex({ vendorId: 1, status: 1 });
      await this.collection.createIndex({ createdAt: -1 });
    } catch (error) {
      console.error("Error creating VendorChat indexes:", error);
    }
  }

  async createConversation(data) {
    const conversation = {
      userId: data.userId,
      vendorId: new ObjectId(data.vendorId),
      productId: data.productId ? new ObjectId(data.productId) : null,
      messages: [],
      status: "active", // active, closed
      lastMessageAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await this.collection.insertOne(conversation);
    return { ...conversation, _id: result.insertedId };
  }

  async findConversation(userId, vendorId) {
    return await this.collection.findOne({
      userId,
      vendorId: new ObjectId(vendorId),
      status: "active",
    });
  }

  async getOrCreateConversation(userId, vendorId, productId = null) {
    let conversation = await this.findConversation(userId, vendorId);
    
    if (!conversation) {
      conversation = await this.createConversation({
        userId,
        vendorId,
        productId,
      });
    }

    return conversation;
  }

  async addMessage(conversationId, messageData) {
    const message = {
      _id: new ObjectId().toString(),
      senderId: messageData.senderId,
      senderType: messageData.senderType, // 'user' or 'vendor'
      message: messageData.message,
      image: messageData.image || null, // Image URL or base64
      read: false,
      createdAt: new Date(),
    };

    const result = await this.collection.updateOne(
      { _id: new ObjectId(conversationId) },
      {
        $push: { messages: message },
        $set: {
          lastMessageAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    return result.modifiedCount > 0 ? message : null;
  }

  async markMessagesAsRead(conversationId, senderType) {
    // Mark all messages from the opposite sender as read
    const oppositeType = senderType === 'user' ? 'vendor' : 'user';
    
    return await this.collection.updateOne(
      { _id: new ObjectId(conversationId) },
      {
        $set: {
          "messages.$[elem].read": true,
          updatedAt: new Date(),
        },
      },
      {
        arrayFilters: [{ "elem.senderType": oppositeType, "elem.read": false }],
      }
    );
  }

  async getUserConversations(userId) {
    const pipeline = [
      { $match: { userId } },
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
        $addFields: {
          unreadCount: {
            $size: {
              $filter: {
                input: "$messages",
                as: "msg",
                cond: {
                  $and: [
                    { $eq: ["$$msg.senderType", "vendor"] },
                    { $eq: ["$$msg.read", false] },
                  ],
                },
              },
            },
          },
        },
      },
    ];

    return await this.collection.aggregate(pipeline).toArray();
  }

  async getVendorConversations(vendorId) {
    const pipeline = [
      { $match: { vendorId: new ObjectId(vendorId) } },
      { $sort: { lastMessageAt: -1 } },
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
    ];

    return await this.collection.aggregate(pipeline).toArray();
  }

  async getConversationById(conversationId) {
    const pipeline = [
      { $match: { _id: new ObjectId(conversationId) } },
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
    ];

    const result = await this.collection.aggregate(pipeline).toArray();
    return result[0] || null;
  }

  async closeConversation(conversationId) {
    return await this.collection.updateOne(
      { _id: new ObjectId(conversationId) },
      {
        $set: {
          status: "closed",
          updatedAt: new Date(),
        },
      }
    );
  }

  async deleteConversation(conversationId) {
    return await this.collection.deleteOne({
      _id: new ObjectId(conversationId),
    });
  }
}

module.exports = VendorChat;
