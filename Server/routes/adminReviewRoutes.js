const express = require("express");
const { ObjectId } = require("mongodb");
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const {
  getAllReviews,
  getUnrepliedReviews,
  addAdminReply,
  deleteReviewAdmin,
} = require("../controllers/reviewController");

const router = express.Router();

const appendAudit = async (req, action, target, changes = {}) => {
  try {
    const payload = {
      action,
      module: "reviews",
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
    console.error("Failed to append review audit:", error.message);
    return null;
  }
};

router.use(verifyToken, verifyAdmin);

router.get("/", getAllReviews);
router.get("/unreplied", getUnrepliedReviews);
router.post("/:reviewId/reply", addAdminReply);
router.delete("/:reviewId", deleteReviewAdmin);

router.patch("/:reviewId/moderate", async (req, res) => {
  try {
    const { reviewId } = req.params;
    if (!ObjectId.isValid(reviewId)) return res.status(400).json({ success: false, error: "Invalid review id" });
    const action = String(req.body.action || req.body.status || "").toLowerCase();
    const allowed = ["approved", "rejected", "hidden", "flagged", "pending"];
    if (!allowed.includes(action)) {
      return res.status(400).json({ success: false, error: "Invalid moderation action" });
    }
    const now = new Date();
    const patch = {
      moderationStatus: action,
      status: action === "approved" ? "approved" : action === "pending" ? "pending" : "hidden",
      moderationReason: req.body.reason || "",
      moderatedBy: req.user?.uid || "admin",
      moderatedAt: now,
      updatedAt: now,
    };
    const result = await req.app.locals.models.Review.collection.updateOne(
      { _id: new ObjectId(reviewId) },
      { $set: patch },
    );
    await appendAudit(req, "reviews.moderated", { type: "review", id: reviewId }, patch);
    res.json({ success: true, data: { matched: result.matchedCount, modified: result.modifiedCount, ...patch } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
