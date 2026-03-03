const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const {
  getAllOffers,
  getActivePopupOffer,
  getOfferById,
  createOffer,
  updateOffer,
  deleteOffer,
  toggleOfferStatus,
} = require("../controllers/offerController");
const { verifyToken, verifyAdmin } = require("../middleware/auth");

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "offer-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase(),
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter,
});

// Public routes
router.get("/active-popup", getActivePopupOffer);

// Admin routes
router.get("/", verifyToken, verifyAdmin, getAllOffers);
router.get("/:id", verifyToken, verifyAdmin, getOfferById);
router.post("/", verifyToken, verifyAdmin, upload.single("image"), createOffer);
router.put(
  "/:id",
  verifyToken,
  verifyAdmin,
  upload.single("image"),
  updateOffer,
);
router.delete("/:id", verifyToken, verifyAdmin, deleteOffer);
router.patch("/:id/toggle", verifyToken, verifyAdmin, toggleOfferStatus);

module.exports = router;
