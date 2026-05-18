# Project Workflow

This document describes how the main workflows move through the Amiyo-Go system today.

For architecture and workflow diagrams, see `MARKETPLACE_WORKFLOW_DIAGRAMS.md`.
For customer, vendor, and admin operating workflows, see `MARKETPLACE_ROLE_WORKFLOWS.md`.

## 1. System Roles

### Customer

- Registers and saves a default address
- Browses products and categories
- Adds items to cart
- Checks out and places orders
- Tracks orders, cancels eligible orders, requests returns

### Vendor

- Registers as a seller
- Gets approved by admin
- Receives allowed main categories
- Creates products in any child category under approved main categories
- Manages shop, orders, returns, messages, finance, payouts

### Admin

- Controls categories, commissions, delivery settings, users, vendors, products, orders, payouts, returns, reviews, support
- Moderates vendor products
- Monitors vendor activity and financial performance

## 2. Core Data Flow

The project mainly revolves around these objects:

- `users`
- `vendors`
- `categories`
- `products`
- `orders`
- `vendorOrders`
- `addresses`
- `returns`
- `vendor_payouts`
- `notifications`

`orders` are the customer-facing master records.  
`vendorOrders` are the vendor-facing slices of those same orders.

## 3. Customer Account and Address Workflow

### Registration

Customer registration collects:

- name
- email
- phone
- division
- district
- upazila
- union
- ward no
- area or village or road
- house name or number

### Address behavior

- The first valid address can be stored as default
- Default address is used in checkout for the customer's own delivery
- Checkout also supports placing an order for someone else with a separate shipping address

### Why this matters

This address structure feeds:

- delivery fee calculation
- order shipping info
- invoice output
- future reorder convenience

## 4. Shopping Workflow

### Browse and discovery

Customers can:

- browse grouped categories
- use home category dropdowns
- search products
- filter by category and other product data
- open vendor storefronts

### Product detail

Product pages are expected to show:

- title
- images
- description
- category
- price
- stock
- vendor info
- reviews and Q&A where available

### Cart

The cart keeps product rows before checkout.  
Delivery calculations must stay consistent between cart and checkout.

## 5. Checkout and Order Creation Workflow

### Checkout stages

1. Load cart items
2. Load saved default address
3. Choose delivery destination
4. Calculate delivery fee
5. Choose payment method
6. Place order

### Delivery fee logic

Delivery is controlled from admin delivery settings and location rules.

The system currently supports:

- area-aware delivery logic
- main service area matching
- vendor and location-aware fee calculation
- per-order delivery breakdown storage

### Commission logic

During order creation:

- each product reads its category commission rate
- minimum commission from parent categories can also affect the effective rate
- the system stores snapshots on the order item:
  - `commissionRateSnapshot`
  - `adminCommissionAmount`
  - `vendorEarningAmount`

This is important because commission must not change historically when the category rate changes later.

### Order splitting

After a customer places one order:

- the master order is stored in `orders`
- vendor-specific records are created or synced into `vendorOrders`
- each line item carries its own vendor and fulfillment state

## 6. Customer Cancellation Workflow

### Allowed cancellation window

Customers can cancel within 30 minutes of order creation.

The order model stores:

- `canCancelUntil`

### What happens on cancellation

When a customer cancels in time:

- master order status becomes cancelled
- `vendorOrders` are synced to cancelled
- stock is restored
- vendor-facing cancellation message is stored
- notifications can be created

Important fields used in vendor and admin views:

- `cancelledByRole`
- `cancellationSource`
- `cancellationMessage`

Expected message:

- `User cancelled this order within 30 minutes.`

## 7. Vendor Onboarding Workflow

### Seller registration

1. User opens seller registration
2. Submits shop and contact information
3. Admin reviews vendor request
4. Admin approves or rejects vendor

### Category access

Admin can assign one or more main categories to a vendor.

If a vendor has a main category:

- they can create products in that main category
- they can also create products in child sections and subcategories under it

This supports workflows like:

