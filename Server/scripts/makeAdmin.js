/**
 * Make a user an admin
 * Usage: node makeAdmin.js your-email@example.com
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { MongoClient } = require("mongodb");
const User = require("../models/User");

const email = process.argv[2];

if (!email) {
  console.log("❌ Please provide an email address");
  console.log("Usage: node makeAdmin.js your-email@example.com");
  process.exit(1);
}

async function makeAdmin() {
  let client;
  try {
    // Connect to MongoDB
    client = new MongoClient(process.env.MONGO_URI);
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db("HnilaBazar");
    const userModel = new User(db);

    // Find user by email
    const user = await userModel.findByEmail(email);

    if (!user) {
      console.log(`❌ User with email "${email}" not found`);
      console.log("Make sure the user has logged in at least once first");
      return;
    }

    // Update user role to admin
    await userModel.updateRole(user.firebaseUid, "admin", "system");

    console.log(`✅ Success! ${email} is now an admin`);
    console.log("User:", { email: user.email, role: "admin" });
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    if (client) {
      await client.close();
    }
    process.exit(0);
  }
}

makeAdmin();
