require("dotenv").config();
const { MongoClient } = require("mongodb");

async function checkAdminUsers() {
  const client = new MongoClient(process.env.MONGO_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const db = client.db();
    const usersCollection = db.collection("users");

    // Find all users
    const allUsers = await usersCollection.find({}).toArray();
    console.log(`📊 Total users in database: ${allUsers.length}\n`);

    // Find admin users
    const adminUsers = await usersCollection.find({ role: "admin" }).toArray();
    console.log(`👑 Admin users: ${adminUsers.length}\n`);

    if (adminUsers.length > 0) {
      console.log("Admin Users:");
      adminUsers.forEach((user, index) => {
        console.log(`\n${index + 1}. ${user.name || "No name"}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Firebase UID: ${user.firebaseUid}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   ID: ${user._id}`);
      });
    } else {
      console.log("❌ No admin users found!");
      console.log("\nAll users:");
      allUsers.forEach((user, index) => {
        console.log(`\n${index + 1}. ${user.name || "No name"}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role || "No role set"}`);
        console.log(`   ID: ${user._id}`);
      });
    }

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.close();
  }
}

checkAdminUsers();
