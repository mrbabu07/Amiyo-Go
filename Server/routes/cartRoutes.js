const express = require("express");
const { verifyToken } = require("../middleware/auth");
const {
  clearCart,
  getCart,
  mergeCart,
  replaceCart,
} = require("../controllers/cartController");

const router = express.Router();

router.use(verifyToken);

router.get("/", getCart);
router.put("/", replaceCart);
router.post("/merge", mergeCart);
router.delete("/", clearCart);

module.exports = router;
