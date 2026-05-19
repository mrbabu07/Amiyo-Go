# Amiyo-Go Marketplace Workflow Diagrams

This document maps the intended marketplace workflow to the current Amiyo-Go codebase. It is diagram-first and should be read together with `PROJECT_WORKFLOW.md`, `MARKETPLACE_ROLE_WORKFLOWS.md`, `DARAZ_LEVEL_MARKETPLACE_AUDIT.md`, and `TESTING_DOCUMENTATION.md`.

## Current Workflow Verdict

The project broadly follows the target modular-monolith marketplace workflow:

- Customer, vendor, and admin frontends are routed through role-based React layouts.
- The backend is a Node.js/Express modular monolith with route groups for catalog, checkout/orders, payments, logistics, returns, reviews, support, promotions, trust, analytics, and admin.
- The current data store is MongoDB through both native Mongo collections and Mongoose models. The supplied PostgreSQL box is a target architecture item, not the current implementation.
- Redis is optional infrastructure. BullMQ exists for selected background workflows, and marketplace events now use a Mongo-backed outbox with an optional BullMQ worker adapter.
- Search currently uses API/database search. A dedicated search index such as Typesense is still a future adapter.
- Shipment state machines, COD states, returns, trust, growth, and analytics foundations exist, but some external integrations are still manual or adapter-ready.

## System Architecture

```mermaid
flowchart TB
    subgraph Clients
        C1[Customer Web App]
        C2[Vendor Dashboard]
        C3[Admin Dashboard]
    end

    subgraph Frontend["React Frontend"]
        FE[Role-based layouts]
        CL[CustomerLayout]
        VL[VendorLayout]
        AL[AdminLayout]
        GUARDS[Route guards and RBAC]
    end

    subgraph Backend["Node.js API - Modular Monolith"]
        API[Express API Layer]
        AUTH[Auth and Identity]
        USER[Users and Addresses]
        VENDOR[Vendors, KYC, Staff]
        CATALOG[Catalog, Products, Categories]
        SEARCH[Search and Discovery]
        CART[Client Cart and Wishlist APIs]
        CHECKOUT[Checkout via Orders]
        ORDER[Orders and Vendor Orders]
        PAYMENT[Payments, Manual Verification, Refunds]
        LOGISTICS[Shipments, Dispatch, COD]
        RETURNS[Returns and Reverse Logistics]
        REVIEW[Reviews, Q and A, Moderation]
        SUPPORT[Support Tickets and Chat]
        PROMO[Coupons, Offers, Promotions, Loyalty]
        NOTIF[Notifications, Email, Push]
        TRUST[Trust, Reports, Disputes, Enforcement]
        ANALYTICS[Analytics Events and Reports]
        ADMIN[Admin, RBAC, Audit]
    end

    subgraph Data["Current Data Layer"]
        MDB[(MongoDB)]
        MONGO[Mongoose + native Mongo models]
        REDIS[(Redis optional)]
        QUEUE[Mongo event outbox + BullMQ selected jobs]
        STORAGE[(Uploads / object storage adapters)]
        FTS[(Search index later)]
    end

    subgraph External["External Integrations"]
        EMAIL[Email Provider]
        PUSH[Push / Service Worker]
        SMS[SMS Provider later]
        COURIER[Courier APIs later]
        PAYGW[Payment APIs / webhooks]
    end

    C1 --> FE
    C2 --> FE
    C3 --> FE
    FE --> CL
    FE --> VL
    FE --> AL
    FE --> GUARDS
    GUARDS --> API

    API --> AUTH
    API --> USER
    API --> VENDOR
    API --> CATALOG
    API --> SEARCH
    API --> CART
    API --> CHECKOUT
    API --> ORDER
    API --> PAYMENT
    API --> LOGISTICS
    API --> RETURNS
    API --> REVIEW
    API --> SUPPORT
    API --> PROMO
    API --> NOTIF
    API --> TRUST
    API --> ANALYTICS
    API --> ADMIN

    AUTH --> MDB
    USER --> MDB
    VENDOR --> MDB
    CATALOG --> MDB
    SEARCH --> MDB
    CART --> MDB
    CHECKOUT --> MDB
    ORDER --> MDB
    PAYMENT --> MDB
    LOGISTICS --> MDB
    RETURNS --> MDB
    REVIEW --> MDB
    SUPPORT --> MDB
    PROMO --> MDB
    NOTIF --> MDB
    TRUST --> MDB
    ANALYTICS --> MDB
    ADMIN --> MDB
    MDB --> MONGO

    CATALOG --> STORAGE
    VENDOR --> STORAGE
    RETURNS --> STORAGE
    REVIEW --> STORAGE
    LOGISTICS --> STORAGE
    ANALYTICS --> STORAGE

    API --> REDIS
    API --> QUEUE
    SEARCH -. future .-> FTS

    QUEUE --> EMAIL
    QUEUE --> PUSH
    QUEUE -. later .-> SMS
    LOGISTICS -. later .-> COURIER
    PAYMENT --> PAYGW
```

