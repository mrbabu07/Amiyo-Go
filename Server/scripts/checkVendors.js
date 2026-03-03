require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function checkVendors() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const db = client.db("BazarBD");
    
    // Check vendors
    const vendors = await db.collection("vendors").find().toArray();
    console.log(`📊 Total vendors in database: ${vendors.length}\n`);
    
    if (vendors.length > 0) {
      console.log("Vendors:");
      vendors.forEach((vendor, index) => {
        console.log(`\n${index + 1}. ${vendor.shopName}`);
        console.log(`   ID: ${vendor._id}`);
        console.log(`   Status: ${vendor.status}`);
        console.log(`   Phone: ${vendor.phone}`);
        console.log(`   Categories: ${vendor.allowedCategoryIds?.length || 0}`);
        console.log(`   Owner User ID: ${vendor.ownerUserId}`);
      });
    } else {
      console.log("❌ No vendors found in database");
      console.log("\n💡 Run this to create test vendors:");
      console.log("   node scripts/seedVendors.js");
    }

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.close();
  }
}

checkVendors();
