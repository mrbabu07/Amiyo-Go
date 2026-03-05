const { ObjectId } = require("mongodb");

// Vendor Registration
exports.registerVendor = async (req, res) => {
  try {
    const { shopName, phone, address, allowedCategoryIds, payoutMethod } = req.body;
    const Vendor = req.app.locals.models.Vendor;
    const Category = req.app.locals.models.Category;
    const User = req.app.locals.models.User;

    // Minimal validation: require basic identity + at least one category.
    if (!shopName || !phone || !allowedCategoryIds || allowedCategoryIds.length === 0) {
      return res.status(400).json({ 
        error: "Shop name, phone, and at least one category are required" 
      });
    }

    // Check if user already has a vendor account
    const existingVendor = await Vendor.findByUserId(req.user._id);
    if (existingVendor) {
      return res.status(400).json({ 
        error: "You already have a vendor account. Each user can only have one vendor account." 
      });
    }

    // Check if user's email is already used by another vendor
    // This prevents creating multiple vendor accounts with the same email
    const user = await User.findById(req.user._id);
    const vendorWithSameEmail = await Vendor.collection.findOne({
      "ownerUserId": { $ne: req.user._id }
    });
    
    // Additional check: prevent if user already has vendor role
    if (user.role === "vendor") {
      return res.status(400).json({
        error: "Your account is already registered as a vendor. Contact admin if you need assistance."
      });
    }

    // Generate unique slug
    const baseSlug = shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    let slug = baseSlug;
    let counter = 1;
    
    while (await Vendor.findBySlug(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create vendor
    const vendorData = {
      ownerUserId: req.user._id,
      shopName,
      slug,
      phone,
      address,
      // Trust the IDs coming from the form; they are taken from
      // the active categories list in the frontend.
      allowedCategoryIds,
      payoutMethod: payoutMethod || null,
    };

    const vendor = await Vendor.create(vendorData);

    res.status(201).json({
      message: "Vendor registration submitted successfully. Pending admin approval.",
      vendor,
    });
  } catch (error) {
    console.error("Error registering vendor:", error);
    res.status(500).json({ error: "Failed to register vendor" });
  }
};

// Get current vendor profile
exports.getMyVendorProfile = async (req, res) => {
  try {
    const Vendor = req.app.locals.models.Vendor;
    const vendor = await Vendor.findByUserId(req.user._id);

    if (!vendor) {
      return res.status(404).json({ error: "Vendor profile not found" });
    }

    res.json({ vendor });
  } catch (error) {
    console.error("Error fetching vendor profile:", error);
    res.status(500).json({ error: "Failed to fetch vendor profile" });
  }
};

// Update vendor profile
exports.updateVendorProfile = async (req, res) => {
  try {
    const { shopName, phone, address, payoutMethod } = req.body;
    const Vendor = req.app.locals.models.Vendor;

    const vendor = await Vendor.findByUserId(req.user._id);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor profile not found" });
    }

    // Vendors cannot change their allowed categories after registration
    const updateData = {};
    if (shopName) updateData.shopName = shopName;
    if (phone) updateData.phone = phone;
    if (address) updateData.address = address;
    if (payoutMethod) updateData.payoutMethod = payoutMethod;

    await Vendor.update(vendor._id, updateData);

    const updatedVendor = await Vendor.findById(vendor._id);
    res.json({ 
      message: "Vendor profile updated successfully",
      vendor: updatedVendor 
    });
  } catch (error) {
    console.error("Error updating vendor profile:", error);
    res.status(500).json({ error: "Failed to update vendor profile" });
  }
};

// Admin: Get all vendors
exports.getAllVendors = async (req, res) => {
  try {
    const { status, page, limit } = req.query;
    const Vendor = req.app.locals.models.Vendor;

    const filter = {};
    if (status) filter.status = status;
    if (page) filter.page = parseInt(page);
    if (limit) filter.limit = parseInt(limit);

    const result = await Vendor.findAll(filter);
    res.json(result);
  } catch (error) {
    console.error("Error fetching vendors:", error);
    res.status(500).json({ error: "Failed to fetch vendors" });
  }
};

// Admin: Get vendor by ID
exports.getVendorById = async (req, res) => {
  try {
    const { id } = req.params;
    const Vendor = req.app.locals.models.Vendor;

    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    res.json({ vendor });
  } catch (error) {
    console.error("Error fetching vendor:", error);
    res.status(500).json({ error: "Failed to fetch vendor" });
  }
};

// Admin: Approve vendor
exports.approveVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const Vendor = req.app.locals.models.Vendor;
    const User = req.app.locals.models.User;

    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    // Update vendor status to approved
    await Vendor.updateStatus(id, "approved");

    // Update user role to "vendor"
    const user = await User.findById(vendor.ownerUserId);
    if (user && user.role === "customer") {
      await User.updateRole(user.firebaseUid, "vendor", req.user.uid);
      console.log(`✅ User ${user.email} role updated to vendor`);
    }

    res.json({ 
      message: "Vendor approved successfully. User role updated to vendor.",
      vendor: await Vendor.findById(id)
    });
  } catch (error) {
    console.error("Error approving vendor:", error);
    res.status(500).json({ error: "Failed to approve vendor" });
  }
};

