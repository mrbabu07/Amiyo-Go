const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "BazarBD";

async function testCommissionCalculation() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db(DB_NAME);
    const ordersCollection = db.collection("orders");
    const categoriesCollection = db.collection("categories");

    // Get a sample order
    const sampleOrder = await ordersCollection.findOne({});
    
    if (!sampleOrder) {
      console.log("❌ No orders found in database");
      return;
    }

    console.log("\n" + "=".repeat(60));
    console.log("📦 Sample Order Analysis");
    console.log("=".repeat(60));
    console.log(`Order ID: ${sampleOrder._id}`);
    console.log(`Created: ${sampleOrder.createdAt}`);
    console.log(`Total: ৳${sampleOrder.total}`);
    console.log(`\nProducts in order: ${sampleOrder.products?.length || 0}`);

    if (sampleOrder.products && sampleOrder.products.length > 0) {
      console.log("\n" + "-".repeat(60));
      console.log("Product Details:");
      console.log("-".repeat(60));

      for (const product of sampleOrder.products) {
        console.log(`\n📦 ${product.name || 'Unknown Product'}`);
        console.log(`   Price: ৳${product.price}`);
        console.log(`   Quantity: ${product.quantity}`);
        console.log(`   Subtotal: ৳${product.price * product.quantity}`);
        
        // Check if commission fields exist
        if (product.commissionRateSnapshot !== undefined) {
          console.log(`   ✅ Commission Rate: ${product.commissionRateSnapshot}%`);
          console.log(`   ✅ Admin Commission: ৳${product.adminCommissionAmount || 0}`);
          console.log(`   ✅ Vendor Earning: ৳${product.vendorEarningAmount || 0}`);
        } else {
          console.log(`   ❌ Commission fields NOT found`);
          
          // Try to calculate what it should be
          if (product.categoryId) {
            const category = await categoriesCollection.findOne({ 
              _id: new ObjectId(product.categoryId) 
            });
            
            if (category && category.commissionRate) {
              const subtotal = product.price * product.quantity;
              const commission = (subtotal * category.commissionRate) / 100;
              const earning = subtotal - commission;
              
              console.log(`   📊 Should be:`);
              console.log(`      Commission Rate: ${category.commissionRate}%`);
              console.log(`      Admin Commission: ৳${commission.toFixed(2)}`);
              console.log(`      Vendor Earning: ৳${earning.toFixed(2)}`);
            } else {
              console.log(`   ⚠️  Category not found or has no commission rate`);
            }
          } else {
            console.log(`   ⚠️  No categoryId in product`);
          }
        }
      }
    }

    // Check categories
    console.log("\n" + "=".repeat(60));
    console.log("📂 Categories with Commission Rates");
    console.log("=".repeat(60));
    
    const categories = await categoriesCollection.find({}).toArray();
    const categoriesWithCommission = categories.filter(c => c.commissionRate > 0);
    
    console.log(`\nTotal categories: ${categories.length}`);
    console.log(`Categories with commission: ${categoriesWithCommission.length}`);
    
    if (categoriesWithCommission.length > 0) {
      console.log("\nCategories:");
      categoriesWithCommission.forEach(cat => {
        console.log(`   • ${cat.name}: ${cat.commissionRate}%`);
      });
    } else {
      console.log("\n⚠️  No categories have commission rates set!");
      console.log("   Run: node scripts/seedCategories.js to add commission rates");
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 Summary");
    console.log("=".repeat(60));
    
    const ordersWithCommission = await ordersCollection.countDocuments({
      "products.commissionRateSnapshot": { $exists: true }
    });
    
    const totalOrders = await ordersCollection.countDocuments({});
    
    console.log(`Total orders: ${totalOrders}`);
    console.log(`Orders with commission data: ${ordersWithCommission}`);
    console.log(`Orders missing commission: ${totalOrders - ordersWithCommission}`);
    
    if (ordersWithCommission === totalOrders) {
      console.log("\n✅ All orders have commission data!");
    } else {
      console.log("\n⚠️  Some orders are missing commission data");
      console.log("   Run: node scripts/migrateOrderCommissions.js to fix");
    }

    console.log("=".repeat(60));

  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  } finally {
    await client.close();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

// Run test
testCommissionCalculation();
