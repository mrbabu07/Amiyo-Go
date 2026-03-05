const express = require("express");
const router = express.Router();
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const {
  getPayouts,
  generatePayouts,
  markPayoutPaid,
} = require("../controllers/adminPayoutController");

router.get("/",           verifyToken, verifyAdmin, getPayouts);
router.post("/generate",  verifyToken, verifyAdmin, generatePayouts);
router.patch("/:id/pay",  verifyToken, verifyAdmin, markPayoutPaid);

module.exports = router;
