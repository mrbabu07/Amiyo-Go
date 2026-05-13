// Product field configuration by category group
// This defines which fields should appear in the product form based on category

const categoryFieldGroups = {
  // Clothing & Fashion categories
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

  // Groceries & Food categories
  groceries: {
    slugPatterns: [
      'groceries', 'super-shop', 'fresh-produce', 'dairy', 'eggs', 
      'snacks', 'beverages', 'personal-care', 'vegetables', 'fruits',
      'farm-fresh', 'leafy', 'root', 'gourd', 'pumpkin', 'brinjal',
      'okra', 'village-fresh', 'herbs', 'spices'
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

  // Electronics & Digital Devices
  electronics: {
    slugPatterns: [
      'electronics', 'digital-devices', 'mobile', 'phones', 'laptops', 
      'computers', 'cameras', 'audio', 'headphones', 'smart-watches'
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

  // Accessories
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

  // Baby & Kids
  babyKids: {
    slugPatterns: [
      'baby', 'kids', 'toys', 'baby-care', 'baby-clothing', 'kids-clothing'
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
};

// Helper function to get field configuration for a category slug
function getFieldsForCategory(categorySlug) {
  for (const [groupName, config] of Object.entries(categoryFieldGroups)) {
    if (config.slugPatterns.some(pattern => categorySlug.includes(pattern))) {
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

// Helper function to validate product attributes against category requirements
function validateProductAttributes(categorySlug, attributes) {
  const fields = getFieldsForCategory(categorySlug);
  const errors = [];

  fields.forEach(field => {
    if (field.required && !attributes[field.name]) {
      errors.push(`${field.label} is required for this category`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

module.exports = {
  categoryFieldGroups,
  getFieldsForCategory,
  validateProductAttributes,
};
