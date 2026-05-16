class AuditLog {
  constructor(db) {
    this.collection = db.collection("audit_logs");
    this.createIndexes();
  }

  async createIndexes() {
    try {
      await this.collection.createIndex({ createdAt: -1 });
      await this.collection.createIndex({ "actor.userId": 1, createdAt: -1 });
      await this.collection.createIndex({ action: 1, createdAt: -1 });
      await this.collection.createIndex({ "target.type": 1, "target.id": 1 });
    } catch (error) {
      console.error("Error creating AuditLog indexes:", error);
    }
  }

  async append(log) {
    return await this.collection.insertOne({
      ...log,
      createdAt: new Date(),
    });
  }

  async findAll(filter = {}) {
    const { page = 1, limit = 50, actorId, action, targetType } = filter;
    const query = {};

    if (actorId) query["actor.userId"] = actorId;
    if (action) query.action = { $regex: action, $options: "i" };
    if (targetType) query["target.type"] = targetType;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);

    const [logs, total] = await Promise.all([
      this.collection
        .find(query)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .toArray(),
      this.collection.countDocuments(query),
    ]);

    return {
      logs,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }
}

module.exports = AuditLog;
