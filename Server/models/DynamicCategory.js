const mongoose = require("mongoose");

const attributeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ["text", "number", "select", "multiselect", "checkbox", "date"],
    required: true,
  },
  options: [
    {
      type: String,
      trim: true,
    },
  ],
  required: {
    type: Boolean,
    default: false,
  },
  order: {
    type: Number,
    default: 0,
  },
});

const dynamicCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
    },
    attributes: [attributeSchema],
    isActive: {
      type: Boolean,
      default: true,
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

// Index for faster queries
dynamicCategorySchema.index({ slug: 1 });
dynamicCategorySchema.index({ isActive: 1 });

module.exports = mongoose.model("DynamicCategory", dynamicCategorySchema);
