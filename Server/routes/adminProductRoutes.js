const express = require("express");
const router = express.Router();
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const {
  getAllAdminProducts,
  getPendingProducts,
  approveProduct,
  rejectProduct,
  disableProduct,
  getVendorProductsAdmin,
} = require("../controllers/adminProductController");

// All routes require admin authentication
router.get("/",        verifyToken, verifyAdmin, getAllAdminProducts);
router.get("/pending", verifyToken, verifyAdmin, getPendingProducts);
router.patch("/:id/approve",  verifyToken, verifyAdmin, approveProduct);
router.patch("/:id/reject",   verifyToken, verifyAdmin, rejectProduct);
router.patch("/:id/disable",  verifyToken, verifyAdmin, disableProduct);

// Admin: view a specific vendor's products (used in Manage Vendors detail page)
router.get("/by-vendor/:vendorId", verifyToken, verifyAdmin, getVendorProductsAdmin);

module.exports = router;
