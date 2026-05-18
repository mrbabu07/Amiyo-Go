const { ObjectId } = require("mongodb");

const normalizeId = (value) => (value?.toString ? value.toString() : String(value || ""));
const toObjectId = (value) => (ObjectId.isValid(normalizeId(value)) ? new ObjectId(normalizeId(value)) : null);

const idQuery = (id) => {
  const objectId = toObjectId(id);
  return objectId ? { _id: objectId } : { _id: normalizeId(id) };
};

const idValues = (id) => {
  const value = normalizeId(id);
  const objectId = toObjectId(value);
  return [value, objectId].filter(Boolean);
};

class Promotion {
  constructor(db) {
    this.collection = db.collection("promotions");
    this.rulesCollection = db.collection("promotion_rules");
    this.targetsCollection = db.collection("promotion_targets");
    this.redemptionsCollection = db.collection("promotion_redemptions");
    this.snapshotsCollection = db.collection("promotion_snapshots");
    this.eventsCollection = db.collection("growth_events");
    this.dailyAggregatesCollection = db.collection("growth_daily_aggregates");
    this.notificationTemplatesCollection = db.collection("notification_templates");
    this.notificationQueueCollection = db.collection("notification_queue");
    this.experimentsCollection = db.collection("experiments");
    this.experimentAssignmentsCollection = db.collection("experiment_assignments");
    this.createIndexes();
  }

  async createIndexes() {
    try {
      await this.collection.createIndex?.({ status: 1, startsAt: 1, endsAt: 1 });
      await this.collection.createIndex?.({ code: 1 }, { sparse: true });
      await this.collection.createIndex?.({ type: 1, priority: -1 });
      await this.collection.createIndex?.({ vendorId: 1 });
      await this.rulesCollection.createIndex?.({ promotionId: 1 });
      await this.targetsCollection.createIndex?.({ promotionId: 1, targetType: 1, targetId: 1 });
      await this.redemptionsCollection.createIndex?.({ promotionId: 1, userId: 1 });
      await this.redemptionsCollection.createIndex?.({ orderId: 1 });
      await this.snapshotsCollection.createIndex?.({ orderId: 1 });
      await this.eventsCollection.createIndex?.({ eventName: 1, timestamp: -1 });
      await this.eventsCollection.createIndex?.({ userId: 1, timestamp: -1 });
      await this.dailyAggregatesCollection.createIndex?.({ dateKey: 1, eventName: 1 }, { unique: true });
      await this.notificationTemplatesCollection.createIndex?.({ eventName: 1, channel: 1 }, { unique: true });
      await this.notificationQueueCollection.createIndex?.({ status: 1, scheduledFor: 1 });
      await this.experimentsCollection.createIndex?.({ status: 1, key: 1 });
      await this.experimentAssignmentsCollection.createIndex?.({ experimentKey: 1, subjectId: 1 }, { unique: true });
    } catch (error) {
      console.error("Error creating Promotion indexes:", error);
    }
  }

  async create(data = {}) {
    const now = new Date();
    const doc = {
      ...data,
      code: data.code ? String(data.code).trim().toUpperCase() : null,
      status: data.status || "scheduled",
      priority: Number(data.priority || 100),
      stackable: data.stackable !== false,
      usedCount: Number(data.usedCount || 0),
      totalDiscountGiven: Number(data.totalDiscountGiven || 0),
      createdAt: now,
      updatedAt: now,
    };
    const result = await this.collection.insertOne(doc);
    return { ...doc, _id: result.insertedId };
  }

  async findById(id) {
    return this.collection.findOne(idQuery(id));
  }

  async findByCode(code) {
    if (!code) return null;
    return this.collection.findOne({ code: String(code).trim().toUpperCase() });
  }

  async list(filter = {}) {
    const query = {};
    if (filter.type && filter.type !== "all") query.type = filter.type;
    if (filter.status && filter.status !== "all") query.status = filter.status;
    if (filter.vendorId) query.vendorId = { $in: idValues(filter.vendorId) };
    if (filter.code) query.code = String(filter.code).trim().toUpperCase();
    return this.collection.find(query).sort({ priority: -1, createdAt: -1 }).toArray();
  }

  async listActive(now = new Date()) {
    return this.collection
      .find({
        status: { $in: ["active", "scheduled"] },
        $or: [{ startsAt: null }, { startsAt: { $lte: now } }, { startDate: { $lte: now } }],
        $and: [
          {
            $or: [{ endsAt: null }, { endsAt: { $gte: now } }, { endDate: { $gte: now } }],
          },
        ],
      })
      .sort({ priority: -1, createdAt: -1 })
      .toArray();
  }

  async update(id, data = {}) {
    const { _id, createdAt, ...safeData } = data;
    const update = {
      ...safeData,
      ...(safeData.code ? { code: String(safeData.code).trim().toUpperCase() } : {}),
      updatedAt: new Date(),
    };
    await this.collection.updateOne(idQuery(id), { $set: update });
    return this.findById(id);
  }

  async setStatus(id, status) {
    await this.collection.updateOne(idQuery(id), { $set: { status, updatedAt: new Date() } });
    return this.findById(id);
  }

  async duplicate(id, overrides = {}) {
    const source = await this.findById(id);
    if (!source) throw new Error("Promotion not found");
    const { _id, createdAt, updatedAt, usedCount, totalDiscountGiven, ...copyable } = source;
    return this.create({
      ...copyable,
      ...overrides,
      code: overrides.code || (copyable.code ? `${copyable.code}_COPY` : null),
      status: overrides.status || "draft",
      usedCount: 0,
      totalDiscountGiven: 0,
      copiedFromPromotionId: normalizeId(_id),
    });
  }

  async countUserRedemptions(promotionId, userId) {
    if (!userId) return 0;
    return this.redemptionsCollection.countDocuments({
      promotionId: normalizeId(promotionId),
      userId: normalizeId(userId),
    });
  }

  async recordRedemption({ promotion, userId, orderId, discountAmount = 0, snapshot = {} }) {
    if (!promotion?._id) return null;
    const now = new Date();
    const row = {
      promotionId: normalizeId(promotion._id),
      promotionCode: promotion.code || null,
      promotionType: promotion.type,
      userId: normalizeId(userId),
      orderId: normalizeId(orderId),
      discountAmount: Number(discountAmount || 0),
      snapshot,
      redeemedAt: now,
      createdAt: now,
    };
    await this.redemptionsCollection.insertOne(row);
    await this.collection.updateOne(idQuery(promotion._id), {
      $inc: {
        usedCount: 1,
        totalDiscountGiven: Number(discountAmount || 0),
      },
      $set: { updatedAt: now },
    });
    return row;
  }

  async snapshotForOrder({ orderId, userId = null, result = {}, source = "checkout" }) {
    const now = new Date();
    const doc = {
      orderId: normalizeId(orderId),
      userId: userId ? normalizeId(userId) : null,
      source,
      version: result.version || 1,
      appliedPromotions: result.appliedPromotions || [],
      rejectedPromotions: result.rejectedPromotions || [],
      totals: result.totals || {},
      rules: result.rules || {},
      createdAt: now,
    };
    const inserted = await this.snapshotsCollection.insertOne(doc);
    return { ...doc, _id: inserted.insertedId };
  }
}

module.exports = Promotion;
