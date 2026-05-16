class AnalyticsSummary {
  constructor(db) {
    this.collection = db.collection("analytics_summaries");
    this.createIndexes();
  }

  async createIndexes() {
    try {
      await this.collection.createIndex(
        { granularity: 1, dateKey: 1 },
        { unique: true },
      );
      await this.collection.createIndex({ date: -1 });
    } catch (error) {
      console.error("Error creating AnalyticsSummary indexes:", error);
    }
  }

  async upsert(summary) {
    return this.collection.updateOne(
      { granularity: summary.granularity, dateKey: summary.dateKey },
      {
        $set: {
          ...summary,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );
  }

  async findRange({ granularity = "daily", start, end } = {}) {
    const query = { granularity };
    if (start || end) {
      query.date = {};
      if (start) query.date.$gte = new Date(start);
      if (end) query.date.$lte = new Date(end);
    }

    return this.collection.find(query).sort({ date: 1 }).toArray();
  }
}

module.exports = AnalyticsSummary;
