const { ObjectId } = require("mongodb");

// Get all users with filtering
exports.getAllUsers = async (req, res) => {
  try {
    const { page, limit, role, status, search } = req.query;
    const User = req.app.locals.models.User;

    const result = await User.findAll({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
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
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const User = req.app.locals.models.User;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
};

// Update user role (admin only)
exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const User = req.app.locals.models.User;
    const Vendor = req.app.locals.models.Vendor;

    // Validate role
    const validRoles = ["customer", "vendor", "admin"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        error: `Invalid role. Must be one of: ${validRoles.join(", ")}`,
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Prevent changing own role
    if (user.firebaseUid === req.user.uid) {
      return res.status(403).json({
        error: "You cannot change your own role",
      });
    }

    const oldRole = user.role;

    // Update user role
    await User.updateRole(user.firebaseUid, role, req.user.uid);

    // Handle vendor-specific logic
    if (role === "vendor" && oldRole !== "vendor") {
      // Check if vendor account exists
      const vendor = await Vendor.findByUserId(user._id);
      if (!vendor) {
        return res.status(400).json({
          error: "User must register as vendor first before role can be changed to vendor",
        });
      }
      // Approve vendor if not already approved
      if (vendor.status !== "approved") {
        await Vendor.updateStatus(vendor._id, "approved");
      }
    } else if (role !== "vendor" && oldRole === "vendor") {
      // Suspend vendor account when role changes from vendor
      const vendor = await Vendor.findByUserId(user._id);
      if (vendor && vendor.status === "approved") {
        await Vendor.updateStatus(vendor._id, "suspended");
      }
    }

    const updatedUser = await User.findById(id);

    res.json({
      success: true,
      message: `User role updated from ${oldRole} to ${role}`,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user role:", error);
    res.status(500).json({ error: "Failed to update user role" });
  }
};

// Update user status
exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const User = req.app.locals.models.User;

    const validStatuses = ["active", "suspended", "banned"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Prevent changing own status
    if (user.firebaseUid === req.user.uid) {
      return res.status(403).json({
        error: "You cannot change your own status",
      });
    }

    await User.updateStatus(user.firebaseUid, status, req.user.uid);

    const updatedUser = await User.findById(id);

    res.json({
      success: true,
      message: `User status updated to ${status}`,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user status:", error);
    res.status(500).json({ error: "Failed to update user status" });
  }
};

// Get user statistics
exports.getUserStats = async (req, res) => {
  try {
    const User = req.app.locals.models.User;
    const stats = await User.getUserStats();

    res.json({ success: true, stats });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    res.status(500).json({ error: "Failed to fetch user stats" });
  }
};

// Promote customer to vendor (creates vendor account)
exports.promoteToVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const { shopName, phone, address, allowedCategoryIds } = req.body;
    const User = req.app.locals.models.User;
    const Vendor = req.app.locals.models.Vendor;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.role === "vendor") {
      return res.status(400).json({ error: "User is already a vendor" });
    }

    // Check if vendor account already exists
    const existingVendor = await Vendor.findByUserId(user._id);
    if (existingVendor) {
      // Just update role and approve vendor
      await User.updateRole(user.firebaseUid, "vendor", req.user.uid);
      await Vendor.updateStatus(existingVendor._id, "approved");

      return res.json({
        success: true,
        message: "User promoted to vendor and vendor account approved",
        user: await User.findById(id),
        vendor: await Vendor.findById(existingVendor._id),
      });
    }

    // Create vendor account
    if (!shopName || !allowedCategoryIds || allowedCategoryIds.length === 0) {
      return res.status(400).json({
        error: "Shop name and at least one category are required to create vendor account",
      });
    }

    // Generate unique slug
    const baseSlug = shopName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    let slug = baseSlug;
    let counter = 1;

    while (await Vendor.findBySlug(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create vendor
    const vendorData = {
      ownerUserId: user._id,
      shopName,
      slug,
      phone: phone || user.profile?.phone || "",
      address: address || {},
      allowedCategoryIds,
      status: "approved", // Auto-approve when admin creates
      payoutMethod: null,
    };

    const vendor = await Vendor.create(vendorData);

    // Update user role
    await User.updateRole(user.firebaseUid, "vendor", req.user.uid);

    res.json({
      success: true,
      message: "User promoted to vendor successfully",
      user: await User.findById(id),
      vendor,
    });
  } catch (error) {
    console.error("Error promoting user to vendor:", error);
    res.status(500).json({ error: "Failed to promote user to vendor" });
  }
};

module.exports = exports;
