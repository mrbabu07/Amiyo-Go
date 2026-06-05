const { ObjectId } = require("mongodb");
const { withResolvedNotificationLink } = require("../utils/notificationTargets");

class Notification {
  constructor(db) {
    this.collection = db.collection("notifications");
    this.createIndexes();
  }

  async createIndexes() {
    try {
      await this.collection.createIndex({ userId: 1, createdAt: -1 });
      await this.collection.createIndex({ isRead: 1 });
      await this.collection.createIndex({ type: 1 });
    } catch (error) {
      console.error("Error creating Notification indexes:", error);
    }
  }

  async create(notificationData) {
    const notification = {
      ...withResolvedNotificationLink(notificationData),
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await this.collection.insertOne(notification);
    return { ...notification, _id: result.insertedId };
  }

  async findByUserId(userId, options = {}) {
    const { limit = 10, skip = 0, unreadOnly = false } = options;
    const query = { userId };

    if (unreadOnly) {
      query.isRead = false;
    }

    const rows = await this.collection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return rows.map((row) => withResolvedNotificationLink(row));
  }

  async markAsRead(notificationId, userId) {
    return await this.collection.updateOne(
      { _id: new ObjectId(notificationId), userId },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );
  }

  async markAllAsRead(userId) {
    return await this.collection.updateMany(
      { userId, isRead: false },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );
  }

  async delete(notificationId, userId) {
    return await this.collection.deleteOne({
      _id: new ObjectId(notificationId),
      userId,
    });
  }

  async getUnreadCount(userId) {
    return await this.collection.countDocuments({
      userId,
      isRead: false,
    });
  }

  async deleteOld(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return await this.collection.deleteMany({
      createdAt: { $lt: cutoffDate },
      isRead: true,
    });
  }
}

module.exports = Notification;
