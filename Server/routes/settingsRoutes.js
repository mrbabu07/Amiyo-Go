const express = require("express");
const { getPublicPlatformConfig } = require("../controllers/adminPlatformController");

const router = express.Router();

router.get("/public", getPublicPlatformConfig);

module.exports = router;
