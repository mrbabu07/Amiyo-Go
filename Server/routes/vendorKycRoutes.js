const express = require("express");
const multer = require("multer");
const { verifyToken } = require("../middleware/auth");
const vendorController = require("../controllers/vendorController");

const router = express.Router();

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 3,
  },
  fileFilter: (req, file, cb) => {
    const allowed = file.mimetype?.startsWith("image/") || file.mimetype === "application/pdf";
    if (!allowed) return cb(new Error("Only images and PDF files are allowed"));
    cb(null, true);
  },
});

router.use(verifyToken);

router.get("/", vendorController.getMyKyc);
router.get("/status", vendorController.getMyKyc);
router.post(
  "/",
  memoryUpload.fields([
    { name: "nidFront", maxCount: 1 },
    { name: "nidBack", maxCount: 1 },
    { name: "tradeLicense", maxCount: 1 },
  ]),
  vendorController.submitVendorKyc,
);
router.post(
  "/submit",
  memoryUpload.fields([
    { name: "nidFront", maxCount: 1 },
    { name: "nidBack", maxCount: 1 },
    { name: "tradeLicense", maxCount: 1 },
  ]),
  vendorController.submitVendorKyc,
);

module.exports = router;
