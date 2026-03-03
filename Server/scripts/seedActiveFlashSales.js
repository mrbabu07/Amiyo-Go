require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const FlashSale = require("../models/FlashSale");

const uri = process.env.MONGO_URI;

async function seedActiveFlashSales() {
  try {
    await mongoose.connect(uri);
    console.log("✅ Connected to MongoDB");

    // Get Product model
    const Product = mongoose.model(
      "Product",
      new mongoose.Schema({}, { strict: false }),
    );
    const products = await Product.find().limit(8);

    if (products.length === 0) {
      console.log(
        "❌ No products found. Please run 'npm run seed' first to create products.",
      );
      process.exit(1);
    }

    console.log(`📦 Found ${products.length} products\n`);

    // Clear existing flash sales
    await FlashSale.deleteMany({});
    console.log("🗑️  Cleared existing flash sales");

    // Create flash sales that are ACTIVE RIGHT NOW
    const flashSalesData = [
      {
        title: products[0].title + " - Flash Sale 50% OFF!",
        description: "Limited time offer! Don't miss out!",
        product: products[0]._id,
        originalPrice: products[0].price || 999,
        flashPrice: Math.round((products[0].price || 999) * 0.5),
        discountPercentage: 50,
        startTime: new Date(Date.now() - 10 * 60 * 1000), // Started 10 min ago
        endTime: new Date(Date.now() + 5 * 60 * 60 * 1000), // Ends in 5 hours
        totalStock: 50,
        soldCount: 12,
        maxPerUser: 2,
        isActive: true,
      },
      {
        title: products[1].title + " - Lightning Deal 60% OFF!",
        description: "Massive discount! Hurry, limited stock!",
        product: products[1]._id,
        originalPrice: products[1].price || 899,
        flashPrice: Math.round((products[1].price || 899) * 0.4),
        discountPercentage: 60,
        startTime: new Date(Date.now() - 5 * 60 * 1000), // Started 5 min ago
        endTime: new Date(Date.now() + 4 * 60 * 60 * 1000), // Ends in 4 hours
        totalStock: 30,
        soldCount: 8,
        maxPerUser: 1,
        isActive: true,
      },
      {
        title: products[2].title + " - Flash Sale 40% OFF!",
        description: "Incredible deal! Perfect for you!",
        product: products[2]._id,
        originalPrice: products[2].price || 1299,
        flashPrice: Math.round((products[2].price || 1299) * 0.6),
        discountPercentage: 40,
        startTime: new Date(Date.now() - 30 * 60 * 1000), // Started 30 min ago
        endTime: new Date(Date.now() + 3 * 60 * 60 * 1000), // Ends in 3 hours
        totalStock: 20,
        soldCount: 5,
        maxPerUser: 1,
        isActive: true,
      },
      {
        title: products[3].title + " - Super Sale 55% OFF!",
        description: "Premium quality at unbeatable price!",
        product: products[3]._id,
        originalPrice: products[3].price || 399,
        flashPrice: Math.round((products[3].price || 399) * 0.45),
        discountPercentage: 55,
        startTime: new Date(Date.now() - 45 * 60 * 1000), // Started 45 min ago
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // Ends in 2 hours
        totalStock: 100,
        soldCount: 45,
        maxPerUser: 3,
        isActive: true,
      },
      {
        title: products[4].title + " - Flash Deal 45% OFF!",
        description: "Latest collection at flash sale prices!",
        product: products[4]._id,
        originalPrice: products[4].price || 180,
        flashPrice: Math.round((products[4].price || 180) * 0.55),
        discountPercentage: 45,
        startTime: new Date(Date.now() - 20 * 60 * 1000), // Started 20 min ago
        endTime: new Date(Date.now() + 6 * 60 * 60 * 1000), // Ends in 6 hours
        totalStock: 75,
        soldCount: 32,
        maxPerUser: 2,
        isActive: true,
      },
    ];

    // Create flash sales
    const createdSales = await FlashSale.insertMany(flashSalesData);
    console.log(`✅ Created ${createdSales.length} ACTIVE flash sales\n`);

    // Display summary
    console.log("📊 Flash Sales Summary:");
    console.log("========================\n");

    createdSales.forEach((sale, index) => {
      const timeLeft = Math.round((sale.endTime - new Date()) / 60000);
      const hoursLeft = Math.floor(timeLeft / 60);
      const minutesLeft = timeLeft % 60;

      console.log(`${index + 1}. ${sale.title}`);
      console.log(
        `   💰 $${sale.flashPrice} (${sale.discountPercentage}% off from $${sale.originalPrice})`,
      );
      console.log(`   ⏰ ${hoursLeft}h ${minutesLeft}m remaining`);
      console.log(
        `   📦 ${sale.totalStock - sale.soldCount}/${sale.totalStock} available`,
      );
      console.log(`   🔴 ACTIVE NOW!\n`);
    });

    console.log("✅ All flash sales are ACTIVE and ready!");
    console.log("\n🌐 Visit: http://localhost:5173");
    console.log("🔧 Admin: http://localhost:5173/admin/flash-sales\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding flash sales:", error);
    process.exit(1);
  }
}

seedActiveFlashSales();
