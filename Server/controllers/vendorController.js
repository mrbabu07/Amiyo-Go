const { ObjectId } = require("mongodb");

// Public: Get vendor public information (for product pages)
exports.getVendorPublicInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const Vendor = req.app.locals.models.Vendor;
    const Product = req.app.locals.models.Product;

    // Validate ObjectId
    if (!id || typeof id !== "string" || id.length !== 24) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid vendor ID format" 
      });
    }

    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return res.status(404).json({ 
        success: false, 
        error: "Vendor not found" 
      });
    }

    // Only return public information for approved vendors
    if (vendor.status !== "approved") {
      return res.status(404).json({ 
        success: false, 
        error: "Vendor not available" 
      });
    }

    // Get vendor's product count
    const totalProducts = await Product.collection.countDocuments({
      vendorId: new ObjectId(id),
      isActive: true,
      approvalStatus: "approved"
    });

    // Calculate vendor rating from reviews
    const Review = req.app.locals.models.Review;
    const vendorProducts = await Product.collection
      .find({ vendorId: new ObjectId(id) })
      .project({ _id: 1 })
      .toArray();
    
    const productIds = vendorProducts.map(p => p._id);
    
    let averageRating = 0;
    let totalReviews = 0;
    
    if (productIds.length > 0) {
      const ratingStats = await Review.collection.aggregate([
        { $match: { productId: { $in: productIds } } },
        {
          $group: {
            _id: null,
            avgRating: { $avg: "$rating" },
            count: { $sum: 1 }
          }
        }
      ]).toArray();
      
      if (ratingStats.length > 0) {
        averageRating = Math.round(ratingStats[0].avgRating * 10) / 10;
        totalReviews = ratingStats[0].count;
      }
    }

    // Get total sales from vendor orders
    const VendorOrder = req.app.locals.models.VendorOrder;
    const salesStats = await VendorOrder.collection.aggregate([
      { 
        $match: { 
          vendorId: id,
          status: { $in: ["delivered", "completed"] }
        } 
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: 1 }
        }
      }
    ]).toArray();

    const totalSales = salesStats.length > 0 ? salesStats[0].totalSales : 0;

    // Return public vendor information
    const publicInfo = {
      _id: vendor._id,
      shopName: vendor.shopName,
      slug: vendor.slug,
      logo: vendor.logo || null,
      banner: vendor.banner || null,
      description: vendor.description || null,
      phone: vendor.phone || null,
      email: vendor.email || null,
      address: vendor.address || null,
      status: vendor.status,
      rating: averageRating,
      totalReviews,
      totalProducts,
      totalSales,
      followerCount: vendor.followerCount || 0,
      responseRate: vendor.responseRate || 95, // Default if not calculated
      responseTime: vendor.responseTime || "within hours", // Default
      joinedDate: vendor.createdAt
    };

    res.json({ 
      success: true, 
      data: publicInfo 
    });
  } catch (error) {
    console.error("Error fetching vendor public info:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch vendor information" 
    });
  }
};

// Get follow status
exports.getFollowStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const User = req.app.locals.models.User;

    const user = await User.findById(req.user._id);
    const isFollowing = user.followedVendors?.includes(id) || false;

    res.json({ success: true, isFollowing });
  } catch (error) {
    console.error("Error checking follow status:", error);
    res.status(500).json({ success: false, error: "Failed to check follow status" });
  }
};

// Follow vendor
exports.followVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const User = req.app.locals.models.User;
    const Vendor = req.app.locals.models.Vendor;

    // Check if vendor exists
    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return res.status(404).json({ success: false, error: "Vendor not found" });
    }

    // Add vendor to user's followed list
    await User.collection.updateOne(
      { _id: req.user._id },
      { 
        $addToSet: { followedVendors: id },
        $set: { updatedAt: new Date() }
      }
    );

    // Increment vendor's follower count
    await Vendor.collection.updateOne(
      { _id: vendor._id },
      { 
        $inc: { followerCount: 1 },
        $set: { updatedAt: new Date() }
      }
    );

    res.json({ 
      success: true, 
      message: "Successfully followed vendor",
      isFollowing: true
    });
  } catch (error) {
    console.error("Error following vendor:", error);
    res.status(500).json({ success: false, error: "Failed to follow vendor" });
  }
};

