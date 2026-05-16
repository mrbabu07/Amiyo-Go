const express = require("express");
const archiver = require("archiver");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

router.use(verifyToken);

const writeJson = (archive, name, value) => {
  archive.append(JSON.stringify(value || [], null, 2), { name });
};

router.get("/export", async (req, res) => {
  try {
    const db = req.app.locals.db;
    const userId = req.user.uid;
    const user = req.dbUser || await req.app.locals.models.User.findByFirebaseUid(userId);
    const userObjectId = user?._id?.toString();

    const [orders, returns, payments, reviews, wishlist, notifications, addresses, vendor, vendorStaff] =
      await Promise.all([
        db.collection("orders").find({ userId }).toArray(),
        db.collection("returns").find({ userId }).toArray(),
        db.collection("payments").find({ userId }).toArray(),
        db.collection("reviews").find({ userId }).toArray(),
        db.collection("wishlist").find({ userId }).toArray(),
        db.collection("notifications").find({ userId }).toArray(),
        db.collection("addresses").find({ userId }).toArray(),
        userObjectId ? db.collection("vendors").findOne({ ownerUserId: userObjectId }) : null,
        userObjectId ? db.collection("vendor_staff").find({ userId: userObjectId }).toArray() : [],
      ]);

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="amiyo-go-account-export-${userId}.zip"`);

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("error", (error) => {
      console.error("Account export archive error:", error);
      if (!res.headersSent) {
        res.status(500).end();
      } else {
        res.end();
      }
    });
    archive.pipe(res);

    writeJson(archive, "user.json", user || {});
    writeJson(archive, "orders.json", orders);
    writeJson(archive, "returns.json", returns);
    writeJson(archive, "payments.json", payments);
    writeJson(archive, "reviews.json", reviews);
    writeJson(archive, "wishlist.json", wishlist);
    writeJson(archive, "notifications.json", notifications);
    writeJson(archive, "addresses.json", addresses);
    writeJson(archive, "vendor.json", vendor || {});
    writeJson(archive, "vendor_staff.json", vendorStaff);

    await archive.finalize();
  } catch (error) {
    console.error("Account export failed:", error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: "Failed to export account data" });
    }
  }
});

router.post("/delete", async (req, res) => {
  try {
    const User = req.app.locals.models.User;
    const deleteAfter = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await User.collection.updateOne(
      { firebaseUid: req.user.uid },
      {
        $set: {
          status: "pending_delete",
          deletionRequestedAt: new Date(),
          deleteAfter,
          deletionReason: req.body.reason || "",
          updatedAt: new Date(),
        },
      },
    );

    res.json({
      success: true,
      message: "Account deletion scheduled with a 30-day grace period",
      deleteAfter,
    });
  } catch (error) {
    console.error("Account deletion scheduling failed:", error);
    res.status(500).json({ success: false, error: "Failed to schedule account deletion" });
  }
});

router.post("/delete/cancel", async (req, res) => {
  try {
    const User = req.app.locals.models.User;
    await User.collection.updateOne(
      { firebaseUid: req.user.uid, status: "pending_delete" },
      {
        $set: { status: "active", updatedAt: new Date() },
        $unset: { deletionRequestedAt: "", deleteAfter: "", deletionReason: "" },
      },
    );

    res.json({ success: true, message: "Account deletion cancelled" });
  } catch (error) {
    console.error("Account deletion cancel failed:", error);
    res.status(500).json({ success: false, error: "Failed to cancel account deletion" });
  }
});

module.exports = router;
