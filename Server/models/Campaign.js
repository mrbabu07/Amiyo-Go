const mongoose = require("mongoose");

const campaignSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    bannerImageUrl: {
      type: String,
      required: true,
    },
    bannerImageKey: {
      type: String,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    discountPercentage: {
      type: Number,
      required: true,
      min: 5,
      max: 100,
    },
    status: {
      type: String,
      enum: ["Draft", "Scheduled", "Active", "Ended", "Archived"],
      default: "Draft",
    },
    eligibleCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    maxProductsPerVendor: {
      type: Number,
      default: 100,
      min: 1,
      max: 1000,
    },
    minViewsThreshold: {
      type: Number,
    },
    minOrdersThreshold: {
      type: Number,
    },
    minRevenueThreshold: {
      type: Number,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Validate that endDate is after startDate
campaignSchema.pre("save", function (next) {
  if (this.endDate <= this.startDate) {
    return next(new Error("End date must be after start date"));
  }

  const durationMs = this.endDate - this.startDate;
  const durationDays = durationMs / (1000 * 60 * 60 * 24);

  if (durationDays < 1 || durationDays > 365) {
    return next(
      new Error("Campaign duration must be between 1 day and 365 days"),
    );
  }

  if (this.eligibleCategories.length === 0) {
    return next(new Error("At least one eligible category is required"));
  }

  next();
});

// Virtual for remaining time
campaignSchema.virtual("remainingTime").get(function () {
  const now = new Date();
  if (now >= this.endDate) return 0;
  return this.endDate - now;
});

// Method to check if campaign is currently active
campaignSchema.methods.isCurrentlyActive = function () {
  const now = new Date();
  return this.status === "Active" && now >= this.startDate && now <= this.endDate;
};

// Method to update status based on current time
campaignSchema.methods.updateStatus = function () {
  const now = new Date();

  if (this.status === "Draft") {
    return this.status;
  }

  if (now < this.startDate) {
    this.status = "Scheduled";
  } else if (now >= this.startDate && now <= this.endDate) {
    this.status = "Active";
  } else if (now > this.endDate) {
    this.status = "Ended";
  }

  return this.status;
};

campaignSchema.set("toJSON", { virtuals: true });
campaignSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Campaign", campaignSchema);
