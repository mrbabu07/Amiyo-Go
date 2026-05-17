const { ObjectId } = require("mongodb");
const { STAFF_ROLES, getDefaultPermissions } = require("../config/permissions");

class User {
  constructor(db) {
    this.collection = db.collection("users");
    this.createIndexes();
  }

  async createIndexes() {
    try {
      await this.collection.createIndex({ firebaseUid: 1 }, { unique: true });
      await this.collection.createIndex({ email: 1 });
      await this.collection.createIndex({ role: 1 });
      await this.collection.createIndex({ createdAt: -1 });
    } catch (error) {
      console.error("Error creating User indexes:", error);
    }
  }

  async findByFirebaseUid(firebaseUid) {
    return await this.collection.findOne({ firebaseUid });
  }

  async findById(id) {
    return await this.collection.findOne({ _id: new ObjectId(id) });
  }

  async findByEmail(email) {
    return await this.collection.findOne({ email });
  }

  async create(userData) {
    const user = {
      ...userData,
      role: userData.role || "customer",
      permissions: this.getDefaultPermissions(userData.role || "customer"),
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLogin: new Date(),
      profile: {
        firstName: userData.firstName || "",
        lastName: userData.lastName || "",
        phone: userData.phone || "",
        avatar: userData.avatar || "",
        preferences: {
          notifications: true,
          marketing: false,
          theme: "light",
        },
      },
    };

    const result = await this.collection.insertOne(user);
    return { ...user, _id: result.insertedId };
  }

  async updateRole(firebaseUid, role, updatedBy) {
    const permissions = this.getDefaultPermissions(role);
    return await this.collection.updateOne(
      { firebaseUid },
      {
        $set: {
          role,
          permissions,
          updatedAt: new Date(),
          updatedBy,
        },
      },
    );
  }

  async updatePermissions(firebaseUid, permissions, updatedBy) {
    return await this.collection.updateOne(
      { firebaseUid },
      {
        $set: {
          permissions,
          updatedAt: new Date(),
          updatedBy,
        },
      },
    );
  }

  async updateProfile(firebaseUid, profileData) {
    return await this.collection.updateOne(
      { firebaseUid },
      {
        $set: {
          "profile.firstName": profileData.firstName,
          "profile.lastName": profileData.lastName,
          "profile.phone": profileData.phone,
          "profile.avatar": profileData.avatar,
          updatedAt: new Date(),
        },
      },
    );
  }

  async updateStatus(firebaseUid, status, updatedBy) {
    return await this.collection.updateOne(
      { firebaseUid },
      {
        $set: {
          status,
          updatedAt: new Date(),
          updatedBy,
        },
      },
    );
  }

  async updateLastLogin(firebaseUid) {
    return await this.collection.updateOne(
      { firebaseUid },
      { $set: { lastLogin: new Date() } },
    );
  }

  async findAll(options = {}) {
    const { page = 1, limit = 20, role, status, search } = options;
    const query = {};

    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: "i" } },
        { "profile.firstName": { $regex: search, $options: "i" } },
        { "profile.lastName": { $regex: search, $options: "i" } },
      ];
    }

    const users = await this.collection
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    const total = await this.collection.countDocuments(query);

    return {
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getStaffUsers() {
    return await this.collection
      .find({
        role: { $in: STAFF_ROLES },
      })
      .sort({ createdAt: -1 })
      .toArray();
  }

  async getUserStats() {
    const stats = await this.collection
      .aggregate([
        {
          $group: {
            _id: "$role",
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    const statusStats = await this.collection
      .aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    const totalUsers = await this.collection.countDocuments();
    const activeUsers = await this.collection.countDocuments({
      status: "active",
    });
    const newUsersThisMonth = await this.collection.countDocuments({
      createdAt: { $gte: new Date(new Date().setDate(1)) },
    });

    return {
      roleStats: stats,
      statusStats,
      totalUsers,
      activeUsers,
      newUsersThisMonth,
    };
  }

  getDefaultPermissions(role) {
    return getDefaultPermissions(role);
  }

  async hasPermission(firebaseUid, resource, action) {
    const user = await this.findByFirebaseUid(firebaseUid);
    if (!user || !user.permissions) return false;

    const resourcePermissions = user.permissions[resource];
    return resourcePermissions && resourcePermissions.includes(action);
  }
}

module.exports = User;
