require("dotenv").config();
const { MongoClient } = require("mongodb");

// Usage: node scripts/setUserRole.js <email> <role>
// Example: node scripts/setUserRole.js admin@example.com admin

async function setUserRole() {
  const args = process.argv.slice(2);
  
  if (args.length !== 2) {
    console.log("Usage: node scripts/setUserRole.js <email> <role>");
    console.log("Example: node scripts/setUserRole.js admin@example.com admin");
    console.log("\nValid roles: customer, vendor, admin");
    process.exit(1);
  }

  const [email, role] = args;
  const validRoles = ["customer", "vendor", "admin"];

  if (!validRoles.includes(role)) {
    console.log(`❌ Invalid role: ${role}`);
    console.log(`Valid roles: ${validRoles.join(", ")}`);
    process.exit(1);
  }

  const client = new MongoClient(process.env.MONGO_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const db = client.db();
    const usersCollection = db.collection("users");

    // Find user by email
    const user = await usersCollection.findOne({ email });

    if (!user) {
      console.log(`❌ User not found: ${email}`);
      console.log("\nAvailable users:");
      const allUsers = await usersCollection.find({}).toArray();
      allUsers.forEach((u, index) => {
        console.log(`${index + 1}. ${u.email} (${u.role || "no role"})`);
      });
      process.exit(1);
    }

    // Update user role
    await usersCollection.updateOne(
      { _id: user._id },
      { 
        $set: { 
          role: role,
          updatedAt: new Date()
        } 
      }
    );

    console.log("✅ User role updated successfully!\n");
    console.log("User Details:");
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name || "Not set"}`);
    console.log(`   Old Role: ${user.role || "none"}`);
    console.log(`   New Role: ${role}`);
    console.log(`   ID: ${user._id}`);

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.close();
  }
}

setUserRole();
