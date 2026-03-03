const express = require("express");
const router = express.Router();
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const {
  getAllReturns,
  getUserReturns,
  getReturnById,
  createReturnRequest,
  updateReturnStatus,
  processRefund,
  getReturnStats,
  getOrderReturns,
} = require("../controllers/returnController");

// Test route without authentication (for debugging)
router.get("/test", (req, res) => {
  console.log("🔥 Returns test route hit!");
  res.json({ message: "Returns routes are working!", timestamp: new Date() });
});

// Test POST route without authentication (for debugging)
router.post("/test", (req, res) => {
  res.json({
    message: "Returns POST route working!",
    data: req.body,
    timestamp: new Date(),
  });
});

// All other return routes require authentication
router.use(verifyToken);

// User routes
router.get("/my-returns", getUserReturns);
router.get("/order/:orderId", getOrderReturns);
router.post("/", createReturnRequest);

// Admin routes - these should come before the /:id route to avoid conflicts
router.get("/admin/all", verifyAdmin, getAllReturns);
router.get("/admin/stats", verifyAdmin, getReturnStats);
router.patch("/:id/status", verifyAdmin, updateReturnStatus);
router.post("/:id/refund", verifyAdmin, processRefund);

// This route should come last to avoid conflicts
router.get("/:id", getReturnById);

module.exports = router;
