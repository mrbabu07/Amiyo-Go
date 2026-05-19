const { ObjectId } = require("mongodb");

// Critical fields — editing any of these on an approved product requires re-approval
const CRITICAL_FIELDS = ["title", "price", "categoryId", "images"];

const EDIT_HISTORY_LIMIT = 50;

const vendorCanUseCategory = async (categoryId, allowedCategoryIds, Category) => {
  const allowedSet = new Set((allowedCategoryIds || []).map((id) => id.toString()));
  let currentId = categoryId ? categoryId.toString() : null;
  const seen = new Set();

  while (currentId && !seen.has(currentId)) {
    if (allowedSet.has(currentId)) return true;
    seen.add(currentId);

    const category = await Category.findById(currentId);
    if (!category) return false;
    currentId = category.parentId ? category.parentId.toString() : null;
  }

  return false;
};

const getDeliveryMetaForCategory = (category = {}) => {
  const slug = String(category.slug || "").toLowerCase();

  if (
    [
      "restaurant",
      "food-ordering",
      "meals",
      "biriyani",
      "tehari",
      "fast-food",
      "street-food",
      "fuchka",
      "chotpoti",
      "bhelpuri",
      "jhalmuri",
      "lunch-box",
      "office-meal",
      "school-tiffin",
      "event-food",
    ].some((pattern) => slug.includes(pattern))
  ) {
    return { deliveryClass: "restaurant", isPerishable: true };
  }

  if (["fish", "seafood"].some((pattern) => slug.includes(pattern))) {
    return { deliveryClass: "fish", isPerishable: true };
  }

  if (["vegetable", "fruit", "fresh"].some((pattern) => slug.includes(pattern))) {
    return { deliveryClass: "vegetable", isPerishable: true };
  }

  if (["homemade", "ready-meals", "pitha", "sweets"].some((pattern) => slug.includes(pattern))) {
    return { deliveryClass: "homemade", isPerishable: true };
  }

  return { deliveryClass: "", isPerishable: false };
};

const sanitizeKeywords = (keywords) => {
  if (Array.isArray(keywords)) {
    return keywords.map((keyword) => String(keyword || "").trim()).filter(Boolean).slice(0, 20);
  }

  return String(keywords || "")
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .slice(0, 20);
};

const sanitizeSeo = (seo = {}, body = {}) => ({
  metaTitle: String(seo.metaTitle || body.metaTitle || "").trim().slice(0, 70),
  metaDescription: String(seo.metaDescription || body.metaDescription || "").trim().slice(0, 160),
  searchKeywords: sanitizeKeywords(seo.searchKeywords || body.searchKeywords),
});

const sanitizeDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const sanitizeVariants = (variants = []) => {
  if (!Array.isArray(variants)) return [];

  return variants.slice(0, 200).map((variant) => ({
    color: String(variant.color || "").trim(),
    size: String(variant.size || "").trim(),
    sku: String(variant.sku || "").trim(),
    price: variant.price !== undefined ? parseFloat(variant.price) || 0 : 0,
    stock: variant.stock !== undefined ? parseInt(variant.stock, 10) || 0 : 0,
    image: String(variant.image || "").trim(),
    status: variant.status === "inactive" ? "inactive" : "active",
  }));
};

const getBulkProductIds = (productIds = []) =>
  [...new Set((Array.isArray(productIds) ? productIds : [])
    .map((id) => String(id || "").trim())
    .filter((id) => ObjectId.isValid(id)))]
    .slice(0, 200);

const sanitizeBulkProductUpdateRow = (row = {}) => ({
  productId: String(row.productId || row.id || "").trim(),
  ...(row.price !== undefined ? { price: parseFloat(row.price) || 0 } : {}),
  ...(row.stock !== undefined ? { stock: parseInt(row.stock, 10) || 0 } : {}),
  ...(row.status !== undefined ? { status: String(row.status || "active").trim() } : {}),
  ...(row.lowStockThreshold !== undefined ? { lowStockThreshold: parseInt(row.lowStockThreshold, 10) || 0 } : {}),
  ...(row.variants !== undefined ? { variants: sanitizeVariants(row.variants) } : {}),
});

const normalizeComparableValue = (value) => {
  if (value === undefined) return "__undefined__";
  if (value === null) return null;
  if (value?.toString && value.constructor?.name === "ObjectId") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalizeComparableValue);
  if (typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        result[key] = normalizeComparableValue(value[key]);
        return result;
      }, {});
  }
  if (typeof value === "number") return Number.isFinite(value) ? Number(value) : 0;
  return value;
};

