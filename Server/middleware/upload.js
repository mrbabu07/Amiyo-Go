const multer = require("multer");

const allowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "video/mp4",
  "video/quicktime",
]);

const maxSizeFor = (file) => {
  if (file.mimetype?.startsWith("image/")) return 5 * 1024 * 1024;
  if (file.mimetype === "application/pdf") return 10 * 1024 * 1024;
  if (file.mimetype?.startsWith("video/")) return 50 * 1024 * 1024;
  return 0;
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 10,
  },
  fileFilter(req, file, cb) {
    if (!allowedTypes.has(file.mimetype)) {
      return cb(new Error("Only jpeg, png, webp, gif, pdf, mp4, and mov files are allowed"));
    }
    cb(null, true);
  },
});

const validateUploadedFileSize = (req, res, next) => {
  const files = [
    ...(req.file ? [req.file] : []),
    ...Object.values(req.files || {}).flat(),
  ];

  for (const file of files) {
    const maxSize = maxSizeFor(file);
    if (!maxSize || file.size > maxSize) {
      return res.status(400).json({
        success: false,
        error: `${file.originalname || "File"} exceeds the allowed size for ${file.mimetype}`,
      });
    }
  }

  next();
};

module.exports = {
  upload,
  validateUploadedFileSize,
};
