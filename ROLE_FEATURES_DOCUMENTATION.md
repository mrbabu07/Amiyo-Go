# Amiyo-Go Role Features Documentation

Last updated: 2026-05-19

This document explains Amiyo-Go as a three-role marketplace system:

- Customer: discovers products, buys, tracks, returns, reviews, and gets support.
- Vendor: runs a seller-center workflow for products, orders, fulfillment, finance, marketing, and reputation.
- Admin: operates the whole marketplace through approvals, queues, moderation, payouts, logistics, trust, analytics, and settings.

Use this file with:

- `MARKETPLACE_WORKFLOW_DIAGRAMS.md`
- `MARKETPLACE_ROLE_WORKFLOWS.md`
- `DARAZ_PROFESSIONAL_FEATURE_GAP_STATUS.md`
- `PROJECT_WORKFLOW.md`

## Customer Features

### 1. Account And Identity

Customers can:

- Register, login, logout, reset password, and manage profile data.
- Use guest checkout for buying without a full account.
- Manage saved addresses and default delivery address.
- Maintain notification, privacy, and account preferences.
- Use customer account security features where enabled.

Important workflow:

```text
Customer creates account or continues as guest
-> Adds profile/contact/address data
-> Browses and buys
-> Can later manage orders, returns, reviews, and support from account area
```

### 2. Discovery And Shopping

Customers can discover products through:

- Homepage sections: hero, category strip, flash sales, featured products, recommendations, vendors, and arrivals.
- Category pages with filters, sorting, chips, and empty states.
- Search results with autocomplete, filters, sorting, and no-result recovery.
- Product detail pages with gallery, variants, delivery/trust information, seller card, Q&A, reviews, and recommendations.
- Vendor storefront pages.
- Flash sale and promotional product surfaces.
- Recently viewed and personalized recommendation areas.

Trust signals shown to customers include:

- Official store indicators.
- Free shipping or fast delivery badges.
- Top-rated product badges.
- Verified purchase reviews.
- Seller information and marketplace protection language.

### 3. Product Detail Features

Product detail supports:

- Image gallery with swipe and zoom.
- Product video display when product media contains video URLs.
- Variant selection with variant-specific images.
- Size/color options.
- Price, original price, stock state, SKU, rating, and sold count.
- Delivery estimate and return/trust content.
- Seller information.
- Product Q&A.
- Customer reviews with sorting and filtering.
- Related products and frequently bought together.
- Add to cart and buy now actions.
- Sticky mobile CTA.

Review features:

- Verified purchase review check.
- Photo review upload.
- Hosted video URL support.
- Review filtering by star rating, verified, photos, and videos.
- Review sorting by newest, oldest, highest rating, lowest rating, and helpful.
- Helpful vote support.
- Admin and vendor replies where available.

### 4. Cart And Checkout

Customers can:

- Add/remove products from cart.
- Update quantities.
- See vendor-grouped cart sections.
- Apply platform coupons or store vouchers.
- Redeem loyalty points/coins where available.
- See vendor delivery breakdown and total delivery fee.
- Choose saved or new address.
- Use Bangladesh cascading address fields.
- Choose payment method.
- Submit manual payment info where required.
- Place authenticated or guest orders.

Checkout workflow:

```text
Cart
-> Address
-> Payment
-> Review
-> Place order
-> Order success
-> Tracking and post-purchase actions
```

Discount workflow:

```text
Customer applies voucher
-> Server validates voucher
-> Checkout preview shows discount
-> Order creation recalculates discount server-side
-> Order, invoice, vendor split, and admin order views store/display payable totals
```

### 5. Orders And Post-Purchase

Customers can:

- View order history.
- Open order detail pages.
- See itemized order totals, delivery fee, discount, and final payable amount.
- Download or view invoice where available.
- Track shipment timeline.
- See courier and delivery state when assigned.
- Cancel eligible orders inside policy windows.
- Reorder.
- Start returns/refunds.
- Open support tickets linked to orders.
- Review purchased products.