## Module Dependency Map

```mermaid
flowchart LR
    AUTH[Auth]
    USER[Users]
    VENDOR[Vendors]
    CATALOG[Catalog]
    CATEGORY[Categories]
    SEARCH[Search]
    CART[Cart / Wishlist]
    CHECKOUT[Checkout]
    ORDER[Orders]
    VORDER[Vendor Orders]
    PAYMENT[Payments]
    LOGISTICS[Logistics]
    RETURNS[Returns]
    REVIEW[Reviews]
    SUPPORT[Support]
    PROMO[Promotions]
    LOYALTY[Loyalty]
    NOTIF[Notifications]
    TRUST[Trust]
    ANALYTICS[Analytics]
    ADMIN[Admin]
    AUDIT[Audit]

    AUTH --> USER
    USER --> CART
    USER --> CHECKOUT
    CATEGORY --> CATALOG
    VENDOR --> CATALOG
    CATALOG --> SEARCH
    CATALOG --> CART
    CART --> CHECKOUT
    PROMO --> CHECKOUT
    LOYALTY --> CHECKOUT
    CHECKOUT --> ORDER
    CHECKOUT --> PAYMENT
    ORDER --> VORDER
    ORDER --> LOGISTICS
    ORDER --> RETURNS
    ORDER --> REVIEW
    ORDER --> SUPPORT
    PAYMENT --> ORDER
    PAYMENT --> RETURNS
    RETURNS --> LOGISTICS
    VENDOR --> VORDER
    VENDOR --> LOGISTICS
    VENDOR --> PROMO
    TRUST --> REVIEW
    TRUST --> RETURNS
    TRUST --> PAYMENT
    TRUST --> VENDOR
    ADMIN --> VENDOR
    ADMIN --> CATALOG
    ADMIN --> ORDER
    ADMIN --> RETURNS
    ADMIN --> REVIEW
    ADMIN --> PAYMENT
    ADMIN --> LOGISTICS
    ADMIN --> PROMO
    ADMIN --> SUPPORT
    ANALYTICS --> ORDER
    ANALYTICS --> PROMO
    ANALYTICS --> LOGISTICS
    ANALYTICS --> REVIEW
    ANALYTICS --> SUPPORT
    NOTIF --> ORDER
    NOTIF --> RETURNS
    NOTIF --> PROMO
    NOTIF --> SUPPORT
    AUDIT --> ADMIN
```

## Customer Buying Flow

Current important routes:

- Frontend: `/products`, `/search`, `/product/:id`, `/cart`, `/checkout`, `/checkout/guest`, `/orders`, `/orders/:orderId`, `/returns`, `/support`, `/notifications`
- Backend: `/api/products`, `/api/search`, `/api/coupons/validate`, `/api/growth/promotions/evaluate`, `/api/orders`, `/api/orders/guest`, `/api/payments`, `/api/shipments/track/:orderId`, `/api/returns`

