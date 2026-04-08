const express = require("express");
const router = express.Router();
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const {
  createProduct,
  getAllProducts,
  getProductById,
  getProductBySlug,
  updateProduct,
  deleteProduct,
  getProductsByCategory,
} = require("../controllers/dynamicProductController");

// Public routes
router.get("/", getAllProducts);
router.get("/slug/:slug", getProductBySlug);
router.get("/category/:categoryId", getProductsByCategory);
router.get("/:id", getProductById);

// Admin routes
router.post("/", verifyToken, verifyAdmin, createProduct);
router.put("/:id", verifyToken, verifyAdmin, updateProduct);
router.delete("/:id", verifyToken, verifyAdmin, deleteProduct);

module.exports = router;
