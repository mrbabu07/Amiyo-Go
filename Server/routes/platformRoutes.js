const express = require("express");
const { getPublicPlatformConfig } = require("../controllers/adminPlatformController");

const router = express.Router();

router.get("/config", getPublicPlatformConfig);

module.exports = router;
