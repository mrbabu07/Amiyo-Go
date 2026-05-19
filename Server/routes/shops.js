const express = require("express");
const { verifyOptionalToken, verifyToken } = require("../middleware/auth");
const shopController = require("../controllers/shopController");

const router = express.Router();

router.get("/", verifyOptionalToken, shopController.listShops);
router.get("/:slug/products", verifyOptionalToken, shopController.getShopProducts);
router.get("/:slug/reviews", verifyOptionalToken, shopController.getShopReviews);
router.get("/:slug/follow/status", verifyToken, shopController.getShopFollowStatus);
router.post("/:slug/follow", verifyToken, shopController.followShop);
router.delete("/:slug/follow", verifyToken, shopController.unfollowShop);
router.get("/:slug", verifyOptionalToken, shopController.getShopBySlug);

module.exports = router;
