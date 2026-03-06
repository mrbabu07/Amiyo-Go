const express = require("express");
const router = express.Router();
const { verifyToken, verifyAdmin, requireRole } = require("../middleware/auth");
const {
  createCategoryRequest,
  getVendorCategoryRequests,
  getAllCategoryRequests,
  approveCategoryRequest,
  rejectCategoryRequest,
  deleteCategoryRequest,
} = require("../controllers/categoryRequestController");

// Vendor routes
router.post("/", verifyToken, requireRole("vendor"), createCategoryRequest);
router.get("/my-requests", verifyToken, requireRole("vendor"), getVendorCategoryRequests);
router.delete("/:requestId", verifyToken, requireRole("vendor"), deleteCategoryRequest);

// Admin routes
router.get("/admin/all", verifyToken, verifyAdmin, getAllCategoryRequests);
router.post("/:requestId/approve", verifyToken, verifyAdmin, approveCategoryRequest);
router.post("/:requestId/reject", verifyToken, verifyAdmin, rejectCategoryRequest);

module.exports = router;
