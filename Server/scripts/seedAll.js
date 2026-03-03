require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const FlashSale = require("../models/FlashSale");
const StockAlert = require("../models/StockAlert");
const Loyalty = require("../models/Loyalty");
const Recommendation = require("../models/Recommendation");

const uri = process.env.MONGO_URI;

// Sample data for new features
const sampleUsers = [
  {
    userId: "user123",
    email: "john@example.com",
  },
  {
    userId: "user456",
    email: "jane@example.com",
  },
  {
    userId: "user789",
    email: "bob@example.com",
  },
];

async function seedAllData() {
  try {
    await mongoose.connect(uri);
    console.log("✅ Connected to MongoDB");

    // Get Product model
    const Product = mongoose.model(
      "Product",
      new mongoose.Schema({}, { strict: false }),
    );
    const products = await Product.find().limit(10);

    if (products.length === 0) {
      console.log(
        "❌ No products found. Please run 'npm run seed' first to create products.",
      );
      process.exit(1);
    }

    console.log(`📦 Found ${products.length} products\n`);

    // ========================================
    // 1. SEED FLASH SALES
    // ========================================
    console.log("🔥 Seeding Flash Sales...");
    await FlashSale.deleteMany({});

    const flashSalesData = [
      {
        title: "iPhone 14 Pro - Flash Sale 50% OFF!",
        description: "Limited time offer on the latest iPhone 14 Pro.",
        product: products[0]._id,
        originalPrice: products[0].price || 999,
        flashPrice: Math.round((products[0].price || 999) * 0.5),
        discountPercentage: 50,
        startTime: new Date(Date.now() - 30 * 60 * 1000), // Started 30 min ago
        endTime: new Date(Date.now() + 90 * 60 * 1000), // Ends in 90 min
        totalStock: 50,
        soldCount: 12,
        maxPerUser: 2,
        isActive: true,
      },
      {
        title: "Samsung Galaxy - Lightning Deal!",
        description: "Massive discount on Samsung Galaxy.",
        product: products[1]._id,
        originalPrice: products[1].price || 899,
        flashPrice: Math.round((products[1].price || 899) * 0.5),
        discountPercentage: 50,
        startTime: new Date(Date.now() - 15 * 60 * 1000), // Started 15 min ago
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // Ends in 2 hours
        totalStock: 30,
        soldCount: 8,
        maxPerUser: 1,
        isActive: true,
      },
      {
        title: "MacBook Air - Flash Sale 40% OFF!",
        description: "Incredible deal on MacBook Air.",
        product: products[2]._id,
        originalPrice: products[2].price || 1299,
        flashPrice: Math.round((products[2].price || 1299) * 0.6),
        discountPercentage: 40,
        startTime: new Date(Date.now() + 10 * 60 * 1000), // Starts in 10 min
        endTime: new Date(Date.now() + 4 * 60 * 60 * 1000), // Ends in 4 hours
        totalStock: 20,
        soldCount: 0,
        maxPerUser: 1,
        isActive: true,
      },
    ];

    const flashSales = await FlashSale.insertMany(flashSalesData);
    console.log(`   ✅ Created ${flashSales.length} flash sales`);

    // ========================================
    // 2. SEED STOCK ALERTS
    // ========================================
    console.log("\n🔔 Seeding Stock Alerts...");
    await StockAlert.deleteMany({});

    const stockAlertsData = [
      {
        userId: sampleUsers[0].userId,
        email: sampleUsers[0].email,
        productId: products[0]._id,
        alertType: "back_in_stock",
        active: true,
        notified: false,
      },
      {
        userId: sampleUsers[0].userId,
        email: sampleUsers[0].email,
        productId: products[1]._id,
        alertType: "price_drop",
        priceThreshold: (products[1].price || 100) * 0.8,
        active: true,
        notified: false,
      },
      {
        userId: sampleUsers[1].userId,
        email: sampleUsers[1].email,
        productId: products[2]._id,
        alertType: "low_stock",
        active: true,
        notified: false,
      },
      {
        userId: sampleUsers[1].userId,
        email: sampleUsers[1].email,
        productId: products[3]._id,
        alertType: "back_in_stock",
        active: true,
        notified: true,
        notifiedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    ];

    const stockAlerts = await StockAlert.insertMany(stockAlertsData);
    console.log(`   ✅ Created ${stockAlerts.length} stock alerts`);

    // ========================================
    // 3. SEED LOYALTY ACCOUNTS
    // ========================================
    console.log("\n🎁 Seeding Loyalty Accounts...");
    await mongoose.model("Loyalty").deleteMany({});

    const loyaltyData = [
      {
        userId: sampleUsers[0].userId,
        email: sampleUsers[0].email,
        points: 2500,
        tier: "silver",
        totalEarned: 5000,
        totalRedeemed: 2500,
        referralCode:
          "REF" + sampleUsers[0].userId.substring(0, 8).toUpperCase(),
        transactions: [
          {
            type: "earned",
            points: 1000,
            reason: "Order #12345",
            date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
          {
            type: "earned",
            points: 500,
            reason: "Referral bonus",
            date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          },
          {
            type: "redeemed",
            points: 1000,
            reason: "Redeemed for order #12346",
            date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          },
          {
            type: "earned",
            points: 1500,
            reason: "Order #12347",
            date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          },
        ],
      },
      {
        userId: sampleUsers[1].userId,
        email: sampleUsers[1].email,
        points: 7500,
        tier: "gold",
        totalEarned: 12000,
        totalRedeemed: 4500,
        referralCode:
          "REF" + sampleUsers[1].userId.substring(0, 8).toUpperCase(),
        transactions: [
          {
            type: "earned",
            points: 3000,
            reason: "Order #12348",
            date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          },
          {
            type: "earned",
            points: 2000,
            reason: "Order #12349",
            date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
          },
          {
            type: "earned",
            points: 1000,
            reason: "Birthday bonus",
            date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
          },
        ],
      },
      {
        userId: sampleUsers[2].userId,
        email: sampleUsers[2].email,
        points: 15000,
        tier: "platinum",
        totalEarned: 25000,
        totalRedeemed: 10000,
        referralCode:
          "REF" + sampleUsers[2].userId.substring(0, 8).toUpperCase(),
        transactions: [
          {
            type: "earned",
            points: 5000,
            reason: "Order #12350",
            date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          },
          {
            type: "earned",
            points: 3000,
            reason: "Order #12351",
            date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
          },
        ],
      },
    ];

    const loyaltyAccounts = await mongoose
      .model("Loyalty")
      .insertMany(loyaltyData);
    console.log(`   ✅ Created ${loyaltyAccounts.length} loyalty accounts`);

    // ========================================
    // 4. SEED RECOMMENDATIONS
    // ========================================
    console.log("\n🎯 Seeding Recommendations...");
    await Recommendation.deleteMany({});

    const recommendationsData = [];

    // Create some recommendation records
    for (let i = 0; i < Math.min(5, products.length); i++) {
      recommendationsData.push({
        userId: sampleUsers[0].userId,
        productId: products[i]._id,
        type: "viewed",
        score: Math.random() * 10,
      });
    }

    if (recommendationsData.length > 0) {
      const recommendations =
        await Recommendation.insertMany(recommendationsData);
      console.log(
        `   ✅ Created ${recommendations.length} recommendation records`,
      );
    }

    // ========================================
    // SUMMARY
    // ========================================
    console.log("\n" + "=".repeat(50));
    console.log("✅ ALL DATA SEEDED SUCCESSFULLY!");
    console.log("=".repeat(50));

    console.log("\n📊 Summary:");
    console.log(`   🔥 Flash Sales: ${flashSales.length}`);
    console.log(`   🔔 Stock Alerts: ${stockAlerts.length}`);
    console.log(`   🎁 Loyalty Accounts: ${loyaltyAccounts.length}`);
    console.log(`   🎯 Recommendations: ${recommendationsData.length}`);

    console.log("\n🌐 Frontend URLs:");
    console.log("   • Flash Sales: http://localhost:5173/flash-sales");
    console.log("   • My Alerts: http://localhost:5173/my-alerts");
    console.log("   • Loyalty: http://localhost:5173/loyalty");
    console.log(
      "   • Admin Flash Sales: http://localhost:5173/admin/flash-sales",
    );

    console.log("\n💡 Note: To see YOUR data in the frontend:");
    console.log("   1. Register/Login to the application");
    console.log("   2. Your user ID will be used to create personalized data");
    console.log("   3. The sample data above uses test user IDs\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding data:", error);
    process.exit(1);
  }
}

seedAllData();
