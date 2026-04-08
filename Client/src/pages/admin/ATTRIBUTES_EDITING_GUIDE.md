# Category Attributes Editing Guide

## 🎯 Quick Start

**URL:** `/admin/categories/:categoryId/attributes`

**Access:** Click "Attributes" button on any category card in `/admin/categories`

## 📖 Step-by-Step Guide

### Step 1: Navigate to Edit Attributes Page

**Option A: From Category List**
1. Go to `/admin/categories`
2. Find the category you want to edit
3. Click the purple **"Attributes"** button
4. You'll be taken to the edit page

**Option B: Direct URL**
- Navigate to: `/admin/categories/507f1f77bcf86cd799439011/attributes`
- Replace the ID with your category ID

### Step 2: Add a New Attribute

**Left Panel - "Add New Attribute"**

1. **Enter Attribute Name**
   - Example: "RAM", "Size", "Color"
   - Required field

2. **Select Type**
   - **Text** - Single line text (e.g., "A17 Pro")
   - **Number** - Numeric value (e.g., 8, 256)
   - **Select** - Dropdown (single choice)
   - **Multiselect** - Multiple choices
   - **Checkbox** - Boolean (true/false)
   - **Date** - Date picker

3. **Add Options (if Select/Multiselect)**
   - Type option name
   - Press Enter or click "Add"
   - Repeat for each option
   - Example for "RAM": 8GB, 16GB, 32GB

4. **Mark as Required (optional)**
   - Check the "Required" checkbox if this attribute must be filled

5. **Click "Add Attribute"**
   - Attribute appears in the right panel

### Step 3: Edit Existing Attributes

**Right Panel - "Existing Attributes"**

Each attribute shows:
- Attribute number and name
- Current type
- Edit fields for each property

**To Edit:**
1. Find the attribute in the right panel
2. Change any field:
   - **Name** - Edit the attribute name
   - **Type** - Change the attribute type
   - **Required** - Toggle required/optional
   - **Options** - Add/remove options (for select types)

3. Changes are temporary until you save

### Step 4: Delete an Attribute

1. Find the attribute in the right panel
2. Click the **"Delete"** button
3. Attribute is removed from the list
4. Click "Save All Attributes" to confirm deletion

### Step 5: Save All Changes

1. Review all changes
2. Click **"Save All Attributes"** button (bottom right)
3. Wait for success message
4. You'll be redirected to categories list

## 🎨 UI Walkthrough

### Left Panel (Sticky)
```
┌─────────────────────────────┐
│ Add New Attribute           │
├─────────────────────────────┤
│                             │
│ Attribute Name *            │
│ [RAM                    ]   │
│                             │
│ Type *                      │
│ [Select                 ▼]  │
│                             │
│ ☑ Required                  │
│                             │
│ Options                     │
│ [Add option] [Add]          │
│ [8GB] [16GB] [32GB]         │
│                             │
│ [+ Add Attribute]           │
│                             │
└─────────────────────────────┘
```

### Right Panel
```
┌──────────────────────────────┐
│ Existing Attributes (3)      │
├──────────────────────────────┤
│                              │
│ 1. RAM                       │
│    Type: Select • Required   │
│    [Delete]                  │
│                              │
│ Name                         │
│ [RAM                     ]   │
│                              │
│ Type                         │
│ [Select                  ▼]  │
│                              │
│ ☑ Required                   │
│                              │
│ Options                      │
│ [8GB] [16GB] [32GB]          │
│                              │
├──────────────────────────────┤
│                              │
│ 2. Storage                   │
│    Type: Select • Required   │
│    [Delete]                  │
│    ...                       │
│                              │
└──────────────────────────────┘
```

## 📝 Examples

### Example 1: Add RAM Attribute

1. **Name:** RAM
2. **Type:** Select
3. **Options:** 8GB, 16GB, 32GB, 64GB
4. **Required:** Yes
5. Click "Add Attribute"

### Example 2: Add Size Attribute

1. **Name:** Size
2. **Type:** Select
3. **Options:** XS, S, M, L, XL, XXL
4. **Required:** Yes
5. Click "Add Attribute"

### Example 3: Add Material Attribute

1. **Name:** Material
2. **Type:** Text
3. **Options:** (none - text type)
4. **Required:** No
5. Click "Add Attribute"

### Example 4: Add Price Attribute

