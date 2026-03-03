/**
 * Check Current Delivery Settings
 *
 * This script shows the current delivery settings in the database.
 */

require("dotenv").config();
const mongoose = require("mongoose");

const uri = process.env.MONGO_URI;

async function checkDeliverySettings() {
  try {
    await mongoose.connect(uri);
    console.log("✅ Connected to MongoDB\n");

    const DeliverySettings = require("../models/DeliverySettings");
    const settings = await DeliverySettings.getSettings();

    console.log("📦 Current Delivery Settings:");
    console.log("=".repeat(60));
    console.log(`Free Delivery Enabled: ${settings.freeDeliveryEnabled}`);
    console.log(
      `Free Delivery Threshold: $${settings.freeDeliveryThreshold} USD (৳${Math.round(settings.freeDeliveryThreshold * 110)} BDT)`,
    );
    console.log(
      `Standard Delivery Charge: $${settings.standardDeliveryCharge.toFixed(4)} USD (৳${Math.round(settings.standardDeliveryCharge * 110)} BDT)`,
    );
    console.log(
      `Express Delivery Charge: $${settings.expressDeliveryCharge.toFixed(4)} USD (৳${Math.round(settings.expressDeliveryCharge * 110)} BDT)`,
    );
    console.log(`Express Delivery Enabled: ${settings.expressDeliveryEnabled}`);
    console.log("=".repeat(60));

    console.log("\n💡 Interpretation:");
    if (settings.freeDeliveryEnabled) {
      console.log(
        `   ✅ Free delivery is ENABLED for orders over ৳${Math.round(settings.freeDeliveryThreshold * 110)}`,
      );
    } else {
      console.log("   ❌ Free delivery is DISABLED - all orders pay delivery");
    }
    console.log(
      `   💰 Standard delivery charge: ৳${Math.round(settings.standardDeliveryCharge * 110)}`,
    );

    await mongoose.disconnect();
    console.log("\n👋 Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkDeliverySettings();
