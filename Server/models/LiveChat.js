const { ObjectId } = require("mongodb");

class LiveChat {
  constructor(db) {
    this.collection = db.collection("liveChats");
    this.createIndexes();
  }

  async createIndexes() {
    try {
      await this.collection.createIndex({ userId: 1 });
      await this.collection.createIndex({ status: 1 });
      await this.collection.createIndex({ assignedAgent: 1 });
      await this.collection.createIndex({ createdAt: -1 });
    } catch (error) {
      console.error("Error creating LiveChat indexes:", error);
    }
  }

  async createSession(sessionData) {
    const session = {
      ...sessionData,
      sessionId: `CHAT-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      status: "waiting", // waiting, active, closed
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [],
      customerInfo: sessionData.customerInfo || {},
    };

    const result = await this.collection.insertOne(session);
    return { ...session, _id: result.insertedId };
  }

  async findById(id) {
    return await this.collection.findOne({ _id: new ObjectId(id) });
  }

  async findBySessionId(sessionId) {
    return await this.collection.findOne({ sessionId });
  }

  async findByUserId(userId) {
    return await this.collection
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();
  }

  async findActiveSessions(agentId = null) {
    const query = { status: { $in: ["waiting", "active"] } };
    if (agentId) query.assignedAgent = agentId;

    return await this.collection.find(query).sort({ createdAt: -1 }).toArray();
  }

  async assignAgent(sessionId, agentId, agentInfo) {
    return await this.collection.updateOne(
      { sessionId },
      {
        $set: {
          assignedAgent: agentId,
          agentInfo,
          status: "active",
          updatedAt: new Date(),
        },
      },
    );
  }

  async addMessage(sessionId, messageData) {
    const message = {
      ...messageData,
      timestamp: new Date(),
      messageId: new ObjectId(),
    };

    return await this.collection.updateOne(
      { sessionId },
      {
        $push: { messages: message },
        $set: { updatedAt: new Date() },
      },
    );
  }

  async updateStatus(sessionId, status) {
    const updateData = { status, updatedAt: new Date() };
    if (status === "closed") {
      updateData.closedAt = new Date();
    }

    return await this.collection.updateOne({ sessionId }, { $set: updateData });
  }

  async getChatHistory(userId, limit = 50) {
    return await this.collection
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  async getAgentStats(agentId) {
    const activeSessions = await this.collection.countDocuments({
      assignedAgent: agentId,
      status: "active",
    });

    const totalSessions = await this.collection.countDocuments({
      assignedAgent: agentId,
    });

    const avgResponseTime = await this.collection
      .aggregate([
        { $match: { assignedAgent: agentId } },
        { $unwind: "$messages" },
        { $match: { "messages.senderType": "agent" } },
        { $group: { _id: null, avgTime: { $avg: "$messages.responseTime" } } },
      ])
      .toArray();

    return {
      activeSessions,
      totalSessions,
      avgResponseTime: avgResponseTime[0]?.avgTime || 0,
    };
  }
}

module.exports = LiveChat;
