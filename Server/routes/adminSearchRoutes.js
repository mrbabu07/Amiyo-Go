const express = require("express");
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const adminSearchController = require("../controllers/adminSearchController");

const router = express.Router();

router.get("/", verifyToken, verifyAdmin, adminSearchController.searchAdminResources);
router.get("/:type/:id", verifyToken, verifyAdmin, adminSearchController.getAdminSearchResourceDetail);

module.exports = router;
