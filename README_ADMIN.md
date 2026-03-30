# 👨‍💼 Amiyo-Go - Admin Guide

**Complete guide for administrators managing Amiyo-Go platform**

---

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Dashboard](#dashboard)
- [User Management](#user-management)
- [Vendor Management](#vendor-management)
- [Product Management](#product-management)
- [Category Management](#category-management)
- [Order Management](#order-management)
- [Financial Management](#financial-management)
- [Marketing & Promotions](#marketing--promotions)
- [Content Moderation](#content-moderation)
- [System Configuration](#system-configuration)
- [Reports & Analytics](#reports--analytics)

---

## 🚀 Getting Started

### Admin Access
1. Login with admin credentials
2. You'll see admin dashboard
3. Full platform control available

### Admin Roles
- **Super Admin** - Full access to everything
- **Manager** - Business operations
- **Moderator** - Content moderation
- **Support** - Customer support

### First Steps
1. Review dashboard
2. Check pending approvals
3. Monitor platform health
4. Configure settings
5. Set up categories

---

## 📊 Dashboard

### 1. **Admin Dashboard**
**What it does:** Overview of platform performance

**Dashboard shows:**
- Total revenue
- Total orders
- Active users
- Active vendors
- New registrations
- Pending approvals
- Recent orders
- Top products
- Top vendors
- System health

**How to use:**
1. Go to "Dashboard"
2. See all metrics
3. Click metric for details
4. Export data (optional)

---

### 2. **Real-time Metrics**
**What it does:** Live platform statistics

**Metrics:**
- **Total Revenue** - All-time revenue
- **Today's Revenue** - Today's sales
- **Total Orders** - All orders placed
- **Today's Orders** - Orders today
- **Active Users** - Users online now
- **Total Users** - All registered users
- **Active Vendors** - Vendors online
- **Total Vendors** - All vendors
- **Products Listed** - Total products
- **Pending Approvals** - Waiting for review

**Updates:** Real-time, refreshes every minute

---

### 3. **System Health**
**What it does:** Monitor system status

**Checks:**
- Database connection
- API status
- Server status
- Cache status
- Email service
- Payment gateways
- Storage usage

**Status Indicators:**
- 🟢 Green - All good
- 🟡 Yellow - Warning
- 🔴 Red - Error

---

## 👥 User Management

### 1. **View All Users**
**What it does:** See all registered users

**How to use:**
1. Go to "Users"
2. See all users with details:
   - User ID
   - Name
   - Email
   - Phone
   - Registration date
   - Last login
   - Status
3. Click user for details

**User Information:**
- Full name
- Email address
- Phone number
- Address
- Registration date
- Last login date
- Account status
- Orders count
- Total spent

---

### 2. **User Roles**
**What it does:** Assign roles to users

**Available Roles:**
- **Customer** - Can shop
- **Vendor** - Can sell
- **Admin** - Full access
- **Manager** - Business operations
- **Moderator** - Content moderation
- **Support** - Customer support

**How to assign role:**
1. Go to "Users"
2. Click on user
3. Click "Change Role"
4. Select new role
5. Save

**Role Permissions:**
- **Customer:** Shop, review, wishlist
- **Vendor:** Sell, manage store, analytics
- **Admin:** Everything
- **Manager:** Orders, vendors, finance
- **Moderator:** Reviews, Q&A, content
- **Support:** Chat, tickets, help

---

### 3. **User Activation/Deactivation**
**What it does:** Enable or disable user accounts

**How to deactivate:**
1. Go to "Users"
2. Click on user
3. Click "Deactivate"
4. Confirm
5. User account disabled

**How to reactivate:**
1. Go to "Users"
2. Click on user
3. Click "Activate"
4. Confirm
5. User account enabled

**Reasons to deactivate:**
- Suspicious activity
- Policy violation
- User request
- Fraud detection

---

### 4. **User Search & Filter**
**What it does:** Find specific users quickly

**Filter by:**
- Role (Customer, Vendor, Admin)
- Status (Active, Inactive)
- Registration date
- Last login
- Email
- Phone
- Name

**How to use:**
1. Go to "Users"
2. Click "Filters"
3. Select criteria
4. Apply filters
5. See filtered users

---

### 5. **User Insights**
**What it does:** Understand user behavior

**Insights:**
- User demographics
- Purchase patterns
- Activity trends
- Retention rates
- Lifetime value
- Churn rate

**How to use:**
1. Go to "Analytics"
2. Click "User Insights"
3. See charts and data
4. Export report

---

## 🏪 Vendor Management

### 1. **Vendor Applications**
**What it does:** Review vendor registration requests

**How to review:**
1. Go to "Vendors"
2. Click "Applications"
3. See pending applications
4. Click application
5. Review details:
   - Business name
   - Business type
   - Contact info
   - Documents
   - Business address
6. Approve or reject

**Approval Criteria:**
- Complete information
- Valid documents
- Professional presentation
- Policy compliance
- No red flags

**How to approve:**
1. Click "Approve"
2. Add notes (optional)
3. Confirm
4. Vendor gets approval email

**How to reject:**
1. Click "Reject"
2. Add rejection reason
3. Confirm
4. Vendor gets rejection email

---

### 2. **Vendor Monitoring**
**What it does:** Track vendor performance

**Metrics:**
- Total sales
- Revenue
- Number of products
- Average rating
- Response rate
- Return rate
- Cancellation rate
- Customer complaints

**How to use:**
1. Go to "Vendors"
2. Click on vendor
3. See performance metrics
4. See recent orders
5. See customer reviews

---

### 3. **Vendor Verification**
**What it does:** Verify vendor documents

**Documents to verify:**
- Business registration
- Tax ID
- Bank account
- Identity proof
- Address proof

**How to verify:**
1. Go to "Vendors"
2. Click on vendor
3. Click "Documents"
4. Review each document
5. Mark as verified or rejected

**Verification Status:**
- ✅ Verified
- ⏳ Pending
- ❌ Rejected

---

### 4. **Vendor Suspension**
**What it does:** Temporarily or permanently suspend vendor

**Reasons:**
- Policy violation
- Poor performance
- Customer complaints
- Fraud detection
- Non-compliance

**How to suspend:**
1. Go to "Vendors"
2. Click on vendor
3. Click "Suspend"
4. Select duration:
   - Temporary (7, 14, 30 days)
   - Permanent
5. Add reason
6. Confirm

**Effects:**
- Vendor can't list products
- Vendor can't accept orders
- Existing orders continue
- Vendor gets notification

---

### 5. **Vendor Reactivation**
**What it does:** Restore suspended vendor

**How to reactivate:**
1. Go to "Vendors"
2. Click on suspended vendor
3. Click "Reactivate"
4. Add notes (optional)
5. Confirm
6. Vendor gets notification

---

### 6. **Commission Management**
**What it does:** Set commission rates for vendors

**Commission Types:**
- **Per Category** - Different rate per category
- **Flat Rate** - Same rate for all
- **Tiered** - Based on sales volume

**How to set commission:**
1. Go to "Commission"
2. Click "Set Rates"
3. Select category
4. Enter commission percentage
5. Save

**Commission Calculation:**
- Commission = Order Total × Commission Rate
- Vendor Earnings = Order Total - Commission

**Example:**
- Order: ৳1000
- Commission: 10%
- Commission Amount: ৳100
- Vendor Earnings: ৳900

---

### 7. **Payout Processing**
**What it does:** Process vendor payouts

**How to process:**
1. Go to "Payouts"
2. See pending payout requests
3. Click request
4. Review details
5. Approve or reject
6. If approved, process payment

**Payout Status:**
- **Pending** - Waiting for approval
- **Approved** - Ready to pay
- **Processing** - Being processed
- **Completed** - Payment sent
- **Failed** - Payment failed

---

## 📦 Product Management

### 1. **Product Moderation**
**What it does:** Review and approve vendor products

**How to moderate:**
1. Go to "Products"
2. Click "Pending Approval"
3. See products waiting for review
4. Click product
5. Review details:
   - Product name
   - Description
   - Images
   - Price
   - Category
   - Specifications
6. Approve or reject

**Approval Criteria:**
- Clear product name
- Detailed description
- High-quality images
- Reasonable price
- Correct category
- Complete specifications
- Policy compliance

**How to approve:**
1. Click "Approve"
2. Add notes (optional)
3. Confirm
4. Product goes live

**How to reject:**
1. Click "Reject"
2. Add rejection reason
3. Confirm
4. Vendor gets notification

---

### 2. **Product Administration**
**What it does:** Manage all products

**Admin can:**
- Add admin products
- Edit any product
- Delete products
- Feature products
- Bulk operations

**How to add admin product:**
1. Go to "Products"
2. Click "Add Product"
3. Fill in details
4. Mark as "Admin Product"
5. Publish

**How to feature product:**
1. Go to "Products"
2. Click on product
3. Click "Feature"
4. Set duration
5. Save

**Featured products:**
- Show on homepage
- Get more visibility
- Boost sales

---

### 3. **Product Quality Control**
**What it does:** Ensure product quality

**Checks:**
- Image quality
- Description quality
- Price reasonableness
- Category appropriateness
- Policy compliance
- Duplicate detection

**How to use:**
1. Go to "Quality Control"
2. See flagged products
3. Review each product
4. Take action:
   - Approve
   - Request changes
   - Reject

---

### 4. **Bulk Operations**
**What it does:** Perform actions on multiple products

**Operations:**
- Bulk approve
- Bulk reject
- Bulk feature
- Bulk delete
- Bulk price update
- Bulk category change

**How to use:**
1. Go to "Products"
2. Select multiple products
3. Click "Bulk Actions"
4. Select action
5. Confirm

---

## 📂 Category Management

### 1. **Create Categories**
**What it does:** Add new product categories

**How to create:**
1. Go to "Categories"
2. Click "Add Category"
3. Fill in details:
   - Category name
   - Description
   - Icon/Image
   - Parent category (optional)
   - Commission rate
4. Save

**Category Details:**
- **Name** - Category title
- **Description** - What products go here
- **Icon** - Visual representation
- **Parent** - For subcategories
- **Commission** - Platform commission

**Category Hierarchy:**
- Electronics
  - Phones
  - Laptops
  - Accessories

---

### 2. **Edit Categories**
**What it does:** Update category information

**How to edit:**
1. Go to "Categories"
2. Click on category
3. Click "Edit"
4. Update information
5. Save

**What you can edit:**
- Category name
- Description
- Icon
- Commission rate
- Parent category

---

### 3. **Delete Categories**
**What it does:** Remove categories

**How to delete:**
1. Go to "Categories"
2. Click on category
3. Click "Delete"
4. Confirm
5. Category deleted

**Note:** Can't delete if products exist

---

### 4. **Dynamic Category Fields**
**What it does:** Add custom fields to categories

**Field Types:**
- **Text** - Short text input
- **Number** - Numeric values
- **Select** - Dropdown (single choice)
- **Multi-select** - Multiple choices
- **Boolean** - Yes/No checkbox
- **Textarea** - Long text

**How to add field:**
1. Go to "Categories"
2. Click on category
3. Click "Add Field"
4. Fill in details:
   - Field name
   - Field type
   - Options (if select)
   - Required (yes/no)
   - Filterable (yes/no)
   - Searchable (yes/no)
5. Save

**Example Fields:**
- **Electronics Category:**
  - RAM (Select: 4GB, 8GB, 16GB)
  - Processor (Text: Intel i5, AMD Ryzen)
  - Screen Size (Number: 15.6 inches)
  - Touch Screen (Boolean: Yes/No)

**Field Options:**
- **Required** - Vendors must fill
- **Filterable** - Customers can filter by this
- **Searchable** - Included in search
- **Display Order** - Order on product page

---

### 5. **Commission Configuration**
**What it does:** Set commission rates per category

**How to set:**
1. Go to "Categories"
2. Click on category
3. Click "Commission"
4. Enter commission percentage
5. Save

**Commission Rates:**
- Different per category
- Applied to all vendors
- Can be changed anytime

**Example Rates:**
- Electronics: 10%
- Fashion: 15%
- Books: 5%
- Home & Garden: 12%

---

## 📋 Order Management

### 1. **View All Orders**
**What it does:** See all customer orders

**How to use:**
1. Go to "Orders"
2. See all orders with details:
   - Order number
   - Customer name
   - Vendor name
   - Order date
   - Items
   - Total price
   - Status
3. Click order for details

**Order Information:**
- Order number
- Customer details
- Vendor details
- Items ordered
- Quantities
- Prices
- Total amount
- Delivery address
- Order status
- Payment method

---

### 2. **Order Filtering**
**What it does:** Find specific orders

**Filter by:**
- Status (Pending, Processing, Shipped, Delivered)
- Date range
- Customer name
- Vendor name
- Order number
- Price range
- Payment method

**How to use:**
1. Go to "Orders"
2. Click "Filters"
3. Select criteria
4. Apply filters
5. See filtered orders

---

### 3. **Order Status Management**
**What it does:** Update order status

**Status Flow:**
1. **Pending** - Order received
2. **Processing** - Vendor preparing
3. **Shipped** - Order sent
4. **Delivered** - Order received

**How to update:**
1. Go to "Orders"
2. Click on order
3. Click "Update Status"
4. Select new status
5. Save

---

### 4. **Order Analytics**
**What it does:** Analyze order data

**Analytics:**
- Total orders
- Orders by status
- Orders by date
- Orders by vendor
- Orders by customer
- Revenue by order
- Average order value

**How to use:**
1. Go to "Analytics"
2. Click "Orders"
3. See charts and data
4. Export report

---

## 🔄 Returns & Refunds

### 1. **Return Management**
**What it does:** Handle customer return requests

**How to manage:**
1. Go to "Returns"
2. See all return requests
3. Click request
4. Review details:
   - Return reason
   - Customer photos
   - Vendor response
5. Approve or reject
6. If approved, monitor return process

**Return Status:**
- **Requested** - Customer requested
- **Approved** - Vendor approved
- **Shipped** - Item shipped back
- **Received** - Vendor received
- **Refunded** - Money refunded

---

### 2. **Refund Processing**
**What it does:** Process customer refunds

**How to process:**
1. Go to "Refunds"
2. See pending refunds
3. Click refund
4. Review details
5. Approve or reject
6. If approved, process payment

**Refund Methods:**
- Original payment method
- Store credit
- Bank transfer

---

### 3. **Return Statistics**
**What it does:** Analyze return patterns

**Statistics:**
- Total returns
- Return rate
- Return reasons
- Return by vendor
- Return by product
- Refund amount

**How to use:**
1. Go to "Analytics"
2. Click "Returns"
3. See charts and data
4. Identify trends

---

## 🎁 Marketing & Promotions

### 1. **Coupon Management**
**What it does:** Create discount coupons

**How to create:**
1. Go to "Coupons"
2. Click "Create Coupon"
3. Fill in details:
   - Coupon code
   - Discount type (Percentage/Fixed)
   - Discount amount
   - Minimum purchase
   - Maximum uses
   - Expiry date
   - Categories (optional)
   - Vendors (optional)
4. Save

**Coupon Types:**
- **Percentage** - e.g., 20% off
- **Fixed Amount** - e.g., ৳500 off
- **Free Shipping** - Free delivery

**Coupon Options:**
- **Minimum Purchase** - Minimum order value
- **Maximum Uses** - Total uses allowed
- **Per User Limit** - Uses per customer
- **Expiry Date** - When coupon expires
- **Categories** - Specific categories only
- **Vendors** - Specific vendors only

---

### 2. **Flash Sales**
**What it does:** Create limited-time sales

**How to create:**
1. Go to "Flash Sales"
2. Click "Create Sale"
3. Fill in details:
   - Sale name
   - Start date/time
   - End date/time
   - Products
   - Discount percentage
4. Save

**Flash Sale Features:**
- Countdown timer
- Limited quantity
- Big discounts
- First come, first served
- Automatic end

**How to manage:**
1. Go to "Flash Sales"
2. See active sales
3. See upcoming sales
4. See past sales
5. Edit or delete

---

### 3. **Offers Management**
**What it does:** Create promotional offers

**Offer Types:**
- **Banner Offers** - Homepage banners
- **Category Offers** - Category-specific
- **Product Offers** - Product-specific
- **Vendor Offers** - Vendor-specific

**How to create:**
1. Go to "Offers"
2. Click "Create Offer"
3. Select offer type
4. Fill in details
5. Set duration
6. Save

---

### 4. **Promotional Campaigns**
**What it does:** Run marketing campaigns

**Campaign Types:**
- Email campaigns
- Push notification campaigns
- In-app campaigns
- Banner campaigns

**How to create:**
1. Go to "Campaigns"
2. Click "Create Campaign"
3. Select campaign type
4. Fill in details
5. Set target audience
6. Schedule
7. Save

---

## 📝 Content Moderation

### 1. **Review Moderation**
**What it does:** Approve/reject customer reviews

**How to moderate:**
1. Go to "Reviews"
2. See pending reviews
3. Click review
4. Read review
5. Approve or reject

**Rejection Reasons:**
- Inappropriate language
- Spam
- Off-topic
- Fake review
- Policy violation

**How to approve:**
1. Click "Approve"
2. Review goes live

**How to reject:**
1. Click "Reject"
2. Add reason
3. Confirm

---

### 2. **Q&A Moderation**
**What it does:** Monitor product questions and answers

**How to moderate:**
1. Go to "Q&A"
2. See pending questions/answers
3. Click item
4. Review content
5. Approve or reject

**Moderation Criteria:**
- Appropriate language
- Relevant to product
- Not spam
- Not promotional
- Factually correct

---

### 3. **Remove Inappropriate Content**
**What it does:** Delete spam or offensive content

**Content to remove:**
- Spam reviews
- Offensive language
- Promotional content
- Fake reviews
- Off-topic content

**How to remove:**
1. Find content
2. Click "Delete"
3. Confirm
4. Content removed

---

### 4. **Featured Content**
**What it does:** Highlight best reviews and Q&A

**How to feature:**
1. Go to "Reviews" or "Q&A"
2. Click on content
3. Click "Feature"
4. Set duration
5. Save

**Featured content:**
- Shows at top
- Gets more visibility
- Helps other customers

---

## ⚙️ System Configuration

### 1. **Delivery Settings**
**What it does:** Configure shipping options

**Settings:**
- Shipping methods
- Delivery zones
- Delivery charges
- Shipping providers
- Delivery time estimates

**How to configure:**
1. Go to "Settings"
2. Click "Delivery"
3. Configure each setting
4. Save

**Delivery Tiers:**
- Express (0-3km): ৳50
- Standard (3-10km): ৳100
- Extended (10-50km): ৳150
- Long Distance (50km+): ৳200

---

### 2. **Payment Settings**
**What it does:** Configure payment methods

**Payment Methods:**
- Cash on Delivery
- Stripe
- bKash
- Nagad

**How to configure:**
1. Go to "Settings"
2. Click "Payments"
3. Enable/disable methods
4. Set transaction fees
5. Configure credentials
6. Save

---

### 3. **Email Configuration**
**What it does:** Set up email service

**Configuration:**
- SMTP server
- Email address
- Password
- Email templates
- Notification settings

**How to configure:**
1. Go to "Settings"
2. Click "Email"
3. Enter SMTP details
4. Test connection
5. Save

**Email Types:**
- Order confirmation
- Shipping updates
- Delivery confirmation
- Return status
- Promotional emails

---

### 4. **Push Notifications**
**What it does:** Configure web push notifications

**Configuration:**
- VAPID keys
- Notification templates
- Subscriber management
- Notification history

**How to configure:**
1. Go to "Settings"
2. Click "Push Notifications"
3. Enter VAPID keys
4. Configure templates
5. Save

---

### 5. **System Settings**
**What it does:** General system configuration

**Settings:**
- Platform name
- Logo
- Favicon
- Currency
- Language
- Timezone
- Date format

**How to configure:**
1. Go to "Settings"
2. Click "System"
3. Update settings
4. Save

---

## 📊 Reports & Analytics

### 1. **Financial Reports**
**What it does:** Detailed financial analysis

**Reports:**
- Revenue report
- Commission report
- Payout report
- Tax report
- Expense report

**How to generate:**
1. Go to "Reports"
2. Click "Financial"
3. Select report type
4. Select date range
5. Generate
6. Download (PDF, Excel)

---

### 2. **Inventory Reports**
**What it does:** Stock and inventory analysis

**Reports:**
- Stock report
- Low stock alert
- Product performance
- Category analysis
- Vendor inventory

**How to generate:**
1. Go to "Reports"
2. Click "Inventory"
3. Select report type
4. Generate
5. Download

---

### 3. **User Reports**
**What it does:** User activity and engagement

**Reports:**
- User activity
- Registration trends
- Engagement metrics
- Retention analysis
- User demographics

**How to generate:**
1. Go to "Reports"
2. Click "Users"
3. Select report type
4. Generate
5. Download

---

### 4. **Sales Reports**
**What it does:** Sales and revenue analysis

**Reports:**
- Sales report
- Revenue report
- Product performance
- Category analysis
- Vendor performance

**How to generate:**
1. Go to "Reports"
2. Click "Sales"
3. Select report type
4. Generate
5. Download

---

### 5. **Export Data**
**What it does:** Export data for analysis

**Export Formats:**
- CSV
- Excel
- PDF
- JSON

**How to export:**
1. Go to any report
2. Click "Export"
3. Select format
4. Download

---

## 🆘 Troubleshooting

### Common Issues

#### "Vendor application stuck"
1. Check application details
2. Request missing documents
3. Contact vendor
4. Approve or reject

#### "High return rate"
1. Check product quality
2. Review vendor performance
3. Contact vendor
4. Consider suspension if needed

#### "Payment gateway error"
1. Check payment settings
2. Verify credentials
3. Test connection
4. Contact payment provider

#### "Email not sending"
1. Check email configuration
2. Verify SMTP settings
3. Test connection
4. Check email logs

#### "System performance slow"
1. Check database
2. Check server resources
3. Clear cache
4. Optimize queries

---

## 📞 Contact Support

### Support Channels
- **Technical Support:** tech-support@amiyo-go.com
- **Business Support:** business-support@amiyo-go.com
- **Emergency:** +880-1700-000-000

---

## 📚 Additional Resources

- **Main README:** README.md
- **User Guide:** README_USER.md
- **Vendor Guide:** README_VENDOR.md
- **Setup Guide:** SETUP_GUIDE.md
- **Project Overview:** PROJECT_OVERVIEW.md

---

**Last Updated:** March 31, 2026  
**Version:** 1.0.0  
**Status:** ✅ Complete

