const express = require("express");
const router = express.Router();
const flashSaleController = require("../controllers/flashSaleController");
const { verifyToken, verifyAdmin } = require("../middleware/auth");

// Public routes
router.get("/active", flashSaleController.getActiveFlashSales);
router.get("/upcoming", flashSaleController.getUpcomingFlashSales);
router.get("/:id", flashSaleController.getFlashSaleById);

// Admin routes
router.get("/", verifyToken, verifyAdmin, flashSaleController.getAllFlashSales);
router.post("/", verifyToken, verifyAdmin, flashSaleController.createFlashSale);
router.put(
  "/:id",
  verifyToken,
  verifyAdmin,
  flashSaleController.updateFlashSale,
);
router.delete(
  "/:id",
  verifyToken,
  verifyAdmin,
  flashSaleController.deleteFlashSale,
);
router.post("/:id/purchase", verifyToken, flashSaleController.recordPurchase);

module.exports = router;
