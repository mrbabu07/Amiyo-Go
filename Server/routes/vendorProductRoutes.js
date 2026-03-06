const express = require("express");
const router = express.Router();
const { verifyToken, requireApprovedVendor } = require("../middleware/auth");
const vendorProductController = require("../controllers/vendorProductController");

// All routes require approved vendor status
router.use(verifyToken);
router.use(requireApprovedVendor);

// Vendor product management
router.get("/",                    vendorProductController.getVendorProducts);
router.post("/",                   vendorProductController.createProduct);
router.get("/:id",                 vendorProductController.getProductById);
router.patch("/:id",               vendorProductController.updateProduct);
router.delete("/:id",              vendorProductController.deleteProduct);
router.post("/:id/submit",         vendorProductController.submitForApproval);
router.patch("/:id/archive",       vendorProductController.archiveProduct);

module.exports = router;
