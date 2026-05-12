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

const categoryTree = [
  {
    name: "Men's Fashion",
    slug: "mens-fashion",
    icon: "fashion",
    displayOrder: 1,
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
    displayOrder: 2,
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
    displayOrder: 3,
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
    displayOrder: 4,
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
    displayOrder: 5,
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
    name: "Groceries",
    slug: "groceries",
    icon: "grocery",
    displayOrder: 6,
    minimumCommissionRate: 3,
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
        name: "Baby & Household Grocery",
        slug: "baby-household-grocery",
        children: [
          { name: "Baby Food", slug: "baby-food" },
          { name: "Diapers & Wipes", slug: "diapers-wipes" },
          { name: "Cleaning Supplies", slug: "cleaning-supplies" },
          { name: "Dishwashing", slug: "dishwashing" },
          { name: "Laundry", slug: "laundry" },
        ],
      },
    ],
  },
  {
    name: "Homemade Products",
    slug: "homemade-products",
    icon: "homemade",
    displayOrder: 7,
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
    name: "Resell Market",
    slug: "resell-market",
    icon: "resell",
    displayOrder: 8,
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
    displayOrder: 9,
    minimumCommissionRate: 3,
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
    displayOrder: 10,
    minimumCommissionRate: 2,
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
    displayOrder: 11,
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
    displayOrder: 12,
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
  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("BazarBD");
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
    await client.close();
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
