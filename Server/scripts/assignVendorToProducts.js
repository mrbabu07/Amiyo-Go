require("dotenv").config();
const { MongoClient, ObjectId } = require("mongodb");

const uri = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || "BazarBD";

async function assignVendorToProducts() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db(DB_NAME);
    const productsCollection = db.collection("products");
    const vendorsCollection = db.collection("vendors");

    // Get all products without vendorId
    const productsWithoutVendor = await productsCollection
      .find({ vendorId: { $exists: false } })
      .toArray();

    console.log(`\n📦 Found ${productsWithoutVendor.length} products without vendorId`);

    if (productsWithoutVendor.length === 0) {
      console.log("✅ All products already have vendorId assigned!");
      return;
    }

    // Get all approved vendors
    const vendors = await vendorsCollection
      .find({ status: "approved" })
      .toArray();

    console.log(`\n🏪 Found ${vendors.length} approved vendors`);

    if (vendors.length === 0) {
      console.log("❌ No approved vendors found. Products will remain without vendorId.");
      console.log("💡 Create and approve vendors first, then run this script again.");
      return;
    }

    // Option 1: Assign all products to first vendor (for testing)
    console.log("\n🔧 Assigning products to vendors...");
    console.log("Strategy: Distributing products evenly among vendors\n");

    let assignedCount = 0;
    for (let i = 0; i < productsWithoutVendor.length; i++) {
      const product = productsWithoutVendor[i];
      const vendor = vendors[i % vendors.length]; // Distribute evenly

      await productsCollection.updateOne(
        { _id: product._id },
        { $set: { vendorId: vendor._id.toString() } }
      );

      console.log(`  ✅ ${product.title} → ${vendor.shopName}`);
      assignedCount++;
    }

    console.log(`\n✅ Successfully assigned ${assignedCount} products to vendors!`);

    // Show summary
    console.log("\n📊 Summary:");
    for (const vendor of vendors) {
      const count = await productsCollection.countDocuments({
        vendorId: vendor._id.toString()
      });
      console.log(`  ${vendor.shopName}: ${count} products`);
    }

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.close();
    console.log("\n✅ Connection closed");
  }
}

// Run the script
assignVendorToProducts();
