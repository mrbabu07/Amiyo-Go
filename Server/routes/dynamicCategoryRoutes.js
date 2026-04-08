const express = require("express");
const router = express.Router();
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const {
  createCategory,
  getAllCategories,
  getCategoryById,
  getCategoryBySlug,
  updateCategory,
  addAttribute,
  updateAttribute,
  deleteAttribute,
  deleteCategory,
} = require("../controllers/dynamicCategoryController");

// Public routes
router.get("/", getAllCategories);
router.get("/slug/:slug", getCategoryBySlug);
router.get("/:id", getCategoryById);

// Admin routes
router.post("/", verifyToken, verifyAdmin, createCategory);
router.put("/:id", verifyToken, verifyAdmin, updateCategory);
router.delete("/:id", verifyToken, verifyAdmin, deleteCategory);

// Attribute management routes
router.post("/:id/attributes", verifyToken, verifyAdmin, addAttribute);
router.put("/:id/attributes/:attributeId", verifyToken, verifyAdmin, updateAttribute);
router.delete("/:id/attributes/:attributeId", verifyToken, verifyAdmin, deleteAttribute);

module.exports = router;
