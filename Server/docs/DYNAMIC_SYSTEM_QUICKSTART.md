# Dynamic Category & Product System - Quick Start Guide

## Setup

### 1. Models are Already Defined
- `Server/models/DynamicCategory.js`
- `Server/models/DynamicProduct.js`

### 2. Routes are Already Registered
- `POST /api/dynamic-categories` - Create category
- `GET /api/dynamic-categories` - List categories
- `GET /api/dynamic-categories/:id` - Get category
- `PUT /api/dynamic-categories/:id` - Update category
- `DELETE /api/dynamic-categories/:id` - Delete category
- `POST /api/dynamic-categories/:id/attributes` - Add attribute
- `PUT /api/dynamic-categories/:id/attributes/:attributeId` - Update attribute
- `DELETE /api/dynamic-categories/:id/attributes/:attributeId` - Delete attribute

- `POST /api/dynamic-products` - Create product
- `GET /api/dynamic-products` - List products
- `GET /api/dynamic-products/:id` - Get product
- `PUT /api/dynamic-products/:id` - Update product
- `DELETE /api/dynamic-products/:id` - Delete product
- `GET /api/dynamic-products/category/:categoryId` - Get products by category

### 3. React Components Ready to Use

**Admin Components:**
```jsx
import DynamicCategoryForm from '@/components/admin/DynamicCategoryForm';
import DynamicProductForm from '@/components/admin/DynamicProductForm';
```

**Public Components:**
```jsx
import DynamicProductBrowser from '@/components/DynamicProductBrowser';
import DynamicProductCard from '@/components/DynamicProductCard';
```

## Usage Examples

### Create Electronics Category with Attributes

```bash
curl -X POST http://localhost:5000/api/dynamic-categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Electronics",
    "slug": "electronics",
    "description": "Electronic devices and gadgets",
    "attributes": [
      {
        "name": "RAM",
        "type": "select",
        "options": ["4GB", "8GB", "16GB", "32GB"],
        "required": true
      },
      {
        "name": "Storage",
        "type": "select",
        "options": ["128GB", "256GB", "512GB", "1TB"],
        "required": true
      },
      {
        "name": "Processor",
        "type": "text",
        "required": true
      },
      {
        "name": "Screen Size",
        "type": "number",
        "required": false
      }
    ]
  }'
```

### Create Fashion Category with Attributes

```bash
curl -X POST http://localhost:5000/api/dynamic-categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Fashion",
    "slug": "fashion",
    "description": "Clothing and accessories",
    "attributes": [
      {
        "name": "Size",
        "type": "select",
        "options": ["XS", "S", "M", "L", "XL", "XXL"],
        "required": true
      },
      {
        "name": "Material",
        "type": "text",
        "required": true
      },
      {
        "name": "Color",
        "type": "select",
        "options": ["Red", "Blue", "Black", "White", "Green"],
        "required": true
      },
      {
        "name": "Fit",
        "type": "select",
        "options": ["Slim", "Regular", "Loose"],
        "required": false
      }
    ]
  }'
```

### Create Electronics Product

```bash
curl -X POST http://localhost:5000/api/dynamic-products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "iPhone 15 Pro",
    "description": "Latest Apple flagship",
    "price": 999,
    "discountPrice": 899,
    "image": "https://example.com/iphone15.jpg",
    "category": "CATEGORY_ID_HERE",
    "stock": 50,
    "sku": "IPHONE-15-PRO-256",
    "dynamicAttributes": {
      "RAM": "8GB",
      "Storage": "256GB",
      "Processor": "A17 Pro",
      "Screen Size": 6.1
    }
  }'
```

### Create Fashion Product

```bash
curl -X POST http://localhost:5000/api/dynamic-products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Blue Cotton T-Shirt",
    "description": "Comfortable everyday wear",
    "price": 29.99,
    "image": "https://example.com/tshirt.jpg",
    "category": "CATEGORY_ID_HERE",
    "stock": 100,
    "sku": "TSHIRT-BLUE-M",
    "dynamicAttributes": {
      "Size": "M",
      "Material": "100% Cotton",
      "Color": "Blue",
      "Fit": "Regular"
    }
  }'
```

### Get All Categories

```bash
curl http://localhost:5000/api/dynamic-categories
```

### Get Products by Category

```bash
curl http://localhost:5000/api/dynamic-products/category/CATEGORY_ID_HERE?page=1&limit=10
```

### Get Product by Slug

```bash
curl http://localhost:5000/api/dynamic-products/slug/iphone-15-pro
```

## Frontend Integration

### Add to Admin Dashboard

```jsx
// pages/admin/Categories.jsx
import DynamicCategoryForm from '@/components/admin/DynamicCategoryForm';

export default function AdminCategories() {
  return (
    <div>
      <h1>Manage Categories</h1>
      <DynamicCategoryForm />
    </div>
  );
}
```

```jsx
// pages/admin/Products.jsx
import DynamicProductForm from '@/components/admin/DynamicProductForm';

export default function AdminProducts() {
  return (
    <div>
      <h1>Add Product</h1>
      <DynamicProductForm />
    </div>
  );
}
```

### Add to Public Shop

```jsx
// pages/Shop.jsx
import DynamicProductBrowser from '@/components/DynamicProductBrowser';

export default function Shop() {
  return (
    <div>
      <h1>Shop</h1>
      <DynamicProductBrowser />
    </div>
  );
}
```

## Key Features

✅ **Dynamic Attributes**: Define any attributes for any category
✅ **Type Support**: text, number, select, multiselect, checkbox, date
✅ **Validation**: Required/optional attributes
✅ **Ordering**: Control attribute display order
✅ **Pagination**: Built-in pagination for products
✅ **Search**: Search products by name/description
✅ **Filtering**: Filter by category and active status
✅ **Admin Only**: Protected endpoints for category/product management
✅ **Public API**: Read-only endpoints for customers

## Testing Workflow

1. **Create Electronics Category** with RAM, Storage, Processor attributes
2. **Create Fashion Category** with Size, Material, Color attributes
3. **Create iPhone Product** in Electronics with RAM=8GB, Storage=256GB
4. **Create T-Shirt Product** in Fashion with Size=M, Material=Cotton
5. **Browse Products** - See different attributes for each category
6. **View Product Details** - See all dynamic attributes

## Troubleshooting

### Products not showing attributes?
- Verify category ID is correct
- Check dynamicAttributes object is populated
- Ensure category has attributes defined

### Form not loading attributes?
- Check category is selected
- Verify API endpoint is accessible
- Check browser console for errors

### Attributes not saving?
- Verify admin token is valid
- Check attribute type is valid
- Ensure required fields are filled

## Next Steps

1. Add attribute filtering/search
2. Add bulk product import
3. Add attribute templates
4. Add product variants
5. Add attribute value suggestions
6. Add attribute analytics
