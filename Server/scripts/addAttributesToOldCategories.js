const mongoose = require("mongoose");
const Category = require("../models/Category");
require("dotenv").config();

// Common attributes for different category types
const categoryAttributeMap = {
  // Electronics
  electronics: [
    { name: "Brand", type: "text", required: true },
    { name: "Model", type: "text", required: true },
    { name: "Color", type: "select", options: ["Black", "White", "Silver", "Gold", "Blue", "Red"], required: false },
    { name: "Storage", type: "select", options: ["64GB", "128GB", "256GB", "512GB", "1TB"], required: false },
    { name: "RAM", type: "select", options: ["4GB", "6GB", "8GB", "12GB", "16GB"], required: false },
    { name: "Warranty", type: "text", required: false },
  ],
  
  // Fashion
  fashion: [
    { name: "Size", type: "select", options: ["XS", "S", "M", "L", "XL", "XXL"], required: true },
    { name: "Color", type: "select", options: ["Black", "White", "Red", "Blue", "Green", "Yellow", "Pink", "Purple"], required: true },
    { name: "Material", type: "text", required: false },
    { name: "Gender", type: "select", options: ["Men", "Women", "Unisex"], required: false },
    { name: "Fit", type: "select", options: ["Slim", "Regular", "Loose", "Oversized"], required: false },
  ],
  
  // Home & Kitchen
  home: [
    { name: "Color", type: "select", options: ["Black", "White", "Silver", "Gold", "Brown"], required: false },
    { name: "Material", type: "text", required: false },
    { name: "Capacity", type: "text", required: false },
    { name: "Dimensions", type: "text", required: false },
    { name: "Weight", type: "text", required: false },
  ],
  
  // Books
  books: [
    { name: "Author", type: "text", required: true },
    { name: "Publisher", type: "text", required: false },
    { name: "Language", type: "select", options: ["English", "Bengali", "Hindi", "Urdu"], required: false },
    { name: "Pages", type: "number", required: false },
    { name: "Edition", type: "text", required: false },
  ],
  
  // Sports
  sports: [
    { name: "Size", type: "select", options: ["XS", "S", "M", "L", "XL", "XXL"], required: false },
    { name: "Color", type: "select", options: ["Black", "White", "Red", "Blue", "Green"], required: false },
    { name: "Material", type: "text", required: false },
    { name: "Weight", type: "text", required: false },
  ],
  
  // Default
  default: [
    { name: "Brand", type: "text", required: false },
    { name: "Color", type: "select", options: ["Black", "White", "Red", "Blue", "Green"], required: false },
    { name: "Size", type: "text", required: false },
  ],
};

async function addAttributesToCategories() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const db = mongoose.connection.db;
    const categoryModel = new Category(db);

    // Get all categories
    const categories = await categoryModel.findAll();
    console.log(`Found ${categories.length} categories`);

    let updated = 0;

    for (const category of categories) {
      // Skip if already has attributes
      if (category.attributes && category.attributes.length > 0) {
        console.log(`✓ ${category.name} already has attributes`);
        continue;
      }

      // Determine which attributes to add based on category name
      let attributes = categoryAttributeMap.default;
      
      const nameLower = category.name.toLowerCase();
      if (nameLower.includes("electron") || nameLower.includes("phone") || nameLower.includes("laptop")) {
        attributes = categoryAttributeMap.electronics;
      } else if (nameLower.includes("fashion") || nameLower.includes("cloth") || nameLower.includes("shirt") || nameLower.includes("dress")) {
        attributes = categoryAttributeMap.fashion;
      } else if (nameLower.includes("home") || nameLower.includes("kitchen") || nameLower.includes("furniture")) {
        attributes = categoryAttributeMap.home;
      } else if (nameLower.includes("book")) {
        attributes = categoryAttributeMap.books;
      } else if (nameLower.includes("sport") || nameLower.includes("fitness")) {
        attributes = categoryAttributeMap.sports;
      }

      // Add IDs to attributes
      const attributesWithIds = attributes.map((attr, idx) => ({
        _id: new mongoose.Types.ObjectId(),
        ...attr,
        order: idx,
      }));

      // Update category
      await categoryModel.update(category._id, {
        attributes: attributesWithIds,
      });

      console.log(`✓ Added ${attributesWithIds.length} attributes to ${category.name}`);
      updated++;
    }

    console.log(`\n✅ Successfully updated ${updated} categories with attributes`);
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

addAttributesToCategories();
