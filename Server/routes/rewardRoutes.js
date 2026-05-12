const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const rewardController = require("../controllers/rewardController");

router.get("/spin/status", verifyToken, rewardController.getStatus);
router.post("/spin", verifyToken, rewardController.spin);

module.exports = router;