// Unfollow vendor
exports.unfollowVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const User = req.app.locals.models.User;
    const Vendor = req.app.locals.models.Vendor;

    // Remove vendor from user's followed list
    await User.collection.updateOne(
      { _id: req.user._id },
      { 
        $pull: { followedVendors: id },
        $set: { updatedAt: new Date() }
      }
    );

    // Decrement vendor's follower count
    await Vendor.collection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $inc: { followerCount: -1 },
        $set: { updatedAt: new Date() }
      }
    );

    res.json({ 
      success: true, 
      message: "Successfully unfollowed vendor",
      isFollowing: false
    });
  } catch (error) {
    console.error("Error unfollowing vendor:", error);
    res.status(500).json({ success: false, error: "Failed to unfollow vendor" });
  }
};

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
    const { 
      shopName, 
      phone, 
      address, 
      payoutMethod,
      // Bank transfer fields
      bankName,
      bankAccountName,
      bankAccountNumber,
      bankBranch,
      // Mobile banking fields
      mobileBankingProvider,
      mobileBankingNumber
    } = req.body;
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
    
    // Bank transfer fields
    if (bankName !== undefined) updateData.bankName = bankName;
    if (bankAccountName !== undefined) updateData.bankAccountName = bankAccountName;
    if (bankAccountNumber !== undefined) updateData.bankAccountNumber = bankAccountNumber;
    if (bankBranch !== undefined) updateData.bankBranch = bankBranch;
    
    // Mobile banking fields
    if (mobileBankingProvider !== undefined) updateData.mobileBankingProvider = mobileBankingProvider;
    if (mobileBankingNumber !== undefined) updateData.mobileBankingNumber = mobileBankingNumber;

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

// Admin: Get vendor finance summary
exports.getVendorFinanceSummary = async (req, res) => {
  try {
    const { id } = req.params;
    const Order = req.app.locals.models.Order;

    // Get all orders containing this vendor's products
    const orders = await Order.collection
      .find({ "products.vendorId": new ObjectId(id) })
      .toArray();

    let grossSales = 0;
    let totalCommission = 0;
    let netEarnings = 0;
    let ordersCount = 0;

    orders.forEach((order) => {
      const vendorProducts = order.products.filter(
        (p) => p.vendorId && p.vendorId.toString() === id
      );

      if (vendorProducts.length > 0) {
        ordersCount++;
        vendorProducts.forEach((product) => {
          const itemTotal = product.price * product.quantity;
          grossSales += itemTotal;
          totalCommission += product.adminCommissionAmount || 0;
          netEarnings += product.vendorEarningAmount || 0;
        });
      }
    });

    res.json({
      success: true,
      data: {
        grossSales: Math.round(grossSales * 100) / 100,
        totalCommission: Math.round(totalCommission * 100) / 100,
        netEarnings: Math.round(netEarnings * 100) / 100,
        ordersCount,
      },
    });
  } catch (error) {
    console.error("Error fetching vendor finance summary:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch finance summary" 
    });
  }
};

// Admin: Get vendor finance transactions
exports.getVendorFinanceTransactions = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const Order = req.app.locals.models.Order;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get orders with vendor's products
    const orders = await Order.collection
      .find({ "products.vendorId": new ObjectId(id) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();

    // Extract vendor's products as transactions
    const transactions = [];
    orders.forEach((order) => {
      const vendorProducts = order.products.filter(
        (p) => p.vendorId && p.vendorId.toString() === id
      );

      vendorProducts.forEach((product) => {
        transactions.push({
          orderId: order._id,
          date: order.createdAt,
          product: product.name || product.title,
          qty: product.quantity,
          subtotal: product.price * product.quantity,
          commissionRateSnapshot: product.commissionRateSnapshot || 0,
          adminCommissionAmount: product.adminCommissionAmount || 0,
          vendorEarningAmount: product.vendorEarningAmount || 0,
          itemStatus: product.itemStatus || "pending",
        });
      });
    });

    const total = await Order.collection.countDocuments({
      "products.vendorId": new ObjectId(id),
    });

    res.json({
      success: true,
      data: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching vendor transactions:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch transactions" 
    });
  }
};

