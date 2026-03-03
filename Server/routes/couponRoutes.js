const express = require("express");
const router = express.Router();
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const {
  getAllCoupons,
  getCouponById,
  getActiveCoupons,
  validateCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  applyCoupon,
} = require("../controllers/couponController");

// Public routes
router.get("/active", getActiveCoupons);
router.post("/validate", validateCoupon);

// Protected routes (require authentication)
router.use(verifyToken);

// Apply coupon (user route)
router.post("/apply", applyCoupon);

// Admin routes
router.get("/", verifyAdmin, getAllCoupons);
router.get("/:id", verifyAdmin, getCouponById);
router.post("/", verifyAdmin, createCoupon);
router.put("/:id", verifyAdmin, updateCoupon);
router.delete("/:id", verifyAdmin, deleteCoupon);

module.exports = router;
