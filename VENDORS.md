# Vendor System Documentation

## Overview
BazarBD is a multi-vendor e-commerce marketplace where vendors can register, manage their stores, and sell products. This document provides comprehensive information about the vendor system.

---

## Table of Contents
1. [Vendor Registration](#vendor-registration)
2. [Vendor Dashboard](#vendor-dashboard)
3. [Vendor Store Features](#vendor-store-features)
4. [Product Management](#product-management)
5. [Order Management](#order-management)
6. [Finance & Payouts](#finance--payouts)
7. [Customer Interaction](#customer-interaction)
8. [Vendor Settings](#vendor-settings)
9. [Commission System](#commission-system)
10. [API Endpoints](#api-endpoints)

---

## Vendor Registration

### Registration Process
1. Navigate to `/vendor/register`
2. Fill in required information:
   - Shop Name
   - Phone Number
   - Address (Division, District, Upazila, Details)
   - Select allowed categories
   - Payment method (optional)

### Approval Workflow
- Status: `pending` → `approved` / `rejected` / `suspended`
- Admin reviews and approves vendor applications
- Upon approval, user role changes from `customer` to `vendor`
- Vendors can only sell products in their approved categories

### Database Structure
```javascript
{
  _id: ObjectId,
  ownerUserId: ObjectId,
  shopName: String,
  slug: String (unique),
  phone: String,
  email: String,
  address: {
    divisionId: String,
    districtId: String,
    upazilaId: String,
    unionId: String,
    details: String
  },
  logo: String (URL or base64),
  banner: String (URL or base64),
  description: String,
  allowedCategoryIds: [ObjectId],
  status: "pending" | "approved" | "rejected" | "suspended",
  verificationLevel: "basic" | "verified" | "premium",
  payoutMethod: String,
  followerCount: Number,
  responseRate: Number,
  responseTime: String,
  rating: Number,
  totalReviews: Number,
  totalProducts: Number,
  totalSales: Number,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Vendor Dashboard

### Dashboard Features
- **Analytics Overview**
  - Total sales
  - Total orders
  - Total products
  - Revenue statistics
  - Order trends

- **Quick Actions**
  - Add new product
  - View orders
  - Manage inventory
  - View messages
  - Check payouts

- **Recent Activity**
  - Latest orders
  - Recent reviews
  - Customer questions
  - Low stock alerts

### Access
- Route: `/vendor/dashboard`
- Protected by vendor role authentication
- Real-time statistics and updates

---

## Vendor Store Features

### Public Store Page
- Route: `/vendor/:vendorId/products`
- Daraz-style design with orange theme (#F57224)

### Store Components

#### 1. Store Header
- Banner image (1200x300px recommended)
- Vendor logo (200x200px recommended)
- Shop name with verified badge
- Location information
- Shop description
- Action buttons: "Chat Now" and "Follow Store"

#### 2. Store Statistics
- ⭐ Rating and reviews count
- 📦 Total products
- 🛍️ Total sales
- 👥 Follower count
- ⏱️ Response time
- ✅ Response rate

#### 3. Contact Information
- Phone number (clickable)
- Email address (clickable)
- Full address

#### 4. Product Filters
- Category filter with product counts
- Sort options:
  - Newest First
  - Most Popular
  - Price: Low to High
  - Price: High to Low
  - Highest Rated

#### 5. Product Grid
- Responsive layout (2/3/4 columns)
- Product cards with images, prices, ratings
- Quick view and add to cart

### Follow Store Feature
- Users can follow/unfollow stores
- Follower count updates in real-time
- Followers receive notifications when vendor uploads new products
- Follow status persisted in user profile

---

## Product Management

### Adding Products
- Route: `/vendor/add-product`
- Dynamic form based on selected category
- Category-specific fields (e.g., Pet Supplies, Electronics)
- Image upload support (multiple images)
- Variant management (size, color, etc.)
- Stock tracking
- Pricing and discounts

### Product Approval
- Products require admin approval before going live
- Status: `pending` → `approved` / `rejected`
- Vendors can edit pending/rejected products

### Inventory Management
- Real-time stock tracking
- Low stock alerts
- Bulk import/export
- Stock movement history
- Variant-level inventory

### Product Features
- Multiple images
- Product variants (size, color, etc.)
- Category-specific attributes
- SEO-friendly URLs
- Product reviews and ratings
- Q&A section

---

## Order Management

### Order Dashboard
- Route: `/vendor/orders`
- Filter by status: pending, processing, shipped, delivered, cancelled
- Search by order ID or customer name
- Bulk actions

### Order Processing
1. **New Order** - Customer places order
2. **Processing** - Vendor confirms and prepares
3. **Shipped** - Vendor ships with tracking
4. **Delivered** - Customer receives order
5. **Completed** - Order finalized

### Order Details
- Customer information
- Shipping address
- Product details
- Payment status
- Commission breakdown
- Vendor earnings

### Returns & Refunds
- Return request management
- Refund processing
- Return reasons tracking
- Admin oversight

---

## Finance & Payouts

### Commission System
- Admin sets commission rate per category
- Commission calculated on each sale
- Formula: `vendorEarning = itemTotal - (itemTotal × commissionRate)`

### Financial Dashboard
- Route: `/vendor/finance`
- **Summary Cards:**
  - Gross Sales
  - Total Commission
  - Net Earnings
  - Pending Payouts

### Transaction History
- Detailed transaction list
- Filter by date range
- Export to CSV
- Commission breakdown per order

### Payout Management
- Payout requests
- Payment method selection
- Payout history
- Pending/completed status

### Financial Reports
- Sales analytics
- Revenue trends
- Commission reports
- Tax documentation

---

## Customer Interaction

### 1. Messaging System
- Route: `/vendor/messages`
- Real-time chat with customers
- **Features:**
  - Text messages
  - Image attachments (up to 5MB)
  - Automatic image compression
  - Unread message badges
  - Search conversations
  - Message history

### 2. Product Reviews
- Vendor can reply to reviews
- Replies highlighted with "Seller" badge (orange)
- Review management dashboard
- Rating analytics

### 3. Product Q&A
- Customers ask questions on product pages
- Vendor answers highlighted with "Seller" badge
- Q&A management interface
- Helpful/not helpful voting

### 4. Vendor Info Component
- Displayed on product detail pages
- Shows vendor profile, rating, response time
- "Visit Store" and "Chat" buttons
- Recent reviews preview

---

## Vendor Settings

### Profile Settings
- Route: `/vendor/settings`
- Daraz-style interface with orange theme

### Configurable Settings

#### 1. Store Branding
- **Logo Upload**
  - Square format (200x200px recommended)
  - Preview before upload
  - Base64 storage (production: use cloud storage)

- **Banner Upload**
  - Wide format (1200x300px recommended)
  - Drag & drop support
  - Preview before upload

#### 2. Store Information
- Shop name
- Bio/Description (500 characters max)
- Contact phone
- Contact email

#### 3. Location Information
- Street address
- City/District
- State/Division
- Zip code
- Country

#### 4. Payment Settings
- Payout method selection
- Bank account details
- Mobile banking info

#### 5. Notification Preferences
- Email notifications
- SMS alerts
- Push notifications

---

## Commission System

### How It Works
1. Admin sets commission rate per category (e.g., 10%)
2. When customer orders, commission is calculated:
   ```
   Item Total = Price × Quantity
   Admin Commission = Item Total × Commission Rate
   Vendor Earning = Item Total - Admin Commission
   ```
3. Commission stored in order item for tracking
4. Vendor sees net earnings in finance dashboard

### Commission Rates
- Set per category by admin
- Default: 10%
- Can be customized per vendor (future feature)
- Transparent calculation shown to vendors

### Example Calculation
```
Product Price: ৳1000
Quantity: 2
Item Total: ৳2000
Commission Rate: 10%
Admin Commission: ৳200
Vendor Earning: ৳1800
```

---

## API Endpoints

### Vendor Registration & Profile
```
POST   /api/vendors/register          - Register new vendor
GET    /api/vendors/my-profile        - Get current vendor profile
PUT    /api/vendors/profile           - Update vendor profile
GET    /api/vendors/:id/public        - Get public vendor info
POST   /api/vendors/upload-logo       - Upload vendor logo
POST   /api/vendors/upload-banner     - Upload vendor banner
```

### Vendor Products
```
GET    /api/vendor/products           - Get vendor's products
POST   /api/vendor/products           - Add new product
PUT    /api/vendor/products/:id       - Update product
DELETE /api/vendor/products/:id       - Delete product
GET    /api/vendor/categories         - Get allowed categories
```

### Vendor Orders
```
GET    /api/vendor/orders             - Get vendor's orders
GET    /api/vendor/orders/:id         - Get order details
PUT    /api/vendor/orders/:id/status  - Update order status
```

### Vendor Finance
```
GET    /api/vendors/finance/summary   - Get financial summary
GET    /api/vendors/finance/transactions - Get transaction history
POST   /api/vendors/finance/payout    - Request payout
GET    /api/vendors/finance/payouts   - Get payout history
```

### Vendor Messaging
```
GET    /api/vendor-chat/vendor        - Get vendor conversations
GET    /api/vendor-chat/conversation/:id/messages - Get messages
POST   /api/vendor-chat/conversation/:id/message  - Send message
PATCH  /api/vendor-chat/conversation/:id/mark-read - Mark as read
```

### Vendor Reviews & Q&A
```
GET    /api/vendor/reviews            - Get vendor's reviews
POST   /api/reviews/:id/vendor-reply  - Reply to review
GET    /api/vendor/my-questions       - Get product questions
POST   /api/questions/:id/answer      - Answer question
```

### Follow System
```
GET    /api/vendors/:id/follow-status - Check follow status
POST   /api/vendors/:id/follow        - Follow vendor
DELETE /api/vendors/:id/unfollow      - Unfollow vendor
```

### Admin Vendor Management
```
GET    /api/admin/vendors             - Get all vendors
GET    /api/admin/vendors/:id         - Get vendor details
PUT    /api/admin/vendors/:id/approve - Approve vendor
PUT    /api/admin/vendors/:id/suspend - Suspend vendor
PUT    /api/admin/vendors/:id/reject  - Reject vendor
PUT    /api/admin/vendors/:id         - Update vendor
GET    /api/admin/vendors/:id/finance - Get vendor finances
```

---

## Best Practices

### For Vendors

1. **Store Setup**
   - Upload high-quality logo and banner
   - Write compelling store description
   - Keep contact information updated
   - Respond to messages within 24 hours

2. **Product Management**
   - Use clear, high-quality product images
   - Write detailed product descriptions
   - Keep inventory updated
   - Set competitive prices
   - Use relevant categories

3. **Customer Service**
   - Respond to questions promptly
   - Reply to reviews professionally
   - Process orders quickly
   - Provide accurate tracking information
   - Handle returns fairly

4. **Financial Management**
   - Monitor sales regularly
   - Track commission rates
   - Request payouts on time
   - Keep payment details updated
   - Review financial reports

### For Administrators

1. **Vendor Approval**
   - Verify vendor information
   - Check category appropriateness
   - Review business credentials
   - Set appropriate commission rates

2. **Monitoring**
   - Track vendor performance
   - Monitor customer complaints
   - Review product quality
   - Check response times
   - Analyze sales data

3. **Support**
   - Provide vendor training
   - Assist with technical issues
   - Resolve disputes fairly
   - Update documentation
   - Gather feedback

---

## Technical Notes

### Image Storage
- Current: Base64 encoding in MongoDB
- Production: Migrate to cloud storage (AWS S3, Cloudinary)
- Image compression: Automatic (max 1200x1200px, 80% quality)
- Size limits: 5MB upload, 10MB payload

### Performance Optimization
- Product queries use aggregation pipelines
- Category names cached in product documents
- Vendor stats calculated on-demand
- Pagination for large datasets

### Security
- JWT authentication required
- Role-based access control
- Vendor can only access own data
- Admin oversight on all operations
- Input validation and sanitization

### Future Enhancements
- Cloud storage for images
- Advanced analytics dashboard
- Automated payout scheduling
- Multi-currency support
- Vendor subscription tiers
- Promotional tools
- Bulk product upload
- API rate limiting
- Webhook notifications

---

## Support

For vendor support:
- Email: vendor-support@bazarbd.com
- Phone: +880-XXX-XXXXXX
- Documentation: https://docs.bazarbd.com
- Help Center: https://help.bazarbd.com

---

## Version History

- **v1.0** - Initial vendor system
- **v1.1** - Added follow store feature
- **v1.2** - Implemented messaging with image support
- **v1.3** - Enhanced vendor store page (Daraz style)
- **v1.4** - Added vendor profile settings
- **v1.5** - Improved commission tracking

---

Last Updated: March 7, 2026