const valuesDiffer = (previous, next) =>
  JSON.stringify(normalizeComparableValue(previous)) !== JSON.stringify(normalizeComparableValue(next));

const buildVendorEditHistoryEntry = (product = {}, updateData = {}, req, { requiresReapproval = false } = {}) => {
  const ignoredFields = new Set([
    "updatedAt",
    "approvalStatus",
    "approvedAt",
    "approvedBy",
    "lastSubmittedAt",
    "lastModeratedAt",
    "rejectionReason",
    "editHistory",
  ]);
  const changedFields = Object.keys(updateData).filter((field) => {
    if (ignoredFields.has(field)) return false;
    return valuesDiffer(product[field], updateData[field]);
  });

  if (changedFields.length === 0 && !requiresReapproval) return null;

  const fieldSummary = changedFields.length ? changedFields.join(", ") : "listing status";
  return {
    action: "vendor_edit",
    actorRole: req.vendorStaff ? "vendor_staff" : "vendor",
    actorId: req.user?.uid || req.dbUser?._id || null,
    staffId: req.vendorStaff?._id || null,
    staffEmail: req.vendorStaff?.email || null,
    changedFields,
    criticalFields: changedFields.filter((field) => CRITICAL_FIELDS.includes(field)),
    requiresReapproval: Boolean(requiresReapproval),
    summary: `Updated ${fieldSummary}`,
    at: new Date(),
  };
};

const buildBulkProductUpdateData = (product = {}, row = {}, req) => {
  const updateData = {};
  if (row.price !== undefined) updateData.price = row.price;
  if (row.stock !== undefined) updateData.stock = row.stock;
  if (row.variants !== undefined) updateData.variants = row.variants;
  if (row.lowStockThreshold !== undefined) updateData.lowStockThreshold = Math.max(0, Number(row.lowStockThreshold) || 0);
  if (row.status !== undefined) {
    Object.assign(updateData, getListingState(row.status));
    if (row.status === "active" && ["draft", "rejected"].includes(product.approvalStatus)) {
      updateData.approvalStatus = "pending";
      updateData.lastSubmittedAt = new Date();
      updateData.approvedAt = null;
      updateData.approvedBy = null;
      updateData.rejectionReason = null;
    }
  }

  let criticalChanged = false;
  if (product.approvalStatus === "approved" && updateData.approvalStatus !== "draft") {
    criticalChanged = CRITICAL_FIELDS.some((field) => updateData[field] !== undefined && valuesDiffer(product[field], updateData[field]));
    if (criticalChanged) {
      updateData.approvalStatus = "pending";
      updateData.approvedAt = null;
      updateData.approvedBy = null;
      updateData.lastSubmittedAt = new Date();
      updateData.lastModeratedAt = null;
      updateData.rejectionReason = null;
    }
  }

  const editHistoryEntry = buildVendorEditHistoryEntry(product, updateData, req, {
    requiresReapproval: criticalChanged,
  });
  if (editHistoryEntry) {
    editHistoryEntry.action = "vendor_bulk_edit";
    editHistoryEntry.summary = `Bulk updated ${editHistoryEntry.changedFields.join(", ") || "listing status"}`;
    updateData.editHistory = [
      editHistoryEntry,
      ...(Array.isArray(product.editHistory) ? product.editHistory : []),
    ].slice(0, EDIT_HISTORY_LIMIT);
  }

  return updateData;
};

const getListingState = (status) => {
  if (status === "draft") {
    return {
      status: "draft",
      approvalStatus: "draft",
      isActive: true,
      lastSubmittedAt: null,
      approvedAt: null,
      approvedBy: null,
      rejectionReason: null,
    };
  }

  if (status === "inactive" || status === "delisted") {
    return {
      status: "inactive",
      isActive: false,
    };
  }

  return {
    status: "active",
    isActive: true,
  };
};

