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
      'snacks', 'beverages', 'personal-care'
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

export function getFieldsForCategory(categorySlug) {
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