Post-purchase workflow:

```text
Order placed
-> Payment/COD state recorded
-> Vendor receives vendor order
-> Shipment draft is created
-> Vendor/admin logistics move shipment through state machine
-> Customer tracks delivery
-> Customer can review, return, or get support
```

### 6. Returns, Refunds, And Support

Customers can:

- Request returns for eligible delivered orders.
- Add reason, details, and evidence.
- Track return/refund status.
- See refund information and expected status.
- Create support tickets.
- View ticket threads and updates.
- Receive notifications for support, return, order, and delivery updates.

Return workflow:

```text
Customer requests return
-> Vendor/admin reviews
-> Return approved or rejected
-> Reverse logistics progresses
-> Inspection/restock/disposal decision
-> Refund and vendor deduction are recorded
```

### 7. Loyalty And Engagement

Customer engagement features include:

- Loyalty points/coins balance.
- Points redemption at checkout.
- Daily check-in rewards where enabled.
- Referral and reward surfaces where enabled.
- Wishlist and wishlist collections.
- Price-drop and stock alert preferences.
- Notification center.
- Followed vendor and recommendation surfaces where enabled.

## Vendor Features

### 1. Vendor Onboarding And Status

Vendors can:

- Apply to become a seller.
- Submit shop information and KYC details.
- Upload required identity/business/bank information where enabled.
- Wait for admin approval.
- See status screens for pending, rejected, suspended, or missing KYC states.
- Request category access.

Vendor status workflow:

```text
Vendor applies
-> KYC/shop data submitted
-> Admin reviews
-> Approved vendors access seller center
-> Pending/rejected/suspended vendors see status guidance
```

### 2. Seller Center Dashboard

Vendor dashboard shows:

- Revenue and order KPIs.
- Pending orders.
- Low stock items.
- Returns pending.
- Payout balance.
- Unread support/customer messages.
- Rejected or pending products.
- Top products.
- Sales and performance widgets.
- Seller health/scorecard indicators.

The dashboard is designed as an action center:

```text
What needs action now?
How is the business performing?
What is hurting performance?
```

### 3. Product And Catalog Management

Vendors can:

- Create products.
- Save drafts.
- Submit products for moderation.
- Edit existing products.
- Manage product images and media.
- Manage variants, SKU, price, stock, and shipping fields.
- See approved, pending, rejected, disabled, and draft states.
- View rejection reasons.
- Use bulk upload where available.
- View product performance.

Product workflow:

```text
Vendor creates product
-> Product enters pending moderation
-> Admin approves, rejects, or requests changes
-> Approved product becomes visible to customers
-> Critical vendor edits can send product back to moderation
```

### 4. Inventory Management

Vendors can:

- Track product stock.
- See low stock and out-of-stock products.
- Update stock manually.
- Track product performance and stock risk through reports.
- Use SKU-level stock where product variant data supports it.

Inventory operations should keep:

- Customer stock status accurate.
- Product cards honest.
- Checkout stock validation reliable.
- Vendor action queues clear.

### 5. Orders And Fulfillment

Vendors can:

- View order queues by status.
- Open vendor order detail.
- See customer, payment, product, and shipping information.
- Accept/process orders.
- Add packing notes.
- Print packing slips.
- Mark orders packed.
- Mark pickup-ready.
- Generate or use shipment labels where workflow supports it.
- See assigned courier/tracking data.
- Track COD state and payment state.

Fulfillment workflow:

```text
Customer places order
-> Vendor receives vendor order
-> Vendor packs items
-> Vendor marks pickup ready
-> Manifest/courier workflow starts
-> Shipment moves through logistics state machine
-> Delivery, failure, RTO, or return flow is recorded
```

### 6. Logistics And Courier Workflow

Vendors can participate in logistics by:

