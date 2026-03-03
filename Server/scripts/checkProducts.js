require("dotenv").config();
const { MongoClient } = require("mongodb");

async function checkProducts() {
  const client = new MongoClient(process.env.MONGO_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const db = client.db();
    const productsCollection = db.collection("products");

    console.log("🔍 Checking products in database...\n");

    const totalProducts = await productsCollection.countDocuments();
    console.log(`Total products: ${totalProducts}\n`);

    if (totalProducts === 0) {
      console.log("❌ No products found in database!");
      console.log("\nPossible reasons:");
      console.log("1. Products were never added");
      console.log("2. Products were deleted");
      console.log("3. Wrong database name");
      console.log("\nCurrent database:", db.databaseName);
    } else {
      console.log("✅ Products exist in database\n");
      
      // Get sample products
      const sampleProducts = await productsCollection.find({}).limit(5).toArray();
      
      console.log("Sample products:");
      sampleProducts.forEach((product, index) => {
        console.log(`\n${index + 1}. ${product.name || product.title}`);
        console.log(`   ID: ${product._id}`);
        console.log(`   Price: ${product.price}`);
        console.log(`   Category: ${product.categoryId || product.category}`);
        console.log(`   Stock: ${product.stock || product.quantity || "N/A"}`);
        console.log(`   Status: ${product.status || "N/A"}`);
      });

      // Check product status distribution
      console.log("\n\n📊 Product Status:");
      const statusAgg = await productsCollection.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]).toArray();

      if (statusAgg.length > 0) {
        statusAgg.forEach(stat => {
          console.log(`   ${stat._id || "no status"}: ${stat.count}`);
        });
      } else {
        console.log("   No status field found");
      }

      // Check if products have required fields
      console.log("\n\n🔍 Checking product structure:");
      const firstProduct = await productsCollection.findOne({});
      console.log("\nFirst product fields:");
      console.log(Object.keys(firstProduct).join(", "));
    }

    // Check categories
    console.log("\n\n📁 Checking categories...");
    const categoriesCollection = db.collection("categories");
    const totalCategories = await categoriesCollection.countDocuments();
    console.log(`Total categories: ${totalCategories}`);

    if (totalCategories > 0) {
      const activeCategories = await categoriesCollection.countDocuments({ isActive: true });
      console.log(`Active categories: ${activeCategories}`);
    }

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.close();
  }
}

checkProducts();
