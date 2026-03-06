require("dotenv").config();
const { MongoClient } = require("mongodb");

const uri = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || "BazarBD";

async function initFollowerCount() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const db = client.db(DB_NAME);
    const vendorsCollection = db.collection("vendors");

    // Initialize followerCount to 0 for all vendors that don't have it
    const result = await vendorsCollection.updateMany(
      { followerCount: { $exists: false } },
      { 
        $set: { 
          followerCount: 0,
          updatedAt: new Date()
        } 
      }
    );

    console.log(`✅ Initialized followerCount for ${result.modifiedCount} vendors`);

    // Show current vendor stats
    const vendors = await vendorsCollection.find({}).toArray();
    console.log("\n📊 Vendor Stats:");
    vendors.forEach(vendor => {
      console.log(`   - ${vendor.shopName}: ${vendor.followerCount || 0} followers`);
    });

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.close();
    console.log("\n✅ Connection closed");
  }
}

initFollowerCount();