- Preparing orders for dispatch.
- Printing packing slips.
- Marking pickup-ready.
- Viewing shipment/courier details.
- Working with admin-assigned or area-based courier rules.
- Handling return-to-origin and reverse logistics where assigned.

Courier assignment can be:

- Manual/internal courier.
- Local courier.
- RedX/Steadfast adapter-backed booking when admin configuration and env credentials are available.
- Future local instant delivery provider.

### 7. Returns And Disputes

Vendors can:

- View return requests linked to their products.
- Review customer reason and evidence.
- Approve or reject according to policy.
- Upload response/evidence.
- Track admin escalation.
- Track refund and vendor deduction impact.
- Mark received/inspection state where reverse logistics requires it.

Vendor return finance rule:

```text
Completed/approved refunds reduce vendor earnings through return deduction fields.
Vendor finance and admin finance views should show gross, deductions, and net payout separately.
```

### 8. Finance And Payouts

Vendors can:

- View earnings dashboard.
- See gross sales, commission, refunds, deductions, and net earnings.
- See COD pending/collected/remitted states where available.
- View transaction ledger.
- Request payouts.
- View payout history.
- Download or view statements where enabled.

Finance workflow:

```text
Order paid or COD remitted
-> Commission calculated
-> Refunds/returns deducted
-> Eligible vendor balance updated
-> Vendor requests payout
-> Admin approves/holds/rejects
-> Payout marked paid
```

### 9. Marketing And Growth

Vendors can:

- Create or request store vouchers.
- Join campaigns.
- Manage seller picks/featured products where enabled.
- View voucher and campaign performance.
- See customer engagement and repeat buyer data in reports.
- Use shop presentation features to improve conversion.

Future/advanced vendor growth:

- Sponsored product advertising.
- CPC budget management.
- Deeper campaign analytics.
- Automated promotion recommendations.

### 10. Shop, Support, And Reputation

Vendors can:

- Manage shop logo, banner, description, policy, social/contact information, and pickup details.
- Use support inbox/chat tools.
- Answer Q&A.
- Reply to reviews.
- Track response health.
- Use saved quick replies and message templates where enabled.
- See reputation and rating indicators.

## Admin Features

### 1. Admin Shell, RBAC, And Staff Control

Admins can:

- Use a role-based admin shell.
- Access permission-aware navigation.
- Use RBAC staff roles and permission matrix.
- Manage staff accounts.
- Use audit logs for sensitive actions.
- Use global search and operational shortcuts where enabled.
- Add section managers or staff accounts for operations, support, finance, moderation, marketing, logistics, or vendor management.
- Keep delete actions and platform setting changes locked to Super Admin only.

Example staff roles:

- Super admin.
- Operations manager.
- Support.
- Finance.
- Moderation.
- Marketing.

### 2. Admin Dashboard And Operations Center

Admin dashboard supports:

- GMV/order/revenue metrics.
- Active vendors/customers.
- Pending approvals.
- Queue summaries.
- Ops alerts.
- SLA indicators.
- Finance and payout exposure.
- Logistics and COD indicators.
- Analytics and reports shortcuts.

Admin operating principle:

```text
Admin does not manage only pages.
Admin manages queues, exceptions, risk, and platform controls.
```

### 3. Vendor Management

Admins can:

- View vendors list.
- Review vendor applications.
- Review KYC and shop information.
- Approve, reject, suspend, restore, or request more info.
- View requested categories.
- Review vendor products, orders, returns, finance, and performance.
- Apply tier/badge/status changes where enabled.
- Issue warnings or enforcement actions.
- View vendor audit trail.

Vendor approval workflow:

```text
Vendor submits application
-> Admin reviews KYC/profile/category/payout info
-> Admin approves, rejects, or requests more information
-> Vendor gets notification
-> Approved vendor gains seller center access
```

### 4. Product And Catalog Operations

Admins can:

- Review product moderation queue.
- Approve/reject products.
- Request edits.
- Add moderation notes.
- Edit product data on behalf of operations where enabled.
- Review duplicate/listing-quality/IP/counterfeit reports.
- Manage categories and nested category tree.
- Manage attributes and dynamic fields.
- Manage commission rules by category.
- Review brand/official store registrations where enabled.

Product moderation workflow:

```text
Vendor submits product
-> Product enters moderation queue
-> Admin checks images, category, attributes, price, policy, and vendor
-> Admin approves, rejects, disables, or requests edits
-> Result is visible to vendor with notes
```

### 5. Order Operations

Admins can:

- View global orders.
- Search orders by full or short id.
- Filter by status, vendor, payment, courier, and date.
- Open order detail panels.
- See buyer, payment, delivery, vendor split, items, discount, and timeline.
- Reassign courier.
- Override address/courier/return-window/refund actions where permitted.
- Monitor COD reconciliation.
- Monitor SLA breaches.
- Monitor fraud order queue.

Admin order workflow:

```text
Order created by customer
-> Vendor fulfills normally
-> Admin monitors exceptions
-> Admin intervenes for payment, delivery, fraud, refund, or dispute issues
```

### 6. Logistics, Courier, And COD

Admins can:

- Manage delivery zones.
- Manage courier partners.
- Set courier provider mode: manual, local, RedX, Steadfast.
- Check courier provider credential readiness.
- Assign or reassign courier.
- Manage dispatch manifests.
- Confirm pickup.
- Track failed deliveries.
- Trigger re-attempt or return-to-seller.
- Monitor RTO.
- Track COD float, collected, remitted, failed, disputed, and settled states.

Forward shipment states:

```text
created
-> pending_packing
-> packed
-> pickup_ready
-> pickup_scheduled
-> picked_up
-> in_transit
-> out_for_delivery
-> delivered
```

Exception states:

```text
delivery_failed
-> out_for_delivery
or
delivery_failed
-> return_to_origin
```

### 7. Returns, Refunds, And Disputes

Admins can:

- View return queue.
- Open return detail.
- Review customer evidence.
- Review vendor response.
- Approve/reject/escalate return cases.
- Process refunds.
- Track vendor deductions.
- Manage return-to-origin and reverse logistics states.
- Resolve disputes in favor of customer, vendor, or partial outcome.

Dispute workflow:

```text
Issue opened
-> Evidence collected
-> Vendor/customer responses reviewed
-> Admin decision recorded
-> Refund, payout hold, enforcement, or closure applied
-> Audit log persists action
```

### 8. Finance And Payout Operations

Admins can:

- View payout queue.
- Review vendor payout requests.
- Approve, reject, hold, process, or mark paid.
- View vendor ledgers.
- Reconcile refunds and deductions.
- Reconcile COD remittances.
- Manage commission rules.
- Export reports.
- Monitor payout exposure and finance risk.

Finance workflow:

```text
Orders generate gross sales
-> Commissions and deductions calculated
-> Returns/refunds adjust earnings
-> COD remittance updates settlement
-> Vendor payout request enters admin queue
-> Admin approves/holds/rejects
```

### 9. Promotions, Notifications, And Growth

Admins can:

- Create platform coupons/vouchers.
- Manage offers.
- Manage flash sales.
- Manage campaigns.
- Review vendor campaign nominations.
- Manage loyalty rules.
- Configure promotion stacking rules.
- View promotion analytics.
- Manage notification templates/logs where enabled.
- Send broadcasts and newsletters.

Promotion workflow:

```text
Promotion created or scheduled
-> Rule scope and eligibility saved
-> Customer applies or receives automatic discount
-> Checkout validates promotion
-> Order stores promotion snapshot
-> Analytics measures usage and GMV impact
```

### 10. Support And Customer Operations

Admins can:

- View support queue.
- Assign tickets.
- Manage priorities and SLA.
- Reply to customers.
- Add internal notes.
- Link tickets to customer, vendor, order, return, or product.
- Resolve or escalate cases.
- View customer profile, order history, loyalty, referrals, returns, and risk indicators.

