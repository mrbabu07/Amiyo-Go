class PlatformSettings {
  constructor(db) {
    this.collection = db.collection("platform_settings");
    this.createIndexes();
  }

  async createIndexes() {
    try {
      await this.collection.createIndex({ updatedAt: -1 });
    } catch (error) {
      console.error("Error creating PlatformSettings indexes:", error);
    }
  }

  async getControlSettings() {
    return this.collection.findOne({ _id: "platform_control" });
  }

  async updateControlSettings(patch = {}) {
    const now = new Date();
    await this.collection.updateOne(
      { _id: "platform_control" },
      {
        $set: {
          ...patch,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true },
    );
    return this.getControlSettings();
  }
}

module.exports = PlatformSettings;
