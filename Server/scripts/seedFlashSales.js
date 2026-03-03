require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const FlashSale = require("../models/FlashSale");

const uri = process.env.MONGO_URI;

const flashSalesData = [
  {
    title: "iPhone 14 Pro - Flash Sale 50% OFF!",
    description:
      "Limited time offer on the latest iPhone 14 Pro. Don't miss out!",
    product: null, // Will be set to actual product ID
    originalPrice: 999,
    flashPrice: 499,
    discountPercentage: 50,
    startTime: new Date(Date.now() + 2 * 60 * 1000), // Starts in 2 minutes
    endTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // Ends in 2 hours
    totalStock: 50,
    soldCount: 12,
    maxPerUser: 2,
    isActive: true,
  },
  {
    title: "Samsung Galaxy S23 - Lightning Deal!",
    description:
      "Massive discount on Samsung Galaxy S23. Hurry, limited stock!",
    product: null,
    originalPrice: 899,
    flashPrice: 449,
    discountPercentage: 50,
    startTime: new Date(Date.now() + 5 * 60 * 1000), // Starts in 5 minutes
    endTime: new Date(Date.now() + 3 * 60 * 60 * 1000), // Ends in 3 hours
    totalStock: 30,
    soldCount: 8,
    maxPerUser: 1,
    isActive: true,
  },
  {
    title: "MacBook Air M2 - Flash Sale 40% OFF!",
    description:
      "Incredible deal on MacBook Air M2. Perfect for work and play!",
    product: null,
    originalPrice: 1299,
    flashPrice: 779,
    discountPercentage: 40,
    startTime: new Date(Date.now() + 10 * 60 * 1000), // Starts in 10 minutes
    endTime: new Date(Date.now() + 4 * 60 * 60 * 1000), // Ends in 4 hours
    totalStock: 20,
    soldCount: 5,
    maxPerUser: 1,
    isActive: true,
  },
  {
    title: "Sony WH-1000XM5 Headphones - 60% OFF!",
    description: "Premium noise-cancelling headphones at an unbeatable price!",
    product: null,
    originalPrice: 399,
    flashPrice: 159,
    discountPercentage: 60,
    startTime: new Date(Date.now() - 30 * 60 * 1000), // Started 30 minutes ago (ACTIVE NOW)
    endTime: new Date(Date.now() + 90 * 60 * 1000), // Ends in 90 minutes
    totalStock: 100,
    soldCount: 45,
    maxPerUser: 3,
    isActive: true,
  },
  {
    title: "Nike Air Max 2024 - Flash Sale 45% OFF!",
    description:
      "Latest Nike Air Max at flash sale prices. Limited sizes available!",
    product: null,
    originalPrice: 180,
    flashPrice: 99,
    discountPercentage: 45,
    startTime: new Date(Date.now() - 15 * 60 * 1000), // Started 15 minutes ago (ACTIVE NOW)
    endTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // Ends in 2 hours
    totalStock: 75,
    soldCount: 32,
    maxPerUser: 2,
    isActive: true,
  },
  {
    title: 'iPad Pro 12.9" - Mega Flash Sale!',
    description:
      "Professional tablet at consumer prices. Perfect for creators!",
    product: null,
    originalPrice: 1099,
    flashPrice: 659,
    discountPercentage: 40,
    startTime: new Date(Date.now() + 30 * 60 * 1000), // Starts in 30 minutes (UPCOMING)
    endTime: new Date(Date.now() + 5 * 60 * 60 * 1000), // Ends in 5 hours
    totalStock: 40,
    soldCount: 0,
    maxPerUser: 1,
    isActive: true,
  },
  {
    title: "Dell XPS 15 Laptop - Flash Deal 35% OFF!",
    description: "Powerful laptop for professionals. Limited time offer!",
    product: null,
    originalPrice: 1599,
    flashPrice: 1039,
    discountPercentage: 35,
    startTime: new Date(Date.now() + 60 * 60 * 1000), // Starts in 1 hour (UPCOMING)
    endTime: new Date(Date.now() + 6 * 60 * 60 * 1000), // Ends in 6 hours
    totalStock: 25,
    soldCount: 0,
    maxPerUser: 1,
    isActive: true,
  },
  {
    title: "Apple Watch Series 9 - 50% Flash Sale!",
    description: "Smart watch at half price! Track your fitness in style.",
    product: null,
    originalPrice: 429,
    flashPrice: 214,
    discountPercentage: 50,
    startTime: new Date(Date.now() - 45 * 60 * 1000), // Started 45 minutes ago (ACTIVE NOW)
    endTime: new Date(Date.now() + 75 * 60 * 1000), // Ends in 75 minutes
    totalStock: 60,
    soldCount: 38,
    maxPerUser: 2,
    isActive: true,
  },
];

async function seedFlashSales() {
  try {
    await mongoose.connect(uri);
    console.log("✅ Connected to MongoDB");

    // Get some products from the database
    const Product = mongoose.model(
      "Product",
      new mongoose.Schema({}, { strict: false }),
    );
    const products = await Product.find().limit(8);

    if (products.length === 0) {
      console.log(
        "❌ No products found in database. Please run 'npm run seed' first to create products.",
      );
      process.exit(1);
    }

    console.log(`📦 Found ${products.length} products`);

    // Clear existing flash sales
    await FlashSale.deleteMany({});
    console.log("🗑️  Cleared existing flash sales");

    // Assign products to flash sales
    const flashSalesToCreate = flashSalesData
      .slice(0, products.length)
      .map((sale, index) => ({
        ...sale,
        product: products[index]._id,
        originalPrice: products[index].price || sale.originalPrice,
        flashPrice: Math.round(
          (products[index].price || sale.originalPrice) *
            (1 - sale.discountPercentage / 100),
        ),
      }));

    // Create flash sales
    const createdSales = await FlashSale.insertMany(flashSalesToCreate);
    console.log(`✅ Created ${createdSales.length} flash sales`);

    // Display summary
    console.log("\n📊 Flash Sales Summary:");
    console.log("========================");

    const activeSales = createdSales.filter((sale) => {
      const now = new Date();
      return now >= sale.startTime && now <= sale.endTime;
    });

    const upcomingSales = createdSales.filter((sale) => {
      const now = new Date();
      return now < sale.startTime;
    });

    console.log(`\n🔴 ACTIVE NOW (${activeSales.length}):`);
    activeSales.forEach((sale) => {
      const timeLeft = Math.round((sale.endTime - new Date()) / 60000);
      console.log(`  ⚡ ${sale.title}`);
      console.log(
        `     💰 ₹${sale.flashPrice} (${sale.discountPercentage}% off)`,
      );
      console.log(`     ⏰ ${timeLeft} minutes left`);
      console.log(
        `     📦 ${sale.remainingStock}/${sale.totalStock} remaining\n`,
      );
    });

    console.log(`\n🔵 UPCOMING (${upcomingSales.length}):`);
    upcomingSales.forEach((sale) => {
      const startsIn = Math.round((sale.startTime - new Date()) / 60000);
      console.log(`  ⏳ ${sale.title}`);
      console.log(
        `     💰 ₹${sale.flashPrice} (${sale.discountPercentage}% off)`,
      );
      console.log(`     🕐 Starts in ${startsIn} minutes`);
      console.log(`     📦 ${sale.totalStock} units available\n`);
    });

    console.log("\n✅ Flash sales seeded successfully!");
    console.log("\n🌐 Visit: http://localhost:5173/flash-sales");
    console.log("🔧 Admin: http://localhost:5173/admin/flash-sales\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding flash sales:", error);
    process.exit(1);
  }
}

seedFlashSales();
