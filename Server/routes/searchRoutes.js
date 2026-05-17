const express = require("express");
const router = express.Router();
const { verifyOptionalToken, verifyToken } = require("../middleware/auth");
const searchController = require("../controllers/searchController");

router.get("/autocomplete", verifyOptionalToken, searchController.getAutocomplete);
router.get("/results", verifyOptionalToken, searchController.getSearchResults);
router.get("/navigation", searchController.getSearchNavigation);
router.post("/history", verifyToken, searchController.saveSearchHistory);

module.exports = router;
