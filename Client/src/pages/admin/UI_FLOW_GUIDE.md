# Admin Category Management - UI Flow Guide

## Page Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Category Management                    [+ New Category]    │
│  Create and manage product categories with dynamic attributes
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  [Search categories...]                                     │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  Electronics     │  │  Fashion         │  │  Books           │
│  ┌────────────┐  │  │  ┌────────────┐  │  │  ┌────────────┐  │
│  │   Image    │  │  │  │   Image    │  │  │  │   Image    │  │
│  └────────────┘  │  │  └────────────┘  │  │  └────────────┘  │
│                  │  │                  │  │                  │
│  Active ✓        │  │  Active ✓        │  │  Inactive ✗      │
│  Slug: electronics│  │  Slug: fashion   │  │  Slug: books     │
│                  │  │                  │  │                  │
│  4 Attributes    │  │  3 Attributes    │  │  2 Attributes    │
│  [RAM] [Storage] │  │  [Size] [Color]  │  │  [Author] [ISBN] │
│  [Processor]...  │  │  [Material]...   │  │  [Pages]...      │
│                  │  │                  │  │                  │
│  [View Details]  │  │  [View Details]  │  │  [View Details]  │
│  [Edit] [Delete] │  │  [Edit] [Delete] │  │  [Edit] [Delete] │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

## Create/Edit Category Flow

### Step 1: Click "New Category" or "Edit"
```
┌─────────────────────────────────────────────────────────────┐
│  Create New Category                                    [×]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Category Name *                                            │
│  [Electronics                                           ]   │
│                                                             │
│  Slug                                                       │
│  [electronics                                          ]   │
│                                                             │
│  Description                                                │
│  [Electronic devices and gadgets                       ]   │
│  [                                                     ]   │
│  [                                                     ]   │
│                                                             │
│  Image URL                                                  │
│  [https://example.com/electronics.jpg                  ]   │
│                                                             │
│  ☑ Active                                                   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Attributes                                [+ Add Attribute]│
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Attribute 1                                 [Remove]│   │
│  │                                                     │   │
│  │ Attribute Name *                                    │   │
│  │ [RAM                                            ]   │   │
│  │                                                     │   │
│  │ Type *                                              │   │
│  │ [Select                                         ▼] │   │
│  │                                                     │   │
│  │ ☑ Required                                          │   │
│  │                                                     │   │
│  │ Options                                             │   │
│  │ [Add option and press Enter] [Add]                 │   │
│  │ [8GB] [16GB] [32GB] [64GB]                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Attribute 2                                 [Remove]│   │
│  │ ...                                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  [Cancel]                          [Create Category]       │
└─────────────────────────────────────────────────────────────┘
```

## View Details Flow

### Step 1: Click "View Details"
```
┌─────────────────────────────────────────────────────────────┐
│  Electronics                                            [×]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Basic Information                                          │
│                                                             │
│  Name                                                       │
│  Electronics                                                │
│                                                             │
│  Slug                                                       │
│  electronics                                                │
│                                                             │
│  Description                                                │
│  Electronic devices and gadgets                             │
│                                                             │
│  Status                                                     │
│  [Active]                                                   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Attributes (4)                                             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ RAM                                    [Required]   │   │
│  │ Type: Dropdown                         [Order: 0]   │   │
│  │ Options: [8GB] [16GB] [32GB] [64GB]                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Storage                                [Required]   │   │
│  │ Type: Dropdown                         [Order: 1]   │   │
│  │ Options: [256GB] [512GB] [1TB]                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Processor                              [Required]   │   │
│  │ Type: Text                             [Order: 2]   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Screen Size                                         │   │
│  │ Type: Number                           [Order: 3]   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Metadata                                                   │
│                                                             │
│  Created          2024-01-15                                │
│  Updated          2024-01-20                                │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  [Close]                           [Edit Category]         │
└─────────────────────────────────────────────────────────────┘
```

## Search & Filter Flow

### Step 1: Type in Search Box
```
Before:
┌─────────────────────────────────────────────────────────────┐
│  [Search categories...]                                     │
└─────────────────────────────────────────────────────────────┘

After typing "elec":
┌─────────────────────────────────────────────────────────────┐
│  [Search categories... elec]                                │
└─────────────────────────────────────────────────────────────┘

Results:
┌──────────────────┐
│  Electronics     │
│  ...             │
└──────────────────┘
```