// Admin: Suspend vendor
exports.suspendVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const Vendor = req.app.locals.models.Vendor;
    const User = req.app.locals.models.User;

    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    // Update vendor status to suspended
    await Vendor.updateStatus(id, "suspended");

    // Update user role back to "customer"
    const user = await User.findById(vendor.ownerUserId);
    if (user && user.role === "vendor") {
      await User.updateRole(user.firebaseUid, "customer", req.user.uid);
      console.log(`✅ User ${user.email} role reverted to customer`);
    }

    res.json({ 
      message: "Vendor suspended successfully. User role reverted to customer.",
      vendor: await Vendor.findById(id)
    });
  } catch (error) {
    console.error("Error suspending vendor:", error);
    res.status(500).json({ error: "Failed to suspend vendor" });
  }
};

// Admin: Get vendor stats
exports.getVendorStats = async (req, res) => {
  try {
    const Vendor = req.app.locals.models.Vendor;
    const stats = await Vendor.getStats();
    res.json({ stats });
  } catch (error) {
    console.error("Error fetching vendor stats:", error);
    res.status(500).json({ error: "Failed to fetch vendor stats" });
  }
};

// Admin: Reject vendor
exports.rejectVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const Vendor = req.app.locals.models.Vendor;
    const User = req.app.locals.models.User;

    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    await Vendor.updateStatus(id, "rejected");
    if (reason) {
      await Vendor.update(id, { rejectionReason: reason });
    }

    // Revert user role back to customer if they were approved previously
    const user = await User.findById(vendor.ownerUserId);
    if (user && user.role === "vendor") {
      await User.updateRole(user.firebaseUid, "customer", req.user.uid);
    }

    res.json({
      message: "Vendor rejected.",
      vendor: await Vendor.findById(id),
    });
  } catch (error) {
    console.error("Error rejecting vendor:", error);
    res.status(500).json({ error: "Failed to reject vendor" });
  }
};

// Admin: Reactivate vendor (approved → approved, rejected/suspended → approved)
exports.reactivateVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const Vendor = req.app.locals.models.Vendor;
    const User = req.app.locals.models.User;

    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    await Vendor.updateStatus(id, "approved");

    // Restore user role to vendor
    const user = await User.findById(vendor.ownerUserId);
    if (user && user.role !== "vendor") {
      await User.updateRole(user.firebaseUid, "vendor", req.user.uid);
    }

    res.json({
      message: "Vendor reactivated and approved.",
      vendor: await Vendor.findById(id),
    });
  } catch (error) {
    console.error("Error reactivating vendor:", error);
    res.status(500).json({ error: "Failed to reactivate vendor" });
  }
};

// Admin: Update vendor (including categories)
exports.updateVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const { allowedCategoryIds } = req.body;
    const Vendor = req.app.locals.models.Vendor;
    const Category = req.app.locals.models.Category;

    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    // If updating categories, just ensure there is at least one ID.
    if (allowedCategoryIds && allowedCategoryIds.length === 0) {
      return res.status(400).json({
        error: "At least one category is required",
      });
    }

    await Vendor.update(id, req.body);

    res.json({ 
      message: "Vendor updated successfully",
      vendor: await Vendor.findById(id)
    });
  } catch (error) {
    console.error("Error updating vendor:", error);
    res.status(500).json({ error: "Failed to update vendor" });
  }
};
