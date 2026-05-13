const mongoose = require("mongoose");

const deliverySettingsSchema = new mongoose.Schema(
  {
    freeDeliveryThreshold: {
      type: Number,
      required: true,
      default: 1000,
    },
    standardDeliveryCharge: {
      type: Number,
      required: true,
      default: 100,
    },
    expressDeliveryCharge: {
      type: Number,
      default: 80,
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
    platformBaseLocation: {
      division: {
        type: String,
        default: "Chattogram",
      },
      district: {
        type: String,
        default: "Coxsbazar",
      },
      upazila: {
        type: String,
        default: "Teknaf",
      },
      union: {
        type: String,
        default: "Hnila",
      },
    },
    zoneFees: {
      sameUnion: { type: Number, default: 30 },
      sameUpazila: { type: Number, default: 50 },
      sameDistrict: { type: Number, default: 80 },
      outsideDistrict: { type: Number, default: 120 },
    },
    remoteAreaFee: {
      type: Number,
      default: 0,
    },
    perishableFee: {
      type: Number,
      default: 20,
    },
    heavyItemThresholdKg: {
      type: Number,
      default: 5,
    },
    heavyItemFeePerKg: {
      type: Number,
      default: 10,
    },
    codCharge: {
      type: Number,
      default: 0,
    },
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

deliverySettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  } else {
    let changed = false;
    if (Number(settings.standardDeliveryCharge || 0) < 10) {
      settings.standardDeliveryCharge = 100;
      changed = true;
    }
    if (Number(settings.expressDeliveryCharge || 0) < 10) {
      settings.expressDeliveryCharge = 80;
      changed = true;
    }
    if (Number(settings.freeDeliveryThreshold || 0) < 100) {
      settings.freeDeliveryThreshold = 1000;
      changed = true;
    }
    if (!settings.zoneFees) {
      settings.zoneFees = {
        sameUnion: 30,
        sameUpazila: 50,
        sameDistrict: 80,
        outsideDistrict: 120,
      };
      changed = true;
    }
    if (!settings.platformBaseLocation?.union) {
      settings.platformBaseLocation = {
        division: "Chattogram",
        district: "Coxsbazar",
        upazila: "Teknaf",
        union: "Hnila",
      };
      changed = true;
    }
    if (changed) {
      await settings.save();
    }
  }
  return settings;
};

module.exports = mongoose.model("DeliverySettings", deliverySettingsSchema);
