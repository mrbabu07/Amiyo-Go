const express = require("express");
const router = express.Router();
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const newsletterController = require("../controllers/newsletterController");

router.post("/subscribe", newsletterController.subscribe);
router.get("/subscribers", verifyToken, verifyAdmin, newsletterController.listSubscribers);

module.exports = router;
