const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "BazarBD";

async function migrateOrderCommissions() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db(DB_NAME);
    const ordersCollection = db.collection("orders");
    const categoriesCollection = db.collection("categories");
    const productsCollection = db.collection("products");

    // Get all orders
    const orders = await ordersCollection.find({}).toArray();
    console.log(`📦 Found ${orders.length} orders to process`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const order of orders) {
      let needsUpdate = false;
      const updatedProducts = [];

      for (const product of order.products || []) {
        // Check if commission fields already exist and are correct
        if (
          product.commissionRateSnapshot !== undefined &&
          product.adminCommissionAmount !== undefined &&
          product.vendorEarningAmount !== undefined &&
          product.commissionRateSnapshot > 0 // Skip if already has valid commission
        ) {
          updatedProducts.push(product);
          continue;
        }

        needsUpdate = true;

        // Try to get categoryId from product if not in order
        let categoryId = product.categoryId;
        if (!categoryId && product.productId) {
          try {
            const productDoc = await productsCollection.findOne({
              _id: new ObjectId(product.productId),
            });
            if (productDoc && productDoc.categoryId) {
              categoryId = productDoc.categoryId;
              console.log(`  📌 Found categoryId from product: ${productDoc.title}`);
            }
          } catch (err) {
            console.error(`  ⚠️  Error fetching product ${product.productId}:`, err.message);
          }
        }

        // Fetch category commission rate
        let commissionRate = 0;
        if (categoryId) {
          try {
            const category = await categoriesCollection.findOne({
              _id: new ObjectId(categoryId),
            });
            if (category && category.commissionRate !== undefined) {
              commissionRate = category.commissionRate;
            }
          } catch (err) {
            console.error(
              `⚠️  Error fetching category for product ${product.name}:`,
              err.message
            );
          }
        }

        // Calculate commission
        const itemSubtotal = product.price * product.quantity;
        const adminCommissionAmount = Math.round(
          ((itemSubtotal * commissionRate) / 100) * 100
        ) / 100;
        const vendorEarningAmount = Math.round(
          (itemSubtotal - adminCommissionAmount) * 100
        ) / 100;

        // Add commission fields to product
        updatedProducts.push({
          ...product,
          categoryId: categoryId || product.categoryId, // Add categoryId if found
          commissionRateSnapshot: commissionRate,
          adminCommissionAmount: adminCommissionAmount,
          vendorEarningAmount: vendorEarningAmount,
        });

        console.log(
          `  📊 ${product.name || 'Unknown'}: ৳${itemSubtotal} → Commission: ৳${adminCommissionAmount} (${commissionRate}%) → Vendor: ৳${vendorEarningAmount}`
        );
      }

      // Update order if needed
      if (needsUpdate) {
        await ordersCollection.updateOne(
          { _id: order._id },
          { $set: { products: updatedProducts } }
        );
        updatedCount++;
        console.log(`✅ Updated order ${order._id}`);
      } else {
        skippedCount++;
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log(`✅ Migration completed!`);
    console.log(`   Updated: ${updatedCount} orders`);
    console.log(`   Skipped: ${skippedCount} orders (already had commission data)`);
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await client.close();
    console.log("🔌 Disconnected from MongoDB");
  }
}

// Run migration
migrateOrderCommissions();
