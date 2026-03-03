const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const {
  getUserAddresses,
  getAddressById,
  getDefaultAddress,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} = require("../controllers/addressController");

// Apply authentication to all address routes
router.use(verifyToken);

// GET /api/addresses - Get user's addresses
router.get("/", getUserAddresses);

// GET /api/addresses/default - Get user's default address
router.get("/default", getDefaultAddress);

// GET /api/addresses/:id - Get specific address
router.get("/:id", getAddressById);

// POST /api/addresses - Create new address
router.post("/", createAddress);

// PUT /api/addresses/:id - Update address
router.put("/:id", updateAddress);

// DELETE /api/addresses/:id - Delete address
router.delete("/:id", deleteAddress);

// PATCH /api/addresses/:id/default - Set as default address
router.patch("/:id/default", setDefaultAddress);

module.exports = router;
