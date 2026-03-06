require("dotenv").config();
const { MongoClient, ObjectId } = require("mongodb");

const uri = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || "BazarBD";

async function checkVendorStatus() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const db = client.db(DB_NAME);
    const usersCollection = db.collection("users");
    const vendorsCollection = db.collection("vendors");

    // Get all users with vendor role
    const vendorUsers = await usersCollection.find({ role: "vendor" }).toArray();
    console.log(`📊 Found ${vendorUsers.length} users with vendor role:\n`);

    for (const user of vendorUsers) {
      console.log(`👤 User: ${user.email}`);
      console.log(`   - Firebase UID: ${user.firebaseUid}`);
      console.log(`   - MongoDB _id: ${user._id}`);
      console.log(`   - Role: ${user.role}`);

      // Check if vendor profile exists
      const vendor = await vendorsCollection.findOne({ 
        ownerUserId: user._id 
      });

      if (vendor) {
        console.log(`   ✅ Vendor Profile Found:`);
        console.log(`      - Vendor ID: ${vendor._id}`);
        console.log(`      - Shop Name: ${vendor.shopName}`);
        console.log(`      - Status: ${vendor.status}`);
      } else {
        console.log(`   ❌ No vendor profile found for this user`);
        console.log(`   💡 This user needs a vendor profile created`);
      }
      console.log();
    }

    // Check for orphaned vendor profiles
    const allVendors = await vendorsCollection.find({}).toArray();
    console.log(`\n📊 Total vendor profiles: ${allVendors.length}\n`);

    for (const vendor of allVendors) {
      const user = await usersCollection.findOne({ _id: vendor.ownerUserId });
      if (!user) {
        console.log(`⚠️  Orphaned vendor profile:`);
        console.log(`   - Vendor ID: ${vendor._id}`);
        console.log(`   - Shop Name: ${vendor.shopName}`);
        console.log(`   - Owner User ID: ${vendor.ownerUserId} (user not found)`);
        console.log();
      }
    }

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.close();
    console.log("✅ Connection closed");
  }
}

checkVendorStatus();