```mermaid
sequenceDiagram
    participant U as Customer
    participant FE as React Frontend
    participant API as Express API
    participant Catalog as Catalog/Search
    participant Promo as Coupon/Growth Promotion
    participant Order as Order Service
    participant VendorOrder as Vendor Order Split
    participant Pay as Payment Service
    participant Logistics as Logistics Service
    participant Notif as Notification Service
    participant Invoice as Invoice Service
    participant DB as MongoDB

    U->>FE: Browse products or search
    FE->>API: GET /products or /search
    API->>Catalog: Load products, categories, filters
    Catalog->>DB: Query products/categories
    Catalog-->>FE: Product list/detail

    U->>FE: Add item to cart
    FE->>FE: Persist cart in client cart context/storage

    U->>FE: Apply voucher or promo code
    FE->>API: POST /coupons/validate
    API->>Promo: Validate admin coupon, seller voucher, or offer code
    Promo->>DB: Fetch coupons/vendorMarketingItems/offers
    Promo-->>FE: Discount preview and finalTotal

    U->>FE: Place order
    FE->>API: POST /orders or /orders/guest
    API->>Order: Recalculate subtotal, delivery, commission, discount
    Order->>DB: Save master order with discount snapshot
    Order->>VendorOrder: Split by vendor
    VendorOrder->>DB: Save vendorOrders
    Order->>Logistics: Create shipment drafts per vendor/platform group
    Logistics->>DB: Save shipment created events
    API->>Pay: Save payment state or wait for manual verification
    Pay->>DB: Save payment/transaction data
    API->>Notif: Create customer and vendor notifications
    API->>Invoice: Generate invoice PDF from stored discounted totals
    Invoice->>DB: Read order snapshot
    API-->>FE: Order id and discounted totals
```

## Voucher and Discount Persistence Flow

This flow is important because checkout previews must match the final order, order list, and invoice.

```mermaid
sequenceDiagram
    participant FE as Checkout UI
    participant Coupon as Coupon Controller
    participant Order as Order Model
    participant DB as MongoDB
    participant Invoice as Invoice Service
    participant OrdersUI as Customer Orders UI

    FE->>Coupon: POST /api/coupons/validate code + cart items
    Coupon->>DB: Check coupons
    Coupon->>DB: Else check vendorMarketingItems
    Coupon->>DB: Else check offers
    Coupon-->>FE: discountAmount, finalTotal, source

    FE->>Order: POST /api/orders with couponCode
    Order->>DB: Re-check same source server-side
    Order->>Order: Build discountBreakdown and promotion snapshot
    Order->>DB: Store couponDiscount, totalDiscount, total, totalAmount, finalTotal

    OrdersUI->>DB: GET /api/orders/my-orders
    OrdersUI->>OrdersUI: Read discountBreakdown/totalDiscount and payable total
    Invoice->>DB: GET order for invoice
    Invoice->>Invoice: Show subtotal, discount row, delivery, payable total
```

## Vendor Operations Flow

```mermaid
flowchart TB
    VENDOR_REGISTER[Vendor registration] --> KYC[KYC and shop information]
    KYC --> ADMIN_REVIEW[Admin vendor review]
    ADMIN_REVIEW -->|approved| ACTIVE_VENDOR[Active vendor workspace]
    ADMIN_REVIEW -->|rejected/pending/suspended| STATUS_SCREEN[Vendor status screen]

    ACTIVE_VENDOR --> CATEGORY_REQUEST[Category request / allowed main category]
    CATEGORY_REQUEST --> PRODUCT_CREATE[Create product in allowed child category]
    PRODUCT_CREATE --> MODERATION[Admin product moderation]
    MODERATION -->|approved| LISTING[Product visible to customers]
    MODERATION -->|rejected| EDIT_PRODUCT[Edit product with rejection feedback]

    LISTING --> ORDER_RECEIVED[Vendor receives vendorOrder]
    ORDER_RECEIVED --> ACCEPT[Accept or process order]
    ACCEPT --> PACK[Pack items]
    PACK --> PICKUP_READY[Mark pickup ready]
    PICKUP_READY --> MANIFEST[Create/submit manifest]
    MANIFEST --> SHIPPED[Courier/admin pickup and shipment]
    SHIPPED --> FINANCE[Finance, settlement, payout visibility]

    ORDER_RECEIVED --> RETURNS[Vendor returns/dispute queue]
    ACTIVE_VENDOR --> MARKETING[Vendor vouchers/campaigns]
    ACTIVE_VENDOR --> REPORTS[Reports and analytics]
    ACTIVE_VENDOR --> SUPPORT[Messages, support, reviews, Q and A]
```

## Admin Operations Flow

