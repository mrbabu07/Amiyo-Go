const { ObjectId } = require("mongodb");

// Vendor: Create category request
exports.createCategoryRequest = async (req, res) => {
  try {
    const { categoryName, description, reason } = req.body;
    const vendorId = req.user.vendorId;

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        error: "Only vendors can request categories",
      });
    }

    if (!categoryName || !categoryName.trim()) {
      return res.status(400).json({
        success: false,
        error: "Category name is required",
      });
    }

    const CategoryRequest = req.app.locals.models.CategoryRequest;
    const Vendor = req.app.locals.models.Vendor;

    // Get vendor details
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: "Vendor not found",
      });
    }

    // Check if similar request already exists
    const existingRequests = await CategoryRequest.findByVendorId(vendorId, {
      status: "pending",
    });
    const duplicate = existingRequests.find(
      (r) => r.categoryName.toLowerCase() === categoryName.toLowerCase().trim()
    );

    if (duplicate) {
      return res.status(400).json({
        success: false,
        error: "You already have a pending request for this category",
      });
    }

    // Create request
    const request = await CategoryRequest.create({
      vendorId,
      vendorName: vendor.shopName,
      vendorEmail: vendor.email,
      categoryName: categoryName.trim(),
      description: description?.trim() || "",
      reason: reason?.trim() || "",
    });

    res.status(201).json({
      success: true,
      message: "Category request submitted successfully",
      data: request,
    });
  } catch (error) {
    console.error("Error creating category request:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create category request",
    });
  }
};

// Vendor: Get own category requests
exports.getVendorCategoryRequests = async (req, res) => {
  try {
    const vendorId = req.user.vendorId;

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        error: "Only vendors can view their requests",
      });
    }

    const CategoryRequest = req.app.locals.models.CategoryRequest;
    const requests = await CategoryRequest.findByVendorId(vendorId);

    res.json({
      success: true,
      data: requests,
    });
  } catch (error) {
    console.error("Error fetching vendor category requests:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch category requests",
    });
  }
};

// Admin: Get all category requests
exports.getAllCategoryRequests = async (req, res) => {
  try {
    const { status, page, limit } = req.query;
    const CategoryRequest = req.app.locals.models.CategoryRequest;

    const result = await CategoryRequest.findAll({
      status,
      page: parseInt(page || 1),
      limit: parseInt(limit || 20),
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error fetching category requests:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch category requests",
    });
  }
};

// Admin: Approve category request and grant vendor access
exports.approveCategoryRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { adminNote } = req.body;

    const CategoryRequest = req.app.locals.models.CategoryRequest;
    const Category = req.app.locals.models.Category;
    const Vendor = req.app.locals.models.Vendor;

    const request = await CategoryRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        error: "Category request not found",
      });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        error: "Request has already been reviewed",
      });
    }

    // Find the category by name
    const category = await Category.collection.findOne({ 
      name: request.categoryName 
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        error: "Category not found. Please ensure the category exists.",
      });
    }

    // Grant vendor access to this category by adding to their allowedCategoryIds
    const vendor = await Vendor.findById(request.vendorId);
    if (vendor) {
      const allowedCategoryIds = vendor.allowedCategoryIds || [];
      const categoryIdStr = category._id.toString();
      
      // Check if already has access
      const alreadyHasAccess = allowedCategoryIds.some(
        id => id.toString() === categoryIdStr
      );
      
      if (!alreadyHasAccess) {
        await Vendor.collection.updateOne(
          { _id: new ObjectId(request.vendorId) },
          { 
            $addToSet: { 
              allowedCategoryIds: category._id 
            } 
          }
        );
      }
    }

    // Update request status
    await CategoryRequest.updateStatus(
      requestId,
      "approved",
      adminNote || "Access granted to category",
      category._id
    );

    res.json({
      success: true,
      message: "Category request approved. Vendor can now use this category.",
      data: {
        request,
        category,
      },
    });
  } catch (error) {
    console.error("Error approving category request:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to approve category request",
    });
  }
};

// Admin: Reject category request
exports.rejectCategoryRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { adminNote } = req.body;

    const CategoryRequest = req.app.locals.models.CategoryRequest;

    const request = await CategoryRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        error: "Category request not found",
      });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        error: "Request has already been reviewed",
      });
    }

    await CategoryRequest.updateStatus(
      requestId,
      "rejected",
      adminNote || "Request rejected"
    );

    res.json({
      success: true,
      message: "Category request rejected",
    });
  } catch (error) {
    console.error("Error rejecting category request:", error);
    res.status(500).json({
      success: false,
      error: "Failed to reject category request",
    });
  }
};

// Vendor: Delete own category request (only if pending)
exports.deleteCategoryRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const vendorId = req.user.vendorId;

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        error: "Only vendors can delete their requests",
      });
    }

    const CategoryRequest = req.app.locals.models.CategoryRequest;

    const request = await CategoryRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        error: "Category request not found",
      });
    }

    if (request.vendorId.toString() !== vendorId.toString()) {
      return res.status(403).json({
        success: false,
        error: "You can only delete your own requests",
      });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        error: "Only pending requests can be deleted",
      });
    }

    await CategoryRequest.delete(requestId);

    res.json({
      success: true,
      message: "Category request deleted",
    });
  } catch (error) {
    console.error("Error deleting category request:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete category request",
    });
  }
};
