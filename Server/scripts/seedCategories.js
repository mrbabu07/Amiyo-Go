const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });
const { MongoClient, ServerApiVersion } = require("mongodb");

const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME || "BazarBD";

function createMongoClient() {
  if (!uri) {
    throw new Error("MONGO_URI is required to seed categories.");
  }

  return new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });
}

const categoryTree = [
  {
    name: "Men's Fashion",
    slug: "mens-fashion",
    icon: "fashion",
    displayOrder: 4,
    minimumCommissionRate: 8,
    children: [
      {
        name: "Clothing",
        slug: "mens-clothing",
        children: [
          { name: "Shirts", slug: "mens-shirts" },
          { name: "T-Shirts", slug: "mens-tshirts" },
          { name: "Pants", slug: "mens-pants" },
          { name: "Formal Pants", slug: "mens-formal-pants" },
          { name: "Jeans", slug: "mens-jeans" },
          { name: "Panjabi", slug: "mens-panjabi" },
          { name: "Jackets & Coats", slug: "mens-jackets-coats" },
          { name: "Innerwear", slug: "mens-innerwear" },
        ],
      },
      {
        name: "Ethnic Wear",
        slug: "mens-ethnic-wear",
        children: [
          { name: "Panjabi & Kurta", slug: "panjabi-kurta" },
          { name: "Pajama", slug: "mens-pajama" },
          { name: "Waistcoat", slug: "mens-waistcoat" },
          { name: "Prayer Caps", slug: "prayer-caps" },
        ],
      },
      {
        name: "Shoes",
        slug: "mens-shoes",
        children: [
          { name: "Casual Shoes", slug: "mens-casual-shoes" },
          { name: "Formal Shoes", slug: "mens-formal-shoes" },
          { name: "Sneakers", slug: "mens-sneakers" },
          { name: "Sandals", slug: "mens-sandals" },
          { name: "Loafers", slug: "mens-loafers" },
          { name: "Sports Shoes", slug: "mens-sports-shoes" },
        ],
      },
      {
        name: "Accessories",
        slug: "mens-accessories",
        children: [
          { name: "Belts", slug: "mens-belts" },
          { name: "Wallets", slug: "mens-wallets" },
          { name: "Sunglasses", slug: "mens-sunglasses" },
          { name: "Caps", slug: "mens-caps" },
          { name: "Watches", slug: "mens-watches" },
          { name: "Ties & Cufflinks", slug: "ties-cufflinks" },
        ],
      },
      {
        name: "Boys Clothing",
        slug: "boys-clothing",
        children: [
          { name: "Boys Shirts", slug: "boys-shirts" },
          { name: "Boys Pants", slug: "boys-pants" },
          { name: "Boys T-Shirts", slug: "boys-tshirts" },
          { name: "Boys Panjabi", slug: "boys-panjabi" },
          { name: "Boys Jackets", slug: "boys-jackets" },
        ],
      },
      {
        name: "Boys Shoes",
        slug: "boys-shoes",
        children: [
          { name: "School Shoes", slug: "boys-school-shoes" },
          { name: "Boys Sneakers", slug: "boys-sneakers" },
          { name: "Boys Sandals", slug: "boys-sandals" },
        ],
      },
      {
        name: "Boys Accessories",
        slug: "boys-accessories",
        children: [
          { name: "Boys Bags", slug: "boys-bags" },
          { name: "Boys Watches", slug: "boys-watches" },
          { name: "Boys Belts", slug: "boys-belts" },
        ],
      },
    ],
  },
  {
    name: "Women's Fashion",
    slug: "womens-fashion",
    minimumCommissionRate: 8,
    icon: "fashion",
    displayOrder: 5,
    children: [
      {
        name: "Clothing",
        slug: "womens-clothing",
        children: [
          { name: "Sarees", slug: "sarees" },
          { name: "Salwar Kameez", slug: "salwar-kameez" },
          { name: "Kurtis", slug: "kurtis" },
          { name: "Western Wear", slug: "womens-western-wear" },
          { name: "Abaya & Burqa", slug: "abaya-burqa" },
          { name: "Hijab & Scarves", slug: "hijab-scarves" },
          { name: "Blouses", slug: "blouses" },
          { name: "Leggings", slug: "leggings" },
        ],
      },
      {
        name: "Traditional Wear",
        slug: "womens-traditional-wear",
        children: [
          { name: "Cotton Sarees", slug: "cotton-sarees" },
          { name: "Silk Sarees", slug: "silk-sarees" },
          { name: "Three Piece", slug: "three-piece" },
          { name: "Lehenga", slug: "lehenga" },
        ],
      },
      {
        name: "Shoes",
        slug: "womens-shoes",
        children: [
          { name: "Heels", slug: "womens-heels" },
          { name: "Flats", slug: "womens-flats" },
          { name: "Sandals", slug: "womens-sandals" },
          { name: "Sneakers", slug: "womens-sneakers" },
          { name: "Slippers", slug: "womens-slippers" },
        ],
      },
      {
        name: "Accessories",
        slug: "womens-accessories",
        children: [
          { name: "Bags", slug: "womens-bags" },
          { name: "Jewelry", slug: "womens-jewelry" },
          { name: "Scarves", slug: "womens-scarves" },
          { name: "Hair Accessories", slug: "hair-accessories" },
          { name: "Watches", slug: "womens-watches" },
          { name: "Wallets", slug: "womens-wallets" },
        ],
      },
      {
        name: "Girls Fashion",
        slug: "girls-fashion",
        children: [
          { name: "Girls Dresses", slug: "girls-dresses" },
          { name: "Girls Shoes", slug: "girls-shoes" },
          { name: "Girls Accessories", slug: "girls-accessories" },
          { name: "Girls Tops", slug: "girls-tops" },
          { name: "Girls Leggings", slug: "girls-leggings" },
        ],
      },
    ],
  },
  {
    name: "Electronics",
    slug: "electronics",
    icon: "electronics",
    displayOrder: 6,
    minimumCommissionRate: 5,
    children: [
      {
        name: "Mobiles",
        slug: "mobiles",
        children: [
          { name: "Smartphones", slug: "smartphones" },
          { name: "Feature Phones", slug: "feature-phones" },
          { name: "Mobile Accessories", slug: "mobile-accessories" },
          { name: "Phone Cases", slug: "phone-cases" },
          { name: "Chargers & Cables", slug: "chargers-cables" },
          { name: "Power Banks", slug: "power-banks" },
        ],
      },
      {
        name: "Computers",
        slug: "computers",
        children: [
          { name: "Laptops", slug: "laptops" },
          { name: "Desktops", slug: "desktops" },
          { name: "Computer Accessories", slug: "computer-accessories" },
          { name: "Keyboards & Mouse", slug: "keyboards-mouse" },
          { name: "Monitors", slug: "monitors" },
          { name: "Printers & Scanners", slug: "printers-scanners" },
        ],
      },
      {
        name: "Audio",
        slug: "audio",
        children: [
          { name: "Headphones", slug: "headphones" },
          { name: "Speakers", slug: "speakers" },
          { name: "Earbuds", slug: "earbuds" },
          { name: "Microphones", slug: "microphones" },
          { name: "Sound Systems", slug: "sound-systems" },
        ],
      },
      {
        name: "TV & Home Appliances",
        slug: "tv-home-appliances",
        children: [
          { name: "Televisions", slug: "televisions" },
          { name: "Refrigerators", slug: "refrigerators" },
          { name: "Washing Machines", slug: "washing-machines" },
          { name: "Air Conditioners", slug: "air-conditioners" },
          { name: "Fans", slug: "fans" },
        ],
      },
      {
        name: "Cameras & Gadgets",
        slug: "cameras-gadgets",
        children: [
          { name: "Cameras", slug: "cameras" },
          { name: "Smart Watches", slug: "smart-watches" },
          { name: "Gaming Accessories", slug: "gaming-accessories" },
          { name: "Drones", slug: "drones" },
        ],
      },
    ],
  },
  {
    name: "Home & Lifestyle",
    slug: "home-lifestyle",
    icon: "home",
    displayOrder: 7,
    minimumCommissionRate: 7,
    children: [
      {
        name: "Home Decor",
        slug: "home-decor",
        children: [
          { name: "Wall Decor", slug: "wall-decor" },
          { name: "Lighting", slug: "lighting" },
          { name: "Bedding", slug: "bedding" },
          { name: "Curtains", slug: "curtains" },
          { name: "Rugs & Carpets", slug: "rugs-carpets" },
          { name: "Clocks", slug: "clocks" },
        ],
      },
      {
        name: "Kitchen",
        slug: "kitchen",
        children: [
          { name: "Cookware", slug: "cookware" },
          { name: "Kitchen Tools", slug: "kitchen-tools" },
          { name: "Storage", slug: "kitchen-storage" },
          { name: "Dinnerware", slug: "dinnerware" },
          { name: "Drinkware", slug: "drinkware" },
          { name: "Kitchen Appliances", slug: "kitchen-appliances" },
        ],
      },
      {
        name: "Furniture",
        slug: "furniture",
        children: [
          { name: "Sofas", slug: "sofas" },
          { name: "Tables", slug: "tables" },
          { name: "Chairs", slug: "chairs" },
          { name: "Beds", slug: "beds" },
          { name: "Wardrobes", slug: "wardrobes" },
        ],
      },
      {
        name: "Bath & Cleaning",
        slug: "bath-cleaning",
        children: [
          { name: "Towels", slug: "towels" },
          { name: "Bathroom Accessories", slug: "bathroom-accessories" },
          { name: "Mops & Brooms", slug: "mops-brooms" },
          { name: "Cleaning Tools", slug: "cleaning-tools" },
        ],
      },
    ],
  },
  {
    name: "Beauty & Health",
    slug: "beauty-health",
    icon: "beauty",
    displayOrder: 8,
    minimumCommissionRate: 10,
    children: [
      {
        name: "Beauty",
        slug: "beauty",
        children: [
          { name: "Skin Care", slug: "skin-care" },
          { name: "Makeup", slug: "makeup" },
          { name: "Hair Care", slug: "hair-care" },
          { name: "Fragrance", slug: "fragrance" },
          { name: "Bath & Body", slug: "bath-body" },
          { name: "Beauty Tools", slug: "beauty-tools" },
        ],
      },
      {
        name: "Health",
        slug: "health",
        children: [
          { name: "Personal Care", slug: "personal-care" },
          { name: "Wellness", slug: "wellness" },
          { name: "Medical Supplies", slug: "medical-supplies" },
          { name: "Vitamins & Supplements", slug: "vitamins-supplements" },
          { name: "Oral Care", slug: "oral-care" },
          { name: "First Aid", slug: "first-aid" },
        ],
      },
      {
        name: "Men's Grooming",
        slug: "mens-grooming",
        children: [
          { name: "Shaving", slug: "shaving" },
          { name: "Beard Care", slug: "beard-care" },
          { name: "Men's Skin Care", slug: "mens-skin-care" },
          { name: "Deodorants", slug: "deodorants" },
        ],
      },
      {
        name: "Mother & Baby Care",
        slug: "mother-baby-care",
        children: [
          { name: "Baby Skin Care", slug: "baby-skin-care" },
          { name: "Baby Bath", slug: "baby-bath" },
          { name: "Maternity Care", slug: "maternity-care" },
        ],
      },
    ],
  },
  {
    name: "Groceries & Daily Needs",
    slug: "groceries",
    icon: "grocery",
    displayOrder: 1,
    minimumCommissionRate: 3,
    description: "Everyday grocery, cooking staples, fresh food, baby care, and household essentials.",
    children: [
      {
        name: "Food Cupboard",
        slug: "food-cupboard",
        children: [
          { name: "Rice & Grains", slug: "rice-grains" },
          { name: "Flour & Baking", slug: "flour-baking" },
          { name: "Lentils & Pulses", slug: "lentils-pulses" },
          { name: "Oil & Ghee", slug: "oil-ghee" },
          { name: "Sugar & Salt", slug: "sugar-salt" },
          { name: "Sauces & Condiments", slug: "sauces-condiments" },
          { name: "Snacks", slug: "snacks" },
        ],
      },
      {
        name: "Noodles & Pasta",
        slug: "noodles-pasta",
        children: [
          { name: "Instant Noodles", slug: "instant-noodles" },
          { name: "Pasta", slug: "pasta" },
          { name: "Vermicelli & Semai", slug: "vermicelli-semai" },
          { name: "Macaroni", slug: "macaroni" },
        ],
      },
      {
        name: "Spices & Masala",
        slug: "spices-masala",
        children: [
          { name: "Whole Spices", slug: "whole-spices" },
          { name: "Powder Spices", slug: "powder-spices" },
          { name: "Cooking Masala", slug: "cooking-masala" },
          { name: "Ready Mix Masala", slug: "ready-mix-masala" },
        ],
      },
      {
        name: "Fresh Food",
        slug: "fresh-food",
        description: "Daily produce, dairy, meat, and fish.",
        children: [
          { name: "Fruits", slug: "fruits" },
          { name: "Vegetables", slug: "vegetables" },
          { name: "Dairy & Eggs", slug: "dairy-eggs" },
          { name: "Meat & Chicken", slug: "meat-chicken" },
          { name: "Fish & Seafood", slug: "grocery-fish-seafood" },
        ],
      },
      {
        name: "Breakfast & Spreads",
        slug: "breakfast-spreads",
        children: [
          { name: "Bread & Bakery", slug: "bread-bakery" },
          { name: "Cereal & Oats", slug: "cereal-oats" },
          { name: "Jam & Jelly", slug: "jam-jelly" },
          { name: "Honey", slug: "honey" },
        ],
      },
      {
        name: "Beverages",
        slug: "beverages",
        children: [
          { name: "Tea", slug: "tea" },
          { name: "Coffee", slug: "coffee" },
          { name: "Juice", slug: "juice" },
          { name: "Soft Drinks", slug: "soft-drinks" },
          { name: "Water", slug: "water" },
        ],
      },
      {
        name: "Household & Baby Essentials",
        slug: "baby-household-grocery",
        children: [
          { name: "Baby Food", slug: "baby-food" },
          { name: "Diapers & Wipes", slug: "diapers-wipes" },
          { name: "Cleaning Supplies", slug: "cleaning-supplies" },
          { name: "Dishwashing", slug: "dishwashing" },
          { name: "Laundry", slug: "laundry" },
          { name: "Tissue & Paper", slug: "tissue-paper" },
          { name: "Household Essentials", slug: "household-essentials" },
        ],
      },
    ],
  },
  {
    name: "Homemade Products",
    slug: "homemade-products",
    icon: "homemade",
    displayOrder: 9,
    minimumCommissionRate: 6,
    children: [
      {
        name: "Homemade Food",
        slug: "homemade-food",
        children: [
          { name: "Pitha & Sweets", slug: "pitha-sweets" },
          { name: "Pickles & Chutney", slug: "pickles-chutney" },
          { name: "Homemade Snacks", slug: "homemade-snacks" },
          { name: "Ready Meals", slug: "homemade-ready-meals" },
          { name: "Homemade Cakes", slug: "homemade-cakes" },
          { name: "Frozen Homemade Food", slug: "frozen-homemade-food" },
        ],
      },
      {
        name: "Handmade Crafts",
        slug: "handmade-crafts",
        children: [
          { name: "Handmade Decor", slug: "handmade-decor" },
          { name: "Handmade Jewelry", slug: "handmade-jewelry" },
          { name: "Handmade Bags", slug: "handmade-bags" },
          { name: "Gift Items", slug: "handmade-gift-items" },
          { name: "Handmade Clothing", slug: "handmade-clothing" },
          { name: "Crochet & Knitting", slug: "crochet-knitting" },
        ],
      },
      {
        name: "Local Homemade Essentials",
        slug: "local-homemade-essentials",
        children: [
          { name: "Natural Oils", slug: "homemade-natural-oils" },
          { name: "Spice Mixes", slug: "homemade-spice-mixes" },
          { name: "Organic Soap", slug: "homemade-organic-soap" },
          { name: "Natural Honey", slug: "homemade-natural-honey" },
          { name: "Herbal Products", slug: "homemade-herbal-products" },
        ],
      },
      {
        name: "Home Service Products",
        slug: "home-service-products",
        children: [
          { name: "Tailoring Items", slug: "tailoring-items" },
          { name: "Custom Gifts", slug: "custom-gifts" },
          { name: "Personalized Decor", slug: "personalized-decor" },
        ],
      },
    ],
  },
  {
    name: "Restaurants & Food Ordering",
    slug: "restaurants-food-ordering",
    icon: "restaurant",
    displayOrder: 10,
    minimumCommissionRate: 8,
    children: [
      {
        name: "Restaurant Meals",
        slug: "restaurant-meals",
        children: [
          { name: "Rice Meals", slug: "restaurant-rice-meals" },
          { name: "Biriyani & Tehari", slug: "biriyani-tehari" },
          { name: "Curry & Bhuna", slug: "curry-bhuna" },
          { name: "Grill & BBQ", slug: "grill-bbq" },
          { name: "Set Menu", slug: "restaurant-set-menu" },
          { name: "Family Platters", slug: "family-platters" },
        ],
      },
      {
        name: "Fast Food",
        slug: "restaurant-fast-food",
        children: [
          { name: "Burgers", slug: "burgers" },
          { name: "Pizza", slug: "pizza" },
          { name: "Fried Chicken", slug: "fried-chicken" },
          { name: "Sandwiches & Wraps", slug: "sandwiches-wraps" },
          { name: "French Fries", slug: "french-fries" },
        ],
      },
      {
        name: "Local Food",
        slug: "local-food",
        children: [
          { name: "Bangla Breakfast", slug: "bangla-breakfast" },
          { name: "Paratha & Roti", slug: "paratha-roti" },
          { name: "Khichuri", slug: "khichuri" },
          { name: "Haleem", slug: "haleem" },
          { name: "Local Snacks", slug: "local-snacks" },
        ],
      },
      {
        name: "Street Food",
        slug: "street-food",
        children: [
          { name: "Fuchka", slug: "fuchka" },
          { name: "Chotpoti", slug: "chotpoti" },
          { name: "Bhelpuri", slug: "bhelpuri" },
          { name: "Jhalmuri", slug: "jhalmuri" },
          { name: "Halim & Soup", slug: "halim-soup" },
          { name: "Kebab & Grill Street Food", slug: "street-kebab-grill" },
          { name: "Singara & Samosa", slug: "singara-samosa" },
          { name: "Rolls & Shawarma", slug: "rolls-shawarma" },
          { name: "Noodles & Chowmein", slug: "street-noodles-chowmein" },
          { name: "Street Tea & Drinks", slug: "street-tea-drinks" },
        ],
      },
      {
        name: "Sweets & Bakery",
        slug: "restaurant-sweets-bakery",
        children: [
          { name: "Cakes", slug: "restaurant-cakes" },
          { name: "Pastry", slug: "pastry" },
          { name: "Misti & Sweets", slug: "misti-sweets" },
          { name: "Bakery Bread", slug: "restaurant-bakery-bread" },
          { name: "Desserts", slug: "desserts" },
        ],
      },
      {
        name: "Tea, Coffee & Drinks",
        slug: "tea-coffee-drinks",
        children: [
          { name: "Tea", slug: "restaurant-tea" },
          { name: "Coffee", slug: "restaurant-coffee" },
          { name: "Juice & Shakes", slug: "juice-shakes" },
          { name: "Lassi", slug: "lassi" },
          { name: "Cold Drinks", slug: "restaurant-cold-drinks" },
        ],
      },
      {
        name: "Food Packages",
        slug: "food-packages",
        children: [
          { name: "Lunch Box", slug: "lunch-box" },
          { name: "Office Meal", slug: "office-meal" },
          { name: "School Tiffin", slug: "school-tiffin" },
          { name: "Event Food", slug: "event-food" },
        ],
      },
    ],
  },
  {
    name: "Resell Market",
    slug: "resell-market",
    icon: "resell",
    displayOrder: 11,
    minimumCommissionRate: 4,
    children: [
      {
        name: "Used Electronics",
        slug: "used-electronics",
        children: [
          { name: "Used Phones", slug: "used-phones" },
          { name: "Used Laptops", slug: "used-laptops" },
          { name: "Used Cameras", slug: "used-cameras" },
          { name: "Used Accessories", slug: "used-electronics-accessories" },
          { name: "Used Gaming Devices", slug: "used-gaming-devices" },
          { name: "Used TVs", slug: "used-tvs" },
        ],
      },
      {
        name: "Pre-Owned Fashion",
        slug: "pre-owned-fashion",
        children: [
          { name: "Pre-Owned Clothing", slug: "pre-owned-clothing" },
          { name: "Pre-Owned Shoes", slug: "pre-owned-shoes" },
          { name: "Pre-Owned Bags", slug: "pre-owned-bags" },
          { name: "Pre-Owned Watches", slug: "pre-owned-watches" },
          { name: "Pre-Owned Jewelry", slug: "pre-owned-jewelry" },
        ],
      },
      {
        name: "Home Resale",
        slug: "home-resale",
        children: [
          { name: "Used Furniture", slug: "used-furniture" },
          { name: "Used Appliances", slug: "used-appliances" },
          { name: "Used Home Decor", slug: "used-home-decor" },
          { name: "Used Kitchenware", slug: "used-kitchenware" },
          { name: "Used Tools", slug: "used-tools" },
        ],
      },
      {
        name: "Vehicles & Parts",
        slug: "vehicles-parts",
        children: [
          { name: "Used Bikes", slug: "used-bikes" },
          { name: "Used Bicycles", slug: "used-bicycles" },
          { name: "Auto Parts", slug: "auto-parts" },
          { name: "Bike Accessories", slug: "bike-accessories" },
        ],
      },
      {
        name: "Books & Collectibles",
        slug: "used-books-collectibles",
        children: [
          { name: "Used Books", slug: "used-books" },
          { name: "Collectibles", slug: "collectibles" },
          { name: "Antiques", slug: "antiques" },
        ],
      },
    ],
  },
  {
    name: "Fresh Fish & Seafood",
    slug: "fresh-fish-seafood",
    icon: "fish",
    displayOrder: 3,
    minimumCommissionRate: 3,
    description: "Fresh, cleaned, frozen, and ready-to-cook fish and seafood.",
    children: [
      {
        name: "Fresh Fish",
        slug: "fresh-fish",
        children: [
          { name: "River Fish", slug: "river-fish" },
          { name: "Pond Fish", slug: "pond-fish" },
          { name: "Sea Fish", slug: "sea-fish" },
          { name: "Live Fish", slug: "live-fish" },
          { name: "Hilsa", slug: "hilsa" },
          { name: "Rui & Katla", slug: "rui-katla" },
        ],
      },
      {
        name: "Seafood",
        slug: "seafood",
        children: [
          { name: "Prawns & Shrimp", slug: "prawns-shrimp" },
          { name: "Crab", slug: "crab" },
          { name: "Dried Fish", slug: "dried-fish" },
          { name: "Squid", slug: "squid" },
          { name: "Lobster", slug: "lobster" },
        ],
      },
      {
        name: "Fish Cuts",
        slug: "fish-cuts",
        children: [
          { name: "Cleaned Fish", slug: "cleaned-fish" },
          { name: "Fish Fillet", slug: "fish-fillet" },
          { name: "Fish Eggs", slug: "fish-eggs" },
          { name: "Fish Steak Cuts", slug: "fish-steak-cuts" },
          { name: "Marinated Fish", slug: "marinated-fish" },
        ],
      },
      {
        name: "Frozen Fish",
        slug: "frozen-fish",
        children: [
          { name: "Frozen Fillet", slug: "frozen-fillet" },
          { name: "Frozen Shrimp", slug: "frozen-shrimp" },
          { name: "Frozen Mixed Seafood", slug: "frozen-mixed-seafood" },
        ],
      },
    ],
  },
  {
    name: "Fresh Vegetables",
    slug: "fresh-vegetables",
    icon: "vegetable",
    displayOrder: 2,
    minimumCommissionRate: 2,
    description: "Daily vegetables, fresh fruits, farm items, and weekly produce packs.",
    children: [
      {
        name: "Daily Vegetables",
        slug: "daily-vegetables",
        children: [
          { name: "Leafy Vegetables", slug: "leafy-vegetables" },
          { name: "Root Vegetables", slug: "root-vegetables" },
          { name: "Gourd & Pumpkin", slug: "gourd-pumpkin" },
          { name: "Brinjal & Okra", slug: "brinjal-okra" },
          { name: "Tomato & Chili", slug: "tomato-chili" },
          { name: "Onion & Garlic", slug: "onion-garlic" },
        ],
      },
      {
        name: "Fresh Fruits",
        slug: "fresh-fruits",
        children: [
          { name: "Seasonal Fruits", slug: "seasonal-fruits" },
          { name: "Local Fruits", slug: "local-fruits" },
          { name: "Imported Fruits", slug: "imported-fruits" },
          { name: "Banana & Papaya", slug: "banana-papaya" },
          { name: "Citrus Fruits", slug: "citrus-fruits" },
        ],
      },
      {
        name: "Farm Fresh",
        slug: "farm-fresh",
        children: [
          { name: "Organic Vegetables", slug: "organic-vegetables" },
          { name: "Village Fresh Items", slug: "village-fresh-items" },
          { name: "Herbs & Spices", slug: "fresh-herbs-spices" },
          { name: "Salad Items", slug: "salad-items" },
          { name: "Mushrooms", slug: "mushrooms" },
        ],
      },
      {
        name: "Fresh Bundles",
        slug: "fresh-bundles",
        children: [
          { name: "Weekly Vegetable Packs", slug: "weekly-vegetable-packs" },
          { name: "Cooking Combo Packs", slug: "cooking-combo-packs" },
          { name: "Fruit Baskets", slug: "fruit-baskets" },
        ],
      },
    ],
  },
  {
    name: "Stationery & Office",
    slug: "stationery-office",
    icon: "stationery",
    displayOrder: 12,
    minimumCommissionRate: 5,
    children: [
      {
        name: "School Stationery",
        slug: "school-stationery",
        children: [
          { name: "Pens & Pencils", slug: "pens-pencils" },
          { name: "Notebooks", slug: "notebooks" },
          { name: "Geometry Boxes", slug: "geometry-boxes" },
          { name: "School Bags", slug: "school-bags" },
          { name: "Erasers & Sharpeners", slug: "erasers-sharpeners" },
          { name: "Exam Boards", slug: "exam-boards" },
        ],
      },
      {
        name: "Office Supplies",
        slug: "office-supplies",
        children: [
          { name: "Files & Folders", slug: "files-folders" },
          { name: "Desk Organizers", slug: "desk-organizers" },
          { name: "Staplers & Punches", slug: "staplers-punches" },
          { name: "Tape & Adhesives", slug: "tape-adhesives" },
          { name: "Whiteboards", slug: "whiteboards" },
          { name: "Office Paper", slug: "office-paper" },
        ],
      },
      {
        name: "Art & Craft",
        slug: "art-craft",
        children: [
          { name: "Drawing Supplies", slug: "drawing-supplies" },
          { name: "Paint & Brushes", slug: "paint-brushes" },
          { name: "Craft Paper", slug: "craft-paper" },
          { name: "DIY Kits", slug: "diy-kits" },
          { name: "Color Pencils", slug: "color-pencils" },
          { name: "Clay & Modeling", slug: "clay-modeling" },
        ],
      },
      {
        name: "Paper Products",
        slug: "paper-products",
        children: [
          { name: "Printing Paper", slug: "printing-paper" },
          { name: "Registers", slug: "registers" },
          { name: "Sticky Notes", slug: "sticky-notes" },
          { name: "Envelopes", slug: "envelopes" },
          { name: "Index Cards", slug: "index-cards" },
          { name: "Binding Supplies", slug: "binding-supplies" },
        ],
      },
      {
        name: "Books & Learning",
        slug: "books-learning",
        children: [
          { name: "Academic Books", slug: "academic-books" },
          { name: "Children's Books", slug: "childrens-books" },
          { name: "Exam Guides", slug: "exam-guides" },
          { name: "Religious Books", slug: "religious-books" },
          { name: "Story Books", slug: "story-books" },
          { name: "Language Learning", slug: "language-learning" },
        ],
      },
    ],
  },
  {
    name: "Pharmacy",
    slug: "pharmacy",
    icon: "pharmacy",
    displayOrder: 13,
    minimumCommissionRate: 6,
    children: [
      {
        name: "Medicines",
        slug: "medicines",
        children: [
          { name: "Prescription Medicine", slug: "prescription-medicine" },
          { name: "OTC Medicine", slug: "otc-medicine" },
          { name: "Pain Relief", slug: "pain-relief" },
          { name: "Cold & Flu", slug: "cold-flu" },
          { name: "Digestive Health", slug: "digestive-health" },
        ],
      },
      {
        name: "Vitamins & Nutrition",
        slug: "pharmacy-vitamins-nutrition",
        children: [
          { name: "Vitamins", slug: "pharmacy-vitamins" },
          { name: "Supplements", slug: "pharmacy-supplements" },
          { name: "Protein & Fitness", slug: "protein-fitness" },
          { name: "Herbal Supplements", slug: "herbal-supplements" },
        ],
      },
      {
        name: "Medical Devices",
        slug: "medical-devices",
        children: [
          { name: "Blood Pressure Monitors", slug: "blood-pressure-monitors" },
          { name: "Glucometers", slug: "glucometers" },
          { name: "Thermometers", slug: "thermometers" },
          { name: "Nebulizers", slug: "nebulizers" },
          { name: "Oximeters", slug: "oximeters" },
        ],
      },
      {
        name: "First Aid & Safety",
        slug: "pharmacy-first-aid-safety",
        children: [
          { name: "Bandages & Dressings", slug: "bandages-dressings" },
          { name: "Antiseptics", slug: "antiseptics" },
          { name: "Masks & Sanitizers", slug: "masks-sanitizers" },
          { name: "Hot & Cold Therapy", slug: "hot-cold-therapy" },
        ],
      },
      {
        name: "Personal Health Care",
        slug: "personal-health-care",
        children: [
          { name: "Diabetes Care", slug: "diabetes-care" },
          { name: "Eye Care", slug: "eye-care" },
          { name: "Ear Care", slug: "ear-care" },
          { name: "Women Health", slug: "women-health" },
          { name: "Senior Care", slug: "senior-care" },
        ],
      },
    ],
  },
  {
    name: "Baby & Kids",
    slug: "baby-kids",
    icon: "baby",
    displayOrder: 14,
    minimumCommissionRate: 6,
    description: "Baby care, kids clothing, school essentials, toys, and safe family products.",
    children: [
      {
        name: "Baby Care Essentials",
        slug: "baby-care-essentials",
        children: [
          { name: "Diapers & Wipes", slug: "baby-kids-diapers-wipes" },
          { name: "Baby Food & Formula", slug: "baby-kids-food-formula" },
          { name: "Baby Bath & Skin Care", slug: "baby-kids-bath-skin-care" },
          { name: "Baby Health & Safety", slug: "baby-health-safety" },
          { name: "Feeding Accessories", slug: "baby-feeding-accessories" },
        ],
      },
      {
        name: "Baby Gear",
        slug: "baby-gear",
        children: [
          { name: "Strollers & Prams", slug: "strollers-prams" },
          { name: "Baby Carriers", slug: "baby-carriers" },
          { name: "Cribs & Baby Bedding", slug: "cribs-baby-bedding" },
          { name: "Baby Monitors", slug: "baby-monitors" },
          { name: "Baby Furniture", slug: "baby-furniture" },
        ],
      },
      {
        name: "Kids Clothing",
        slug: "kids-clothing",
        children: [
          { name: "Kids T-Shirts", slug: "kids-tshirts" },
          { name: "Kids Dresses", slug: "kids-dresses" },
          { name: "Kids Pants", slug: "kids-pants" },
          { name: "Kids Ethnic Wear", slug: "kids-ethnic-wear" },
          { name: "School Uniforms", slug: "school-uniforms" },
        ],
      },
      {
        name: "Kids Shoes & Accessories",
        slug: "kids-shoes-accessories",
        children: [
          { name: "Kids School Shoes", slug: "kids-school-shoes" },
          { name: "Kids Sandals", slug: "kids-sandals" },
          { name: "Kids Bags", slug: "kids-bags" },
          { name: "Kids Watches & Accessories", slug: "kids-watches-accessories" },
        ],
      },
      {
        name: "Baby & Kids Toys",
        slug: "baby-kids-toys",
        children: [
          { name: "Infant Toys", slug: "infant-toys" },
          { name: "Educational Toys", slug: "educational-toys-baby-kids" },
          { name: "Soft Toys", slug: "soft-toys-baby-kids" },
          { name: "Outdoor Play", slug: "kids-outdoor-play" },
        ],
      },
    ],
  },
  {
    name: "Mobile & Gadgets",
    slug: "mobile-gadgets",
    icon: "mobile",
    displayOrder: 15,
    minimumCommissionRate: 5,
    description: "Phones, tablets, wearables, smart devices, and everyday tech accessories.",
    children: [
      {
        name: "Phones & Tablets",
        slug: "phones-tablets",
        children: [
          { name: "Smartphones", slug: "mobile-gadgets-smartphones" },
          { name: "Feature Phones", slug: "mobile-feature-phones" },
          { name: "Tablets", slug: "tablets" },
          { name: "Refurbished Phones", slug: "refurbished-phones" },
        ],
      },
      {
        name: "Mobile Accessories",
        slug: "mobile-gadgets-accessories",
        children: [
          { name: "Phone Cases & Protectors", slug: "phone-cases-protectors" },
          { name: "Chargers, Cables & Adapters", slug: "mobile-power-charging" },
          { name: "Power Banks", slug: "mobile-gadgets-power-banks" },
          { name: "Memory Cards & Storage", slug: "memory-cards-storage" },
        ],
      },
      {
        name: "Wearables & Smart Devices",
        slug: "wearables-smart-devices",
        children: [
          { name: "Smart Watches", slug: "mobile-gadgets-smart-watches" },
          { name: "Fitness Bands", slug: "fitness-bands" },
          { name: "Smart Home Devices", slug: "smart-home-devices" },
          { name: "Trackers & Finders", slug: "trackers-finders" },
        ],
      },
      {
        name: "Gadgets & Gaming Devices",
        slug: "gadgets-gaming-devices",
        children: [
          { name: "Portable Gadgets", slug: "portable-gadgets" },
          { name: "Gaming Controllers", slug: "gaming-controllers" },
          { name: "VR & AR Accessories", slug: "vr-ar-accessories" },
          { name: "Tech Gifts", slug: "tech-gifts" },
        ],
      },
    ],
  },
  {
    name: "Jewelry & Watches",
    slug: "jewelry-watches",
    icon: "jewelry",
    displayOrder: 16,
    minimumCommissionRate: 8,
    description: "Jewelry, watches, eyewear, and premium personal accessories.",
    children: [
      {
        name: "Jewelry",
        slug: "jewelry",
        children: [
          { name: "Fashion Jewelry", slug: "fashion-jewelry" },
          { name: "Fine Jewelry", slug: "fine-jewelry" },
          { name: "Gold-Plated Jewelry", slug: "gold-plated-jewelry" },
          { name: "Bridal Jewelry", slug: "bridal-jewelry" },
          { name: "Religious Jewelry", slug: "religious-jewelry" },
        ],
      },
      {
        name: "Watches",
        slug: "jewelry-watches-products",
        children: [
          { name: "Men's Watches", slug: "jewelry-mens-watches" },
          { name: "Women's Watches", slug: "jewelry-womens-watches" },
          { name: "Couple Watches", slug: "couple-watches" },
          { name: "Watch Accessories", slug: "watch-accessories" },
        ],
      },
      {
        name: "Eyewear & Accessories",
        slug: "eyewear-accessories",
        children: [
          { name: "Sunglasses & Eyewear", slug: "sunglasses-eyewear" },
          { name: "Jewelry Boxes", slug: "jewelry-boxes" },
          { name: "Gift Accessories", slug: "jewelry-gift-accessories" },
        ],
      },
    ],
  },
  {
    name: "Sports & Outdoors",
    slug: "sports-outdoors",
    icon: "sports",
    displayOrder: 17,
    minimumCommissionRate: 7,
    description: "Sports gear, fitness equipment, outdoor products, and active lifestyle essentials.",
    children: [
      {
        name: "Cricket",
        slug: "cricket-gear",
        children: [
          { name: "Cricket Bats", slug: "cricket-bats" },
          { name: "Cricket Balls", slug: "cricket-balls" },
          { name: "Cricket Protective Gear", slug: "cricket-protective-gear" },
          { name: "Cricket Kits", slug: "cricket-kits" },
        ],
      },
      {
        name: "Football",
        slug: "football-gear",
        children: [
          { name: "Footballs", slug: "footballs" },
          { name: "Football Jerseys", slug: "football-jerseys" },
          { name: "Goalkeeper Gear", slug: "goalkeeper-gear" },
          { name: "Training Cones & Nets", slug: "training-cones-nets" },
        ],
      },
      {
        name: "Badminton & Indoor Sports",
        slug: "badminton-indoor-sports",
        children: [
          { name: "Badminton Rackets", slug: "badminton-rackets" },
          { name: "Shuttlecocks", slug: "shuttlecocks" },
          { name: "Table Tennis", slug: "table-tennis" },
          { name: "Carrom & Chess", slug: "carrom-chess" },
        ],
      },
      {
        name: "Fitness",
        slug: "fitness-equipment",
        children: [
          { name: "Dumbbells & Weights", slug: "dumbbells-weights" },
          { name: "Yoga Mats", slug: "yoga-mats" },
          { name: "Resistance Bands", slug: "resistance-bands" },
          { name: "Exercise Machines", slug: "exercise-machines" },
        ],
      },
      {
        name: "Cycling & Outdoors",
        slug: "cycling-outdoors",
        children: [
          { name: "Bicycles", slug: "bicycles" },
          { name: "Cycling Accessories", slug: "cycling-accessories" },
          { name: "Camping Gear", slug: "camping-gear" },
          { name: "Outdoor Recreation", slug: "outdoor-recreation" },
        ],
      },
    ],
  },
  {
    name: "Toys & Games",
    slug: "toys-games",
    icon: "toys",
    displayOrder: 18,
    minimumCommissionRate: 6,
    description: "Educational toys, board games, collectibles, and gaming products for all ages.",
    children: [
      {
        name: "Learning Toys",
        slug: "learning-toys",
        children: [
          { name: "STEM Toys", slug: "stem-toys" },
          { name: "Building Blocks", slug: "building-blocks" },
          { name: "Puzzles", slug: "puzzles" },
          { name: "Activity Toys", slug: "activity-toys" },
        ],
      },
      {
        name: "Games",
        slug: "board-games-puzzles",
        children: [
          { name: "Board Games", slug: "board-games" },
          { name: "Card Games", slug: "card-games" },
          { name: "Strategy Games", slug: "strategy-games" },
          { name: "Party Games", slug: "party-games" },
        ],
      },
      {
        name: "Pretend Play & Collectibles",
        slug: "pretend-play-collectibles",
        children: [
          { name: "Dolls & Action Figures", slug: "dolls-action-figures" },
          { name: "Toy Vehicles", slug: "toy-vehicles" },
          { name: "Role Play Sets", slug: "role-play-sets" },
          { name: "Collectible Toys", slug: "collectible-toys" },
        ],
      },
      {
        name: "Remote Control & Digital Games",
        slug: "remote-control-digital-games",
        children: [
          { name: "Remote Control Toys", slug: "remote-control-toys" },
          { name: "Video Games", slug: "video-games" },
          { name: "Consoles & Accessories", slug: "consoles-accessories" },
        ],
      },
    ],
  },
  {
    name: "Automotive & Bike",
    slug: "automotive-bike",
    icon: "car",
    displayOrder: 19,
    minimumCommissionRate: 5,
    description: "Motorbike, bicycle, car accessories, safety gear, and maintenance products.",
    children: [
      {
        name: "Motorbike Accessories",
        slug: "new-bike-accessories",
        children: [
          { name: "Bike Helmets", slug: "bike-helmets" },
          { name: "Bike Covers", slug: "bike-covers" },
          { name: "Bike Lights", slug: "bike-lights" },
          { name: "Bike Locks", slug: "bike-locks" },
        ],
      },
      {
        name: "Car Accessories",
        slug: "car-accessories",
        children: [
          { name: "Car Interior Accessories", slug: "car-interior-accessories" },
          { name: "Car Exterior Accessories", slug: "car-exterior-accessories" },
          { name: "Car Electronics", slug: "car-electronics" },
          { name: "Car Care", slug: "car-care" },
        ],
      },
      {
        name: "Safety Gear",
        slug: "helmets-safety-gear",
        children: [
          { name: "Helmets", slug: "helmets" },
          { name: "Riding Gloves", slug: "riding-gloves" },
          { name: "Protective Jackets", slug: "protective-jackets" },
          { name: "Rain Gear", slug: "riding-rain-gear" },
        ],
      },
      {
        name: "Maintenance",
        slug: "vehicle-maintenance",
        children: [
          { name: "Oils & Fluids", slug: "oils-fluids" },
          { name: "Tyres & Tubes", slug: "tyres-tubes" },
          { name: "Batteries", slug: "vehicle-batteries" },
          { name: "Vehicle Tools", slug: "vehicle-tools-maintenance" },
        ],
      },
    ],
  },
  {
    name: "Tools, Hardware & Garden",
    slug: "tools-hardware-garden",
    icon: "tools",
    displayOrder: 20,
    minimumCommissionRate: 6,
    description: "Power tools, hardware, electrical supplies, plumbing items, and garden products.",
    children: [
      {
        name: "Power Tools",
        slug: "power-tools",
        children: [
          { name: "Drills", slug: "drills" },
          { name: "Saws & Cutters", slug: "saws-cutters" },
          { name: "Grinders", slug: "grinders" },
          { name: "Tool Kits", slug: "power-tool-kits" },
        ],
      },
      {
        name: "Hand Tools",
        slug: "hand-tools",
        children: [
          { name: "Screwdrivers", slug: "screwdrivers" },
          { name: "Wrenches", slug: "wrenches" },
          { name: "Hammers", slug: "hammers" },
          { name: "Measuring Tools", slug: "measuring-tools" },
        ],
      },
      {
        name: "Hardware & Supplies",
        slug: "hardware-supplies",
        children: [
          { name: "Electrical Supplies", slug: "electrical-supplies" },
          { name: "Plumbing Supplies", slug: "plumbing-supplies" },
          { name: "Fasteners", slug: "fasteners" },
          { name: "Paint & Repair", slug: "paint-repair" },
        ],
      },
      {
        name: "Garden",
        slug: "garden",
        children: [
          { name: "Garden Tools", slug: "garden-tools" },
          { name: "Seeds & Plants", slug: "seeds-plants" },
          { name: "Pots & Planters", slug: "pots-planters" },
          { name: "Watering Supplies", slug: "watering-supplies" },
        ],
      },
    ],
  },
  {
    name: "Pet Supplies",
    slug: "pet-supplies",
    icon: "pet",
    displayOrder: 21,
    minimumCommissionRate: 6,
    description: "Food, grooming, toys, beds, and essentials for pets.",
    children: [
      {
        name: "Pet Food",
        slug: "pet-food",
        children: [
          { name: "Cat Food", slug: "cat-food" },
          { name: "Dog Food", slug: "dog-food" },
          { name: "Bird Food", slug: "bird-food" },
          { name: "Fish Food", slug: "pet-fish-food" },
        ],
      },
      {
        name: "Pet Care",
        slug: "pet-care",
        children: [
          { name: "Dog Supplies", slug: "dog-supplies" },
          { name: "Cat Supplies", slug: "cat-supplies" },
          { name: "Bird & Fish Supplies", slug: "bird-fish-supplies" },
          { name: "Pet Grooming & Hygiene", slug: "pet-grooming-hygiene" },
        ],
      },
      {
        name: "Pet Comfort & Play",
        slug: "pet-comfort-play",
        children: [
          { name: "Pet Beds & Carriers", slug: "pet-beds-carriers" },
          { name: "Pet Toys", slug: "pet-toys" },
          { name: "Collars & Leashes", slug: "collars-leashes" },
          { name: "Pet Bowls & Feeders", slug: "pet-bowls-feeders" },
        ],
      },
    ],
  },
  {
    name: "Books, Media & Learning",
    slug: "books-media-learning",
    icon: "book",
    displayOrder: 22,
    minimumCommissionRate: 5,
    description: "Books, exam guides, learning kits, religious titles, and media products.",
    children: [
      {
        name: "Books",
        slug: "books",
        children: [
          { name: "Academic Books", slug: "learning-academic-books" },
          { name: "Exam Prep Guides", slug: "exam-prep-guides" },
          { name: "Children's Learning Books", slug: "children-learning-books" },
          { name: "Religious & Spiritual Books", slug: "religious-spiritual-books" },
          { name: "Novels & Literature", slug: "novels-literature" },
        ],
      },
      {
        name: "Learning Materials",
        slug: "learning-materials",
        children: [
          { name: "Educational Kits", slug: "educational-kits" },
          { name: "Language Learning", slug: "learning-language-learning" },
          { name: "Skill Development", slug: "skill-development" },
          { name: "Online Course Materials", slug: "online-course-materials" },
        ],
      },
      {
        name: "Media",
        slug: "media",
        children: [
          { name: "Music & Movies", slug: "music-movies-media" },
          { name: "Magazines", slug: "magazines" },
          { name: "Digital Learning Files", slug: "digital-learning-files" },
        ],
      },
    ],
  },
  {
    name: "Luggage & Travel",
    slug: "luggage-travel",
    icon: "travel",
    displayOrder: 23,
    minimumCommissionRate: 7,
    description: "Suitcases, backpacks, travel organizers, laptop bags, and trip accessories.",
    children: [
      {
        name: "Luggage",
        slug: "luggage",
        children: [
          { name: "Suitcases", slug: "suitcases" },
          { name: "Trolley Bags", slug: "trolley-bags" },
          { name: "Duffel Bags", slug: "duffel-bags" },
          { name: "Travel Sets", slug: "travel-sets" },
        ],
      },
      {
        name: "Bags",
        slug: "travel-bags",
        children: [
          { name: "Backpacks", slug: "backpacks-travel" },
          { name: "Laptop Bags & Sleeves", slug: "laptop-bags-sleeves" },
          { name: "Messenger Bags", slug: "messenger-bags" },
          { name: "Waist Bags", slug: "waist-bags" },
        ],
      },
      {
        name: "Travel Accessories",
        slug: "travel-accessories",
        children: [
          { name: "Travel Organizers", slug: "travel-organizers" },
          { name: "Neck Pillows & Eye Masks", slug: "neck-pillows-eye-masks" },
          { name: "Locks & Tags", slug: "locks-tags" },
          { name: "Travel Bottles", slug: "travel-bottles" },
        ],
      },
    ],
  },
];

