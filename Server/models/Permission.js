class Permission {
  constructor(db) {
    this.collection = db.collection("permissions");
    this.createIndexes();
  }

  async createIndexes() {
    try {
      await this.collection.createIndex({ role: 1 }, { unique: true });
      await this.collection.createIndex({ updatedAt: -1 });
    } catch (error) {
      console.error("Error creating Permission indexes:", error);
    }
  }

  async syncDefaults(defaults) {
    const now = new Date();

    await Promise.all(
      Object.entries(defaults).map(([role, permissions]) =>
        this.collection.updateOne(
          { role },
          {
            $setOnInsert: {
              role,
              permissions,
              createdAt: now,
            },
            $set: {
              defaultPermissions: permissions,
              updatedAt: now,
            },
          },
          { upsert: true },
        ),
      ),
    );
  }

  async findByRole(role) {
    return await this.collection.findOne({ role });
  }
}

module.exports = Permission;
