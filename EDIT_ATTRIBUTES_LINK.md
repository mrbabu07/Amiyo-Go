# Edit Category Attributes - Complete Setup

## 🎯 What You Get

A dedicated page where admins can edit all attributes for a category.

## 📍 The Link

**URL Pattern:** `/admin/categories/:categoryId/attributes`

**Example:** `/admin/categories/507f1f77bcf86cd799439011/attributes`

## 🚀 How to Access

### Option 1: From Category Card (Easiest)
1. Go to `/admin/categories`
2. Find the category you want to edit
3. Click the **"Attributes"** button (purple button)
4. You'll be taken to the edit attributes page

### Option 2: Direct URL
Navigate directly to: `/admin/categories/{categoryId}/attributes`

Replace `{categoryId}` with the actual category ID.

## 📋 What You Can Do

On the edit attributes page, you can:

✅ **Add New Attributes**
- Enter attribute name (e.g., "RAM")
- Select type (text, number, select, multiselect, checkbox, date)
- Add options for select types
- Mark as required/optional
- Click "Add Attribute"

✅ **Edit Existing Attributes**
- Change attribute name
- Change attribute type
- Toggle required/optional
- Add/remove options
- Changes are saved when you click "Save All Attributes"

✅ **Delete Attributes**
- Click "Delete" button on any attribute
- Attribute is removed from the list

✅ **Save All Changes**
- Click "Save All Attributes" button
- All changes are saved to the database
- You're redirected back to categories list

## 🔧 Setup Instructions

### Step 1: Add Route

In your routing file (e.g., `App.jsx` or `AdminRoutes.jsx`):

```jsx
import AdminEditCategoryAttributes from '@/pages/admin/AdminEditCategoryAttributes';

// Add this route:
<Route 
  path="/admin/categories/:categoryId/attributes" 
  element={<AdminEditCategoryAttributes />} 
/>
```

### Step 2: Verify Navigation

The "Attributes" button on category cards should now work automatically.

### Step 3: Test

1. Go to `/admin/categories`
2. Click "Attributes" on any category
3. You should see the edit attributes page

## 📁 Files Created

- `Client/src/pages/admin/AdminEditCategoryAttributes.jsx` - Main page
- `Client/src/pages/admin/ROUTE_SETUP.md` - Route setup guide

## 🎨 Page Layout

```
┌─────────────────────────────────────────────────────────┐
│ Edit Category Attributes                    [← Back]    │
│ Category: Electronics                                   │
└─────────────────────────────────────────────────────────┘

┌──────────────────────────┐  ┌──────────────────────────┐
│  Add New Attribute       │  │  Existing Attributes (3) │
│                          │  │                          │
│ Name: [________]         │  │ 1. RAM                   │
│ Type: [Select ▼]         │  │    Type: Select          │
│ ☑ Required               │  │    [Edit fields...]      │
│                          │  │    [Delete]              │
│ Options:                 │  │                          │
│ [Add option] [Add]       │  │ 2. Storage               │
│ [8GB] [16GB] [32GB]      │  │    Type: Select          │
│                          │  │    [Edit fields...]      │
│ [+ Add Attribute]        │  │    [Delete]              │
└──────────────────────────┘  │                          │
                              │ 3. Processor             │
                              │    Type: Text            │
                              │    [Edit fields...]      │
                              │    [Delete]              │
                              └──────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ [Cancel]                    [Save All Attributes]       │
└─────────────────────────────────────────────────────────┘
```

## 🔗 Navigation Flow

```
Categories List (/admin/categories)
    ↓
Click "Attributes" button
    ↓
Edit Attributes Page (/admin/categories/:categoryId/attributes)
    ↓
Add/Edit/Delete Attributes
    ↓
Click "Save All Attributes"
    ↓
Back to Categories List
```

## 💡 Features

### Left Panel (Sticky)
- Add new attributes
- Form stays visible while scrolling
- Quick access to add functionality

### Right Panel
- View all existing attributes
- Edit each attribute inline
- Delete attributes
- See attribute count

### Responsive Design
- Works on mobile, tablet, desktop
- Stacks on smaller screens
- Touch-friendly buttons

## 🧪 Testing

### Test Adding Attribute
1. Go to edit attributes page
2. Enter name: "Color"
3. Select type: "Select"
4. Add options: Red, Blue, Black
5. Check "Required"
6. Click "Add Attribute"
7. Should appear in the list

### Test Editing Attribute
1. Find an existing attribute
2. Change the name
3. Change the type
4. Click "Save All Attributes"
5. Should be updated

### Test Deleting Attribute
1. Click "Delete" on an attribute
2. Attribute should be removed
3. Click "Save All Attributes"
4. Should be deleted from database

## ⚙️ API Endpoints

The page uses these endpoints:

```
GET    /api/dynamic-categories/:categoryId
PUT    /api/dynamic-categories/:categoryId
```

Both require:
- Valid JWT token
- Admin role

## 🐛 Troubleshooting

### "Attributes" button not showing?
- Make sure CategoryCard component is updated
- Check browser console for errors

### Can't navigate to edit page?
- Verify route is added to routing configuration
- Check URL format: `/admin/categories/{categoryId}/attributes`
- Verify categoryId is valid

### Can't save attributes?
- Check browser console for errors
- Verify authentication token is valid
- Verify admin role is set
- Check API endpoint is working

### Attributes not loading?
- Check browser console for errors
- Verify categoryId in URL is correct
- Check API response in Network tab

## 📚 Documentation

See these files for more details:
- `ROUTE_SETUP.md` - Complete route setup guide
- `TESTING_ATTRIBUTES.md` - Testing guide
- `README_CATEGORIES.md` - Category management overview

## ✅ Checklist

- [ ] Route added to routing configuration
- [ ] Can navigate to `/admin/categories`
- [ ] "Attributes" button visible on category cards
- [ ] Can click "Attributes" button
- [ ] Edit attributes page loads
- [ ] Can add new attributes
- [ ] Can edit existing attributes
- [ ] Can delete attributes
- [ ] Can save all changes
- [ ] Changes persist after refresh
- [ ] Works on mobile
- [ ] No console errors

## 🎉 You're All Set!

The edit attributes page is ready to use. Just add the route and start managing category attributes!

**Quick Link:** `/admin/categories/:categoryId/attributes`
