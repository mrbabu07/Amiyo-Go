require("dotenv").config();
const { MongoClient } = require("mongodb");

const uri = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || "AmiyoGo";

async function testPerformance() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");
    
    const db = client.db(DB_NAME);
    
    // Test 1: Product query performance
    console.log("\n📊 Testing Product Query Performance...");
    const startTime1 = Date.now();
    const products = await db.collection("products")
      .find({ isActive: true })
      .limit(20)
      .toArray();
    const duration1 = Date.now() - startTime1;
    console.log(`✓ Product query: ${duration1}ms (${products.length} products)`);
    
    // Test 2: Aggregation performance
    console.log("\n📊 Testing Aggregation Performance...");
    const startTime2 = Date.now();
    const stats = await db.collection("orders").aggregate([
      { $match: { status: "delivered" } },
      { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } }
    ]).toArray();
    const duration2 = Date.now() - startTime2;
    console.log(`✓ Aggregation query: ${duration2}ms`);
    
    // Test 3: Index usage
    console.log("\n📊 Checking Indexes...");
    const indexes = await db.collection("products").indexes();
    console.log(`✓ Product indexes: ${indexes.length}`);
    indexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });
    
    // Test 4: Collection stats
    console.log("\n📊 Collection Statistics...");
    const collections = ["products", "orders", "users", "categories"];
    for (const collName of collections) {
      const count = await db.collection(collName).countDocuments();
      console.log(`✓ ${collName}: ${count} documents`);
    }
    
    console.log("\n✅ Performance tests completed!");
    
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.close();
  }
}

testPerformance();
