require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function createTestVendor() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const db = client.db("BazarBD");

    // Check if categories exist
    const categoriesCount = await db.collection("categories").countDocuments();
    if (categoriesCount === 0) {
      console.log("❌ No categories found. Please run: node scripts/seedCategories.js");
      return;
    }

    // Get some categories
    const categories = await db.collection("categories").find().limit(3).toArray();
    const categoryIds = categories.map(c => c._id);

    console.log("📦 Using categories:");
    categories.forEach(cat => console.log(`   - ${cat.name}`));
    console.log();

    // Check if test user exists
    let testUser = await db.collection("users").findOne({ email: "vendor@test.com" });
    
    if (!testUser) {
      console.log("👤 Creating test user...");
      const userResult = await db.collection("users").insertOne({
        email: "vendor@test.com",
        firebaseUid: "test-vendor-" + Date.now(),
        role: "customer",
        permissions: {
          orders: ["read"],
          profile: ["read", "update"],
          wishlist: ["read", "create", "update", "delete"],
          reviews: ["read", "create", "update", "delete"],
          support: ["create", "read"],
        },
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: new Date(),
        profile: {
          firstName: "Test",
          lastName: "Vendor",
          phone: "01712345678",
          avatar: "",
          preferences: {
            notifications: true,
            marketing: false,
            theme: "light",
          },
        },
      });
      testUser = { _id: userResult.insertedId, email: "vendor@test.com" };
      console.log("   ✅ Test user created");
    } else {
      console.log("👤 Test user already exists");
    }

    // Check if vendor already exists
    const existingVendor = await db.collection("vendors").findOne({ 
      ownerUserId: testUser._id 
    });

    if (existingVendor) {
      console.log("\n⚠️  Vendor already exists for this user:");
      console.log(`   Shop: ${existingVendor.shopName}`);
      console.log(`   Status: ${existingVendor.status}`);
      console.log(`   Slug: ${existingVendor.slug}`);
      
      if (existingVendor.status === "pending") {
        console.log("\n💡 To approve this vendor, run:");
        console.log(`   db.vendors.updateOne({ _id: ObjectId("${existingVendor._id}") }, { $set: { status: "approved" } })`);
      }
      return;
    }

    // Create test vendor
    console.log("\n🏪 Creating test vendor...");
    const vendorData = {
      ownerUserId: testUser._id,
      shopName: "Test Vendor Shop",
      slug: "test-vendor-shop-" + Date.now(),
      phone: "01712345678",
      address: {
        divisionId: "6", // Dhaka
        districtId: "47", // Dhaka district
        upazilaId: "293", // Dhaka Sadar
        unionId: "",
        details: "123 Test Street, Dhaka",
      },
      allowedCategoryIds: categoryIds,
      status: "approved", // Auto-approve for testing
      verificationLevel: "basic",
      payoutMethod: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("vendors").insertOne(vendorData);
    console.log("   ✅ Test vendor created!");
    console.log(`   ID: ${result.insertedId}`);
    console.log(`   Shop: ${vendorData.shopName}`);
    console.log(`   Status: ${vendorData.status}`);
    console.log(`   Categories: ${categoryIds.length}`);

    console.log("\n🎉 Test vendor is ready!");
    console.log("\n📝 Login credentials:");
    console.log("   Email: vendor@test.com");
    console.log("   (Use Firebase auth to create this user if needed)");
    console.log("\n🔗 Test URLs:");
    console.log("   Dashboard: http://localhost:5173/vendor/dashboard");
    console.log("   Add Product: http://localhost:5173/vendor/products/add");

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await client.close();
  }
}

createTestVendor();
