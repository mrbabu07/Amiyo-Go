const express = require("express");
const router = express.Router();
const multer = require("multer");
const { ObjectId } = require("mongodb");
const { verifyToken, requireApprovedVendor, requireVendorPermission } = require("../middleware/auth");
const vendorProductController = require("../controllers/vendorProductController");
const { uploadFiles } = require("../services/storageService");
const { enqueueBulkUpload } = require("../services/bulkUploadQueue");

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 5,
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype?.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
});

const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const isCsv =
      file.mimetype === "text/csv" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.originalname?.toLowerCase().endsWith(".csv");
    if (!isCsv) return cb(new Error("Only CSV files are allowed"));
    cb(null, true);
  },
});

// All routes require approved vendor status
router.use(verifyToken);
router.use(requireApprovedVendor);
router.use(requireVendorPermission("products:manage"));

// Vendor product management
router.get("/",                    vendorProductController.getVendorProducts);
router.post("/bulk-jobs", csvUpload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "CSV file is required" });
    }

    const job = await enqueueBulkUpload({
      app: req.app,
      vendor: req.vendor,
      user: req.user,
      file: req.file,
    });

    res.status(202).json({ success: true, data: job });
  } catch (error) {
    console.error("Bulk upload enqueue failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});
router.get("/bulk-jobs/:jobId", async (req, res) => {
  try {
    const job = await req.app.locals.db.collection("bulk_upload_jobs").findOne({
      _id: new ObjectId(req.params.jobId),
      vendorId: req.vendor._id.toString(),
    });

    if (!job) {
      return res.status(404).json({ success: false, error: "Bulk upload job not found" });
    }

    const { csvText, reportCsv, ...safeJob } = job;
    res.json({ success: true, data: safeJob });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to load bulk upload job" });
  }
});
router.get("/bulk-jobs/:jobId/report", async (req, res) => {
  try {
    const job = await req.app.locals.db.collection("bulk_upload_jobs").findOne({
      _id: new ObjectId(req.params.jobId),
      vendorId: req.vendor._id.toString(),
    });

    if (!job || !job.reportCsv) {
      return res.status(404).json({ success: false, error: "Validation report not ready" });
    }

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="bulk-upload-report-${req.params.jobId}.csv"`);
    res.send(job.reportCsv);
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to download report" });
  }
});
router.post(
  "/upload-images",
  imageUpload.array("images", 5),
  async (req, res) => {
    try {
      const images = await uploadFiles({
        req,
        files: req.files || [],
        folder: `products/${req.vendor._id}`,
      });

      res.json({ success: true, data: images, urls: images.map((file) => file.url) });
    } catch (error) {
      console.error("Vendor product upload failed:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  },
);
router.post("/",                   vendorProductController.createProduct);
router.get("/:id",                 vendorProductController.getProductById);
router.patch("/:id",               vendorProductController.updateProduct);
router.delete("/:id",              vendorProductController.deleteProduct);
router.post("/:id/submit",         vendorProductController.submitForApproval);
router.patch("/:id/archive",       vendorProductController.archiveProduct);

module.exports = router;