### 11. Trust And Safety

Admins can:

- View fraud/risk dashboards.
- Review suspicious users, vendors, returns, reviews, promotions, and payouts.
- Review reports for products, reviews, vendors, and content.
- Moderate reviews and Q&A.
- Handle counterfeit/IP reports.
- Issue enforcement actions.
- Manage appeals.
- View policy violations and audit trail.
- Suspend or restrict accounts.

Trust workflow:

```text
Risk signal or report created
-> Trust queue receives case
-> Admin reviews evidence and history
-> Enforcement or clearance decision recorded
-> Appeal can be submitted where policy allows
```

### 12. Analytics And Reports

Admins can:

- View platform analytics.
- Review GMV, commission revenue, refund rate, payout exposure, support SLA, logistics SLA, COD exposure, fraud/dispute rate, active vendors, and active customers.
- View search, product, vendor, campaign, notification, logistics, trust, finance, and retention analytics where data exists.
- Export CSV/PDF reports where available.
- Monitor analytics job/data quality where enabled.

Analytics workflow:

```text
Frontend/backend events captured
-> Event stream stores raw event
-> Warehouse/aggregation jobs build daily facts
-> Admin/vendor/customer dashboards read summarized metrics
```

### 13. Platform Settings And Observability

Admins can:

- Manage platform configuration.
- Manage delivery settings.
- Manage payment/manual payment settings.
- Manage email/push configuration.
- Manage terms/policy versions.
- Use audit logs.
- Use operations monitoring for jobs, queues, email failures, push failures, and cron status where enabled.

## Current High-Value Remaining Gaps

These are not blockers for the current marketplace workflow, but they are the next professional upgrades:

### Verified Architecture Gap Status

| Item | Status | Notes |
| --- | --- | --- |
| Unified BullMQ event bus coverage | Partial | `MarketplaceEventBus` exists with Mongo outbox and optional BullMQ worker, but every domain transition still needs publisher coverage. |
| Immediate shipment draft at order creation | Implemented | Order creation creates shipment drafts per vendor/platform group. |
| Unified notification pipeline | Partial | Event-bus notification work exists, but some controllers still create/send notifications directly. |
| Search provider abstraction | Implemented | Search now uses a provider registry with MongoDB as the default provider; Typesense/Meilisearch can be added later behind the same interface. |
| Payment provider adapter | Not yet implemented | Payment logic still needs a uniform provider adapter for bKash, Nagad, Stripe, COD, and manual verification. |
| Server-side cart persistence with guest merge | Not yet implemented | Cart is still mostly client-side; add persisted carts only if cross-device guest merge is required. |
| Vendor activation checklist/score | Implemented | Vendor dashboards expose readiness and seller action-center checks. |
| Failed-job / failed-notification monitoring UI | Partial | Admin operations views expose integration/job readiness, but deeper retry/detail screens can still be expanded. |
| Analytics emission audit | Partial | Analytics/event services exist; transition-by-transition emission coverage still needs a formal audit pass. |

1. Sponsored product advertising with CPC budget and promoted labels.
2. Direct video upload workflow for product/review videos.
3. Map-pin address capture using Leaflet/OpenStreetMap.
4. EMI/installment metadata and display.
5. Formal bundle promotion rules.
6. Deeper official brand storefront pages.
7. Stronger automation for seller health alerts, lifecycle marketing, and fraud thresholds.

## Role Workflow Summary

```text
Customer discovers product
-> Customer places order
-> Payment/COD state is recorded
-> Vendor prepares and ships
-> Logistics tracks delivery
-> Customer receives, reviews, returns, or asks support
-> Admin handles approvals, exceptions, disputes, payouts, trust, and analytics
-> Finance settles vendor earnings
-> Promotions and notifications drive repeat purchase
```
