require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const categories = [
  // Root categories
  {
    name: "Clothing & Fashion",
    slug: "clothing-fashion",
    parentId: null,
    isActive: true,
  },
  {
    name: "Accessories",
    slug: "accessories",
    parentId: null,
    isActive: true,
  },
  {
    name: "Electronics & Digital Devices",
    slug: "electronics-digital-devices",
    parentId: null,
    isActive: true,
  },
  {
    name: "Groceries & Super Shop",
    slug: "groceries-super-shop",
    parentId: null,
    isActive: true,
  },
];

const subCategories = {
  "Clothing & Fashion": [
    { name: "Men's Fashion", slug: "mens-fashion" },
    { name: "Women's Fashion", slug: "womens-fashion" },
    { name: "Baby & Kids", slug: "baby-kids" },
  ],
  "Accessories": [
    { name: "Bags & Luggage", slug: "bags-luggage" },
    { name: "Watches", slug: "watches" },
    { name: "Jewelry", slug: "jewelry" },
    { name: "Sunglasses", slug: "sunglasses" },
  ],
  "Electronics & Digital Devices": [
    { name: "Mobile Phones", slug: "mobile-phones" },
    { name: "Laptops & Computers", slug: "laptops-computers" },
    { name: "Cameras", slug: "cameras" },
    { name: "Audio & Headphones", slug: "audio-headphones" },
    { name: "Smart Watches", slug: "smart-watches" },
  ],
  "Groceries & Super Shop": [
    { name: "Fresh Produce", slug: "fresh-produce" },
    { name: "Dairy & Eggs", slug: "dairy-eggs" },
    { name: "Snacks & Beverages", slug: "snacks-beverages" },
    { name: "Personal Care", slug: "personal-care" },
  ],
};

const mensFashionSub = [
  { name: "T-Shirts", slug: "mens-tshirts" },
  { name: "Shirts", slug: "mens-shirts" },
  { name: "Pants & Jeans", slug: "mens-pants-jeans" },
  { name: "Shoes", slug: "mens-shoes" },
  { name: "Winter Wear", slug: "mens-winter-wear" },
];

const womensFashionSub = [
  { name: "Sarees", slug: "sarees" },
  { name: "Salwar Kameez", slug: "salwar-kameez" },
  { name: "Kurtis", slug: "kurtis" },
  { name: "Western Wear", slug: "womens-western-wear" },
  { name: "Shoes & Sandals", slug: "womens-shoes-sandals" },
];

const babyKidsSub = [
  { name: "Baby Clothing", slug: "baby-clothing" },
  { name: "Kids Clothing", slug: "kids-clothing" },
  { name: "Baby Care", slug: "baby-care" },
  { name: "Toys", slug: "toys" },
];

async function seedCategories() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db("BazarBD");
    const collection = db.collection("categories");

    // Clear existing categories
    await collection.deleteMany({});
    console.log("🗑️  Cleared existing categories");

    // Insert root categories
    const rootResults = await collection.insertMany(
      categories.map(cat => ({
        ...cat,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
    );
    console.log(`✅ Inserted ${rootResults.insertedCount} root categories`);

    // Get inserted root category IDs
    const insertedRoots = await collection.find({ parentId: null }).toArray();
    const rootMap = {};
    insertedRoots.forEach(cat => {
      rootMap[cat.name] = cat._id;
    });

    // Insert subcategories
    const subCatsToInsert = [];
    for (const [parentName, subs] of Object.entries(subCategories)) {
      const parentId = rootMap[parentName];
      if (parentId) {
        subs.forEach(sub => {
          subCatsToInsert.push({
            ...sub,
            parentId,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        });
      }
    }

    if (subCatsToInsert.length > 0) {
      const subResults = await collection.insertMany(subCatsToInsert);
      console.log(`✅ Inserted ${subResults.insertedCount} subcategories`);
    }

    // Insert third-level categories
    const mensFashionId = (await collection.findOne({ slug: "mens-fashion" }))?._id;
    const womensFashionId = (await collection.findOne({ slug: "womens-fashion" }))?._id;
    const babyKidsId = (await collection.findOne({ slug: "baby-kids" }))?._id;

    const thirdLevelCats = [];

    if (mensFashionId) {
      mensFashionSub.forEach(sub => {
        thirdLevelCats.push({
          ...sub,
          parentId: mensFashionId,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });
    }

    if (womensFashionId) {
      womensFashionSub.forEach(sub => {
        thirdLevelCats.push({
          ...sub,
          parentId: womensFashionId,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });
    }

    if (babyKidsId) {
      babyKidsSub.forEach(sub => {
        thirdLevelCats.push({
          ...sub,
          parentId: babyKidsId,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });
    }

    if (thirdLevelCats.length > 0) {
      const thirdResults = await collection.insertMany(thirdLevelCats);
      console.log(`✅ Inserted ${thirdResults.insertedCount} third-level categories`);
    }

    // Display category tree
    console.log("\n📦 Category Tree:");
    const allCategories = await collection.find({}).toArray();
    displayTree(allCategories, null, 0);

    console.log("\n✅ Category seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding categories:", error);
  } finally {
    await client.close();
  }
}

function displayTree(categories, parentId, level) {
  const children = categories.filter(cat => {
    const catParentId = cat.parentId ? cat.parentId.toString() : null;
    const compareParentId = parentId ? parentId.toString() : null;
    return catParentId === compareParentId;
  });

  children.forEach(cat => {
    console.log("  ".repeat(level) + "└─ " + cat.name + ` (${cat.slug})`);
    displayTree(categories, cat._id, level + 1);
  });
}

seedCategories();