1. **Name:** Price
2. **Type:** Number
3. **Options:** (none - number type)
4. **Required:** Yes
5. Click "Add Attribute"

## 🔄 Editing Workflow

### Scenario: Change "RAM" from Select to Text

1. Find "RAM" in right panel
2. Change Type from "Select" to "Text"
3. Options field disappears
4. Click "Save All Attributes"
5. Change is saved

### Scenario: Add New Option to Existing Attribute

1. Find attribute in right panel
2. Scroll to Options section
3. Options are shown as tags
4. To add: Edit the attribute type to add options
5. Click "Save All Attributes"

### Scenario: Delete Multiple Attributes

1. Click "Delete" on first attribute
2. Click "Delete" on second attribute
3. Click "Delete" on third attribute
4. Click "Save All Attributes" once
5. All deletions are saved

## ⌨️ Keyboard Shortcuts

- **Enter** - Add option when in option input field
- **Tab** - Move between fields
- **Escape** - (Not implemented, use Cancel button)

## 📱 Mobile View

On mobile devices:
- Left panel appears first
- Right panel below
- Buttons stack vertically
- Touch-friendly spacing
- Scroll to see all content

## 🎯 Common Tasks

### Add 5 Attributes to Electronics Category

1. Go to Electronics category
2. Click "Attributes"
3. Add "RAM" (Select: 8GB, 16GB, 32GB)
4. Add "Storage" (Select: 256GB, 512GB, 1TB)
5. Add "Processor" (Text)
6. Add "Screen Size" (Number)
7. Add "Color" (Select: Black, Silver, Gold)
8. Click "Save All Attributes"

### Edit Existing Attribute

1. Find attribute in right panel
2. Change name/type/required
3. Click "Save All Attributes"

### Remove Attribute

1. Click "Delete" on attribute
2. Click "Save All Attributes"

## ✅ Validation

The page validates:
- ✅ Attribute name is required
- ✅ Attribute type is required
- ✅ No duplicate attribute names
- ✅ Options required for select types
- ✅ All changes saved to database

## 🐛 Troubleshooting

### "Attribute name is required"
- Make sure you entered a name before clicking "Add Attribute"

### "Attribute already exists"
- An attribute with that name already exists
- Use a different name

### Changes not saving?
- Check browser console for errors
- Verify authentication token is valid
- Check API endpoint is working

### Page not loading?
- Check URL format: `/admin/categories/{categoryId}/attributes`
- Verify categoryId is valid
- Check browser console for errors

## 🔐 Permissions

- Requires admin role
- Requires valid authentication token
- Only admins can edit attributes

## 📊 Attribute Types Reference

| Type | Input | Example | Use Case |
|------|-------|---------|----------|
| Text | Text box | "A17 Pro" | Processor, Material |
| Number | Number input | 8, 256 | RAM, Storage, Price |
| Select | Dropdown | "8GB" | RAM, Size, Color |
| Multiselect | Multiple checkboxes | ["Red", "Blue"] | Colors, Features |
| Checkbox | Toggle | true/false | Has WiFi, Waterproof |
| Date | Date picker | "2024-01-15" | Release Date, Warranty |

## 💾 Saving

- Changes are temporary until you click "Save All Attributes"
- All changes are saved at once
- You're redirected to categories list after saving
- Success message appears briefly

## 🔄 Workflow Summary

```
1. Navigate to edit page
   ↓
2. Add/Edit/Delete attributes
   ↓
3. Review changes
   ↓
4. Click "Save All Attributes"
   ↓
5. Success message
   ↓
6. Redirect to categories list
```

## 📚 Related Pages

- `/admin/categories` - View all categories
- `/admin/categories/:categoryId/attributes` - Edit attributes (this page)
- `/admin/products` - Manage products

## 🎓 Tips & Tricks

1. **Sticky Left Panel** - Stays visible while scrolling right panel
2. **Quick Add** - Press Enter in option field to add option
3. **Bulk Edit** - Edit multiple attributes before saving
4. **Type Conversion** - Change attribute type anytime
5. **Required Fields** - Mark important attributes as required

## ✨ Best Practices

1. Use clear, descriptive attribute names
2. Mark essential attributes as required
3. Pre-define options for select types
4. Group related attributes together
5. Test with products after creating attributes
6. Document your attribute structure

---

**Ready to edit attributes?** Click the "Attributes" button on any category!
