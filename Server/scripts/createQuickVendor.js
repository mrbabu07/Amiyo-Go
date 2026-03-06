require("dotenv").config();
const { MongoClient, ObjectId } = require("mongodb");

const uri = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || "BazarBD";

async function createQuickVendor() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const db = client.db(DB_NAME);
    const usersCollection = db.collection("users");
    const vendorsCollection = db.collection("vendors");

    // Check if test vendor user exists
    const email = "vendor@test.com";
    let user = await usersCollection.findOne({ email });

    if (!user) {
      console.log("❌ User not found:", email);
      console.log("\n📝 To create this vendor:");
      console.log("1. Go to http://localhost:5173/register");
      console.log("2. Register with email: vendor@test.com");
      console.log("3. Then run this script again");
      console.log("\nOr use an existing user by providing their email:");
      console.log("   node Server/scripts/createQuickVendor.js your-email@example.com\n");
      return;
    }

    console.log("✅ User found:", user.email);
    console.log("   Firebase UID:", user.firebaseUid);
    console.log("   MongoDB _id:", user._id);
    console.log("   Current role:", user.role);

    // Update user role to vendor if not already
    if (user.role !== "vendor") {
      await usersCollection.updateOne(
        { _id: user._id },
        { $set: { role: "vendor" } }
      );
      console.log("✅ Updated user role to: vendor");
    }

    // Check if vendor profile exists
    let vendor = await vendorsCollection.findOne({ ownerUserId: user._id });

    if (!vendor) {
      // Create vendor profile
      const vendorData = {
        ownerUserId: user._id,
        shopName: "Test Vendor Shop",
        email: user.email,
        phone: "+8801700000000",
        businessName: "Test Business",
        businessType: "retail",
        description: "A test vendor shop for development",
        address: {
          street: "123 Test Street",
          city: "Dhaka",
          state: "Dhaka",
          zipCode: "1200",
          country: "Bangladesh",
        },
        status: "approved",
        rating: 4.5,
        totalReviews: 0,
        totalProducts: 0,
        totalSales: 0,
        responseRate: 95,
        responseTime: "within a few hours",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await vendorsCollection.insertOne(vendorData);
      vendor = { ...vendorData, _id: result.insertedId };
      console.log("✅ Created vendor profile");
      console.log("   Vendor ID:", vendor._id);
      console.log("   Shop Name:", vendor.shopName);
      console.log("   Status:", vendor.status);
    } else {
      console.log("✅ Vendor profile already exists");
      console.log("   Vendor ID:", vendor._id);
      console.log("   Shop Name:", vendor.shopName);
      console.log("   Status:", vendor.status);

      // Ensure vendor is approved
      if (vendor.status !== "approved") {
        await vendorsCollection.updateOne(
          { _id: vendor._id },
          { $set: { status: "approved" } }
        );
        console.log("✅ Updated vendor status to: approved");
      }
    }

    console.log("\n✅ Vendor setup complete!");
    console.log("\n📝 Login credentials:");
    console.log("   Email:", user.email);
    console.log("   Password: (use the password you registered with)");
    console.log("\n🔗 Access vendor dashboard at:");
    console.log("   http://localhost:5173/vendor/dashboard");
    console.log("   http://localhost:5173/vendor/messages");

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.close();
    console.log("\n✅ Connection closed");
  }
}

// Get email from command line argument or use default
const email = process.argv[2] || "vendor@test.com";
createQuickVendor();