```mermaid
flowchart TB
    ADMIN_LOGIN[Admin login] --> RBAC[RBAC-aware AdminLayout]
    RBAC --> DASH[Admin dashboard and operations center]

    DASH --> VENDOR_QUEUE[Vendor approval and KYC queue]
    DASH --> PRODUCT_QUEUE[Product moderation queue]
    DASH --> ORDER_QUEUE[Orders control queue]
    DASH --> RETURN_QUEUE[Returns decision queue]
    DASH --> PAYOUT_QUEUE[Payout queue]
    DASH --> SUPPORT_QUEUE[Support queue]
    DASH --> REVIEW_QUEUE[Review moderation queue]
    DASH --> TRUST_QUEUE[Trust and safety queues]
    DASH --> LOGISTICS_DASH[Logistics and COD dashboard]
    DASH --> PROMO_DASH[Promotions and growth manager]
    DASH --> ANALYTICS_DASH[Analytics and reports]
    DASH --> AUDIT_LOGS[Audit logs]

    VENDOR_QUEUE --> AUDIT_LOGS
    PRODUCT_QUEUE --> AUDIT_LOGS
    ORDER_QUEUE --> AUDIT_LOGS
    RETURN_QUEUE --> AUDIT_LOGS
    PAYOUT_QUEUE --> AUDIT_LOGS
    TRUST_QUEUE --> AUDIT_LOGS
```

## Logistics State Machine

The current code has state machines in `Server/utils/logisticsStateMachine.js` and shipment routes under `/api/shipments`, `/api/vendor/logistics`, and `/api/admin/logistics`.

```mermaid
stateDiagram-v2
    [*] --> created
    created --> pending_packing
    pending_packing --> packed
    packed --> pickup_ready
    pickup_ready --> pickup_scheduled
    pickup_scheduled --> picked_up
    picked_up --> in_transit
    in_transit --> out_for_delivery
    in_transit --> delivery_failed
    in_transit --> return_to_origin
    out_for_delivery --> delivered
    out_for_delivery --> delivery_failed
    out_for_delivery --> return_to_origin
    delivery_failed --> out_for_delivery
    delivery_failed --> return_to_origin
```

## Reverse Logistics State Machine

```mermaid
stateDiagram-v2
    [*] --> return_requested
    return_requested --> return_approved
    return_approved --> return_pickup_scheduled
    return_approved --> return_picked_up
    return_pickup_scheduled --> return_picked_up
    return_picked_up --> return_in_transit
    return_in_transit --> return_received
    return_received --> inspected
    inspected --> restocked
    inspected --> disposed
    inspected --> refurbished
```

## COD State Machine

```mermaid
stateDiagram-v2
    [*] --> cod_pending
    cod_pending --> cod_collected
    cod_pending --> cod_failed
    cod_pending --> cod_disputed
    cod_collected --> cod_remitted
    cod_collected --> cod_disputed
    cod_remitted --> cod_settled
    cod_remitted --> cod_disputed
    cod_failed --> cod_disputed
    cod_disputed --> cod_collected
    cod_disputed --> cod_failed
    cod_disputed --> cod_remitted
```

## Analytics and Intelligence Flow

```mermaid
flowchart LR
    FE[Frontend event tracker] --> API[/POST /api/analytics/events/]
    API --> EVENT_SERVICE[AnalyticsEventService]
    EVENT_SERVICE --> VALIDATE[Normalize and validate taxonomy]
    VALIDATE -->|accepted| STREAM[(event_stream)]
    VALIDATE -->|rejected| DLQ[(event_dead_letter_queue)]
    STREAM --> LEGACY[(analytics_events)]
    STREAM --> GROWTH[(growth_events)]
    STREAM --> WAREHOUSE[AnalyticsWarehouseService]
    WAREHOUSE --> FACTS[(daily fact collections)]
    FACTS --> ADMIN_REPORTS[Admin analytics reports]
    FACTS --> VENDOR_REPORTS[Vendor reports]
    FACTS --> GROWTH_DASH[Growth analytics]
```

## Marketplace Event Bus Flow

The current code has a platform-wide event bus in `Server/services/marketplaceEventBus.js`. It writes important workflow events into `marketplace_events`, stages in-app/email/push work in `marketplace_notification_queue`, and processes in-app notifications immediately when Redis/BullMQ is not enabled. When Redis is enabled with `MARKETPLACE_EVENT_USE_REDIS=true` or `REDIS_URL`, the same event IDs can be processed by the BullMQ `marketplace-events` worker.

