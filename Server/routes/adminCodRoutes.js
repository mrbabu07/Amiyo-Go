const express = require("express");
const { ObjectId } = require("mongodb");
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const {
  getAdminCodReconciliation,
  markAdminCodDelivered,
  confirmAdminCodPayment,
} = require("../controllers/orderController");

const router = express.Router();

const appendAudit = async (req, action, target, changes = {}) => {
  try {
    const payload = {
      action,
      module: "finance",
      actor: {
        userId: req.user?.uid || req.dbUser?._id?.toString?.() || "admin",
        role: req.dbUser?.role || req.user?.role || "admin",
        email: req.user?.email || req.dbUser?.email || "",
      },
      target,
      changes,
      createdAt: new Date(),
    };
    const AuditLog = req.app.locals.models?.AuditLog;
    if (AuditLog?.append) return AuditLog.append(payload);
    return req.app.locals.db.collection("audit_logs").insertOne(payload);
  } catch (error) {
    console.error("Failed to append COD audit:", error.message);
    return null;
  }
};

router.use(verifyToken, verifyAdmin);

router.get("/", getAdminCodReconciliation);
router.get("/reconciliation", getAdminCodReconciliation);
router.post("/:id/mark-collected", markAdminCodDelivered);
router.post("/:id/mark-remitted", confirmAdminCodPayment);

router.post("/:id/mark-failed", async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ success: false, error: "Invalid order id" });
    const now = new Date();
    const reason = String(req.body.reason || "COD failed").trim();
    const result = await req.app.locals.models.Order.collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          codCollectionStatus: "failed",
          codState: "cod_failed",
          codFailedAt: now,
          codFailureReason: reason,
          updatedAt: now,
        },
        $push: {
          statusHistory: {
            status: "cod_failed",
            changedAt: now,
            changedBy: req.user?.uid || "admin",
            note: reason,
          },
        },
      },
    );
    await appendAudit(req, "finance.cod.failed", { type: "order", id }, { reason });
    res.json({ success: true, data: { matched: result.matchedCount, modified: result.modifiedCount } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
