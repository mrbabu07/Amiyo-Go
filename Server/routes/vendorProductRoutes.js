const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { verifyToken, requireApprovedVendor } = require("../middleware/auth");
const vendorProductController = require("../controllers/vendorProductController");

const uploadDir = path.join(__dirname, "../uploads/products");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeExt = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)
      ? ext
      : ".jpg";
    cb(
      null,
      `${req.vendor._id}-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`,
    );
  },
});

const imageUpload = multer({
  storage,
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

// All routes require approved vendor status
router.use(verifyToken);
router.use(requireApprovedVendor);

// Vendor product management
router.get("/",                    vendorProductController.getVendorProducts);
router.post(
  "/upload-images",
  imageUpload.array("images", 5),
  (req, res) => {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const images = (req.files || []).map((file) => ({
      filename: file.filename,
      url: `${baseUrl}/uploads/products/${file.filename}`,
      path: `/uploads/products/${file.filename}`,
      size: file.size,
      mimetype: file.mimetype,
    }));

    res.json({ success: true, data: images, urls: images.map((file) => file.url) });
  },
);
router.post("/",                   vendorProductController.createProduct);
router.get("/:id",                 vendorProductController.getProductById);
router.patch("/:id",               vendorProductController.updateProduct);
router.delete("/:id",              vendorProductController.deleteProduct);
router.post("/:id/submit",         vendorProductController.submitForApproval);
router.patch("/:id/archive",       vendorProductController.archiveProduct);

module.exports = router;
