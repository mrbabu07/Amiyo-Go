const express = require("express");
const PushSubscription = require("../models/PushSubscription");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

router.get("/vapid-key", (req, res) => {
  res.json({
    success: Boolean(process.env.VAPID_PUBLIC_KEY),
    publicKey: process.env.VAPID_PUBLIC_KEY || "",
    configured: Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
  });
});

router.post("/subscribe", verifyToken, async (req, res) => {
  try {
    const { subscription, device = {} } = req.body;
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return res.status(400).json({ success: false, error: "Valid push subscription is required" });
    }

    const userId = req.dbUser?._id?.toString?.() || req.user?._id?.toString?.() || req.user?.uid;
    const userAgent = req.headers["user-agent"] || "";
    await PushSubscription.updateOne(
      { "subscription.endpoint": subscription.endpoint },
      {
        $set: {
          userId: String(userId),
          subscription,
          device: {
            browser: device.browser || "",
            os: device.os || "",
            userAgent: device.userAgent || userAgent,
          },
          isActive: true,
        },
      },
      { upsert: true },
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete("/unsubscribe", verifyToken, async (req, res) => {
  try {
    const endpoint = req.body?.endpoint || req.body?.subscription?.endpoint;
    if (!endpoint) return res.status(400).json({ success: false, error: "Subscription endpoint is required" });
    await PushSubscription.updateOne(
      { "subscription.endpoint": endpoint },
      { $set: { isActive: false } },
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