- Electronics -> Mobile -> Accessories
- Men's Fashion -> Clothing -> Shirts
- Grocery -> Spices -> Mixed Spices
- Restaurants & Food Ordering -> Street Food -> Fuchka

## 8. Vendor Product Workflow

### Product creation

1. Vendor opens `vendor/products/add`
2. Selects an allowed category
3. Fills product form
4. Uploads images
5. Submits the product

### Category-specific fields

Product forms can change based on category family. Examples:

- electronics specs
- grocery weight or shelf life
- restaurant preparation time
- pharmacy or stationery relevant fields

### Moderation state

Products move through:

- `pending`
- `approved`
- `rejected`

### Important moderation behavior

- new vendor products usually require approval
- editing an already approved product can send it back to `pending`
- admin rejection can store a rejection reason

## 9. Admin Category and Commission Workflow

### Category management

Admins can:

- create grouped category trees
- add nested sections and subcategories
- manage slugs, icons, descriptions, and images
- edit attributes for categories

### Commission management

Admins can set:

- `commissionRate`
- `minimumCommissionRate`

The effective commission for a product is resolved from:

- the category itself
- minimum commission inherited from parent categories

This lets the marketplace guarantee floor commission rates across large category groups.

## 10. Admin Product Moderation Workflow

### Main moderation pages

- `/admin/products`
- `/admin/vendor-activity`
- vendor detail product controls

### Moderation board behavior

Admins can review products by status:

- pending
- approved
- rejected
- all

Available actions include:

- review
- approve
- reject
- disable

## 11. Order Fulfillment Workflow

### Customer-facing order status

The main order can move through:

- pending
- processing
- packed
- shipped
- delivered
- cancelled
- returned

### Item-level status

Each order item also stores fulfillment details such as:

- `itemStatus`
- `trackingNumber`
- `shippedAt`
- `deliveredAt`

### Admin-to-vendor sync

When admin updates an order:

- the master order is updated
- matching vendor order rows are updated
- item-level timestamps are refreshed

This keeps customer, vendor, and admin views aligned.

## 12. Vendor Finance Workflow

### Earnings model

Vendor finance is based on delivered sales, commission, payouts, and returns.

Typical values:

- gross sales
- commission
- net earnings
- pending balance
- paid payouts
- available balance

### Payout request flow

1. Vendor opens finance
2. Reviews eligible balance
3. Submits payout request
4. Admin reviews request
5. Admin approves or rejects
6. Paid amount appears in vendor payout history

### Minimum payout

Vendor payout requests are checked against a minimum threshold before acceptance.

## 13. Return Workflow

### Customer side

Customers can submit return requests from order history.

### Vendor/admin side

Returns are reviewed with:

- request reason
- product and order mapping
- refund and commission details

The system also tracks vendor-side financial impact on returned items.

## 14. Messaging and Notification Workflow

### Messaging

There are separate workflows for:

- customer <-> vendor chat
- vendor <-> admin chat
- support tickets

### Notifications

Notifications can be created for:

- new orders
- status changes
- product moderation events
- review events
- other platform alerts

Frontend notification UI also stores and normalizes notification payloads for display.

## 15. Reporting and Monitoring Workflow

### Vendor

Vendor dashboards show operational performance such as:

- orders
- products
- revenue
- commission
- payouts

### Admin

Admin pages cover:

- vendor activity
- users
- orders
- payouts
- returns
- customer insights
- inventory

## 16. Current External Dependency Notes

Some flows are fully implemented inside the app, while some external providers are still optional or partially mocked.

Known examples from the current codebase:

- email service can run in mock mode when SMTP is not configured
- SMS sending still needs a real provider
- some notification channels are placeholders for real push/email delivery
- stock alert emails still need full provider integration

## 17. Suggested Team Usage

### For product or QA review

Read:

1. `README.md`
2. `PROJECT_WORKFLOW.md`
3. `FEATURE_REFERENCE.md`

### For role-specific onboarding

Read one of:

- `README_USER.md`
- `README_VENDOR.md`
- `README_ADMIN.md`
