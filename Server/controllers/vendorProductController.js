const { ObjectId } = require("mongodb");

// Critical fields — editing any of these on an approved product requires re-approval
const CRITICAL_FIELDS = ["title", "price", "categoryId", "images"];

// ─── Get vendor's products (paginated, filterable by status) ───
exports.getVendorProducts = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const Product = req.app.locals.models.Product;

    const result = await Product.findByVendorPaginated(req.vendor._id.toString(), {
      status,
      page: parseInt(page),
      limit: parseInt(limit),
    });

    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Error fetching vendor products:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
};

// ─── Create product (vendor only) ─────────────────────────────
exports.createProduct = async (req, res) => {
  try {
    const {
      categoryId,
      title,
      description,
      price,
      images,
      stock,
      variants,
      attributes,
    } = req.body;

    const Product = req.app.locals.models.Product;
    const Vendor = req.app.locals.models.Vendor;
    const Category = req.app.locals.models.Category;

    // Validation
    if (!categoryId || !title || !price) {
      return res.status(400).json({
        error: "Category, title, and price are required",
      });
    }

    // Check if category is in vendor's allowed categories
    const vendor = await Vendor.findById(req.vendor._id);
    const allowedCategoryIds = vendor.allowedCategoryIds.map((id) => id.toString());

    if (!allowedCategoryIds.includes(categoryId)) {
      return res.status(403).json({
        error: "You are not allowed to add products in this category",
      });
    }

    // Verify category exists and is active
    const category = await Category.findById(categoryId);
    if (!category || !category.isActive) {
      return res.status(400).json({ error: "Invalid or inactive category" });
    }

    // Create product — vendorId always comes from auth, never frontend
    const productData = {
      vendorId: req.vendor._id,
      categoryId,
      title,
      description: description || "",
      price: parseFloat(price),
      images: images || [],
      stock: stock !== undefined ? parseInt(stock) : 0,
      variants: variants || [],
      attributes: attributes || {},
    };

    const productId = await Product.create(productData);
    const product = await Product.findById(productId.toString());

    // Notify followers about new product
    try {
      const User = req.app.locals.models.User;
      const followers = await User.collection.find({
        followedVendors: req.vendor._id.toString()
      }).toArray();

      if (followers.length > 0) {
        const Notification = req.app.locals.models.Notification;
        const notifications = followers.map(follower => ({
          userId: follower.firebaseUid,
          type: "vendor_new_product",
          title: "New Product Available",
          message: `${req.vendor.shopName} has added a new product: ${title}`,
          data: {
            vendorId: req.vendor._id.toString(),
            productId: productId.toString(),
            productTitle: title,
            vendorName: req.vendor.shopName
          },
          read: false,
          createdAt: new Date()
        }));

        if (Notification) {
          await Notification.collection.insertMany(notifications);
        }
      }
    } catch (notifError) {
      console.error("Error sending notifications:", notifError);
      // Don't fail product creation if notification fails
    }

    res.status(201).json({
      success: true,
      message: "Product created and submitted for admin approval.",
      product,
    });
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ error: "Failed to create product" });
  }
};

// ─── Update product (vendor only) ─────────────────────────────
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      categoryId,
      title,
      description,
      price,
      images,
      stock,
      variants,
      attributes,
    } = req.body;

    const Product = req.app.locals.models.Product;
    const Vendor = req.app.locals.models.Vendor;
    const Category = req.app.locals.models.Category;

    // Check product exists and belongs to this vendor
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (product.vendorId.toString() !== req.vendor._id.toString()) {
      return res.status(403).json({
        error: "You don't have permission to update this product",
      });
    }

    // If changing category, verify it's allowed
    if (categoryId && categoryId !== product.categoryId.toString()) {
      const vendor = await Vendor.findById(req.vendor._id);
      const allowedCategoryIds = vendor.allowedCategoryIds.map((id) => id.toString());

      if (!allowedCategoryIds.includes(categoryId)) {
        return res.status(403).json({
          error: "You are not allowed to move products to this category",
        });
      }

      const category = await Category.findById(categoryId);
      if (!category || !category.isActive) {
        return res.status(400).json({ error: "Invalid or inactive category" });
      }
    }

    // Build update payload
    const updateData = {};
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (images !== undefined) updateData.images = images;
    if (stock !== undefined) updateData.stock = parseInt(stock);
    if (variants !== undefined) updateData.variants = variants;
    if (attributes !== undefined) updateData.attributes = attributes;

    // Re-approval logic: if product is approved and a critical field changed, reset to pending
    if (product.approvalStatus === "approved") {
      const criticalChanged = CRITICAL_FIELDS.some((field) => updateData[field] !== undefined);
      if (criticalChanged) {
        updateData.approvalStatus = "pending";
        updateData.approvedAt = null;
        updateData.approvedBy = null;
        updateData.lastSubmittedAt = new Date();
        updateData.lastModeratedAt = null;
        updateData.rejectionReason = null;
        console.log(`🔄 Product ${id} reset to pending after critical field edit by vendor`);
      }
    }

    await Product.update(id, updateData);
    const updatedProduct = await Product.findById(id);

    res.json({
      success: true,
      message:
        updateData.approvalStatus === "pending"
          ? "Product updated. It will require re-approval before appearing publicly."
          : "Product updated successfully.",
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: "Failed to update product" });
  }
};

// ─── Submit product for approval ───────────────────────────────
exports.submitForApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const Product = req.app.locals.models.Product;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (product.vendorId.toString() !== req.vendor._id.toString()) {
      return res.status(403).json({
        error: "You don't have permission to submit this product",
      });
    }

    if (product.approvalStatus === "approved") {
      return res.status(400).json({ error: "Product is already approved" });
    }

    await Product.update(id, {
      approvalStatus: "pending",
      rejectionReason: null,
      lastSubmittedAt: new Date(),
    });

    const updated = await Product.findById(id);
    res.json({
      success: true,
      message: "Product submitted for admin approval.",
      product: updated,
    });
  } catch (error) {
    console.error("Error submitting product for approval:", error);
    res.status(500).json({ error: "Failed to submit product" });
  }
};

// ─── Archive product (soft delete) ────────────────────────────
exports.archiveProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const Product = req.app.locals.models.Product;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (product.vendorId.toString() !== req.vendor._id.toString()) {
      return res.status(403).json({
        error: "You don't have permission to archive this product",
      });
    }

    await Product.update(id, { isActive: false });

    res.json({ success: true, message: "Product archived (hidden from public listing)." });
  } catch (error) {
    console.error("Error archiving product:", error);
    res.status(500).json({ error: "Failed to archive product" });
  }
};

// ─── Delete product (vendor only) ─────────────────────────────
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const Product = req.app.locals.models.Product;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (product.vendorId.toString() !== req.vendor._id.toString()) {
      return res.status(403).json({
        error: "You don't have permission to delete this product",
      });
    }

    await Product.delete(id);
    res.json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: "Failed to delete product" });
  }
};

// ─── Get product by ID (vendor — own products only) ────────────
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const Product = req.app.locals.models.Product;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (product.vendorId.toString() !== req.vendor._id.toString()) {
      return res.status(403).json({
        error: "You don't have permission to view this product",
      });
    }

    res.json({ success: true, product });
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ error: "Failed to fetch product" });
  }
};
