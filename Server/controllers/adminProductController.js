const { ObjectId } = require("mongodb");

const DEFAULT_PROHIBITED_KEYWORDS = [
  "counterfeit",
  "fake",
  "replica",
  "copy brand",
  "weapon",
  "adult",
  "casino",
];

const REVIEW_STATUSES = ["pending", "flagged", "changes_requested"];

const getObjectId = (id) => {
  if (!ObjectId.isValid(id)) return null;
  return new ObjectId(id);
};

const getIdValues = (id) => {
  const values = [String(id)];
  if (ObjectId.isValid(id)) values.push(new ObjectId(id));
  return values;
};

const round2 = (value) => Math.round(((Number(value) || 0) + Number.EPSILON) * 100) / 100;

const normalizeText = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const normalizeCloneKey = (product = {}) =>
  [
    normalizeText(product.title),
    normalizeText(product.brand || product.attributes?.brand),
    String(product.categoryId || product.category || ""),
  ]
    .filter(Boolean)
    .join("|");

const getSku = (product = {}) =>
  product.sku ||
  product.attributes?.sku ||
  product.variants?.find((variant) => variant?.sku)?.sku ||
  "";

const getImages = (product = {}) =>
  [product.image, ...(Array.isArray(product.images) ? product.images : [])].filter(Boolean);

const getSubmissionDate = (product = {}) =>
  product.submittedForReviewAt ||
  product.moderationSubmittedAt ||
  product.lastSubmittedAt ||
  product.updatedAt ||
  product.createdAt ||
  new Date(0);