// Get vendor's allowed categories
exports.getVendorAllowedCategories = async (req, res) => {
  try {
    const vendorId = req.user.vendorId;
    
    if (!vendorId) {
      return res.status(403).json({
        success: false,
        error: "Vendor access required",
      });
    }

    const Vendor = req.app.locals.models.Vendor;
    const Category = req.app.locals.models.Category;

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: "Vendor not found",
      });
    }

    // Get all categories that vendor has access to
    const allowedCategoryIds = vendor.allowedCategoryIds || [];
    
    if (allowedCategoryIds.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: "No categories assigned yet. Please request category access.",
      });
    }

    const categories = await Category.collection
      .find({ 
        _id: { $in: allowedCategoryIds.map(id => new ObjectId(id)) } 
      })
      .toArray();

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Error fetching vendor allowed categories:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch allowed categories",
    });
  }
};

// Upload vendor logo (simplified - stores URL)
exports.uploadLogo = async (req, res) => {
  try {
    const Vendor = req.app.locals.models.Vendor;
    const vendorId = req.user.vendorId;

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        error: "Vendor access required",
      });
    }

    // For now, accept a URL. In production, you'd use multer + cloud storage
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: "Image URL is required",
      });
    }

    await Vendor.collection.updateOne(
      { _id: new ObjectId(vendorId) },
      { $set: { logo: url, updatedAt: new Date() } }
    );

    res.json({
      success: true,
      url,
      message: "Logo uploaded successfully",
    });
  } catch (error) {
    console.error("Error uploading logo:", error);
    res.status(500).json({
      success: false,
      error: "Failed to upload logo",
    });
  }
};

// Upload vendor banner (simplified - stores URL)
exports.uploadBanner = async (req, res) => {
  try {
    const Vendor = req.app.locals.models.Vendor;
    const vendorId = req.user.vendorId;

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        error: "Vendor access required",
      });
    }

    // For now, accept a URL. In production, you'd use multer + cloud storage
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: "Image URL is required",
      });
    }

    await Vendor.collection.updateOne(
      { _id: new ObjectId(vendorId) },
      { $set: { banner: url, updatedAt: new Date() } }
    );

    res.json({
      success: true,
      url,
      message: "Banner uploaded successfully",
    });
  } catch (error) {
    console.error("Error uploading banner:", error);
    res.status(500).json({
      success: false,
      error: "Failed to upload banner",
    });
  }
};

/**
 * Toggle shop status (open/closed)
 * When closed, vendor's products won't show on homepage
 */
exports.toggleShopStatus = async (req, res) => {
  try {
    const Vendor = req.app.locals.models.Vendor;
    const vendorId = req.user.vendorId;

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        error: "Vendor access required",
      });
    }

    const { isShopOpen } = req.body;

    if (typeof isShopOpen !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: "isShopOpen must be a boolean value",
      });
    }

    await Vendor.collection.updateOne(
      { _id: new ObjectId(vendorId) },
      { 
        $set: { 
          isShopOpen,
          shopClosedAt: isShopOpen ? null : new Date(),
          shopOpenedAt: isShopOpen ? new Date() : null,
          updatedAt: new Date() 
        } 
      }
    );

    res.json({
      success: true,
      message: isShopOpen ? "Shop opened successfully" : "Shop closed successfully",
      isShopOpen,
    });
  } catch (error) {
    console.error("Error toggling shop status:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to toggle shop status" 
    });
  }
};

/**
 * Set vacation mode with start and end dates
 * Automatically closes shop during vacation period
 */