const buildExtendedProductFields = (body = {}, { includeDefaults = false } = {}) => {
  const fields = {};
  const lowStockThreshold = parseInt(body.lowStockThreshold, 10);

  if (body.sku !== undefined) fields.sku = String(body.sku || "").trim();

  if (
    includeDefaults ||
    body.seo !== undefined ||
    body.metaTitle !== undefined ||
    body.metaDescription !== undefined ||
    body.searchKeywords !== undefined
  ) {
    fields.seo = sanitizeSeo(body.seo || {}, body);
  }

  if (includeDefaults || body.lowStockThreshold !== undefined) {
    fields.lowStockThreshold = Number.isNaN(lowStockThreshold) ? 5 : Math.max(0, lowStockThreshold);
  }

  if (includeDefaults || body.allowBackorder !== undefined) {
    fields.allowBackorder = Boolean(body.allowBackorder);
  }

  if (includeDefaults || body.restockDate !== undefined) {
    fields.restockDate = sanitizeDate(body.restockDate);
  }

  if (includeDefaults || body.preorderEnabled !== undefined) {
    fields.preorderEnabled = Boolean(body.preorderEnabled);
  }

  if (includeDefaults || body.expectedShipDate !== undefined) {
    fields.expectedShipDate = sanitizeDate(body.expectedShipDate);
  }

  if (includeDefaults || body.imageSettings !== undefined) {
    fields.imageSettings = body.imageSettings && typeof body.imageSettings === "object" ? body.imageSettings : {};
  }

  return fields;
};

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

