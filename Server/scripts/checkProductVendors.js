require("dotenv").config();
const { MongoClient, ObjectId } = require("mongodb");

const uri = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || "BazarBD";

async function checkProductVendors() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db(DB_NAME);
    const productsCollection = db.collection("products");
    const vendorsCollection = db.collection("vendors");

    // Get total products
    const totalProducts = await productsCollection.countDocuments();
    console.log(`\n📦 Total Products: ${totalProducts}`);

    // Get products without vendorId
    const productsWithoutVendor = await productsCollection
      .find({ vendorId: { $exists: false } })
      .toArray();

    console.log(`\n❌ Products without vendorId: ${productsWithoutVendor.length}`);

    if (productsWithoutVendor.length > 0) {
      console.log("\nSample products without vendorId:");
      productsWithoutVendor.slice(0, 5).forEach(p => {
        console.log(`  - ${p.title} (ID: ${p._id})`);
      });
    }

    // Get products with vendorId
    const productsWithVendor = await productsCollection
      .find({ vendorId: { $exists: true } })
      .toArray();

    console.log(`\n✅ Products with vendorId: ${productsWithVendor.length}`);

    if (productsWithVendor.length > 0) {
      console.log("\nSample products with vendorId:");
      productsWithVendor.slice(0, 5).forEach(p => {
        console.log(`  - ${p.title} (vendorId: ${p.vendorId})`);
      });
    }

    // Get approved vendors
    const approvedVendors = await vendorsCollection
      .find({ status: "approved" })
      .toArray();

    console.log(`\n🏪 Approved Vendors: ${approvedVendors.length}`);

    if (approvedVendors.length > 0) {
      console.log("\nApproved vendors:");
      approvedVendors.forEach(v => {
        console.log(`  - ${v.shopName} (ID: ${v._id})`);
      });
    }

    // Recommendation
    if (productsWithoutVendor.length > 0 && approvedVendors.length > 0) {
      console.log("\n💡 RECOMMENDATION:");
      console.log("Run 'node Server/scripts/assignVendorToProducts.js' to assign vendors to products");
    } else if (productsWithoutVendor.length > 0 && approvedVendors.length === 0) {
      console.log("\n⚠️ WARNING:");
      console.log("No approved vendors found. Create and approve vendors first.");
    } else {
      console.log("\n✅ All products have vendorId assigned!");
    }

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.close();
    console.log("\n✅ Connection closed");
  }
}

// Run the script
checkProductVendors();
