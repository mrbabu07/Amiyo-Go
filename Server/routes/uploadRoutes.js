const express = require("express");
const multer = require("multer");
const { verifyToken } = require("../middleware/auth");
const { uploadFiles } = require("../services/storageService");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 8,
  },
  fileFilter: (req, file, cb) => {
    const allowed =
      file.mimetype?.startsWith("image/") ||
      file.mimetype?.startsWith("video/") ||
      file.mimetype === "application/pdf";
    if (!allowed) {
      return cb(new Error("Only image, video, and PDF files are allowed"));
    }
    cb(null, true);
  },
});

router.post("/images", verifyToken, upload.array("images", 8), async (req, res) => {
  try {
    const folder = req.body.folder || "general";
    const files = await uploadFiles({
      req,
      files: req.files || [],
      folder,
    });

    res.json({
      success: true,
      data: files,
      urls: files.map((file) => file.url),
    });
  } catch (error) {
    console.error("Upload failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