exports.setVacationMode = async (req, res) => {
  try {
    const Vendor = req.app.locals.models.Vendor;
    const vendorId = req.user.vendorId;

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        error: "Vendor access required",
      });
    }

    const { vacationStart, vacationEnd, vacationReason } = req.body;

    if (!vacationStart || !vacationEnd) {
      return res.status(400).json({
        success: false,
        error: "Vacation start and end dates are required",
      });
    }

    const startDate = new Date(vacationStart);
    const endDate = new Date(vacationEnd);
    const now = new Date();

    if (startDate >= endDate) {
      return res.status(400).json({
        success: false,
        error: "End date must be after start date",
      });
    }

    if (endDate < now) {
      return res.status(400).json({
        success: false,
        error: "End date cannot be in the past",
      });
    }

    // Check if currently in vacation period
    const isCurrentlyOnVacation = startDate <= now && endDate >= now;

    await Vendor.collection.updateOne(
      { _id: new ObjectId(vendorId) },
      { 
        $set: { 
          vacationMode: {
            enabled: true,
            startDate,
            endDate,
            reason: vacationReason || "Vendor is on vacation",
            setAt: new Date(),
          },
          isShopOpen: !isCurrentlyOnVacation, // Close shop if vacation is active now
          updatedAt: new Date() 
        } 
      }
    );

    res.json({
      success: true,
      message: "Vacation mode set successfully",
      vacationMode: {
        enabled: true,
        startDate,
        endDate,
        reason: vacationReason || "Vendor is on vacation",
        isCurrentlyActive: isCurrentlyOnVacation,
      },
    });
  } catch (error) {
    console.error("Error setting vacation mode:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to set vacation mode" 
    });
  }
};

/**
 * Cancel vacation mode
 */
exports.cancelVacationMode = async (req, res) => {
  try {
    const Vendor = req.app.locals.models.Vendor;
    const vendorId = req.user.vendorId;

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        error: "Vendor access required",
      });
    }

    await Vendor.collection.updateOne(
      { _id: new ObjectId(vendorId) },
      { 
        $set: { 
          "vacationMode.enabled": false,
          "vacationMode.cancelledAt": new Date(),
          isShopOpen: true, // Reopen shop when cancelling vacation
          updatedAt: new Date() 
        } 
      }
    );

    res.json({
      success: true,
      message: "Vacation mode cancelled successfully",
    });
  } catch (error) {
    console.error("Error cancelling vacation mode:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to cancel vacation mode" 
    });
  }
};

/**
 * Get shop status and vacation info
 */
exports.getShopStatus = async (req, res) => {
  try {
    const Vendor = req.app.locals.models.Vendor;
    const vendorId = req.user.vendorId;

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        error: "Vendor access required",
      });
    }

    const vendor = await Vendor.findById(vendorId);
    
    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: "Vendor not found",
      });
    }

    const now = new Date();
    let isCurrentlyOnVacation = false;
    
    if (vendor.vacationMode?.enabled) {
      const start = new Date(vendor.vacationMode.startDate);
      const end = new Date(vendor.vacationMode.endDate);
      isCurrentlyOnVacation = start <= now && end >= now;
      
      // Auto-disable vacation if period has ended
      if (now > end) {
        await Vendor.collection.updateOne(
          { _id: new ObjectId(vendorId) },
          { 
            $set: { 
              "vacationMode.enabled": false,
              "vacationMode.autoDisabledAt": new Date(),
              isShopOpen: true,
              updatedAt: new Date() 
            } 
          }
        );
        vendor.vacationMode.enabled = false;
        vendor.isShopOpen = true;
        isCurrentlyOnVacation = false;
      }
    }

    res.json({
      success: true,
      data: {
        isShopOpen: vendor.isShopOpen !== false, // Default to true if not set
        vacationMode: vendor.vacationMode || { enabled: false },
        isCurrentlyOnVacation,
        shopClosedAt: vendor.shopClosedAt,
        shopOpenedAt: vendor.shopOpenedAt,
      },
    });
  } catch (error) {
    console.error("Error getting shop status:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to get shop status" 
    });
  }
};