## Delete Flow

### Step 1: Click Delete
```
Confirmation Dialog:
┌─────────────────────────────────────────────────────────────┐
│  Confirm Delete                                             │
│                                                             │
│  Are you sure you want to delete this category?             │
│                                                             │
│  [Cancel]                                    [Delete]       │
└─────────────────────────────────────────────────────────────┘
```

### Step 2: Confirm
```
Result:
- Category removed from list
- Success message shown
- Page updates automatically
```

## Attribute Type Selection

### When Type = "Select" or "Multiselect"
```
┌─────────────────────────────────────────────────────────────┐
│ Type *                                                      │
│ [Select                                                 ▼] │
│                                                             │
│ Options                                                     │
│ [Add option and press Enter] [Add]                         │
│ [8GB] [16GB] [32GB] [64GB]                                 │
│                                                             │
│ (Options input appears)                                     │
└─────────────────────────────────────────────────────────────┘
```

### When Type = "Text", "Number", "Date", "Checkbox"
```
┌─────────────────────────────────────────────────────────────┐
│ Type *                                                      │
│ [Text                                                   ▼] │
│                                                             │
│ (No options input)                                          │
└─────────────────────────────────────────────────────────────┘
```

## Loading States

### Initial Load
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    ⟳ Loading categories...                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Form Submission
```
Button changes from:
[Create Category]
to:
[Saving...]
(disabled)
```

## Message States

### Success Message
```
┌─────────────────────────────────────────────────────────────┐
│ ✓ Category created successfully!                            │
└─────────────────────────────────────────────────────────────┘
(Green background, auto-dismisses after 1.5s)
```

### Error Message
```
┌─────────────────────────────────────────────────────────────┐
│ ✗ Category name already exists                              │
└─────────────────────────────────────────────────────────────┘
(Red background, stays until dismissed)
```

## Empty State

### No Categories
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                   No categories found                       │
│                                                             │
│              [Create First Category]                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### No Search Results
```
┌─────────────────────────────────────────────────────────────┐
│  [Search categories... xyz]                                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                   No categories found                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Responsive Behavior

### Desktop (3 columns)
```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Category 1  │  │  Category 2  │  │  Category 3  │
└──────────────┘  └──────────────┘  └──────────────┘
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Category 4  │  │  Category 5  │  │  Category 6  │
└──────────────┘  └──────────────┘  └──────────────┘
```

### Tablet (2 columns)
```
┌──────────────┐  ┌──────────────┐
│  Category 1  │  │  Category 2  │
└──────────────┘  └──────────────┘
┌──────────────┐  ┌──────────────┐
│  Category 3  │  │  Category 4  │
└──────────────┘  └──────────────┘
```

### Mobile (1 column)
```
┌──────────────┐
│  Category 1  │
└──────────────┘
┌──────────────┐
│  Category 2  │
└──────────────┘
┌──────────────┐
│  Category 3  │
└──────────────┘
```

## Keyboard Navigation

- `Tab` - Move between form fields
- `Enter` - Submit form or add option
- `Escape` - Close modal
- `Space` - Toggle checkbox

## Color Scheme

- **Primary Actions**: Blue (#2563EB)
- **Success**: Green (#22C55E)
- **Danger**: Red (#DC2626)
- **Background**: Light Gray (#F9FAFB)
- **Cards**: White (#FFFFFF)
- **Text**: Dark Gray (#111827)
- **Borders**: Light Gray (#E5E7EB)

## Animation & Transitions

- Modal fade-in: 200ms
- Button hover: 150ms
- Message auto-dismiss: 1500ms
- Loading spinner: continuous rotation

## Accessibility Features

- ✅ ARIA labels on all buttons
- ✅ Semantic HTML structure
- ✅ Keyboard navigation support
- ✅ Focus indicators on interactive elements
- ✅ Color contrast ratio 4.5:1
- ✅ Screen reader friendly
- ✅ Form validation messages
- ✅ Error announcements
