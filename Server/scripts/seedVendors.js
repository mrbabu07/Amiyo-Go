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

const testVendors = [
  {
    shopName: "Fashion Hub BD",
    phone: "01712345678",
    status: "approved",
    address: {
      divisionId: "6", // Dhaka
      districtId: "47", // Dhaka district
      upazilaId: "293", // Dhaka Sadar
      unionId: "",
      details: "House 12, Road 5, Dhanmondi, Dhaka",
    },
    categoryTypes: ["clothing", "accessories"],
  },
  {
    shopName: "Tech World Bangladesh",
    phone: "01812345679",
    status: "approved",
    address: {
      divisionId: "1", // Chattogram
      districtId: "8", // Chattogram district
      upazilaId: "11", // Chattogram Sadar
      unionId: "",
      details: "Shop 45, GEC Circle, Chattogram",
    },
    categoryTypes: ["electronics"],
  },
  {
    shopName: "Fresh Mart BD",
    phone: "01912345680",
    status: "pending",
    address: {
      divisionId: "6", // Dhaka
      districtId: "47", // Dhaka district
      upazilaId: "293", // Dhaka Sadar
      unionId: "",
      details: "Plot 23, Mirpur 10, Dhaka",
    },
    categoryTypes: ["groceries"],
  },
  {
    shopName: "Style Station",
    phone: "01612345681",
    status: "approved",
    address: {
      divisionId: "2", // Rajshahi
      districtId: "15", // Rajshahi district
      upazilaId: "14", // Rajshahi Sadar
      unionId: "",
      details: "Shop 78, Shaheb Bazar, Rajshahi",
    },
    categoryTypes: ["clothing"],
  },
  {
    shopName: "Baby Care BD",
    phone: "01512345682",
    status: "pending",
    address: {
      divisionId: "6", // Dhaka
      districtId: "2", // Gazipur
      upazilaId: "6", // Gazipur Sadar
      unionId: "",
      details: "House 34, Tongi, Gazipur",
    },
    categoryTypes: ["baby"],
  },
  {
    shopName: "Gadget Galaxy",
    phone: "01412345683",
    status: "approved",
    address: {
      divisionId: "5", // Sylhet
      districtId: "15", // Sylhet district
      upazilaId: "17", // Sylhet Sadar
      unionId: "",
      details: "Shop 12, Zindabazar, Sylhet",
    },
    categoryTypes: ["electronics", "accessories"],
  },
  {
    shopName: "Organic Bazar",
    phone: "01312345684",
    status: "suspended",
    address: {
      divisionId: "4", // Khulna
      districtId: "11", // Khulna district
      upazilaId: "15", // Khulna Sadar
      unionId: "",
      details: "Market 5, Khulna City",
    },
    categoryTypes: ["groceries"],
  },
  {
    shopName: "Trendy Accessories",
    phone: "01212345685",
    status: "approved",
    address: {
      divisionId: "6", // Dhaka
      districtId: "47", // Dhaka district
      upazilaId: "293", // Dhaka Sadar
      unionId: "",
      details: "Shop 89, Gulshan 2, Dhaka",
    },
    categoryTypes: ["accessories"],
  },
];

async function seedVendors() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const db = client.db("BazarBD");
    const vendorsCollection = db.collection("vendors");
    const usersCollection = db.collection("users");
    const categoriesCollection = db.collection("categories");

    // Check if categories exist
    const categoriesCount = await categoriesCollection.countDocuments();
    if (categoriesCount === 0) {
      console.log("❌ No categories found. Please run: node scripts/seedCategories.js");
      return;
    }

    console.log(`📦 Found ${categoriesCount} categories\n`);

    // Get all categories
    const allCategories = await categoriesCollection.find().toArray();

    // Clear existing test vendors
    await vendorsCollection.deleteMany({ 
      shopName: { $in: testVendors.map(v => v.shopName) } 
    });
    console.log("🗑️  Cleared existing test vendors\n");

    let createdCount = 0;

    for (const vendorData of testVendors) {
      console.log(`👤 Creating vendor: ${vendorData.shopName}...`);

      // Create or find user for this vendor
      const userEmail = `${vendorData.shopName.toLowerCase().replace(/\s+/g, '')}@test.com`;
      let user = await usersCollection.findOne({ email: userEmail });

      if (!user) {
        const userResult = await usersCollection.insertOne({
          email: userEmail,
          firebaseUid: `test-vendor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
            firstName: vendorData.shopName.split(' ')[0],
            lastName: "Owner",
            phone: vendorData.phone,
            avatar: "",
            preferences: {
              notifications: true,
              marketing: false,
              theme: "light",
            },
          },
        });
        user = { _id: userResult.insertedId, email: userEmail };
        console.log(`   ✅ Created user: ${userEmail}`);
      } else {
        console.log(`   ℹ️  User exists: ${userEmail}`);
      }

      // Find categories based on type
      const allowedCategories = [];
      for (const catType of vendorData.categoryTypes) {
        const matchingCats = allCategories.filter(cat => 
          cat.slug.includes(catType) || 
          cat.name.toLowerCase().includes(catType)
        );
        allowedCategories.push(...matchingCats);
      }

      // If no specific match, get some random categories
      if (allowedCategories.length === 0) {
        allowedCategories.push(...allCategories.slice(0, 3));
      }

      const categoryIds = [...new Set(allowedCategories.map(cat => cat._id))];

      // Create vendor
      const slug = vendorData.shopName.toLowerCase().replace(/\s+/g, '-');
      const vendor = {
        ownerUserId: user._id,
        shopName: vendorData.shopName,
        slug: slug,
        phone: vendorData.phone,
        address: vendorData.address,
        allowedCategoryIds: categoryIds,
        status: vendorData.status,
        verificationLevel: "basic",
        payoutMethod: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await vendorsCollection.insertOne(vendor);
      console.log(`   ✅ Created vendor with ${categoryIds.length} categories`);
      console.log(`   📧 Email: ${userEmail}`);
      console.log(`   📊 Status: ${vendorData.status}`);
      console.log(`   🏪 Slug: ${slug}\n`);
      
      createdCount++;
    }

    // Display summary
    console.log("=" .repeat(60));
    console.log("📊 VENDOR SEEDING SUMMARY");
    console.log("=" .repeat(60));
    console.log(`✅ Created ${createdCount} vendors\n`);

    const stats = await vendorsCollection.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    console.log("Status breakdown:");
    stats.forEach(stat => {
      const emoji = stat._id === "approved" ? "✅" : stat._id === "pending" ? "⏳" : "🚫";
      console.log(`   ${emoji} ${stat._id}: ${stat.count}`);
    });

    console.log("\n📝 Test Credentials:");
    console.log("   All passwords: Use Firebase auth to create these users");
    console.log("\n🔗 Test URLs:");
    console.log("   Admin Vendors: http://localhost:5173/admin/vendors");
    console.log("   Vendor Dashboard: http://localhost:5173/vendor/dashboard");

    console.log("\n💡 Next Steps:");
    console.log("   1. Login as admin to approve pending vendors");
    console.log("   2. Login as vendor to access dashboard");
    console.log("   3. Add products from vendor dashboard");

  } catch (error) {
    console.error("❌ Error seeding vendors:", error);
  } finally {
    await client.close();
  }
}

seedVendors();
