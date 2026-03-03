const mongoose = require("mongoose");

const stockAlertSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    alertType: {
      type: String,
      enum: ["back_in_stock", "price_drop", "low_stock"],
      required: true,
    },
    priceThreshold: {
      type: Number,
      default: null, // For price drop alerts
    },
    notified: {
      type: Boolean,
      default: false,
    },
    notifiedAt: {
      type: Date,
      default: null,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index for efficient queries
stockAlertSchema.index({ productId: 1, alertType: 1, active: 1 });
stockAlertSchema.index({ userId: 1, active: 1 });

module.exports = mongoose.model("StockAlert", stockAlertSchema);
