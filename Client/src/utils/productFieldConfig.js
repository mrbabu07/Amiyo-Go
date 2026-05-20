// Product field configuration by category - Frontend version
// Matches Server/config/productFieldConfig.js

const categoryFieldGroups = {
  clothing: {
    slugPatterns: [
      'clothing', 'fashion', 'tshirts', 'shirts', 'pants', 'jeans', 
      'shoes', 'sarees', 'salwar', 'kurtis', 'western-wear', 'winter-wear'
    ],
    fields: [
      {
        name: 'size',
        label: 'Size',
        type: 'multiselect',
        required: true,
        options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
      },
      {
        name: 'color',
        label: 'Color',
        type: 'multiselect',
        required: true,
        options: ['Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Pink', 'Purple', 'Orange', 'Brown', 'Gray', 'Multicolor'],
      },
      {
        name: 'brand',
        label: 'Brand',
        type: 'text',
        required: false,
      },
      {
        name: 'material',
        label: 'Material',
        type: 'text',
        required: false,
        placeholder: 'e.g., Cotton, Polyester, Silk',
      },
      {
        name: 'gender',
        label: 'Gender',
        type: 'select',
        required: true,
        options: ['Men', 'Women', 'Unisex', 'Boys', 'Girls', 'Baby'],
      },
      {
        name: 'fitType',
        label: 'Fit Type',
        type: 'select',
        required: false,
        options: ['Regular', 'Slim', 'Loose', 'Oversized'],
      },
    ],
  },

  groceries: {
    slugPatterns: [
      'groceries', 'super-shop', 'fresh-produce', 'dairy', 'eggs', 
      'snacks', 'beverages', 'personal-care', 'vegetables', 'fruits',
      'farm-fresh', 'leafy', 'root', 'gourd', 'pumpkin', 'brinjal',
      'okra', 'village-fresh', 'herbs', 'spices', 'food-cupboard',
      'rice', 'grain', 'grains', 'flour', 'baking', 'lentils', 'pulses',
      'oil', 'ghee', 'sugar', 'salt', 'sauces', 'condiments', 'noodles',
      'pasta', 'vermicelli', 'semai', 'macaroni', 'masala', 'fresh-food',
      'meat', 'chicken', 'breakfast', 'bread', 'bakery', 'cereal', 'oats',
      'honey', 'baby-food', 'diapers', 'wipes', 'household', 'cleaning',
      'dishwashing', 'laundry', 'tissue'
    ],
    fields: [
      {
        name: 'weight',
        label: 'Weight/Volume',
        type: 'text',
        required: true,
        placeholder: 'e.g., 500g, 1kg, 1L',
      },
      {
        name: 'unit',
        label: 'Unit',
        type: 'select',
        required: true,
        options: ['kg', 'g', 'L', 'ml', 'piece', 'dozen', 'pack'],
      },
      {
        name: 'brand',
        label: 'Brand',
        type: 'text',
        required: false,
      },
      {
        name: 'expiryDate',
        label: 'Expiry Date',
        type: 'date',
        required: false,
      },
      {
        name: 'ingredients',
        label: 'Ingredients',
        type: 'textarea',
        required: false,
      },
      {
        name: 'nutritionalInfo',
        label: 'Nutritional Information',
        type: 'textarea',
        required: false,
      },
    ],
  },

  freshFish: {
    slugPatterns: [
      'fish', 'seafood', 'prawns', 'shrimp', 'crab', 'dried-fish',
      'river-fish', 'pond-fish', 'sea-fish', 'live-fish', 'fish-fillet'
    ],
    fields: [
      {
        name: 'weight',
        label: 'Weight',
        type: 'text',
        required: true,
        placeholder: 'e.g., 1kg, 500g',
      },
      {
        name: 'fishSource',
        label: 'Source',
        type: 'select',
        required: true,
        options: ['River', 'Pond', 'Sea', 'Farm', 'Imported'],
      },
      {
        name: 'cutType',
        label: 'Cut/Cleaning',
        type: 'select',
        required: false,
        options: ['Whole', 'Cleaned', 'Sliced', 'Fillet', 'Live'],
      },
      {
        name: 'deliveryCondition',
        label: 'Delivery Condition',
        type: 'select',
        required: true,
        options: ['Fresh', 'Chilled', 'Frozen', 'Dried'],
      },
      {
        name: 'catchDate',
        label: 'Catch/Collection Date',
        type: 'date',
        required: false,
      },
    ],
  },

  homemade: {
    slugPatterns: [
      'homemade', 'handmade', 'pitha', 'sweets', 'pickles', 'chutney',
      'ready-meals', 'crafts', 'gift-items', 'natural-oils', 'spice-mixes',
      'organic-soap'
    ],
    fields: [
      {
        name: 'makerName',
        label: 'Maker/Brand Name',
        type: 'text',
        required: false,
      },
      {
        name: 'madeToOrder',
        label: 'Made to Order',
        type: 'select',
        required: true,
        options: ['Yes', 'No'],
      },
      {
        name: 'preparationTime',
        label: 'Preparation Time',
        type: 'text',
        required: false,
        placeholder: 'e.g., 1 day, 3 hours',
      },
      {
        name: 'ingredientsOrMaterials',
        label: 'Ingredients/Materials',
        type: 'textarea',
        required: false,
      },
      {
        name: 'shelfLife',
        label: 'Shelf Life',
        type: 'text',
        required: false,
        placeholder: 'For food items, e.g., 3 days',
      },
    ],
  },

  restaurant: {
    slugPatterns: [
      'restaurant', 'food-ordering', 'meals', 'biriyani', 'tehari',
      'curry', 'bhuna', 'grill', 'bbq', 'set-menu', 'platters',
      'fast-food', 'burgers', 'pizza', 'fried-chicken', 'sandwiches',
      'wraps', 'paratha', 'roti', 'khichuri', 'haleem', 'lunch-box',
      'office-meal', 'school-tiffin', 'event-food', 'desserts', 'lassi',
      'street-food', 'fuchka', 'chotpoti', 'bhelpuri', 'jhalmuri',
      'singara', 'samosa', 'shawarma', 'chowmein'
    ],
    fields: [
      {
        name: 'restaurantName',
        label: 'Restaurant Name',
        type: 'text',
        required: false,
        placeholder: 'e.g., Hnila Food Corner',
      },
      {
        name: 'servingSize',
        label: 'Serving Size',
        type: 'select',
        required: true,
        options: ['1 person', '2 people', '3-4 people', 'Family pack', 'Party pack'],
      },
      {
        name: 'preparationTime',
        label: 'Preparation Time',
        type: 'text',
        required: true,
        placeholder: 'e.g., 20 minutes, 1 hour',
      },
      {
        name: 'foodType',
        label: 'Food Type',
        type: 'select',
        required: true,
        options: ['Ready to eat', 'Pre-order', 'Frozen', 'Bakery', 'Drink'],
      },
      {
        name: 'spiceLevel',
        label: 'Spice Level',
        type: 'select',
        required: false,
        options: ['No spice', 'Mild', 'Medium', 'Spicy', 'Extra spicy'],
      },
      {
        name: 'ingredients',
        label: 'Ingredients',
        type: 'textarea',
        required: false,
      },
      {
        name: 'availableTime',
        label: 'Available Time',
        type: 'text',
        required: false,
        placeholder: 'e.g., 10 AM - 10 PM, Lunch only',
      },
    ],
  },

  resell: {
    slugPatterns: [
      'resell', 'used', 'pre-owned', 'resale', 'second-hand'
    ],
    fields: [
      {
        name: 'condition',
        label: 'Condition',
        type: 'select',
        required: true,
        options: ['Like New', 'Good', 'Fair', 'Needs Repair'],
      },
      {
        name: 'usedDuration',
        label: 'Used Duration',
        type: 'text',
        required: false,
        placeholder: 'e.g., 6 months, 2 years',
      },
      {
        name: 'originalBrand',
        label: 'Original Brand',
        type: 'text',
        required: false,
      },
      {
        name: 'defects',
        label: 'Known Defects',
        type: 'textarea',
        required: false,
      },
      {
        name: 'warrantyOrReceipt',
        label: 'Warranty/Receipt Available',
        type: 'select',
        required: false,
        options: ['Yes', 'No'],
      },
    ],
  },

  electronics: {
    slugPatterns: [
      'electronics', 'digital-devices', 'mobile', 'phones', 'laptops', 
      'computers', 'cameras', 'audio', 'headphones', 'smart-watches',
      'tablet', 'wearable', 'smart-home', 'gadgets'
    ],
    fields: [
      {
        name: 'brand',
        label: 'Brand',
        type: 'text',
        required: true,
      },
      {
        name: 'model',
        label: 'Model',
        type: 'text',
        required: true,
      },
      {
        name: 'warranty',
        label: 'Warranty Period',
        type: 'text',
        required: false,
        placeholder: 'e.g., 1 year, 6 months',
      },
      {
        name: 'condition',
        label: 'Condition',
        type: 'select',
        required: true,
        options: ['New', 'Refurbished', 'Used'],
      },
      {
        name: 'color',
        label: 'Color',
        type: 'multiselect',
        required: false,
        options: ['Black', 'White', 'Silver', 'Gold', 'Blue', 'Red', 'Green', 'Other'],
      },
      {
        name: 'specifications',
        label: 'Technical Specifications',
        type: 'textarea',
        required: false,
        placeholder: 'Key specs like RAM, Storage, Display, etc.',
      },
    ],
  },

  accessories: {
    slugPatterns: [
      'accessories', 'bags', 'luggage', 'watches', 'jewelry', 'sunglasses'
    ],
    fields: [
      {
        name: 'brand',
        label: 'Brand',
        type: 'text',
        required: false,
      },
      {
        name: 'material',
        label: 'Material',
        type: 'text',
        required: false,
        placeholder: 'e.g., Leather, Metal, Plastic',
      },
      {
        name: 'color',
        label: 'Color',
        type: 'multiselect',
        required: false,
        options: ['Black', 'Brown', 'White', 'Silver', 'Gold', 'Blue', 'Red', 'Green', 'Multicolor'],
      },
      {
        name: 'size',
        label: 'Size',
        type: 'text',
        required: false,
        placeholder: 'e.g., One Size, Small, Medium, Large',
      },
      {
        name: 'gender',
        label: 'Gender',
        type: 'select',
        required: false,
        options: ['Men', 'Women', 'Unisex'],
      },
    ],
  },

  babyKids: {
    slugPatterns: [
      'baby', 'kids', 'baby-care', 'baby-clothing', 'kids-clothing'
    ],
    fields: [
      {
        name: 'ageRange',
        label: 'Age Range',
        type: 'text',
        required: true,
        placeholder: 'e.g., 0-6 months, 2-4 years',
      },
      {
        name: 'brand',
        label: 'Brand',
        type: 'text',
        required: false,
      },
      {
        name: 'size',
        label: 'Size',
        type: 'text',
        required: false,
      },
      {
        name: 'color',
        label: 'Color',
        type: 'multiselect',
        required: false,
        options: ['Pink', 'Blue', 'Yellow', 'White', 'Red', 'Green', 'Multicolor'],
      },
      {
        name: 'material',
        label: 'Material',
        type: 'text',
        required: false,
      },
      {
        name: 'safetyInfo',
        label: 'Safety Information',
        type: 'textarea',
        required: false,
      },
    ],
  },

  toysGames: {
    slugPatterns: [
      'toys-games', 'learning-toys', 'toy', 'toys', 'puzzles',
      'board-games', 'card-games', 'dolls', 'action-figures',
      'remote-control', 'video-games', 'consoles'
    ],
    fields: [
      {
        name: 'ageRange',
        label: 'Age Range',
        type: 'text',
        required: true,
        placeholder: 'e.g., 3+ years, 8-12 years',
      },
      {
        name: 'toyType',
        label: 'Toy/Game Type',
        type: 'select',
        required: true,
        options: ['Educational', 'Board Game', 'Outdoor Play', 'Remote Control', 'Collectible', 'Digital Game', 'Other'],
      },
      {
        name: 'material',
        label: 'Material',
        type: 'text',
        required: false,
      },
      {
        name: 'safetyInfo',
        label: 'Safety Information',
        type: 'textarea',
        required: false,
      },
    ],
  },

  sportsOutdoors: {
    slugPatterns: [
      'sports-outdoors', 'cricket', 'football', 'badminton', 'fitness',
      'cycling', 'outdoor-recreation', 'camping', 'yoga', 'dumbbells',
      'exercise-machines', 'table-tennis', 'carrom-chess'
    ],
    fields: [
      {
        name: 'sportType',
        label: 'Sport/Activity',
        type: 'text',
        required: true,
        placeholder: 'e.g., Cricket, Fitness, Cycling',
      },
      {
        name: 'brand',
        label: 'Brand',
        type: 'text',
        required: false,
      },
      {
        name: 'size',
        label: 'Size/Weight',
        type: 'text',
        required: false,
        placeholder: 'e.g., Size 5, 5kg, Adult',
      },
      {
        name: 'material',
        label: 'Material',
        type: 'text',
        required: false,
      },
    ],
  },

  automotive: {
    slugPatterns: [
      'automotive', 'bike-accessories', 'car-accessories', 'bike-helmets',
      'vehicle', 'helmets-safety', 'oils-fluids', 'tyres-tubes',
      'vehicle-batteries', 'car-care', 'riding'
    ],
    fields: [
      {
        name: 'vehicleType',
        label: 'Vehicle Type',
        type: 'select',
        required: true,
        options: ['Motorbike', 'Bicycle', 'Car', 'CNG/Auto', 'Universal'],
      },
      {
        name: 'brand',
        label: 'Brand',
        type: 'text',
        required: false,
      },
      {
        name: 'modelCompatibility',
        label: 'Model Compatibility',
        type: 'text',
        required: false,
        placeholder: 'e.g., Universal, Toyota Corolla, Hero Hunk',
      },
      {
        name: 'warranty',
        label: 'Warranty Period',
        type: 'text',
        required: false,
      },
    ],
  },

  petSupplies: {
    slugPatterns: [
      'pet-supplies', 'pet-food', 'dog', 'cat', 'bird-food',
      'pet-fish-food', 'pet-care', 'pet-grooming', 'pet-beds',
      'pet-toys', 'collars-leashes', 'pet-bowls'
    ],
    fields: [
      {
        name: 'petType',
        label: 'Pet Type',
        type: 'select',
        required: true,
        options: ['Cat', 'Dog', 'Bird', 'Fish', 'Small Pet', 'Other'],
      },
      {
        name: 'weight',
        label: 'Weight/Pack Size',
        type: 'text',
        required: false,
        placeholder: 'e.g., 1kg, 500ml, 12 pcs',
      },
      {
        name: 'brand',
        label: 'Brand',
        type: 'text',
        required: false,
      },
      {
        name: 'expiryDate',
        label: 'Expiry Date',
        type: 'date',
        required: false,
      },
    ],
  },

  toolsGarden: {
    slugPatterns: [
      'tools-hardware-garden', 'power-tools', 'hand-tools', 'hardware',
      'electrical-supplies', 'plumbing-supplies', 'garden', 'drills',
      'saws-cutters', 'grinders', 'screwdrivers', 'wrenches', 'hammers'
    ],
    fields: [
      {
        name: 'toolType',
        label: 'Tool/Use Type',
        type: 'text',
        required: true,
        placeholder: 'e.g., Drill, Garden tool, Electrical supply',
      },
      {
        name: 'brand',
        label: 'Brand',
        type: 'text',
        required: false,
      },
      {
        name: 'powerSource',
        label: 'Power Source',
        type: 'select',
        required: false,
        options: ['Manual', 'Electric', 'Battery', 'Fuel', 'Not applicable'],
      },
      {
        name: 'warranty',
        label: 'Warranty Period',
        type: 'text',
        required: false,
      },
    ],
  },

  booksLearning: {
    slugPatterns: [
      'books-media-learning', 'learning-academic-books', 'exam-prep',
      'children-learning-books', 'religious-spiritual-books', 'novels',
      'learning-materials', 'educational-kits', 'skill-development',
      'music-movies-media', 'magazines', 'digital-learning'
    ],
    fields: [
      {
        name: 'authorOrCreator',
        label: 'Author/Creator',
        type: 'text',
        required: false,
      },
      {
        name: 'language',
        label: 'Language',
        type: 'select',
        required: false,
        options: ['Bangla', 'English', 'Arabic', 'Hindi', 'Urdu', 'Other'],
      },
      {
        name: 'format',
        label: 'Format',
        type: 'select',
        required: true,
        options: ['Paperback', 'Hardcover', 'Digital', 'Audio/Video', 'Kit', 'Other'],
      },
      {
        name: 'edition',
        label: 'Edition/Class',
        type: 'text',
        required: false,
        placeholder: 'e.g., Class 8, 2026 edition',
      },
    ],
  },

  jewelryWatches: {
    slugPatterns: [
      'jewelry-watches', 'fashion-jewelry', 'fine-jewelry',
      'gold-plated-jewelry', 'bridal-jewelry', 'religious-jewelry',
      'watch-accessories', 'sunglasses-eyewear', 'jewelry-boxes'
    ],
    fields: [
      {
        name: 'material',
        label: 'Material',
        type: 'text',
        required: false,
        placeholder: 'e.g., Gold plated, Stainless steel, Alloy',
      },
      {
        name: 'color',
        label: 'Color/Finish',
        type: 'multiselect',
        required: false,
        options: ['Gold', 'Silver', 'Rose Gold', 'Black', 'Brown', 'Multicolor'],
      },
      {
        name: 'gender',
        label: 'Gender',
        type: 'select',
        required: false,
        options: ['Men', 'Women', 'Unisex', 'Kids'],
      },
      {
        name: 'warrantyOrAuthenticity',
        label: 'Warranty/Authenticity',
        type: 'text',
        required: false,
      },
    ],
  },

  travelLuggage: {
    slugPatterns: [
      'luggage-travel', 'suitcases', 'trolley-bags', 'duffel-bags',
      'travel-sets', 'backpacks-travel', 'laptop-bags-sleeves',
      'messenger-bags', 'waist-bags', 'travel-accessories',
      'travel-organizers', 'neck-pillows', 'locks-tags', 'travel-bottles'
    ],
    fields: [
      {
        name: 'capacity',
        label: 'Capacity/Size',
        type: 'text',
        required: false,
        placeholder: 'e.g., 20 inch, 45L, fits 15 inch laptop',
      },
      {
        name: 'material',
        label: 'Material',
        type: 'text',
        required: false,
      },
      {
        name: 'color',
        label: 'Color',
        type: 'multiselect',
        required: false,
        options: ['Black', 'Blue', 'Brown', 'Gray', 'Red', 'Green', 'Multicolor'],
      },
      {
        name: 'warranty',
        label: 'Warranty Period',
        type: 'text',
        required: false,
      },
    ],
  },
};

const categoryFieldPriority = [
  'freshFish',
  'toysGames',
  'babyKids',
  'sportsOutdoors',
  'automotive',
  'petSupplies',
  'toolsGarden',
  'booksLearning',
  'jewelryWatches',
  'travelLuggage',
  'electronics',
  'accessories',
  'groceries',
  'homemade',
  'restaurant',
  'resell',
  'clothing',
];

export function getFieldsForCategory(categorySlug) {
  const normalizedSlug = String(categorySlug || '');
  const orderedConfigs = [
    ...categoryFieldPriority.map((key) => categoryFieldGroups[key]).filter(Boolean),
    ...Object.entries(categoryFieldGroups)
      .filter(([key]) => !categoryFieldPriority.includes(key))
      .map(([, config]) => config),
  ];

  for (const config of orderedConfigs) {
    if (config.slugPatterns.some(pattern => normalizedSlug.includes(pattern))) {
      return config.fields;
    }
  }
  
  // Default fields if no match found
  return [
    {
      name: 'brand',
      label: 'Brand',
      type: 'text',
      required: false,
    },
    {
      name: 'color',
      label: 'Color',
      type: 'text',
      required: false,
    },
  ];
}
