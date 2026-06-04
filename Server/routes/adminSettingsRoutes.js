const express = require("express");
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const {
  getPlatformConfig,
  updatePlatformConfig,
} = require("../controllers/adminPlatformController");

const router = express.Router();

router.get("/", verifyToken, verifyAdmin, getPlatformConfig);
router.put("/", verifyToken, verifyAdmin, updatePlatformConfig);
router.patch("/", verifyToken, verifyAdmin, updatePlatformConfig);

module.exports = router;
