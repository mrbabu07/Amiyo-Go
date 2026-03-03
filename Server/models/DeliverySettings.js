const mongoose = require("mongoose");

const deliverySettingsSchema = new mongoose.Schema(
  {
    freeDeliveryThreshold: {
      type: Number,
      required: true,
      default: 50, // $50 USD = ৳5,500 BDT (easier to reach)
    },
    standardDeliveryCharge: {
      type: Number,
      required: true,
      default: 100 / 110, // ~0.909 USD = ৳100 BDT
    },
    expressDeliveryCharge: {
      type: Number,
      default: 200 / 110, // ~1.818 USD = ৳200 BDT
    },
    expressDeliveryEnabled: {
      type: Boolean,
      default: false,
    },
    freeDeliveryEnabled: {
      type: Boolean,
      default: true,
    },
    deliveryAreas: [
      {
        name: String,
        charge: Number,
        enabled: {
          type: Boolean,
          default: true,
        },
      },
    ],
    estimatedDeliveryDays: {
      min: {
        type: Number,
        default: 2,
      },
      max: {
        type: Number,
        default: 5,
      },
    },
  },
  {
    timestamps: true,
  },
);

// Ensure only one settings document exists
deliverySettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model("DeliverySettings", deliverySettingsSchema);
