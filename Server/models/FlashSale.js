const mongoose = require("mongoose");

const flashSaleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    originalPrice: {
      type: Number,
      required: true,
    },
    flashPrice: {
      type: Number,
      required: true,
    },
    discountPercentage: {
      type: Number,
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    totalStock: {
      type: Number,
      required: true,
      min: 0,
    },
    soldCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxPerUser: {
      type: Number,
      default: 5,
      min: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["upcoming", "active", "expired", "sold_out"],
      default: "upcoming",
    },
  },
  {
    timestamps: true,
  },
);

// Virtual for remaining stock
flashSaleSchema.virtual("remainingStock").get(function () {
  return this.totalStock - this.soldCount;
});

// Method to check if sale is currently active
flashSaleSchema.methods.isCurrentlyActive = function () {
  const now = new Date();
  return (
    this.isActive &&
    now >= this.startTime &&
    now <= this.endTime &&
    this.soldCount < this.totalStock
  );
};

// Update status based on time and stock
flashSaleSchema.methods.updateStatus = function () {
  const now = new Date();

  if (this.soldCount >= this.totalStock) {
    this.status = "sold_out";
  } else if (now < this.startTime) {
    this.status = "upcoming";
  } else if (now > this.endTime) {
    this.status = "expired";
  } else {
    this.status = "active";
  }

  return this.status;
};

flashSaleSchema.set("toJSON", { virtuals: true });
flashSaleSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("FlashSale", flashSaleSchema);
