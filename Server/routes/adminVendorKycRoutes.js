const express = require("express");
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const vendorController = require("../controllers/vendorController");

const router = express.Router();

router.use(verifyToken, verifyAdmin);

router.get("/", vendorController.getKycQueue);
router.patch("/:vendorId/review", vendorController.reviewVendorKyc);

router.get("/:vendorId", async (req, res) => {
  try {
    const Vendor = req.app.locals.models.Vendor;
    const vendor = await Vendor.findById(req.params.vendorId);
    if (!vendor) return res.status(404).json({ success: false, error: "Vendor not found" });
    res.json({
      success: true,
      data: {
        vendorId: vendor._id,
        shopName: vendor.shopName,
        businessName: vendor.businessName,
        ownerName: vendor.ownerName,
        phone: vendor.phone,
        email: vendor.email,
        status: vendor.status,
        kyc: vendor.kyc || { status: "not_submitted", documents: {} },
        payoutDetails: vendor.payoutDetails || null,
        updatedAt: vendor.updatedAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
