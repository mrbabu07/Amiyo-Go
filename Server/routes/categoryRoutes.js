const express = require("express");
const router = express.Router();
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const {
  getAllCategories,
  getCategoryById,
  getCategoryChildren,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController");

router.get("/", getAllCategories);
router.get("/:id", getCategoryById);
router.get("/:id/children", getCategoryChildren);
router.post("/", verifyToken, verifyAdmin, createCategory);
router.put("/:id", verifyToken, verifyAdmin, updateCategory);
router.delete("/:id", verifyToken, verifyAdmin, deleteCategory);

module.exports = router;
