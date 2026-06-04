const mongoose = require("mongoose");

const pushSubscriptionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    subscription: {
      endpoint: { type: String, required: true, unique: true },
      expirationTime: { type: mongoose.Schema.Types.Mixed, default: null },
      keys: {
        p256dh: { type: String, required: true },
        auth: { type: String, required: true },
      },
    },
    device: {
      browser: { type: String, default: "" },
      os: { type: String, default: "" },
      userAgent: { type: String, default: "" },
    },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

module.exports = mongoose.models.PushSubscription || mongoose.model("PushSubscription", pushSubscriptionSchema);
