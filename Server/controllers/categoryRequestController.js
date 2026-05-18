const { ObjectId } = require("mongodb");

const normalizeId = (value) => (value ? value.toString() : "");

const buildCategoryPath = async (Category, category) => {
  const path = [];
  let current = category;
  const seen = new Set();

  while (current) {
    path.unshift({
      _id: current._id,
      name: current.name,
      slug: current.slug || "",
      parentId: current.parentId || null,
    });

    const parentId = normalizeId(current.parentId);
    if (!parentId || seen.has(parentId)) break;

    seen.add(parentId);
    current = await Category.findById(parentId);
  }

  return path;
};

const hasVendorCategoryAccess = (vendor, categoryId) => {
  const requestedId = normalizeId(categoryId);
  return (vendor.allowedCategoryIds || []).some((id) => normalizeId(id) === requestedId);
};

// Vendor: Create category request
exports.createCategoryRequest = async (req, res) => {
  try {
    const {
      categoryId,
      categoryName,
      categoryPath,
      description,
      parentCategoryId,
      parentCategoryName,
      reason,
      rootCategoryId,
      rootCategoryName,
    } = req.body;
    const vendorId = req.user.vendorId;

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        error: "Only vendors can request categories",
      });
    }

    if (!categoryId && (!categoryName || !categoryName.trim())) {
      return res.status(400).json({
        success: false,
        error: "Category selection is required",
      });
    }

    const CategoryRequest = req.app.locals.models.CategoryRequest;
    const Vendor = req.app.locals.models.Vendor;
    const Category = req.app.locals.models.Category;

    // Get vendor details
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: "Vendor not found",
      });
    }

    let selectedCategory = null;
    let selectedPath = [];

    if (categoryId) {
      if (!ObjectId.isValid(categoryId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid category selection",
        });
      }

      selectedCategory = await Category.findById(categoryId);
      if (!selectedCategory || selectedCategory.isActive === false) {
        return res.status(404).json({
          success: false,
          error: "Selected category was not found or is inactive",
        });
      }

      if (hasVendorCategoryAccess(vendor, selectedCategory._id)) {
        return res.status(400).json({
          success: false,
          error: "Your store already has access to this category",
        });
      }

      selectedPath = await buildCategoryPath(Category, selectedCategory);
    }

    const normalizedCategoryName = selectedCategory?.name || categoryName.trim();
    const pathLabel =
      selectedPath.length > 0
        ? selectedPath.map((item) => item.name).join(" > ")
        : categoryPath || normalizedCategoryName;
    const rootCategory = selectedPath[0] || null;
    const parentCategory = selectedPath.length > 1 ? selectedPath[selectedPath.length - 2] : null;

    // Check if similar request already exists
    const existingRequests = await CategoryRequest.findByVendorId(vendorId, {
      status: "pending",
    });
    const selectedCategoryId = normalizeId(selectedCategory?._id);
    const duplicate = existingRequests.find((request) => {
      if (selectedCategoryId && normalizeId(request.requestedCategoryId) === selectedCategoryId) {
        return true;
      }

      return request.categoryName.toLowerCase() === normalizedCategoryName.toLowerCase();
    });

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
      categoryName: normalizedCategoryName,
      requestedCategoryId: selectedCategory?._id || null,
      categoryPath: pathLabel,
      requestedCategoryPath: selectedPath,
      rootCategoryId: rootCategory?._id || rootCategoryId || null,
      rootCategoryName: rootCategory?.name || rootCategoryName || "",
      parentCategoryId: parentCategory?._id || parentCategoryId || null,
      parentCategoryName: parentCategory?.name || parentCategoryName || "",
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

    // Prefer the saved category id so duplicate category names under different groups approve correctly.
    let category = null;
    if (request.requestedCategoryId) {
      category = await Category.findById(request.requestedCategoryId);
    }

    if (!category) {
      category = await Category.collection.findOne({
        name: request.categoryName,
      });
    }

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
