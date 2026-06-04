const express = require("express");
const multer = require("multer");
const { ObjectId } = require("mongodb");
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const { uploadFile } = require("../services/storageService");

const router = express.Router();

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 2,
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype?.startsWith("image/")) {
      return cb(new Error("Only image files are allowed."));
    }
    cb(null, true);
  },
});

const asDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const actor = (req) => ({
  userId: req.user?.uid || req.dbUser?._id?.toString?.() || "admin",
  role: req.dbUser?.role || req.user?.role || "admin",
  email: req.user?.email || req.dbUser?.email || "",
});

const appendAudit = async (req, action, target, changes = {}) => {
  try {
    const payload = {
      action,
      module: "marketing",
      actor: actor(req),
      target,
      changes,
      createdAt: new Date(),
    };
    const AuditLog = req.app.locals.models?.AuditLog;
    if (AuditLog?.append) return AuditLog.append(payload);
    return req.app.locals.db.collection("audit_logs").insertOne(payload);
  } catch (error) {
    console.error("Failed to append banner audit:", error.message);
    return null;
  }
};

const normalizeBannerPayload = async (req, existing = {}) => {
  const image = req.files?.image?.[0];
  const mobileImage = req.files?.mobileImage?.[0];
  const uploadedImage = image
    ? await uploadFile({ req, file: image, folder: "admin/banners" })
    : null;
  const uploadedMobileImage = mobileImage
    ? await uploadFile({ req, file: mobileImage, folder: "admin/banners/mobile" })
    : null;

  return {
    title: String(req.body.title ?? existing.title ?? "").trim(),
    subtitle: String(req.body.subtitle ?? existing.subtitle ?? "").trim(),
    placement: String(req.body.placement ?? existing.placement ?? "home_hero").trim(),
    imageUrl: uploadedImage?.url || String(req.body.imageUrl ?? existing.imageUrl ?? "").trim(),
    mobileImageUrl: uploadedMobileImage?.url || String(req.body.mobileImageUrl ?? existing.mobileImageUrl ?? "").trim(),
    linkUrl: String(req.body.linkUrl ?? existing.linkUrl ?? "").trim(),
    ctaLabel: String(req.body.ctaLabel ?? existing.ctaLabel ?? "").trim(),
    badgeText: String(req.body.badgeText ?? existing.badgeText ?? "").trim(),
    status: String(req.body.status ?? existing.status ?? "active").trim(),
    position: Number(req.body.position ?? existing.position ?? 0),
    activeFrom: asDate(req.body.activeFrom ?? existing.activeFrom),
    activeTo: asDate(req.body.activeTo ?? existing.activeTo),
    audience: String(req.body.audience ?? existing.audience ?? "all").trim(),
    updatedAt: new Date(),
  };
};

router.use(verifyToken, verifyAdmin);

router.get("/", async (req, res) => {
  try {
    const { placement, status, search, page = 1, limit = 50 } = req.query;
    const query = {};
    if (placement) query.placement = String(placement);
    if (status && status !== "all") query.status = String(status);
    if (search) {
      query.$or = [
        { title: { $regex: String(search), $options: "i" } },
        { subtitle: { $regex: String(search), $options: "i" } },
        { placement: { $regex: String(search), $options: "i" } },
      ];
    }

    const pageNum = Math.max(Number.parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(Number.parseInt(limit, 10) || 50, 1), 100);
    const collection = req.app.locals.models.Banner.collection;
    const [banners, total] = await Promise.all([
      collection
        .find(query)
        .sort({ placement: 1, position: 1, createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .toArray(),
      collection.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: banners,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post(
  "/",
  imageUpload.fields([
    { name: "image", maxCount: 1 },
    { name: "mobileImage", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const payload = await normalizeBannerPayload(req);
      if (!payload.title) return res.status(400).json({ success: false, error: "Banner title is required" });
      if (!payload.imageUrl) return res.status(400).json({ success: false, error: "Banner image is required" });
      if (!["active", "inactive", "scheduled"].includes(payload.status)) {
        return res.status(400).json({ success: false, error: "Invalid banner status" });
      }

      const doc = {
        ...payload,
        createdAt: new Date(),
        createdBy: actor(req),
      };
      const result = await req.app.locals.models.Banner.collection.insertOne(doc);
      await appendAudit(req, "marketing.banner.created", { type: "banner", id: result.insertedId.toString() }, doc);
      res.status(201).json({ success: true, data: { ...doc, _id: result.insertedId } });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

router.patch(
  "/:id",
  imageUpload.fields([
    { name: "image", maxCount: 1 },
    { name: "mobileImage", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, error: "Invalid banner id" });
      const collection = req.app.locals.models.Banner.collection;
      const existing = await collection.findOne({ _id: new ObjectId(req.params.id) });
      if (!existing) return res.status(404).json({ success: false, error: "Banner not found" });
      const payload = await normalizeBannerPayload(req, existing);
      await collection.updateOne({ _id: existing._id }, { $set: payload });
      await appendAudit(req, "marketing.banner.updated", { type: "banner", id: req.params.id }, payload);
      res.json({ success: true, data: await collection.findOne({ _id: existing._id }) });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

router.delete("/:id", async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, error: "Invalid banner id" });
    const result = await req.app.locals.models.Banner.collection.deleteOne({ _id: new ObjectId(req.params.id) });
    await appendAudit(req, "marketing.banner.deleted", { type: "banner", id: req.params.id });
    res.json({ success: true, data: { deleted: result.deletedCount } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
