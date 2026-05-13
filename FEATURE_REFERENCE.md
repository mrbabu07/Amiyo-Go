# Feature Reference

This document maps the visible project features to routes and notes how each area works today.

Status labels used here:

- `Live` - connected to real project flow
- `Mixed` - mostly wired, but depends on external setup or has some partial behavior
- `Needs review` - present in UI but should be checked before production rollout

## 1. Public and Customer Features

| Area | Route | Purpose | Status |
| --- | --- | --- | --- |
| Home | `/` | Landing page, hero, category browsing, featured products | Live |
| Categories | `/categories`, `/category/:category` | Grouped category browsing | Live |
| Products | `/products` | Product list and filtering | Live |
| Product detail | `/product/:id` | Product details, vendor info, actions | Live |
| Search | `/search` | Search results page | Live |
| Flash sales | `/flash-sales` | Campaign-driven product listing | Mixed |
| Vendor storefront | `/vendor/:vendorId/products` | Public vendor store | Live |
| Cart | `/cart` | Cart review and delivery preview | Live |
| Checkout | `/checkout` | Address, payment, delivery fee, order placement | Live |
| Orders | `/orders` | Customer order history, tracking, cancellation, review entry | Live |
| Wishlist | `/wishlist` | Saved items | Live |
| Shared wishlist | `/wishlist/shared/:shareId` | Public wishlist share | Mixed |
| Compare | `/compare` | Product comparison | Live |
| Messages | `/messages` | Customer chat | Mixed |
| Returns | `/returns` | Return request management | Mixed |
| Addresses | `/addresses` | Saved addresses and default address control | Live |
| Loyalty | `/loyalty` | Reward and points dashboard | Mixed |
| Alerts | `/my-alerts` | User alerts and notification-related items | Mixed |
| Support | `/support` | Tickets and support messaging | Mixed |
| Profile | `/profile` | Customer profile management | Live |
| Vendor registration | `/vendor/register` | Seller onboarding form | Live |

## 2. Customer Workflow Notes

### Registration and address

- Registration includes Bangladesh-specific address fields.
- Default address is reused in checkout.
- Checkout also supports an alternate recipient address.

### Orders

- Customer orders are created in the master order collection.
- Items are also split into vendor-facing order records.
- Customer cancellation is time-limited to 30 minutes.

## 3. Vendor Features

| Area | Route | Purpose | Status |
| --- | --- | --- | --- |
| Dashboard | `/vendor/dashboard` | Vendor KPIs, order and finance summary | Live |
| Products list | `/vendor/products` | Product overview, pricing, commission visibility | Live |
| Add product | `/vendor/products/add` | Create vendor product in allowed category tree | Live |
| Edit product | `/vendor/products/edit/:id` | Update product and resubmit if needed | Live |
| Bulk upload | `/vendor/products/bulk` | Multi-product upload surface | Needs review |
| Orders | `/vendor/orders` | Vendor order management and status tracking | Live |
| Finance | `/vendor/finance` | Earnings, payouts, transactions | Live |
| Bank settings | `/vendor/settings/bank` | Payout account setup | Live |
| Shop settings | `/vendor/shop`, `/vendor/shop/profile`, `/vendor/shop/categories` | Shop profile and shop-level configuration | Live |
| General settings | `/vendor/settings` | Core store data, address, payout method | Live |
| Messages | `/vendor/messages` | Vendor-to-customer messaging | Mixed |
| Reviews | `/vendor/reviews` | Review response area | Mixed |
| Q&A | `/vendor/qa` | Product question responses | Mixed |
| Returns | `/vendor/returns` | Return request handling | Mixed |
| Support chat | `/vendor/support-chat` | Vendor-to-admin help flow | Mixed |
| Category requests | `/vendor/category-requests` | Request more selling categories | Live |
| Marketing | `/vendor/marketing` and children | Promotions and campaigns | Needs review |
| Reports | `/vendor/reports` and children | Sales, product, traffic reporting | Mixed |

## 4. Vendor Workflow Notes

### Category permissions

- Vendors can have multiple main categories assigned.
- They can use all valid child categories under those approved parents.

### Product approvals

- Vendor products go through admin moderation.
- Approved products can return to pending on update.

### Finance

- Delivered orders drive earned balance.
- Commission is visible at item and summary level.
- Payout requests depend on balance and minimum threshold.

## 5. Admin Features

