/**
 * Create Test Coupon
 *
 * This script creates a test coupon for testing the coupon validation
 */

require("dotenv").config();
const mongoose = require("mongoose");

const createTestCoupon = async () => {
  try {
    console.log("🔧 Creating test coupon...\n");

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Define Coupon Schema
    const couponSchema = new mongoose.Schema({
      code: { type: String, required: true, unique: true, uppercase: true },
      name: { type: String, required: true },
      description: String,
      discountType: {
        type: String,
        enum: ["percentage", "fixed"],
        required: true,
      },
      discountValue: { type: Number, required: true },
      maxDiscountAmount: Number,
      minOrderAmount: Number,
      usageLimit: Number,
      usedCount: { type: Number, default: 0 },
      userUsageLimit: Number,
      usedBy: [
        {
          userId: String,
          usedAt: Date,
        },
      ],
      expiresAt: { type: Date, required: true },
      isActive: { type: Boolean, default: true },
      createdAt: { type: Date, default: Date.now },
    });

    const Coupon = mongoose.model("Coupon", couponSchema);

    // Create test coupons
    const testCoupons = [
      {
        code: "SAVE10",
        name: "10% Off",
        description: "Get 10% off on your order",
        discountType: "percentage",
        discountValue: 10,
        minOrderAmount: 5, // $5 minimum (৳550)
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        isActive: true,
      },
      {
        code: "SAVE20",
        name: "20% Off",
        description: "Get 20% off on orders above $20",
        discountType: "percentage",
        discountValue: 20,
        minOrderAmount: 20, // $20 minimum (৳2200)
        maxDiscountAmount: 10, // Max $10 discount (৳1100)
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
      },
      {
        code: "FLAT100",
        name: "৳100 Off",
        description: "Get ৳100 off on your order",
        discountType: "fixed",
        discountValue: 100 / 110, // Convert BDT to USD
        minOrderAmount: 10, // $10 minimum (৳1100)
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
      },
      {
        code: "WELCOME50",
        name: "Welcome Discount",
        description: "Get ৳50 off on your first order",
        discountType: "fixed",
        discountValue: 50 / 110, // Convert BDT to USD
        minOrderAmount: 5, // $5 minimum (৳550)
        userUsageLimit: 1, // One time per user
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        isActive: true,
      },
    ];

    for (const couponData of testCoupons) {
      // Check if coupon already exists
      const existing = await Coupon.findOne({ code: couponData.code });
      if (existing) {
        console.log(
          `⚠️  Coupon ${couponData.code} already exists, skipping...`,
        );
        continue;
      }

      const coupon = await Coupon.create(couponData);
      console.log(`✅ Created coupon: ${coupon.code} - ${coupon.name}`);
      console.log(
        `   Discount: ${coupon.discountType === "percentage" ? coupon.discountValue + "%" : "৳" + Math.round(coupon.discountValue * 110)}`,
      );
      console.log(`   Min Order: ৳${Math.round(coupon.minOrderAmount * 110)}`);
      if (coupon.maxDiscountAmount) {
        console.log(
          `   Max Discount: ৳${Math.round(coupon.maxDiscountAmount * 110)}`,
        );
      }
      console.log(`   Expires: ${coupon.expiresAt.toLocaleDateString()}\n`);
    }

    console.log("\n🎉 Test coupons created successfully!");
    console.log("\n📋 Available Coupon Codes:");
    console.log("   - SAVE10: 10% off (min ৳550)");
    console.log("   - SAVE20: 20% off (min ৳2200, max ৳1100 discount)");
    console.log("   - FLAT100: ৳100 off (min ৳1100)");
    console.log("   - WELCOME50: ৳50 off for first order (min ৳550)");

    await mongoose.connection.close();
    console.log("\n✅ Database connection closed");
  } catch (error) {
    console.error("❌ Error creating test coupon:", error);
    process.exit(1);
  }
};

createTestCoupon();
