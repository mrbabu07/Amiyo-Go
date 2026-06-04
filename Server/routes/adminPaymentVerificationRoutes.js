const express = require("express");
const { ObjectId } = require("mongodb");
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const { idempotencyMiddleware } = require("../middleware/idempotency");
const {
  getManualPaymentQueue,
  approveManualPayment,
  rejectManualPayment,
} = require("../controllers/paymentController");

const router = express.Router();

const paymentReviewIdempotency = idempotencyMiddleware({
  scope: "admin-payment-verification",
  required: false,
});

const MANUAL_METHODS = ["bkash", "nagad", "rocket", "cod"];

const appendAudit = async (req, action, target, changes = {}) => {
  try {
    const payload = {
      action,
      module: "payments",
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
    console.error("Failed to append payment verification audit:", error.message);
    return null;
  }
};

router.use(verifyToken, verifyAdmin);

router.get("/stats", async (req, res) => {
  try {
    const Order = req.app.locals.models.Order;
    const base = { paymentMethod: { $in: MANUAL_METHODS } };
    const [pending, approved, rejected, duplicateTransactions] = await Promise.all([
      Order.collection.countDocuments({
        ...base,
        paymentStatus: { $in: ["pending", "pending_verification", "manual_review"] },
      }),
      Order.collection.countDocuments({
        ...base,
        paymentStatus: "paid",
        "manualPaymentVerification.status": "approved",
      }),
      Order.collection.countDocuments({
        ...base,
        paymentStatus: "payment_rejected",
      }),
      Order.collection
        .aggregate([
          { $match: { transactionId: { $exists: true, $nin: ["", null] } } },
          { $group: { _id: "$transactionId", count: { $sum: 1 } } },
          { $match: { count: { $gt: 1 } } },
          { $count: "total" },
        ])
        .toArray(),
    ]);

    res.json({
      success: true,
      data: {
        pending,
        approved,
        rejected,
        duplicateTransactions: duplicateTransactions[0]?.total || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/", getManualPaymentQueue);

router.patch("/:orderId/approve", paymentReviewIdempotency, async (req, res, next) => {
  await appendAudit(req, "payments.verification.approve_requested", { type: "order", id: req.params.orderId }, req.body);
  return approveManualPayment(req, res, next);
});

router.patch("/:orderId/reject", paymentReviewIdempotency, async (req, res, next) => {
  await appendAudit(req, "payments.verification.reject_requested", { type: "order", id: req.params.orderId }, req.body);
  return rejectManualPayment(req, res, next);
});

router.patch("/bulk", paymentReviewIdempotency, async (req, res) => {
  try {
    const { orderIds = [], action, reason = "", note = "", allowDuplicate = false } = req.body;
    const ids = Array.isArray(orderIds) ? orderIds.filter((id) => ObjectId.isValid(id)) : [];
    if (!ids.length) return res.status(400).json({ success: false, error: "orderIds are required" });
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ success: false, error: "action must be approve or reject" });
    }

    const now = new Date();
    const Order = req.app.locals.models.Order;
    const paymentStatus = action === "approve" ? "paid" : "payment_rejected";
    const orderStatus = action === "approve" ? "processing" : undefined;
    const verification = {
      status: action === "approve" ? "approved" : "rejected",
      reviewedBy: req.user?.uid || req.dbUser?._id?.toString() || "admin",
      reviewedAt: now,
      note,
      reason,
      duplicateAcknowledged: Boolean(allowDuplicate),
    };

    const update = {
      paymentStatus,
      manualPaymentVerification: verification,
      updatedAt: now,
    };
    if (orderStatus) update.status = orderStatus;

    const result = await Order.collection.updateMany(
      { _id: { $in: ids.map((id) => new ObjectId(id)) }, paymentMethod: { $in: MANUAL_METHODS } },
      { $set: update },
    );

    await appendAudit(req, `payments.verification.bulk_${action}`, { type: "order", id: "bulk" }, {
      orderIds: ids,
      matched: result.matchedCount,
      modified: result.modifiedCount,
    });

    res.json({
      success: true,
      data: {
        matched: result.matchedCount,
        modified: result.modifiedCount,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
