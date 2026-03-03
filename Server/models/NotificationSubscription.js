const { ObjectId } = require("mongodb");

class NotificationSubscription {
  constructor(db) {
    this.collection = db.collection("notificationSubscriptions");
  }

  async create(subscriptionData) {
    const subscription = {
      ...subscriptionData,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    };

    const result = await this.collection.insertOne(subscription);
    return result.insertedId;
  }

  async findByUserId(userId) {
    return await this.collection
      .find({ userId, isActive: true })
      .sort({ createdAt: -1 })
      .toArray();
  }

  async findByEndpoint(endpoint) {
    return await this.collection.findOne({
      "subscription.endpoint": endpoint,
      isActive: true,
    });
  }

  async updatePreferences(userId, preferences) {
    return await this.collection.updateMany(
      { userId, isActive: true },
      {
        $set: {
          preferences,
          updatedAt: new Date(),
        },
      },
    );
  }

  async deactivate(endpoint) {
    return await this.collection.updateOne(
      { "subscription.endpoint": endpoint },
      {
        $set: {
          isActive: false,
          updatedAt: new Date(),
        },
      },
    );
  }

  async findActiveSubscriptions(userIds = null) {
    const query = { isActive: true };
    if (userIds) {
      query.userId = { $in: userIds };
    }

    return await this.collection.find(query).toArray();
  }

  async findByNotificationType(notificationType, userIds = null) {
    const query = {
      isActive: true,
      [`preferences.${notificationType}`]: true,
    };

    if (userIds) {
      query.userId = { $in: userIds };
    }

    return await this.collection.find(query).toArray();
  }

  async cleanup() {
    // Remove subscriptions older than 6 months that are inactive
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    return await this.collection.deleteMany({
      isActive: false,
      updatedAt: { $lt: sixMonthsAgo },
    });
  }
}

module.exports = NotificationSubscription;
