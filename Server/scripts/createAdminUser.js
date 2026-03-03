require("dotenv").config();
const { MongoClient } = require("mongodb");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function createAdminUser() {
  const client = new MongoClient(process.env.MONGO_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const db = client.db();
    const usersCollection = db.collection("users");

    console.log("=== Create Admin User ===\n");
    console.log("Choose an option:");
    console.log("1. Create a new admin user (requires Firebase UID)");
    console.log("2. Upgrade an existing user to admin\n");

    const choice = await question("Enter your choice (1 or 2): ");

    if (choice === "1") {
      // Create new admin user
      console.log("\n📝 Enter admin user details:");
      const email = await question("Email: ");
      const name = await question("Name: ");
      const firebaseUid = await question("Firebase UID: ");

      const adminUser = {
        email,
        name,
        firebaseUid,
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await usersCollection.insertOne(adminUser);
      console.log("\n✅ Admin user created successfully!");
      console.log(`   ID: ${result.insertedId}`);
      console.log(`   Email: ${email}`);
      console.log(`   Name: ${name}`);
      console.log(`   Role: admin`);
    } else if (choice === "2") {
      // Upgrade existing user
      const allUsers = await usersCollection.find({}).toArray();
      
      if (allUsers.length === 0) {
        console.log("\n❌ No users found in database!");
        return;
      }

      console.log("\n📋 Existing users:");
      allUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email} (${user.role || "no role"})`);
      });

      const userIndex = await question("\nEnter user number to make admin: ");
      const selectedUser = allUsers[parseInt(userIndex) - 1];

      if (!selectedUser) {
        console.log("❌ Invalid user number!");
        return;
      }

      await usersCollection.updateOne(
        { _id: selectedUser._id },
        { 
          $set: { 
            role: "admin",
            updatedAt: new Date()
          } 
        }
      );

      console.log("\n✅ User upgraded to admin successfully!");
      console.log(`   Email: ${selectedUser.email}`);
      console.log(`   New Role: admin`);
    } else {
      console.log("❌ Invalid choice!");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.close();
    rl.close();
  }
}

createAdminUser();
