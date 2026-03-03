require("dotenv").config();
const { MongoClient } = require("mongodb");

async function makeFirstUserAdmin() {
  const client = new MongoClient(process.env.MONGO_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const db = client.db();
    const usersCollection = db.collection("users");

    // Check if there are any admin users
    const adminCount = await usersCollection.countDocuments({ role: "admin" });
    
    if (adminCount > 0) {
      console.log(`✅ Admin users already exist (${adminCount} found)`);
      const admins = await usersCollection.find({ role: "admin" }).toArray();
      console.log("\nCurrent admin users:");
      admins.forEach((admin, index) => {
        console.log(`${index + 1}. ${admin.email}`);
      });
      return;
    }

    // Find the first user
    const firstUser = await usersCollection.findOne({});
    
    if (!firstUser) {
      console.log("❌ No users found in database!");
      console.log("\nTo create an admin user:");
      console.log("1. Register a user account in the frontend");
      console.log("2. Run this script again");
      return;
    }

    // Update first user to admin
    await usersCollection.updateOne(
      { _id: firstUser._id },
      { 
        $set: { 
          role: "admin",
          updatedAt: new Date()
        } 
      }
    );

    console.log("✅ First user upgraded to admin successfully!\n");
    console.log("Admin User Details:");
    console.log(`   Email: ${firstUser.email}`);
    console.log(`   Name: ${firstUser.name || "Not set"}`);
    console.log(`   Firebase UID: ${firstUser.firebaseUid}`);
    console.log(`   ID: ${firstUser._id}`);
    console.log("\n🔐 You can now log in with this account to access admin features!");

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.close();
  }
}

makeFirstUserAdmin();
