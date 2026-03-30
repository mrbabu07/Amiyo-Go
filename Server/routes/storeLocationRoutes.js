const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const {
  createStoreLocation,
  getMyStoreLocations,
  getVendorLocations,
  findNearbyStores,
  calculateDeliveryEstimate,
  updateStoreLocation,
  setPrimaryLocation,
  deleteStoreLocation,
  getStoresByType,
} = require("../controllers/storeLocationController");

// Public routes
router.get("/nearby", findNearbyStores);
router.get("/delivery-estimate", calculateDeliveryEstimate);
router.get("/vendor/:vendorId", getVendorLocations);
router.get("/type/:type", getStoresByType);

// Vendor routes (protected)
router.post("/", verifyToken, createStoreLocation);
router.get("/my-locations", verifyToken, getMyStoreLocations);
router.put("/:id", verifyToken, updateStoreLocation);
router.post("/:id/set-primary", verifyToken, setPrimaryLocation);
router.delete("/:id", verifyToken, deleteStoreLocation);

module.exports = router;