```mermaid
sequenceDiagram
    participant Domain as Domain Controller/Service
    participant Bus as MarketplaceEventBus
    participant Events as marketplace_events
    participant Queue as marketplace_notification_queue
    participant Worker as Inline/BullMQ Worker
    participant Notifications as notifications
    participant Realtime as Realtime

    Domain->>Bus: publish(eventName, payload, actor, subject)
    Bus->>Events: Persist event with dedupe key
    Bus->>Queue: Queue notification work from payload.notifications
    Bus->>Worker: Process inline or enqueue BullMQ job
    Worker->>Notifications: Create in-app notification
    Worker->>Queue: Mark notification sent/failed
    Worker->>Events: Mark event processed/partial_failure
    Worker->>Realtime: Broadcast marketplace.event.processed
```

## Main Collections and Persistence Map

| Domain | Main current collections/models |
| --- | --- |
| Identity | `users`, Firebase identity claims, admin role/permission data |
| Vendor | `vendors`, `vendorStaff`, KYC fields, vendor category requests |
| Catalog | `products`, `categories`, dynamic category/field collections |
| Cart | Mostly frontend cart state; wishlist is persisted through `wishlists` |
| Checkout/order | `orders`, `vendorOrders`, `promotion_snapshots` |
| Payments | `payments`, manual verification fields, payment webhooks |
| Logistics | `shipments`, `shipment_events`, `manifests`, `couriers` |
| Returns | `returns`, return evidence, vendor responses, refund fields |
| Promotions | `coupons`, `offers`, `vendorMarketingItems`, campaign collections |
| Notifications | `marketplace_events`, `marketplace_notification_queue`, `notifications`, notification subscriptions, push/email logs where configured |
| Trust | risk/report/dispute/enforcement/appeal collections and audit logs |
| Analytics | `event_stream`, `analytics_events`, `growth_events`, daily analytics summary collections |
| Admin/audit | `audit_logs`, RBAC permissions and staff-role records |

## Target Diagram Match Status

| Target area | Current status | Notes |
| --- | --- | --- |
| Customer web, vendor dashboard, admin dashboard | Present | Routed through React role layouts and guards. |
| Node.js modular monolith | Present | `Server/index.js` registers domain route modules. |
| REST API | Present | Express routes under `/api/*`. |
| Realtime/push | Partial | Push/service-worker support exists; not every domain emits through one realtime bus. |
| PostgreSQL | Not current | Current database is MongoDB. PostgreSQL would be a migration, not documentation of today. |
| Redis | Partial/optional | Config exists and can be required by env, but app can run without Redis. |
| BullMQ jobs | Partial | Used for selected jobs such as bulk upload; marketplace events have a Mongo outbox and optional BullMQ worker adapter. |
| Marketplace event bus | Present | `MarketplaceEventBus` persists workflow events, queues notification work, and powers order-created/timeline events. |
| Object storage | Partial | Upload routes/services exist; storage provider depends on configuration. |
| Search index/Typesense | Future | Search currently works through API/database search. |
| Checkout to order flow | Present | `/api/orders` and `/api/orders/guest`; discount persistence is now aligned with invoice/order views. |
| Payment gateway flow | Partial | Payment records, manual verification, and webhooks exist; gateway depth depends on provider setup. |
| Logistics state machine | Present | Forward, reverse, and COD state machines exist. |
| Auto shipment draft at order placement | Present | Order creation now creates shipment drafts for each vendor/platform group; vendor logistics actions continue the state machine. |
| Admin queue operations | Present/partial | Vendors, products, orders, returns, payouts, support, trust, logistics, analytics pages exist. Depth varies by workflow. |
| Analytics event taxonomy and warehouse | Present/partial | Event ingestion, taxonomy, and intelligence services exist; dashboard completeness depends on events being emitted consistently. |

## Recommended Next Hardening Steps

1. Decide whether PostgreSQL is a real migration target. If yes, add a separate migration plan instead of mixing it into current architecture diagrams.
2. Add a server-side cart collection only if cross-device cart persistence is required.
3. Expand event-bus publishers to every remaining payment-updated, shipment-updated, return-updated, and support-replied path.
4. Add a search adapter boundary so Mongo search can later be replaced by Typesense without changing page code.
5. Add courier API adapters on top of the existing shipment drafts/state machine when a delivery partner is selected.
6. Add a diagram update checklist to every future phase so docs and workflow stay synced with implementation.
