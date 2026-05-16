const express = require("express");
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const dispatchController = require("../controllers/dispatchController");

const router = express.Router();

router.use(verifyToken, verifyAdmin);

router.get("/assignments", dispatchController.getAssignments);
router.post("/assignments", dispatchController.createAssignment);
router.patch("/assignments/:id/status", dispatchController.updateAssignmentStatus);
router.get("/assignments/:id/packing-slip", dispatchController.downloadPackingSlip);
router.get("/assignments/:id/barcode-label", dispatchController.downloadBarcodeLabel);
router.get("/manifest/pdf", dispatchController.downloadManifest);

module.exports = router;