const buildSearchRegex = (search) =>
  new RegExp(String(search || "").trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

const getModerationRules = async (db) => {
  const rules = await db.collection("product_moderation_rules").findOne({ type: "prohibited_keywords" });
  const keywords = Array.isArray(rules?.keywords) && rules.keywords.length > 0
    ? rules.keywords
    : DEFAULT_PROHIBITED_KEYWORDS;

  return keywords.map((keyword) => String(keyword || "").trim().toLowerCase()).filter(Boolean);
};

const getRequiredAttributes = (category = {}) =>
  (category.attributes || [])
    .filter((attribute) => attribute.required || attribute.isRequired)
    .map((attribute) => attribute.name || attribute.key || attribute.label)
    .filter(Boolean);

const collectMissingAttributes = (product = {}, category = {}) => {
  const productAttributes = product.attributes || {};
  return getRequiredAttributes(category).filter((name) => {
    const value = productAttributes[name] ?? productAttributes[String(name).toLowerCase()];
    return value === undefined || value === null || String(value).trim() === "";
  });
};

const buildModerationFlags = (product, { prohibitedKeywords = [], categoryMap = {}, duplicateMap = {} } = {}) => {
  const flags = [];
  const text = normalizeText([
    product.title,
    product.description,
    product.metaTitle,
    product.metaDescription,
    ...(product.searchKeywords || product.seo?.searchKeywords || []),
  ].join(" "));

  const matchedKeywords = prohibitedKeywords.filter((keyword) => text.includes(normalizeText(keyword)));
  if (matchedKeywords.length > 0) {
    flags.push({
      type: "prohibited_keyword",
      severity: "high",
      message: `Contains prohibited keyword: ${matchedKeywords[0]}`,
      matches: matchedKeywords,
    });
  }

  if (getImages(product).length === 0) {
    flags.push({
      type: "missing_image",
      severity: "medium",
      message: "No product image uploaded",
    });
  }

  if (!getSku(product)) {
    flags.push({
      type: "missing_sku",
      severity: "low",
      message: "SKU is missing",
    });
  }

  const category = categoryMap[String(product.categoryId || product.category || "")];
  const missingAttributes = collectMissingAttributes(product, category);
  if (missingAttributes.length > 0) {
    flags.push({
      type: "missing_required_attributes",
      severity: "medium",
      message: `Missing required attributes: ${missingAttributes.join(", ")}`,
      fields: missingAttributes,
    });
  }

  const cloneKey = normalizeCloneKey(product);
  const duplicateCount = duplicateMap[cloneKey] || 0;
  if (cloneKey && duplicateCount > 1) {
    flags.push({
      type: "clone_candidate",
      severity: "low",
      message: `${duplicateCount} near-duplicate listings found`,
      duplicateCount,
    });
  }

  return flags;
};

const dedupeFlags = (flags) =>
  flags.filter(
    (flag, index, allFlags) =>
      allFlags.findIndex((item) => item.type === flag.type && item.message === flag.message) === index,
  );

const buildDuplicateMap = (products = []) =>
  products.reduce((map, product) => {
    const key = normalizeCloneKey(product);
    if (!key) return map;
    map[key] = (map[key] || 0) + 1;
    return map;
  }, {});

const buildVendorMap = async (db, products = []) => {
  const vendorIds = [
    ...new Set(products.map((product) => String(product.vendorId || product.sellerId || "")).filter(Boolean)),
  ];
  const objectIds = vendorIds.filter(ObjectId.isValid).map((id) => new ObjectId(id));
  const vendors = objectIds.length
    ? await db.collection("vendors").find({ _id: { $in: objectIds } }).toArray()
    : [];

  return Object.fromEntries(vendors.map((vendor) => [String(vendor._id), vendor]));
};

const buildCategoryMap = async (db, products = []) => {
  const categoryIds = [
    ...new Set(products.map((product) => String(product.categoryId || product.category || "")).filter(Boolean)),
  ];
  const objectIds = categoryIds.filter(ObjectId.isValid).map((id) => new ObjectId(id));
  const categories = objectIds.length
    ? await db.collection("categories").find({ _id: { $in: objectIds } }).toArray()
    : [];

  return Object.fromEntries(categories.map((category) => [String(category._id), category]));
};

const addModerationHistory = (action, req, metadata = {}) => ({
  action,
  actorUid: req.user?.uid || "admin",
  actorRole: req.user?.role || "admin",
  metadata,
  createdAt: new Date(),
});

const notifyVendor = (product, subject, message, severity = "notice") => ({
  _id: new ObjectId(),
  vendorId: product.vendorId || null,
  subject,
  message,
  severity,
  read: false,
  createdAt: new Date(),
});

const buildListQuery = async (req, db) => {
  const { approvalStatus, status, vendorId, categoryId, flagged, search } = req.query;
  const and = [];
  const statusValue = approvalStatus || status;

  if (statusValue && statusValue !== "all") {
    if (statusValue === "queue") {
      and.push({ approvalStatus: { $in: REVIEW_STATUSES } });
    } else if (statusValue.includes(",")) {
      and.push({ approvalStatus: { $in: statusValue.split(",").map((item) => item.trim()).filter(Boolean) } });
    } else {
      and.push({ approvalStatus: statusValue });
    }
  }

  if (vendorId) and.push({ vendorId: { $in: getIdValues(vendorId) } });
  if (categoryId) and.push({ categoryId: { $in: getIdValues(categoryId) } });
  if (flagged === "true") and.push({ "moderationFlags.0": { $exists: true } });

  if (search) {
    const regex = buildSearchRegex(search);
    const vendorDocs = await db.collection("vendors").find({
      $or: [{ shopName: regex }, { businessName: regex }, { email: regex }],
    }).limit(50).toArray();
    const categoryDocs = await db.collection("categories").find({
      $or: [{ name: regex }, { slug: regex }],
    }).limit(50).toArray();

    and.push({
      $or: [
        { title: regex },
        { description: regex },
        { sku: regex },
        { "variants.sku": regex },
        { brand: regex },
        { "attributes.brand": regex },
        { approvalStatus: regex },
        { vendorId: { $in: vendorDocs.flatMap((vendor) => [vendor._id, String(vendor._id)]) } },
        { categoryId: { $in: categoryDocs.flatMap((category) => [category._id, String(category._id)]) } },
      ],
    });
  }

  return and.length > 0 ? { $and: and } : {};
};

const enrichProducts = async (db, products = []) => {
  const [vendorMap, categoryMap, prohibitedKeywords, duplicateSource] = await Promise.all([
    buildVendorMap(db, products),
    buildCategoryMap(db, products),
    getModerationRules(db),
    db.collection("products").find({ isActive: { $ne: false } }).limit(1000).toArray(),
  ]);
  const duplicateMap = buildDuplicateMap(duplicateSource);

  return products.map((product) => {
    const vendor = vendorMap[String(product.vendorId || product.sellerId || "")];
    const category = categoryMap[String(product.categoryId || product.category || "")];
    const computedFlags = buildModerationFlags(product, { prohibitedKeywords, categoryMap, duplicateMap });

    return {
      ...product,
      sku: getSku(product),
      submittedForReviewAt: getSubmissionDate(product),
      vendorShopName: vendor?.shopName || vendor?.businessName || product.vendorShopName || null,
      vendorStatus: vendor?.status || null,
      trustedVendor: ["preferred", "star", "mall_seller"].includes(vendor?.tier),
      categoryName: category?.name || product.categoryName || null,
      requiredAttributes: getRequiredAttributes(category),
      moderationFlags: dedupeFlags([...(product.moderationFlags || []), ...computedFlags]),
    };
  });
};

exports.getAllAdminProducts = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { page = 1, limit = 20, sort = "submitted" } = req.query;
    const query = await buildListQuery(req, db);
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    const sortMap = {
      submitted: { submittedForReviewAt: -1, updatedAt: -1, createdAt: -1 },
      newest: { createdAt: -1 },
      updated: { updatedAt: -1 },
      title: { title: 1 },
    };

    const col = db.collection("products");
    const [products, total] = await Promise.all([
      col.find(query).sort(sortMap[sort] || sortMap.submitted).skip(skip).limit(limitNum).toArray(),
      col.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: await enrichProducts(db, products),
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error("Error in getAllAdminProducts:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getPendingProducts = async (req, res) => {
  req.query.approvalStatus = "pending";
  return exports.getAllAdminProducts(req, res);
};

exports.getModerationQueue = async (req, res) => {
  req.query.status = "queue";
  req.query.sort = "submitted";
  return exports.getAllAdminProducts(req, res);
};

exports.approveProduct = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const col = db.collection("products");
    const productId = getObjectId(req.params.id);
    if (!productId) return res.status(400).json({ success: false, error: "Invalid product ID" });
    const now = new Date();

    const result = await col.updateOne(
      { _id: productId },
      {
        $set: {
          approvalStatus: "approved",
          approvedBy: req.user?.uid || null,
          approvedAt: now,
          lastModeratedAt: now,
          rejectionReason: null,
          moderationFlags: [],
          updatedAt: now,
        },
        $push: {
          moderationHistory: addModerationHistory("approved", req, { note: req.body?.note || "" }),
        },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }

    const product = await col.findOne({ _id: productId });
    res.json({ success: true, message: "Product approved.", data: product });
  } catch (error) {
    console.error("Error in approveProduct:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.rejectProduct = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const col = db.collection("products");
    const productId = getObjectId(req.params.id);
    if (!productId) return res.status(400).json({ success: false, error: "Invalid product ID" });
    const { reason, guidance } = req.body;
    const finalReason = reason || guidance || "Product needs changes before approval";
    const now = new Date();

    const product = await col.findOne({ _id: productId });
    if (!product) return res.status(404).json({ success: false, error: "Product not found" });

    const result = await col.updateOne(
      { _id: productId },
      {
        $set: {
          approvalStatus: "rejected",
          rejectionReason: finalReason,
          rejectionGuidance: guidance || finalReason,
          lastModeratedAt: now,
          approvedAt: null,
          approvedBy: null,
          updatedAt: now,
        },
        $push: {
          moderationHistory: addModerationHistory("rejected", req, { reason: finalReason }),
          vendorNotifications: notifyVendor(product, "Product rejected", finalReason, "warning"),
        },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }

    const updatedProduct = await col.findOne({ _id: productId });
    res.json({ success: true, message: "Product rejected.", data: updatedProduct });
  } catch (error) {
    console.error("Error in rejectProduct:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.disableProduct = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const col = db.collection("products");
    const productId = getObjectId(req.params.id);
    if (!productId) return res.status(400).json({ success: false, error: "Invalid product ID" });
    const now = new Date();

    const product = await col.findOne({ _id: productId });
    if (!product) return res.status(404).json({ success: false, error: "Product not found" });

    const reason = req.body?.reason || "Admin delisted product";
    await col.updateOne(
      { _id: productId },
      {
        $set: {
          isActive: false,
          approvalStatus: "delisted",
          delistedReason: reason,
          lastModeratedAt: now,
          updatedAt: now,
        },
        $push: {
          moderationHistory: addModerationHistory("delisted", req, { reason }),
          vendorNotifications: notifyVendor(product, "Product delisted", reason, "critical"),
        },
      },
    );

    const updatedProduct = await col.findOne({ _id: productId });
    res.json({ success: true, message: "Product disabled.", data: updatedProduct });
  } catch (error) {
    console.error("Error in disableProduct:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.adminEditProduct = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const col = db.collection("products");
    const productId = getObjectId(req.params.id);
    if (!productId) return res.status(400).json({ success: false, error: "Invalid product ID" });

    const allowedFields = [
      "title",
      "description",
      "categoryId",
      "sku",
      "brand",
      "price",
      "stock",
      "attributes",
      "metaTitle",
      "metaDescription",
      "searchKeywords",
      "images",
      "image",
    ];
    const patch = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) patch[field] = req.body[field];
    });
    if (patch.categoryId && ObjectId.isValid(patch.categoryId)) patch.categoryId = new ObjectId(patch.categoryId);
    if (patch.price !== undefined) patch.price = Number(patch.price);
    if (patch.stock !== undefined) patch.stock = Number(patch.stock);

    if (Object.keys(patch).length === 0 && !req.body.approveAfterEdit) {
      return res.status(400).json({ success: false, error: "No editable fields provided" });
    }

    const now = new Date();
    if (req.body.approveAfterEdit) {
      patch.approvalStatus = "approved";
      patch.approvedAt = now;
      patch.approvedBy = req.user?.uid || null;
      patch.rejectionReason = null;
      patch.moderationFlags = [];
    }
    patch.updatedAt = now;
    patch.lastModeratedAt = now;

    const result = await col.updateOne(
      { _id: productId },
      {
        $set: patch,
        $push: {
          adminEditHistory: {
            fields: Object.keys(patch).filter((field) => field !== "updatedAt" && field !== "lastModeratedAt"),
            note: req.body.note || "",
            actorUid: req.user?.uid || "admin",
            createdAt: now,
          },
          moderationHistory: addModerationHistory(req.body.approveAfterEdit ? "edited_and_approved" : "admin_edited", req, {
            fields: Object.keys(patch),
            note: req.body.note || "",
          }),
        },
      },
    );

    if (!result.matchedCount) return res.status(404).json({ success: false, error: "Product not found" });
    const product = await col.findOne({ _id: productId });
    res.json({
      success: true,
      message: req.body.approveAfterEdit ? "Product edited and approved." : "Product updated.",
      data: product,
    });
  } catch (error) {
    console.error("Error in adminEditProduct:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.bulkModerateProducts = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const col = db.collection("products");
    const { productIds = [], action, reason = "" } = req.body;
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ success: false, error: "Select at least one product" });
    }

    const objectIds = productIds.map(getObjectId);
    if (objectIds.some((id) => !id)) {
      return res.status(400).json({ success: false, error: "One or more product IDs are invalid" });
    }

    const statusByAction = {
      approve: "approved",
      reject: "rejected",
      delist: "delisted",
      flag: "flagged",
    };
    const nextStatus = statusByAction[action];
    if (!nextStatus) return res.status(400).json({ success: false, error: "Unsupported moderation action" });
    if (action === "reject" && !String(reason).trim()) {
      return res.status(400).json({ success: false, error: "Reject reason is required" });
    }

    const now = new Date();
    const update = {
      $set: {
        approvalStatus: nextStatus,
        lastModeratedAt: now,
        updatedAt: now,
        ...(action === "approve"
          ? { approvedAt: now, approvedBy: req.user?.uid || null, rejectionReason: null, moderationFlags: [] }
          : {}),
        ...(action === "reject" ? { rejectionReason: reason, rejectionGuidance: reason, approvedAt: null, approvedBy: null } : {}),
        ...(action === "delist" ? { isActive: false, delistedReason: reason || "Bulk delisted by admin" } : {}),
      },
      $push: {
        moderationHistory: addModerationHistory(`bulk_${action}`, req, { reason, count: objectIds.length }),
      },
    };

    const result = await col.updateMany({ _id: { $in: objectIds } }, update);
    res.json({
      success: true,
      message: `${result.modifiedCount || 0} products processed`,
      data: { matchedCount: result.matchedCount || 0, modifiedCount: result.modifiedCount || 0, status: nextStatus },
    });
  } catch (error) {
    console.error("Error in bulkModerateProducts:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getModerationConfig = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const [categories, prohibitedKeywords] = await Promise.all([
      db.collection("categories").find({ isActive: { $ne: false } }).sort({ name: 1 }).toArray(),
      getModerationRules(db),
    ]);

    res.json({
      success: true,
      data: {
        reviewStatuses: REVIEW_STATUSES,
        prohibitedKeywords,
        categories: categories.map((category) => ({
          _id: category._id,
          name: category.name,
          slug: category.slug,
          requiredAttributes: getRequiredAttributes(category),
          attributeCount: (category.attributes || []).length,
        })),
      },
    });
  } catch (error) {
    console.error("Error in getModerationConfig:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.scanProductsForModeration = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const col = db.collection("products");
    const scope = req.body.scope || "queue";
    const query = scope === "all" ? {} : { approvalStatus: { $in: REVIEW_STATUSES } };
    const products = await col.find(query).limit(1000).toArray();
    const enriched = await enrichProducts(db, products);
    const now = new Date();
    const updates = enriched
      .filter((product) => product.moderationFlags.length > 0)
      .map((product) => ({
        updateOne: {
          filter: { _id: product._id },
          update: {
            $set: {
              moderationFlags: product.moderationFlags,
              approvalStatus: product.approvalStatus === "approved" ? "flagged" : product.approvalStatus || "flagged",
              lastAutoScannedAt: now,
              updatedAt: now,
            },
          },
        },
      }));

    if (updates.length > 0) await col.bulkWrite(updates);
    res.json({
      success: true,
      message: `${updates.length} product(s) flagged`,
      data: { scanned: products.length, flagged: updates.length },
    });
  } catch (error) {
    console.error("Error in scanProductsForModeration:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getDuplicateProductGroups = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const products = await db.collection("products").find({ isActive: { $ne: false } }).limit(2000).toArray();
    const groups = new Map();

    products.forEach((product) => {
      const key = normalizeCloneKey(product);
      if (!key) return;
      const list = groups.get(key) || [];
      list.push(product);
      groups.set(key, list);
    });

    const duplicateGroups = [...groups.values()]
      .filter((group) => group.length > 1 && new Set(group.map((product) => String(product.vendorId || ""))).size > 1)
      .map((group) => ({
        key: normalizeCloneKey(group[0]),
        title: group[0].title,
        categoryId: group[0].categoryId,
        brand: group[0].brand || group[0].attributes?.brand || "",
        count: group.length,
        products: group.map((product) => ({
          _id: product._id,
          title: product.title,
          vendorId: product.vendorId,
          price: round2(product.price),
          approvalStatus: product.approvalStatus || "approved",
        })),
      }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 50);

    res.json({ success: true, data: duplicateGroups });
  } catch (error) {
    console.error("Error in getDuplicateProductGroups:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getIpViolationReports = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { status = "pending" } = req.query;
    const query = status === "all" ? {} : { status };
    const reports = await db.collection("product_ip_reports").find(query).sort({ createdAt: -1 }).limit(100).toArray();
    res.json({ success: true, data: reports });
  } catch (error) {
    console.error("Error in getIpViolationReports:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.submitIpViolationReport = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const productId = getObjectId(req.body.productId);
    if (!productId) return res.status(400).json({ success: false, error: "Valid productId is required" });

    const report = {
      productId,
      reporterName: req.body.reporterName || "Anonymous",
      reporterType: req.body.reporterType || "customer",
      brandName: req.body.brandName || "",
      reason: req.body.reason || "Possible counterfeit or IP violation",
      evidenceUrls: Array.isArray(req.body.evidenceUrls) ? req.body.evidenceUrls : [],
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await db.collection("product_ip_reports").insertOne(report);
    res.status(201).json({ success: true, data: { ...report, _id: result.insertedId } });
  } catch (error) {
    console.error("Error in submitIpViolationReport:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.reviewIpViolationReport = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const reportId = getObjectId(req.params.reportId);
    if (!reportId) return res.status(400).json({ success: false, error: "Invalid report ID" });

    const report = await db.collection("product_ip_reports").findOne({ _id: reportId });
    if (!report) return res.status(404).json({ success: false, error: "Report not found" });

    const status = req.body.status || "resolved";
    const now = new Date();
    await db.collection("product_ip_reports").updateOne(
      { _id: reportId },
      {
        $set: {
          status,
          adminNote: req.body.adminNote || "",
          reviewedBy: req.user?.uid || "admin",
          reviewedAt: now,
          updatedAt: now,
        },
      },
    );

    if (req.body.delistProduct) {
      await db.collection("products").updateOne(
        { _id: report.productId },
        {
          $set: {
            approvalStatus: "delisted",
            isActive: false,
            delistedReason: req.body.adminNote || "Delisted after IP violation review",
            updatedAt: now,
            lastModeratedAt: now,
          },
          $push: {
            moderationHistory: addModerationHistory("ip_report_delisted", req, {
              reportId,
              note: req.body.adminNote || "",
            }),
          },
        },
      );
    }

    res.json({ success: true, message: "IP report reviewed" });
  } catch (error) {
    console.error("Error in reviewIpViolationReport:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getBrandRegistry = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const brands = await db.collection("brand_registry").find({}).sort({ name: 1 }).limit(200).toArray();
    res.json({ success: true, data: brands });
  } catch (error) {
    console.error("Error in getBrandRegistry:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.upsertBrandRegistryItem = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const name = String(req.body.name || "").trim();
    if (!name) return res.status(400).json({ success: false, error: "Brand name is required" });
    const now = new Date();
    const normalizedName = normalizeText(name);
    const ownerVendorId = req.body.ownerVendorId && ObjectId.isValid(req.body.ownerVendorId)
      ? new ObjectId(req.body.ownerVendorId)
      : req.body.ownerVendorId || null;

    const result = await db.collection("brand_registry").findOneAndUpdate(
      { normalizedName },
      {
        $set: {
          name,
          normalizedName,
          ownerVendorId,
          trademarkNumber: req.body.trademarkNumber || "",
          status: req.body.status || "pending",
          officialStoreEligible: Boolean(req.body.officialStoreEligible),
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true, returnDocument: "after" },
    );

    res.status(201).json({ success: true, data: result.value || result });
  } catch (error) {
    console.error("Error in upsertBrandRegistryItem:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.reviewBrandRegistryItem = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const brandId = getObjectId(req.params.brandId);
    if (!brandId) return res.status(400).json({ success: false, error: "Invalid brand ID" });

    const status = req.body.status || "approved";
    const now = new Date();
    const brand = await db.collection("brand_registry").findOne({ _id: brandId });
    if (!brand) return res.status(404).json({ success: false, error: "Brand not found" });

    await db.collection("brand_registry").updateOne(
      { _id: brandId },
      {
        $set: {
          status,
          officialStoreEligible: status === "approved" ? Boolean(req.body.officialStoreEligible ?? true) : false,
          adminNote: req.body.adminNote || "",
          reviewedBy: req.user?.uid || "admin",
          reviewedAt: now,
          updatedAt: now,
        },
      },
    );

    if (status === "approved" && brand.ownerVendorId && req.body.officialStoreEligible !== false) {
      await db.collection("vendors").updateOne(
        { _id: brand.ownerVendorId },
        {
          $set: {
            officialStore: true,
            officialBrandName: brand.name,
            officialStoreApprovedAt: now,
            updatedAt: now,
          },
        },
      );
    }

    res.json({ success: true, message: "Brand registry item reviewed" });
  } catch (error) {
    console.error("Error in reviewBrandRegistryItem:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getVendorProductsAdmin = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { vendorId } = req.params;
    const { status, page = 1, limit = 20, search } = req.query;
    const vendorObjectId = getObjectId(vendorId);
    if (!vendorObjectId) return res.status(400).json({ success: false, error: "Invalid vendorId" });

    const vendorMatch = { $or: [{ vendorId: vendorObjectId }, { vendorId: vendorId.toString() }] };
    const and = [vendorMatch];
    if (status && status !== "all") and.push({ approvalStatus: status });
    if (search) {
      const regex = buildSearchRegex(search);
      and.push({
        $or: [
          { title: regex },
          { description: regex },
          { sku: regex },
          { "variants.sku": regex },
        ],
      });
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    const query = and.length > 1 ? { $and: and } : vendorMatch;
    const col = db.collection("products");

    const [products, total] = await Promise.all([
      col.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).toArray(),
      col.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: products,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error("Error in getVendorProductsAdmin:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports._private = {
  buildModerationFlags,
  buildDuplicateMap,
  buildListQuery,
  normalizeCloneKey,
  getRequiredAttributes,
};