| Area | Route | Purpose | Status |
| --- | --- | --- | --- |
| Dashboard | `/admin` | Marketplace overview | Live |
| Vendors | `/admin/vendors` | Vendor list and control surface | Live |
| Vendor detail | `/admin/vendors/:vendorId` | Vendor profile, products, orders, payouts | Live |
| Vendor activity | `/admin/vendor-activity` | Vendor activity center and product moderation board | Live |
| Vendor chats | `/admin/chats`, `/admin/chat/:vendorId` | Admin-to-vendor communication | Mixed |
| Products | `/admin/products` | Marketplace product moderation | Live |
| Product create/edit | `/admin/products/add`, `/admin/products/edit/:id` | Admin product management | Live |
| Inventory | `/admin/inventory` | Product stock view and adjustments | Live |
| Orders | `/admin/orders` | Full order oversight and status control | Live |
| Returns | `/admin/returns` | Return and refund review | Mixed |
| Payouts | `/admin/payouts` | Paid payout records | Live |
| Payout requests | `/admin/payout-requests` | Approve or reject vendor payout requests | Live |
| Categories | `/admin/categories` | Dynamic grouped category management | Live |
| Category manage | `/admin/categories/manage` | Category tree and attributes editing | Live |
| Category attributes | `/admin/categories/:categoryId/attributes` | Field-level category attributes | Live |
| Category requests | `/admin/category-requests` | Vendor requests for new category access | Live |
| Coupons | `/admin/coupons` | Coupon management | Mixed |
| Flash sales | `/admin/flash-sales` | Flash sale management | Mixed |
| Offers | `/admin/offers` | Offer management | Mixed |
| Delivery settings | `/admin/delivery-settings` | Delivery fee and area control | Live |
| Users | `/admin/users` | Customer and user management | Live |
| Insights | `/admin/insights` | Customer and marketplace insights | Mixed |
| Support | `/admin/support` | Support ticket control | Mixed |
| Reviews | `/admin/reviews` | Review moderation and reply | Mixed |
| Q&A | `/admin/qa` | Product question oversight | Mixed |

## 6. Admin Workflow Notes

### Categories

Admins control:

- grouped category structure
- child and grandchild sections
- icons and storefront presentation
- category commissions
- minimum commission floors

### Product moderation

Main moderation statuses:

- pending
- approved
- rejected

The admin activity page now supports filtering by these statuses instead of showing only pending items.

### Vendor governance

Admins can:

- approve vendors
- assign category access
- inspect vendor order performance
- edit vendor products
- process payout requests

## 7. Backend Route Groups

These backend route groups are present in `Server/routes/`:

- addresses
- admin alerts
- admin finance
- admin payouts
- admin products
- admin users
- admin vendors
- campaigns
- categories and category fields
- chats and vendor chats
- coupons
- delivery settings
- dynamic categories and products
- flash sales
- loyalty and rewards
- newsletters
- notifications
- offers
- orders
- payments
- products
- product questions
- recommendations
- returns
- reviews
- stock alerts
- store locations
- support
- users
- vendor finance
- vendor order management
- vendor products
- vendors
- wishlists

## 8. Important Business Rules in Code

### Commission

- Category commission is applied during order creation.
- Parent category minimum commission can raise the effective rate.
- Commission snapshots are stored inside each order item.

### Delivery

- Delivery charge is recalculated server-side during order creation.
- Delivery breakdown is stored with the order.

### Cancellation

- Customer cancellation is limited to 30 minutes.
- Cancellation syncs to vendor order records and restores stock.

### Order sync

- Admin status updates sync back to vendor-facing order records.

## 9. External or Partial Integrations

These areas need configuration or extra rollout attention:

| Area | Current note |
| --- | --- |
| Email | Can run in mock mode without SMTP |
| SMS | Provider integration still needed |
| Push notifications | Mixed, depends on browser and service setup |
| Stock alert emails | Provider integration still incomplete |
| Some campaign and analytics surfaces | Present, but should be verified before production |
| Some vendor marketing and bulk flows | Present in UI, should be tested end to end |

## 10. Recommended QA Pass

Before a production release, test these paths in order:

1. Customer registration with address
2. Add products to cart from multiple vendors
3. Checkout with delivery calculation
4. Customer cancel within 30 minutes
5. Vendor sees synced cancellation
6. Vendor adds product and admin approves it
7. Admin changes order status and vendor finance updates
8. Vendor payout request and admin payout processing
9. Return request flow
10. Notifications and chat flows
