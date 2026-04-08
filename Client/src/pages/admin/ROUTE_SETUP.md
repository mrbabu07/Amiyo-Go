# Setting Up Routes for Category Management

## Routes to Add

Add these routes to your admin routing configuration:

### In your main App.jsx or routing file:

```jsx
import AdminDynamicCategories from '@/pages/admin/AdminDynamicCategories';
import AdminEditCategoryAttributes from '@/pages/admin/AdminEditCategoryAttributes';

// Add these routes:
<Route path="/admin/categories" element={<AdminDynamicCategories />} />
<Route path="/admin/categories/:categoryId/attributes" element={<AdminEditCategoryAttributes />} />
```

### Or if using nested routes:

```jsx
<Route path="/admin" element={<AdminLayout />}>
  <Route path="categories" element={<AdminDynamicCategories />} />
  <Route path="categories/:categoryId/attributes" element={<AdminEditCategoryAttributes />} />
</Route>
```

## Navigation Links

### In your admin sidebar or navigation:

```jsx
<Link to="/admin/categories" className="...">
  📁 Categories
</Link>
```

## How It Works

### Main Categories Page
- **URL:** `/admin/categories`
- **Component:** `AdminDynamicCategories.jsx`
- **Features:**
  - View all categories
  - Search categories
  - Create new category
  - Edit category details
  - Delete category
  - View category details

### Edit Attributes Page
- **URL:** `/admin/categories/:categoryId/attributes`
- **Component:** `AdminEditCategoryAttributes.jsx`
- **Features:**
  - Add new attributes
  - Edit existing attributes
  - Delete attributes
  - Change attribute type
  - Add/remove options
  - Mark as required/optional

## User Flow

```
1. Admin goes to /admin/categories
   ↓
2. Sees list of categories with "Attributes" button
   ↓
3. Clicks "Attributes" button on a category
   ↓
4. Goes to /admin/categories/{categoryId}/attributes
   ↓
5. Can add/edit/delete attributes
   ↓
6. Clicks "Save All Attributes"
   ↓
7. Returns to /admin/categories
```

## Button Locations

### On Category Card:
```
[View Details] [Edit] [Attributes] [Delete]
```

- **View Details** - Opens modal with category info
- **Edit** - Opens form to edit category details
- **Attributes** - Opens dedicated page to manage attributes
- **Delete** - Deletes the category

## Complete Example

Here's a complete example of how to set up your routing:

```jsx
// App.jsx or AdminRoutes.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AdminLayout from '@/layouts/AdminLayout';
import AdminDynamicCategories from '@/pages/admin/AdminDynamicCategories';
import AdminEditCategoryAttributes from '@/pages/admin/AdminEditCategoryAttributes';
import AdminDynamicProducts from '@/pages/admin/AdminDynamicProducts';

function AdminRoutes() {
  return (
    <Routes>
      <Route path="/admin" element={<AdminLayout />}>
        {/* Category Management */}
        <Route path="categories" element={<AdminDynamicCategories />} />
        <Route 
          path="categories/:categoryId/attributes" 
          element={<AdminEditCategoryAttributes />} 
        />
        
        {/* Product Management */}
        <Route path="products" element={<AdminDynamicProducts />} />
        
        {/* Other admin routes */}
      </Route>
    </Routes>
  );
}

export default AdminRoutes;
```

## Testing the Routes

1. Navigate to `/admin/categories`
2. You should see the category list
3. Click "Attributes" button on any category
4. You should see the edit attributes page
5. Add/edit/delete attributes
6. Click "Save All Attributes"
7. You should return to the categories list

## Troubleshooting

### Route not found?
- Make sure you added the route to your routing configuration
- Check the path matches exactly: `/admin/categories/:categoryId/attributes`
- Verify the component is imported correctly

### Attributes button not working?
- Check browser console for errors
- Verify the route is set up correctly
- Make sure categoryId is being passed correctly

### Can't save attributes?
- Check browser console for errors
- Verify API endpoint is correct
- Check authentication token is valid
- Verify admin role is set

## API Endpoints Used

The attributes page uses these endpoints:

```
GET    /api/dynamic-categories/:id              # Get category
PUT    /api/dynamic-categories/:id              # Update attributes
```

Both require authentication with admin role.

## Next Steps

1. Add the routes to your routing configuration
2. Test navigation to `/admin/categories`
3. Test clicking "Attributes" button
4. Test adding/editing/deleting attributes
5. Test saving attributes
6. Deploy to production
