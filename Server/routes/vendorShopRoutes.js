const express = require("express");
const multer = require("multer");
const { verifyToken, requireApprovedVendor, requireVendorPermission } = require("../middleware/auth");
const shopController = require("../controllers/shopController");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 2,
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype?.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
});

router.get("/", verifyToken, requireApprovedVendor, requireVendorPermission("shop:view"), shopController.getOwnShop);
router.put("/", verifyToken, requireApprovedVendor, requireVendorPermission("shop:manage"), shopController.updateOwnShop);
router.put(
  "/location",
  verifyToken,
  requireApprovedVendor,
  requireVendorPermission("shop:manage"),
  shopController.updateOwnShopLocation,
);
router.put(
  "/media",
  verifyToken,
  requireApprovedVendor,
  requireVendorPermission("shop:manage"),
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "banner", maxCount: 1 },
  ]),
  shopController.updateOwnShopMedia,
);

module.exports = router;
