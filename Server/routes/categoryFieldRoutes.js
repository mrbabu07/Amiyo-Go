const express = require("express");
const router = express.Router();
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const {
  getCategoryFields,
  createCategoryField,
  updateCategoryField,
  deleteCategoryField,
  reorderCategoryFields,
  getAllCategoriesWithFields,
  validateProductData,
} = require("../controllers/categoryFieldController");

// Public routes
router.get("/category/:categoryId", getCategoryFields);
router.post("/validate/:categoryId", validateProductData);

// Admin routes
router.get("/all", verifyToken, verifyAdmin, getAllCategoriesWithFields);
router.post("/", verifyToken, verifyAdmin, createCategoryField);
router.put("/:id", verifyToken, verifyAdmin, updateCategoryField);
router.delete("/:id", verifyToken, verifyAdmin, deleteCategoryField);
router.post("/reorder/:categoryId", verifyToken, verifyAdmin, reorderCategoryFields);

module.exports = router;
