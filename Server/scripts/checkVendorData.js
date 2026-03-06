require("dotenv").config();
const { MongoClient } = require("mongodb");

const uri = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || "BazarBD";

async function checkVendorData() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const db = client.db(DB_NAME);
    const vendorsCollection = db.collection("vendors");

    // Get first vendor to see structure
    const vendor = await vendorsCollection.findOne({ status: "approved" });
    
    if (vendor) {
      console.log("📦 Sample Vendor Data Structure:");
      console.log(JSON.stringify(vendor, null, 2));
      
      console.log("\n📍 Address Information:");
      console.log("Has address field:", !!vendor.address);
      if (vendor.address) {
        console.log("Address content:", vendor.address);
      }
      
      console.log("\n📞 Contact Information:");
      console.log("Phone:", vendor.phone);
      console.log("Email:", vendor.email);
    } else {
      console.log("❌ No approved vendors found");
    }

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.close();
    console.log("\n✅ Connection closed");
  }
}

checkVendorData();
