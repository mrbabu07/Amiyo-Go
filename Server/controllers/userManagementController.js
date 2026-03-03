const CustomerInsight = require("../models/CustomerInsight");

// User Management
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, status, search } = req.query;

    const User = req.app.locals.models.User;
    const result = await User.findAll({
      page: parseInt(page),
      limit: parseInt(limit),
      role,
      status,
      search,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch users",
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const User = req.app.locals.models.User;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch user",
    });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const updatedBy = req.user.uid;

    const User = req.app.locals.models.User;

    // First get the user to find their firebaseUid
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    await User.updateRole(user.firebaseUid, role, updatedBy);

    res.json({
      success: true,
      message: "User role updated successfully",
    });
  } catch (error) {
    console.error("Error updating user role:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update user role",
    });
  }
};

const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updatedBy = req.user.uid;

    const User = req.app.locals.models.User;

    // First get the user to find their firebaseUid
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    await User.updateStatus(user.firebaseUid, status, updatedBy);

    res.json({
      success: true,
      message: "User status updated successfully",
    });
  } catch (error) {
    console.error("Error updating user status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update user status",
    });
  }
};

const updateUserPermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;
    const updatedBy = req.user.uid;

    const User = req.app.locals.models.User;

    // First get the user to find their firebaseUid
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    await User.updatePermissions(user.firebaseUid, permissions, updatedBy);

    res.json({
      success: true,
      message: "User permissions updated successfully",
    });
  } catch (error) {
    console.error("Error updating user permissions:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update user permissions",
    });
  }
};

const getStaffUsers = async (req, res) => {
  try {
    const User = req.app.locals.models.User;
    const staff = await User.getStaffUsers();

    res.json({
      success: true,
      staff,
    });
  } catch (error) {
    console.error("Error fetching staff users:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch staff users",
    });
  }
};

const getUserStats = async (req, res) => {
  try {
    const User = req.app.locals.models.User;
    const stats = await User.getUserStats();

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch user stats",
    });
  }
};

// Customer Insights
const getCustomerInsight = async (req, res) => {
  try {
    const { userId } = req.params;

    const CustomerInsightModel = new CustomerInsight(req.app.locals.db);
    const insight = await CustomerInsightModel.getInsight(userId);

    res.json({
      success: true,
      insight,
    });
  } catch (error) {
    console.error("Error fetching customer insight:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch customer insight",
    });
  }
};

const getAllCustomerInsights = async (req, res) => {
  try {
    const { page = 1, limit = 20, segment, sortBy } = req.query;

    const CustomerInsightModel = new CustomerInsight(req.app.locals.db);
    const result = await CustomerInsightModel.getAllCustomerInsights({
      page: parseInt(page),
      limit: parseInt(limit),
      segment,
      sortBy,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error fetching customer insights:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch customer insights",
    });
  }
};

const generateCustomerInsight = async (req, res) => {
  try {
    const { userId } = req.params;

    const CustomerInsightModel = new CustomerInsight(req.app.locals.db);
    const insight = await CustomerInsightModel.generateInsight(userId);

    res.json({
      success: true,
      message: "Customer insight generated successfully",
      insight,
    });
  } catch (error) {
    console.error("Error generating customer insight:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate customer insight",
    });
  }
};

const getCustomerSegmentStats = async (req, res) => {
  try {
    const CustomerInsightModel = new CustomerInsight(req.app.locals.db);
    const stats = await CustomerInsightModel.getCustomerSegmentStats();

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error fetching customer segment stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch customer segment stats",
    });
  }
};

// Permission checking middleware
const checkPermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      const User = req.app.locals.models.User;
      const hasPermission = await User.hasPermission(
        req.user.uid,
        resource,
        action,
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: "Insufficient permissions",
        });
      }

      next();
    } catch (error) {
      console.error("Error checking permissions:", error);
      res.status(500).json({
        success: false,
        error: "Permission check failed",
      });
    }
  };
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUserRole,
  updateUserStatus,
  updateUserPermissions,
  getStaffUsers,
  getUserStats,
  getCustomerInsight,
  getAllCustomerInsights,
  generateCustomerInsight,
  getCustomerSegmentStats,
  checkPermission,
};
