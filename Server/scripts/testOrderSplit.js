require("dotenv").config();
const { MongoClient } = require("mongodb");

const uri = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || "BazarBD";

async function testOrderSplit() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db(DB_NAME);
    const ordersCollection = db.collection("orders");
    const vendorOrdersCollection = db.collection("vendorOrders");
    const productsCollection = db.collection("products");

    // Get a sample order
    const sampleOrder = await ordersCollection.findOne({}, { sort: { createdAt: -1 } });
    
    if (!sampleOrder) {
      console.log("❌ No orders found in database");
      return;
    }

    console.log("\n📦 Sample Parent Order:");
    console.log("Order ID:", sampleOrder._id);
    console.log("Total:", sampleOrder.total);
    console.log("Products:", sampleOrder.products?.length || 0);

    // Find vendor orders for this parent order
    const vendorOrders = await vendorOrdersCollection
      .find({ parentOrderId: sampleOrder._id.toString() })
      .toArray();

    console.log("\n📦 Vendor Orders Split:");
    console.log("Total Vendor Orders:", vendorOrders.length);

    for (const vendorOrder of vendorOrders) {
      console.log("\n  Vendor Order ID:", vendorOrder._id);
      console.log("  Vendor ID:", vendorOrder.vendorId || "Platform");
      console.log("  Products:", vendorOrder.products?.length || 0);
      console.log("  Subtotal:", vendorOrder.subtotal);
      console.log("  Delivery Charge:", vendorOrder.deliveryCharge);
      console.log("  Total Amount:", vendorOrder.totalAmount);
      console.log("  Status:", vendorOrder.status);
    }

    // Verify totals match
    const vendorTotalsSum = vendorOrders.reduce((sum, vo) => sum + (vo.totalAmount || 0), 0);
    console.log("\n💰 Total Verification:");
    console.log("Parent Order Total:", sampleOrder.total);
    console.log("Sum of Vendor Orders:", Math.round(vendorTotalsSum * 100) / 100);
    console.log("Match:", Math.abs(sampleOrder.total - vendorTotalsSum) < 0.01 ? "✅ YES" : "❌ NO");

    // Check products have vendorId
    console.log("\n🏪 Product Vendor Assignment:");
    const products = await productsCollection.find({}).limit(5).toArray();
    for (const product of products) {
      console.log(`  ${product.title}: vendorId = ${product.vendorId || "NOT SET"}`);
    }

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.close();
    console.log("\n✅ Connection closed");
  }
}

testOrderSplit();
