const express = require("express");
const { verifyToken } = require("../middleware/auth");
const {
  downloadLabel,
  generateLabel,
  getCustomerTracking,
  getStateMachine,
} = require("../controllers/shipmentController");

const router = express.Router();

router.use(verifyToken);

router.get("/state-machine", getStateMachine);
router.get("/track/:orderId", getCustomerTracking);
router.post("/:id/generate-label", generateLabel);
router.get("/:id/label", downloadLabel);

module.exports = router;
