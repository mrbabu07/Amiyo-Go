const express = require("express");
const {
  getActiveCoupons,
  validateCoupon,
} = require("../controllers/couponController");

const router = express.Router();

router.get("/active", getActiveCoupons);
router.post("/validate", validateCoupon);

module.exports = router;
