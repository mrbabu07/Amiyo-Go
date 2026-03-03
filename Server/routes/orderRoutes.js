const express = require("express");
const router = express.Router();
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const {
  getAllOrders,
  getUserOrders,
  createOrder,
  updateOrderStatus,
  cancelOrder,
  downloadInvoice,
} = require("../controllers/orderController");

router.get("/", verifyToken, verifyAdmin, getAllOrders);
router.get("/my-orders", verifyToken, getUserOrders);
router.post("/", verifyToken, createOrder);
router.post("/guest", createOrder); // Guest checkout - no auth required
router.patch("/:id/status", verifyToken, verifyAdmin, updateOrderStatus);
router.post("/:id/cancel", verifyToken, cancelOrder); // Cancel order within 30 min
router.get("/:id/invoice", downloadInvoice); // Download invoice (public for guest orders)

module.exports = router;
