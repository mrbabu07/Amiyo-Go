const { ObjectId } = require("mongodb");

class SupportTicket {
  constructor(db) {
    this.collection = db.collection("supportTickets");
    this.createIndexes();
  }

  async createIndexes() {
    try {
      await this.collection.createIndex({ userId: 1 });
      await this.collection.createIndex({ status: 1 });
      await this.collection.createIndex({ priority: 1 });
      await this.collection.createIndex({ createdAt: -1 });
      await this.collection.createIndex({ assignedTo: 1 });
    } catch (error) {
      console.error("Error creating SupportTicket indexes:", error);
    }
  }

  async create(ticketData) {
    const ticket = {
      ...ticketData,
      ticketId: `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      status: "open",
      priority: ticketData.priority || "medium",
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: ticketData.initialMessage
        ? [
            {
              senderId: ticketData.userId,
              senderType: "customer",
              message: ticketData.initialMessage,
              timestamp: new Date(),
              attachments: ticketData.attachments || [],
            },
          ]
        : [],
    };

    const result = await this.collection.insertOne(ticket);
    return { ...ticket, _id: result.insertedId };
  }

  async findById(id) {
    return await this.collection.findOne({ _id: new ObjectId(id) });
  }

  async findByTicketId(ticketId) {
    return await this.collection.findOne({ ticketId });
  }

  async findByUserId(userId, options = {}) {
    const { page = 1, limit = 10, status } = options;
    const query = { userId };
    if (status) query.status = status;

    const tickets = await this.collection
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    const total = await this.collection.countDocuments(query);
    return { tickets, total, page, totalPages: Math.ceil(total / limit) };
  }

  async findAll(options = {}) {
    const {
      page = 1,
      limit = 20,
      status,
      priority,
      assignedTo,
      search,
    } = options;
    const query = {};

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;
    if (search) {
      query.$or = [
        { subject: { $regex: search, $options: "i" } },
        { ticketId: { $regex: search, $options: "i" } },
        { "customerInfo.email": { $regex: search, $options: "i" } },
      ];
    }

    const tickets = await this.collection
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    const total = await this.collection.countDocuments(query);
    return { tickets, total, page, totalPages: Math.ceil(total / limit) };
  }

  async updateStatus(id, status, updatedBy) {
    return await this.collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status,
          updatedAt: new Date(),
          updatedBy,
        },
      },
    );
  }

  async assignTicket(id, assignedTo, assignedBy) {
    return await this.collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          assignedTo,
          assignedBy,
          updatedAt: new Date(),
        },
      },
    );
  }

  async addMessage(id, messageData) {
    const message = {
      ...messageData,
      timestamp: new Date(),
      attachments: messageData.attachments || [],
    };

    return await this.collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $push: { messages: message },
        $set: { updatedAt: new Date() },
      },
    );
  }

  async updatePriority(id, priority, updatedBy) {
    return await this.collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          priority,
          updatedAt: new Date(),
          updatedBy,
        },
      },
    );
  }

  async getTicketStats() {
    const stats = await this.collection
      .aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    const priorityStats = await this.collection
      .aggregate([
        {
          $group: {
            _id: "$priority",
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    return { statusStats: stats, priorityStats };
  }
}

module.exports = SupportTicket;
