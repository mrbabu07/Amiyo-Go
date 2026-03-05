const express = require("express");
const router = express.Router();
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const {
  getAllAdminProducts,
  getPendingProducts,
  approveProduct,
  rejectProduct,
} = require("../controllers/adminProductController");

// All routes require admin authentication
router.get("/",        verifyToken, verifyAdmin, getAllAdminProducts);
router.get("/pending", verifyToken, verifyAdmin, getPendingProducts);
router.patch("/:id/approve", verifyToken, verifyAdmin, approveProduct);
router.patch("/:id/reject",  verifyToken, verifyAdmin, rejectProduct);

module.exports = router;
