const express = require("express");
const router = express.Router();
const { verifyToken, verifyAdmin, verifyOptionalToken } = require("../middleware/auth");
const {
  getAllProducts,
  getProductById,
  searchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getFilterOptions,
  getLowStockProducts,
  getOutOfStockProducts,
  updateStockBulk,
  incrementProductView,
  reportProduct,
  updateProductVariants,
  getProductVariants,
} = require("../controllers/productController");

// Public routes
router.get("/", getAllProducts);
router.get("/search", searchProducts);
router.get("/filter-options", getFilterOptions);

// Admin routes
router.get("/admin/low-stock", verifyToken, verifyAdmin, getLowStockProducts);
router.get(
  "/admin/out-of-stock",
  verifyToken,
  verifyAdmin,
  getOutOfStockProducts,
);
router.post("/", verifyToken, verifyAdmin, createProduct);
router.patch("/bulk-stock-update", verifyToken, verifyAdmin, updateStockBulk);

// ID-based routes must stay after static routes such as /admin/low-stock.
router.get("/:id", getProductById);
router.get("/:id/variants", getProductVariants);
router.post("/:id/view", incrementProductView);
router.post("/:id/report", verifyOptionalToken, reportProduct);
router.put("/:id", verifyToken, verifyAdmin, updateProduct);
router.put("/:id/variants", verifyToken, verifyAdmin, updateProductVariants);
router.delete("/:id", verifyToken, verifyAdmin, deleteProduct);

module.exports = router;
