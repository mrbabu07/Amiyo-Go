const mongoose = require("mongoose");

const recommendationSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    recommendations: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        score: {
          type: Number,
          default: 0,
        },
        reason: {
          type: String,
          enum: [
            "viewed_together",
            "bought_together",
            "similar_category",
            "trending",
            "personalized",
          ],
          default: "personalized",
        },
      },
    ],
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// Update recommendations periodically
recommendationSchema.index({ lastUpdated: 1 });

module.exports = mongoose.model("Recommendation", recommendationSchema);
