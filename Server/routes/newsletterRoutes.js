const express = require("express");
const router = express.Router();
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const newsletterController = require("../controllers/newsletterController");

router.post("/subscribe", newsletterController.subscribe);
router.get("/unsubscribe/:token", newsletterController.unsubscribe);
router.get("/open/:broadcastId/:token.gif", newsletterController.trackOpen);
router.get("/subscribers", verifyToken, verifyAdmin, newsletterController.listSubscribers);
router.get("/broadcasts", verifyToken, verifyAdmin, newsletterController.listBroadcasts);
router.post("/broadcasts", verifyToken, verifyAdmin, newsletterController.createBroadcast);
router.get("/broadcasts/:id", verifyToken, verifyAdmin, newsletterController.getBroadcast);
router.post("/broadcasts/:id/send", verifyToken, verifyAdmin, newsletterController.sendBroadcastNow);

module.exports = router;
