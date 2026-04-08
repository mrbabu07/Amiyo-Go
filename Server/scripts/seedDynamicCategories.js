require("dotenv").config();
const mongoose = require("mongoose");

const DynamicCategory = require("../models/DynamicCategory");

const dynamicCategories = [
  {
    name: "Electronics",
    slug: "electronics",
    description: "Electronic devices and gadgets",
    image: "https://via.placeholder.com/300x200?text=Electronics",
    isActive: true,
    attributes: [
      {
        name: "Brand",
        type: "select",
        options: ["Apple", "Samsung", "Sony", "LG", "Dell"],
        required: true,
        order: 0,
      },
      {
        name: "RAM",
        type: "select",
        options: ["4GB", "8GB", "16GB", "32GB"],
        required: false,
        order: 1,
      },
      {
        name: "Storage",
        type: "select",
        options: ["128GB", "256GB", "512GB", "1TB"],
        required: false,
        order: 2,
      },
      {
        name: "Color",
        type: "select",
        options: ["Black", "White", "Silver", "Gold", "Blue"],
        required: false,
        order: 3,
      },
    ],
  },
  {
    name: "Fashion",
    slug: "fashion",
    description: "Clothing and fashion items",
    image: "https://via.placeholder.com/300x200?text=Fashion",
    isActive: true,
    attributes: [
      {
        name: "Size",
        type: "select",
        options: ["XS", "S", "M", "L", "XL", "XXL"],
        required: true,
        order: 0,
      },
      {
        name: "Color",
        type: "select",
        options: ["Black", "White", "Red", "Blue", "Green", "Yellow"],
        required: true,
        order: 1,
      },
      {
        name: "Material",
        type: "select",
        options: ["Cotton", "Polyester", "Silk", "Wool", "Linen"],
        required: false,
        order: 2,
      },
      {
        name: "Gender",
        type: "select",
        options: ["Men", "Women", "Unisex"],
        required: true,
        order: 3,
      },
    ],
  },
  {
    name: "Home & Kitchen",
    slug: "home-kitchen",
    description: "Home and kitchen appliances",
    image: "https://via.placeholder.com/300x200?text=Home+Kitchen",
    isActive: true,
    attributes: [
      {
        name: "Brand",
        type: "select",
        options: ["Philips", "Bosch", "Siemens", "Whirlpool", "LG"],
        required: true,
        order: 0,
      },
      {
        name: "Capacity",
        type: "text",
        options: [],
        required: false,
        order: 1,
      },
      {
        name: "Color",
        type: "select",
        options: ["Black", "White", "Silver", "Stainless Steel"],
        required: false,
        order: 2,
      },
      {
        name: "Warranty (Years)",
        type: "number",
        options: [],
        required: false,
        order: 3,
      },
    ],
  },
  {
    name: "Books",
    slug: "books",
    description: "Books and reading materials",
    image: "https://via.placeholder.com/300x200?text=Books",
    isActive: true,
    attributes: [
      {
        name: "Author",
        type: "text",
        options: [],
        required: true,
        order: 0,
      },
      {
        name: "Genre",
        type: "select",
        options: ["Fiction", "Non-Fiction", "Mystery", "Romance", "Science Fiction", "Biography"],
        required: true,
        order: 1,
      },
      {
        name: "Language",
        type: "select",
        options: ["English", "Bengali", "Hindi", "Urdu"],
        required: false,
        order: 2,
      },
      {
        name: "Pages",
        type: "number",
        options: [],
        required: false,
        order: 3,
      },
    ],
  },
  {
    name: "Sports & Outdoors",
    slug: "sports-outdoors",
    description: "Sports equipment and outdoor gear",
    image: "https://via.placeholder.com/300x200?text=Sports",
    isActive: true,
    attributes: [
      {
        name: "Sport Type",
        type: "select",
        options: ["Cricket", "Football", "Basketball", "Tennis", "Badminton", "Cycling"],
        required: true,
        order: 0,
      },
      {
        name: "Size",
        type: "select",
        options: ["Small", "Medium", "Large", "Extra Large"],
        required: false,
        order: 1,
      },
      {
        name: "Material",
        type: "select",
        options: ["Rubber", "Leather", "Synthetic", "Wood"],
        required: false,
        order: 2,
      },
      {
        name: "Color",
        type: "select",
        options: ["Black", "White", "Red", "Blue", "Green"],
        required: false,
        order: 3,
      },
    ],
  },
];

async function seedDynamicCategories() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Clear existing dynamic categories
    await DynamicCategory.deleteMany({});
    console.log("🗑️  Cleared existing dynamic categories");

    // Insert new categories
    const result = await DynamicCategory.insertMany(dynamicCategories);
    console.log(`✅ Inserted ${result.length} dynamic categories`);

    // Display inserted categories
    console.log("\n📦 Dynamic Categories:");
    result.forEach((cat, idx) => {
      console.log(`\n${idx + 1}. ${cat.name} (${cat.slug})`);
      console.log(`   Attributes: ${cat.attributes.length}`);
      cat.attributes.forEach((attr) => {
        console.log(`   - ${attr.name} (${attr.type})${attr.required ? " [Required]" : ""}`);
      });
    });

    console.log("\n✅ Dynamic category seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding dynamic categories:", error);
    process.exit(1);
  }
}

seedDynamicCategories();
