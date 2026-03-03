require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
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
  { name: "Men's", slug: "mens" },
  { name: "Women's", slug: "womens" },
  { name: "Electronics", slug: "electronics" },
  { name: "Baby", slug: "baby" },
];

async function seed() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db("HnilaBazar");

    // Clear existing data
    await db.collection("categories").deleteMany({});
    await db.collection("products").deleteMany({});
    console.log("🗑️  Cleared existing data");

    // Insert categories
    const categoryResult = await db
      .collection("categories")
      .insertMany(categories);
    console.log(`✅ Inserted ${categoryResult.insertedCount} categories`);

    const insertedCategories = await db
      .collection("categories")
      .find({})
      .toArray();
    const categoryMap = {};
    insertedCategories.forEach((cat) => {
      categoryMap[cat.slug] = cat._id.toString();
    });

    // Sample products with multiple images
    const products = [
      // Men's products
      {
        title: "Men's Classic T-Shirt",
        price: 29.99,
        image:
          "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=600&fit=crop",
        images: [
          "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=600&fit=crop",
          "https://images.unsplash.com/photo-1583743814966-8936f37f4678?w=600&h=600&fit=crop",
          "https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=600&h=600&fit=crop",
          "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600&h=600&fit=crop",
        ],
        categoryId: categoryMap.mens,
        stock: 50,
        description:
          "Comfortable cotton t-shirt for everyday wear. Made from 100% premium cotton with a classic fit.",
        sizes: ["S", "M", "L", "XL"],
        colors: [
          { name: "Black", value: "#000000" },
          { name: "White", value: "#FFFFFF" },
          { name: "Navy", value: "#1E3A8A" },
          { name: "Gray", value: "#6B7280" },
        ],
      },
      {
        title: "Men's Denim Jeans",
        price: 59.99,
        image:
          "https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&h=600&fit=crop",
        images: [
          "https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&h=600&fit=crop",
          "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&h=600&fit=crop",
          "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600&h=600&fit=crop",
          "https://images.unsplash.com/photo-1565084888279-aca607ecce0c?w=600&h=600&fit=crop",
        ],
        categoryId: categoryMap.mens,
        stock: 30,
        description:
          "Classic fit denim jeans with premium quality fabric and modern styling.",
        sizes: ["30", "32", "34", "36"],
        colors: [
          { name: "Blue", value: "#3B82F6" },
          { name: "Black", value: "#000000" },
          { name: "Gray", value: "#6B7280" },
        ],
      },
      {
        title: "Men's Leather Jacket",
        price: 199.99,
        image:
          "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&h=600&fit=crop",
        images: [
          "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&h=600&fit=crop",
          "https://images.unsplash.com/photo-1520975954732-35dd22299614?w=600&h=600&fit=crop",
          "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&h=600&fit=crop",
          "https://images.unsplash.com/photo-1506629905607-d405872a4d86?w=600&h=600&fit=crop",
        ],
        categoryId: categoryMap.mens,
        stock: 15,
        description:
          "Premium genuine leather jacket with modern design and superior craftsmanship.",
        sizes: ["M", "L", "XL"],
      },
      {
        title: "Men's Running Shoes",
        price: 89.99,
        image:
          "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop",
        images: [
          "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop",
          "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&h=600&fit=crop",
          "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&h=600&fit=crop",
          "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&h=600&fit=crop",
        ],
        categoryId: categoryMap.mens,
        stock: 40,
        description:
          "Comfortable running shoes with advanced cushioning and breathable design.",
        sizes: ["8", "9", "10", "11", "12"],
        colors: [
          { name: "Black", value: "#000000" },
          { name: "White", value: "#FFFFFF" },
          { name: "Red", value: "#EF4444" },
          { name: "Blue", value: "#3B82F6" },
        ],
      },

      // Women's products
      {
        title: "Women's Summer Dress",
        price: 49.99,
        image:
          "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&h=600&fit=crop",
        images: [
          "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&h=600&fit=crop",
          "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&h=600&fit=crop",
          "https://images.unsplash.com/photo-1566479179817-c0c8b4b4e8b8?w=600&h=600&fit=crop",
          "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600&h=600&fit=crop",
        ],
        categoryId: categoryMap.womens,
        stock: 35,
        description:
          "Light and breezy summer dress perfect for warm weather and casual occasions.",
        sizes: ["XS", "S", "M", "L"],
        colors: [
          { name: "Pink", value: "#EC4899" },
          { name: "Blue", value: "#3B82F6" },
          { name: "White", value: "#FFFFFF" },
          { name: "Yellow", value: "#F59E0B" },
        ],
      },
      {
        title: "Women's Handbag",
        price: 79.99,
        image:
          "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&h=600&fit=crop",
        images: [
          "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&h=600&fit=crop",
          "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&h=600&fit=crop",
          "https://images.unsplash.com/photo-1590736969955-71cc94901144?w=600&h=600&fit=crop",
          "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&h=600&fit=crop",
        ],
        categoryId: categoryMap.womens,
        stock: 25,
        description:
          "Elegant leather handbag with spacious interior and stylish design.",
      },
      {
        title: "Women's High Heels",
        price: 69.99,
        image:
          "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&h=600&fit=crop",
        images: [
          "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&h=600&fit=crop",
          "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&h=600&fit=crop",
          "https://images.unsplash.com/photo-1535043934128-cf0b28d52f95?w=600&h=600&fit=crop",
          "https://images.unsplash.com/photo-1463100099107-aa0980c362e6?w=600&h=600&fit=crop",
        ],
        categoryId: categoryMap.womens,
        stock: 20,
        description:
          "Stylish high heel shoes perfect for formal occasions and special events.",
        sizes: ["6", "7", "8", "9", "10"],
      },
      {
        title: "Women's Sunglasses",
        price: 39.99,
        image:
          "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&h=600&fit=crop",
        images: [
          "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&h=600&fit=crop",
          "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&h=600&fit=crop",
          "https://images.unsplash.com/photo-1508296695146-257a814070b4?w=600&h=600&fit=crop",
          "https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=600&h=600&fit=crop",
        ],
        categoryId: categoryMap.womens,
        stock: 45,
        description:
          "UV protection sunglasses with fashionable design and premium quality lenses.",
      },

      // Electronics
      {
        title: "Wireless Headphones",
        price: 149.99,
        image:
          "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop",
        images: [
          "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop",
          "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=600&h=600&fit=crop",
          "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600&h=600&fit=crop",
          "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&h=600&fit=crop",
        ],
        categoryId: categoryMap.electronics,
        stock: 60,
        description:
          "Noise-cancelling wireless headphones with superior sound quality and long battery life.",
      },
      {
        title: "Smart Watch",
        price: 299.99,
        image:
          "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop",
        images: [
          "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop",
          "https://images.unsplash.com/photo-1551816230-ef5deaed4a26?w=600&h=600&fit=crop",
          "https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=600&h=600&fit=crop",
          "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=600&h=600&fit=crop",
        ],
        categoryId: categoryMap.electronics,
        stock: 30,
        description:
          "Advanced fitness tracking smart watch with health monitoring and GPS features.",
      },
      {
        title: "Laptop Stand",
        price: 49.99,
        image:
          "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600&h=600&fit=crop",
        images: [
          "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600&h=600&fit=crop",
          "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=600&h=600&fit=crop",
          "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=600&h=600&fit=crop",
        ],
        categoryId: categoryMap.electronics,
        stock: 50,
        description:
          "Ergonomic laptop stand for improved posture and workspace organization.",
      },
      {
        title: "Wireless Mouse",
        price: 29.99,
        image:
          "https://images.unsplash.com/photo-1527814050087-3793815479db?w=600&h=600&fit=crop",
        images: [
          "https://images.unsplash.com/photo-1527814050087-3793815479db?w=600&h=600&fit=crop",
          "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&h=600&fit=crop",
          "https://images.unsplash.com/photo-1563297007-0686b7003af7?w=600&h=600&fit=crop",
        ],
        categoryId: categoryMap.electronics,
        stock: 80,
        description:
          "Ergonomic wireless mouse with precision tracking and comfortable grip.",
      },

      // Baby products
      {
        title: "Baby Stroller",
        price: 249.99,
        image:
          "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=600&fit=crop",
        images: [
          "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=600&fit=crop",
          "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&h=600&fit=crop",
          "https://images.unsplash.com/photo-1587393855524-087f83d95bc9?w=600&h=600&fit=crop",
          "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&h=600&fit=crop",
        ],
        categoryId: categoryMap.baby,
        stock: 15,
        description:
          "Comfortable and safe baby stroller with smooth maneuverability and safety features.",
      },
      {
        title: "Baby Monitor",
        price: 89.99,
        image:
          "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=600&h=600&fit=crop",
        images: [
          "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=600&h=600&fit=crop",
          "https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?w=600&h=600&fit=crop",
          "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&h=600&fit=crop",
        ],
        categoryId: categoryMap.baby,
        stock: 25,
        description:
          "Video baby monitor with night vision and two-way audio communication.",
      },
      {
        title: "Baby Clothes Set",
        price: 34.99,
        image:
          "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&h=600&fit=crop",
        images: [
          "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&h=600&fit=crop",
          "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=600&h=600&fit=crop",
          "https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?w=600&h=600&fit=crop",
          "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&h=600&fit=crop",
        ],
        categoryId: categoryMap.baby,
        stock: 40,
        description:
          "Soft cotton baby clothes set with comfortable fit and adorable designs.",
        sizes: ["0-3M", "3-6M", "6-12M"],
      },
      {
        title: "Baby Toys Set",
        price: 24.99,
        image:
          "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=600&h=600&fit=crop",
        images: [
          "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=600&h=600&fit=crop",
          "https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?w=600&h=600&fit=crop",
          "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&h=600&fit=crop",
        ],
        categoryId: categoryMap.baby,
        stock: 55,
        description:
          "Safe and educational baby toys designed for early development and fun.",
      },
    ];

    // Insert products
    const productResult = await db.collection("products").insertMany(products);
    console.log(`✅ Inserted ${productResult.insertedCount} products`);

    console.log("\n🎉 Database seeded successfully!");
    console.log("\n📊 Summary:");
    console.log(`   Categories: ${categoryResult.insertedCount}`);
    console.log(`   Products: ${productResult.insertedCount}`);
    console.log("\n💡 Next steps:");
    console.log("   1. Start the server: npm run dev");
    console.log("   2. Register a user in the frontend");
    console.log(
      "   3. Update user role to 'admin' in MongoDB to access admin features",
    );
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    await client.close();
  }
}

seed();
