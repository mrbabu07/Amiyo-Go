const { ObjectId } = require("mongodb");

const normalizeId = (value) => (value?.toString ? value.toString() : String(value || ""));

class NotificationDeliveryLog {
  constructor(db) {
    this.collection = db.collection("notification_deliveries");
    this.createIndexes();
  }

  async createIndexes() {
    try {
      await this.collection.createIndex({ status: 1, createdAt: -1 });
      await this.collection.createIndex({ userId: 1, createdAt: -1 });
      await this.collection.createIndex({ channel: 1, status: 1 });
      await this.collection.createIndex({ retryOf: 1 }, { sparse: true });
    } catch (error) {
      console.error("Error creating NotificationDeliveryLog indexes:", error);
    }
  }

  async record(delivery = {}) {
    const now = new Date();
    const doc = {
      channel: delivery.channel || "push",
      status: delivery.status || (delivery.error ? "failed" : "sent"),
      userId: delivery.userId ? normalizeId(delivery.userId) : null,
      notificationType: delivery.notificationType || delivery.type || delivery.payload?.type || delivery.payload?.data?.type || null,
      title: delivery.title || delivery.payload?.title || "",
      body: delivery.body || delivery.payload?.body || "",
      data: delivery.data || delivery.payload?.data || {},
      endpoint: delivery.endpoint || null,
      provider: delivery.provider || "web-push",
      mock: delivery.mock === true,
      error: delivery.error || null,
      statusCode: delivery.statusCode || null,
      retryOf: delivery.retryOf || null,
      retryable: delivery.retryable !== false,
      attempts: Number(delivery.attempts || 1),
      createdAt: now,
      updatedAt: now,
      ...(delivery.status === "failed" || delivery.error ? { failedAt: now } : { sentAt: now }),
    };

    const result = await this.collection.insertOne(doc);
    return { ...doc, _id: result.insertedId };
  }

  async list(filter = {}, options = {}) {
    const query = {};
    if (filter.status && filter.status !== "all") query.status = filter.status;
    if (filter.channel && filter.channel !== "all") query.channel = filter.channel;
    if (filter.userId) query.userId = normalizeId(filter.userId);

    return this.collection
      .find(query)
      .sort(options.sort || { createdAt: -1 })
      .limit(Math.min(Number(options.limit || 50), 200))
      .toArray();
  }

  async findById(id) {
    const objectId = ObjectId.isValid(normalizeId(id)) ? new ObjectId(normalizeId(id)) : id;
    return this.collection.findOne({ _id: objectId });
  }

  async markRetried(id, result = {}) {
    const objectId = ObjectId.isValid(normalizeId(id)) ? new ObjectId(normalizeId(id)) : id;
    await this.collection.updateOne(
      { _id: objectId },
      {
        $set: {
          status: result.failed > 0 ? "retry_failed" : "retried",
          retryResult: result,
          retriedAt: new Date(),
          updatedAt: new Date(),
        },
        $inc: { attempts: 1 },
      },
    );
    return this.findById(id);
  }
}

module.exports = NotificationDeliveryLog;