function flattenTree(nodes, parentId = null, level = 0) {
  const rows = [];

  nodes.forEach((node, index) => {
    const { children = [], ...category } = node;
    const row = {
      ...category,
      parentId,
      isActive: true,
      commissionRate: category.commissionRate || 0,
      minimumCommissionRate: category.minimumCommissionRate || 0,
      attributes: category.attributes || [],
      description: category.description || `Shop ${category.name}`,
      displayOrder: category.displayOrder ?? index + 1,
      level,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    rows.push({ row, children });
  });

  return rows;
}

async function insertTree(collection, nodes, parentId = null, level = 0) {
  for (const { row, children } of flattenTree(nodes, parentId, level)) {
    const result = await collection.insertOne(row);
    if (children.length > 0) {
      await insertTree(collection, children, result.insertedId, level + 1);
    }
  }
}

function displayTree(categories, parentId = null, level = 0) {
  const children = categories.filter((category) => {
    const categoryParentId = category.parentId ? category.parentId.toString() : null;
    const compareParentId = parentId ? parentId.toString() : null;
    return categoryParentId === compareParentId;
  });

  children.forEach((category) => {
    console.log(`${"  ".repeat(level)}- ${category.name} (${category.slug})`);
    displayTree(categories, category._id, level + 1);
  });
}

async function seedCategories() {
  let client;

  try {
    client = createMongoClient();
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db(dbName);
    const collection = db.collection("categories");

    await collection.deleteMany({});
    console.log("Cleared existing categories");

    await insertTree(collection, categoryTree);

    const allCategories = await collection.find({}).sort({ displayOrder: 1, name: 1 }).toArray();
    console.log(`Inserted ${allCategories.length} categories`);
    console.log("\nCategory Tree:");
    displayTree(allCategories);
    console.log("\nCategory seeding completed successfully");
  } catch (error) {
    console.error("Error seeding categories:", error);
    process.exitCode = 1;
  } finally {
    if (client) await client.close();
  }
}

if (require.main === module) {
  seedCategories();
}

module.exports = {
  categoryTree,
  flattenTree,
  insertTree,
};
