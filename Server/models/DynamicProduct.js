const mongoose = require("mongoose");

const dynamicProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    discountPrice: {
      type: Number,
      min: 0,
    },
    image: {
      type: String,
    },
    images: [
      {
        type: String,
      },
    ],
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DynamicCategory",
      required: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
    },
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    sku: {
      type: String,
      unique: true,
      sparse: true,
    },
    // Dynamic attributes stored as key-value pairs
    dynamicAttributes: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
    // Alternative: Array of objects approach
    // dynamicAttributes: [
    //   {
    //     attributeName: String,
    //     attributeValue: mongoose.Schema.Types.Mixed,
    //   },
    // ],
    isActive: {
      type: Boolean,
      default: true,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Indexes for faster queries
dynamicProductSchema.index({ slug: 1 });
dynamicProductSchema.index({ category: 1 });
dynamicProductSchema.index({ vendor: 1 });
dynamicProductSchema.index({ isActive: 1 });
dynamicProductSchema.index({ sku: 1 });

// Generate slug from name if not provided
dynamicProductSchema.pre("save", function (next) {
  if (!this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }
  next();
});

module.exports = mongoose.model("DynamicProduct", dynamicProductSchema);