exports.bulkProductAction = async (req, res) => {
  try {
    const Product = req.app.locals.models.Product;
    const action = String(req.body?.action || "").trim();
    const vendorId = req.vendor._id.toString();
    const results = [];

    if (!["update_fields", "submit", "archive", "delete"].includes(action)) {
      return res.status(400).json({ success: false, error: "Unsupported bulk product action" });
    }

    if (action === "update_fields") {
      const updateRows = (Array.isArray(req.body?.updates) ? req.body.updates : [])
        .map(sanitizeBulkProductUpdateRow)
        .filter((row) => ObjectId.isValid(row.productId))
        .slice(0, 200);

      if (!updateRows.length) {
        return res.status(400).json({ success: false, error: "No product updates supplied" });
      }

      for (const row of updateRows) {
        try {
          const product = await Product.findById(row.productId);
          if (!product) {
            results.push({ productId: row.productId, success: false, error: "Product not found" });
            continue;
          }
          if (product.vendorId.toString() !== vendorId) {
            results.push({ productId: row.productId, success: false, error: "Not authorized" });
            continue;
          }

          const updateData = buildBulkProductUpdateData(product, row, req);
          if (Object.keys(updateData).length === 0) {
            results.push({ productId: row.productId, success: true, skipped: true });
            continue;
          }

          await Product.update(row.productId, updateData);
          results.push({
            productId: row.productId,
            success: true,
            requiresReapproval: updateData.approvalStatus === "pending",
          });
        } catch (rowError) {
          results.push({ productId: row.productId, success: false, error: rowError.message || "Update failed" });
        }
      }
    } else {
      const productIds = getBulkProductIds(req.body?.productIds);
      if (!productIds.length) {
        return res.status(400).json({ success: false, error: "No products selected" });
      }

      for (const productId of productIds) {
        try {
          const product = await Product.findById(productId);
          if (!product) {
            results.push({ productId, success: false, error: "Product not found" });
            continue;
          }
          if (product.vendorId.toString() !== vendorId) {
            results.push({ productId, success: false, error: "Not authorized" });
            continue;
          }

          if (action === "submit") {
            if (product.approvalStatus === "approved") {
              results.push({ productId, success: false, error: "Already approved" });
              continue;
            }
            await Product.update(productId, {
              status: "active",
              isActive: true,
              approvalStatus: "pending",
              rejectionReason: null,
              lastSubmittedAt: new Date(),
            });
          }

          if (action === "archive") {
            await Product.update(productId, { isActive: false, status: "inactive" });
          }

          if (action === "delete") {
            await Product.delete(productId);
          }

          results.push({ productId, success: true, action });
        } catch (itemError) {
          results.push({ productId, success: false, error: itemError.message || "Bulk action failed" });
        }
      }
    }

    const updated = results.filter((item) => item.success).length;
    const failed = results.length - updated;

    res.json({
      success: failed === 0,
      message: `${updated} product${updated === 1 ? "" : "s"} processed${failed ? `, ${failed} failed` : ""}`,
      summary: {
        requested: results.length,
        updated,
        failed,
      },
      results,
    });
  } catch (error) {
    console.error("Error applying vendor bulk product action:", error);
    res.status(500).json({ success: false, error: "Failed to apply bulk product action" });
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
      status,
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
    const allowedCategoryIds = vendor.allowedCategoryIds || [];

    if (!(await vendorCanUseCategory(categoryId, allowedCategoryIds, Category))) {
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
    const deliveryMeta = getDeliveryMetaForCategory(category);
    const listingState = getListingState(status);
    const productData = {
      vendorId: req.vendor._id,
      categoryId,
      title,
      description: description || "",
      price: parseFloat(price),
      images: images || [],
      stock: stock !== undefined ? parseInt(stock) : 0,
      variants: sanitizeVariants(variants),
      attributes: attributes || {},
      ...buildExtendedProductFields(req.body, { includeDefaults: true }),
      ...listingState,
      ...deliveryMeta,
    };

    const productId = await Product.create(productData);
    const product = await Product.findById(productId.toString());

    // Notify followers about new product
    try {
      const User = req.app.locals.models.User;
      const vendorId = req.vendor._id.toString();
      const [legacyFollowers, followRows] = await Promise.all([
        User.collection.find({ followedVendors: vendorId }).toArray(),
        req.app.locals.db.collection("vendorFollows").find({ vendorId, active: true }).toArray(),
      ]);
      const followersByUid = new Map();
      legacyFollowers.forEach((follower) => {
        if (follower.firebaseUid) followersByUid.set(follower.firebaseUid, follower);
      });
      followRows.forEach((follow) => {
        if (follow.userId) followersByUid.set(follow.userId, follow);
      });
      const followers = Array.from(followersByUid.values());

      if (followers.length > 0) {
        const Notification = req.app.locals.models.Notification;
        const notifications = followers.map(follower => ({
          userId: follower.firebaseUid || follower.userId,
          type: "vendor_new_product",
          title: "New Product Available",
          message: `${req.vendor.shopName} has added a new product: ${title}`,
          link: `/products/${productId.toString()}`,
          data: {
            vendorId,
            productId: productId.toString(),
            productTitle: title,
            vendorName: req.vendor.shopName
          },
          isRead: false,
          createdAt: new Date()
        }));

        if (Notification) {
          await Notification.collection.insertMany(notifications);
        }
        followers.forEach((follower) => {
          const userId = follower.firebaseUid || follower.userId;
          if (!userId) return;
          req.app.locals.realtime?.broadcast(`followed-vendor-feed:${userId}`, "vendor.product.created", {
            vendorId,
            productId: productId.toString(),
            title,
            vendorName: req.vendor.shopName,
          });
        });
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
      status,
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
      const allowedCategoryIds = vendor.allowedCategoryIds || [];

      if (!(await vendorCanUseCategory(categoryId, allowedCategoryIds, Category))) {
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
    if (variants !== undefined) updateData.variants = sanitizeVariants(variants);
    if (attributes !== undefined) updateData.attributes = attributes;
    if (
      req.body.sku !== undefined ||
      req.body.seo !== undefined ||
      req.body.metaTitle !== undefined ||
      req.body.metaDescription !== undefined ||
      req.body.searchKeywords !== undefined ||
      req.body.lowStockThreshold !== undefined ||
      req.body.allowBackorder !== undefined ||
      req.body.restockDate !== undefined ||
      req.body.preorderEnabled !== undefined ||
      req.body.expectedShipDate !== undefined ||
      req.body.imageSettings !== undefined
    ) {
      Object.assign(updateData, buildExtendedProductFields(req.body));
    }
    if (status !== undefined) {
      Object.assign(updateData, getListingState(status));
      if (status === "active" && ["draft", "rejected"].includes(product.approvalStatus)) {
        updateData.approvalStatus = "pending";
        updateData.lastSubmittedAt = new Date();
        updateData.approvedAt = null;
        updateData.approvedBy = null;
        updateData.rejectionReason = null;
      }
    }

    if (categoryId && categoryId !== product.categoryId.toString()) {
      const category = await Category.findById(categoryId);
      Object.assign(updateData, getDeliveryMetaForCategory(category));
    }

    let criticalChanged = false;

    // Re-approval logic: if product is approved and a critical field changed, reset to pending
    if (product.approvalStatus === "approved" && updateData.approvalStatus !== "draft") {
      criticalChanged = CRITICAL_FIELDS.some((field) => updateData[field] !== undefined && valuesDiffer(product[field], updateData[field]));
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

    const editHistoryEntry = buildVendorEditHistoryEntry(product, updateData, req, {
      requiresReapproval: criticalChanged,
    });
    if (editHistoryEntry) {
      updateData.editHistory = [
        editHistoryEntry,
        ...(Array.isArray(product.editHistory) ? product.editHistory : []),
      ].slice(0, EDIT_HISTORY_LIMIT);
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
      status: "active",
      isActive: true,
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

    await Product.update(id, { isActive: false, status: "inactive" });

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
