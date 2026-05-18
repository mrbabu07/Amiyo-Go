# Amiyo-Go Daraz-Level Marketplace Audit

Last audited: May 18, 2026

## Purpose

This document turns the Daraz-level marketplace plan into an executable audit for the current Amiyo-Go codebase. It lists what exists today, marks the maturity of each area, and defines the next work in the correct order: reliability first, then buyer flow, seller center, admin operations, logistics, trust, growth, analytics, and scale.

## Status Legend

- Complete: usable end to end with real routes, UI, backend logic, and tests.
- Partial: exists and is usable in places, but still has missing workflows, inconsistent UI, weak edge cases, or incomplete integration.
- Mock: UI or backend path exists but depends on simulated data, mock mode, placeholders, or incomplete external integration.
- Broken: code exists but is likely not wired correctly, unsafe, or unable to meet the expected workflow.
- Missing: no meaningful implementation found.

## Immediate Freeze Rule

Freeze new random feature work until Phase 1 is closed. The project already has many customer, vendor, admin, logistics, promotion, support, and analytics files. The current risk is not lack of pages; it is uneven completion, mixed patterns, and operational gaps.

## Inventory Snapshot

- Frontend route count: about 110 route entries in `Client/src/routes/Routes.jsx`.
- Backend route/controller handler references: about 596 route declarations across `Server/routes` and route-style controller files.
- Frontend tests: 24 suites / 93 tests at last verification.
- Backend tests: 64 suites / 404 tests at last verification.
- Major frontend shells: `CustomerLayout`, `AuthLayout`, `VendorLayout`, `AdminLayout`.
- Major backend groups: customer commerce, vendor center, admin operations, logistics, promotions, trust-safety, support, analytics, notifications, loyalty, wishlist, campaigns.

## Phase 1 Audit Summary

| Area | Current Status | Evidence | Required Next Step |
|---|---|---|---|
| Full audit | Partial | Previous docs exist, but no single maturity matrix existed before this file. | Use this file as the tracking source and update it after each sprint. |
| Project structure | Partial | Customer, vendor, admin, shared, route, service, hook, layout folders exist. Some duplicate legacy/shared UI remains. | Create a cleanup PR that removes dead/duplicate components and standardizes imports. |
| Environment validation | Complete | `Server/config/env.js` validates MongoDB, Firebase, Redis, Supabase, email, push, session/CORS configuration before startup. | Keep production envs aligned with the validator. |
| Health/readiness endpoints | Complete | `/health`, `/ready`, `/ops` and `/api/*` aliases now report liveness, readiness, dependency state, jobs, and degraded ops. | Wire external uptime/monitoring to these endpoints. |
| Security/RBAC | Complete | Backend permission resolution is role/resource/action based; admin frontend navigation and route elements are RBAC-aware. | Continue adding action-level button disables as pages are polished. |
| Idempotency | Complete | Critical checkout, guest order, payment, refund, return, vendor payout, and admin payout writes use `Idempotency-Key`. Client API adds keys automatically. | Add dashboard visibility for idempotency conflicts if ops needs it. |
| Audit logs | Complete | Sensitive admin/vendor/order/payment/return/support/upload actions are audited with redaction, clearer target types, and a unified admin audit viewer. | Add retention/export policy once compliance requirements are finalized. |
| Rate limits | Complete | Configurable global API, search, payment, product-view analytics, upload, KYC, and bulk-upload limiters are wired in `Server/index.js`. Product/campaign view analytics no longer consume the general API budget. | Tune `API_RATE_LIMIT_MAX` and `API_RATE_LIMIT_WINDOW_MS` from production traffic. |
| Sanitization | Complete | `sanitizeMiddleware` is wired before API routes. | Add route-specific validation schemas during page cleanup. |
| Helmet/security headers | Complete | `helmet` and strict CORS allowlist config are wired during startup. | Maintain `CORS_ORIGINS` per environment. |
| Upload hardening | Partial | Multer filters exist for uploads and vendor product routes. | Add file scanning policy, stricter MIME/extension checks, image processing limits, and audit events. |

## Customer Feature Audit

| Feature | Status | Notes |
|---|---|---|
| Homepage discovery | Partial | `Home`, discovery APIs, hero/category/flash/recommendation concepts exist. Category strip is now sticky and product sections have empty fallbacks. Needs final vendor-highlight/trust-block adoption pass. |
| Category listing | Partial | `CategoryPage`, dynamic categories, category fields, and filters exist. Needs cleaner subcategory chips, SEO block consistency, and mobile filter bottom sheet completion. |
| Product listing `/products` | Partial | Products page exists and has improved category/daily needs work. Needs final grid consistency and complete mobile polish. |
| Search results | Partial | Search routes, autocomplete, navigation, history, bottom-sheet filters, applied chips, and zero-result recovery exist. Product autocomplete now routes to the real product detail path. Needs analytics tracking completion. |
| Product detail | Partial | Gallery, delivery, seller, Q&A, reviews, trust widgets exist. Product detail now owns product-view tracking instead of listing cards. Needs final above-fold hierarchy and consistent sticky purchase bar behavior. |
| Vendor storefront | Partial | `VendorStore`, public vendor APIs, follow status, marketing items exist. Needs final trust metrics, policy accordion, and storefront consistency. |
| Flash sale page | Partial | `FlashSales`, flash sale API/admin exist. Needs expired-state handling and stock-left UX consistency. |
| Deals/vouchers | Partial | Coupons, offers, promotions, vendor marketing exist. Needs a unified customer deals page. |
| Login/register | Partial | Pages and auth context exist. Intended URL redirects now work through shared guards. Needs full validation polish and password/reset flows. |
| Forgot/reset password | Missing | No dedicated frontend routes found. |
| Address onboarding | Partial | Address pages and Bangladesh location components exist. Needs onboarding-specific flow and validation polish. |
| Cart | Partial | Cart exists with vendor grouping and checkout CTA work. Needs final sticky summary and full voucher/coin/shipping breakdown consistency. |
| Guest checkout | Partial | `/checkout/guest` exists and guest order API exists. Needs final validation, optional account creation, and success path hardening. |
| Checkout | Partial | Checkout page and order creation exist. Needs stricter stepper enforcement, idempotency, and payment confirmation hardening. |
| Order success | Partial | `OrderConfirmation` now shows order ID copy, ETA, item count, total, trust steps, and track/detail CTAs. Needs recommended items and guest tracking hardening. |
| Account dashboard | Partial | `Profile` links profile/orders/addresses/coins/notifications/support. Needs one complete hub with embedded summaries. |
| Orders/history/detail | Partial | `Orders`, order timeline, invoice download APIs, `/orders/:orderId`, and `/orders/:orderId/track` now exist. Needs deeper item-level tracking and post-delivery action polish. |
| Wishlist | Partial | Wishlist, collections, sharing, alerts exist. Needs final grid, move-to-cart, and price-drop states. |
| Loyalty/coins | Partial | Loyalty dashboard/API exists. Needs checkout integration consistency. |
| Notifications center | Partial | `/notifications`, `MyAlerts`, notification context, preferences, and push services exist. Notifications now group by Today/Yesterday/Earlier with read/unread and type filters. Needs event-driven backend consolidation. |
| Support center | Partial | Ticket list/detail concepts and admin queue exist. Needs order-detail entry points and attachment UX finish. |
| Returns flow | Partial | `Returns`, return model/controller, vendor/admin flows exist. Needs full self-serve wizard and case detail polish. |
| Reviews | Partial | Review APIs, review components, admin moderation, vendor reply, and `/my-reviews` now exist. Needs final moderation status consistency and richer media management. |

## Vendor Feature Audit

| Feature | Status | Notes |
|---|---|---|
| Vendor route/status guard | Partial | Vendor access now uses shared status and permission guards with pending, rejected, suspended, role-sync, missing-profile, KYC-required, and vendor-staff variants. KYC self-service routes stay reachable for owners. Needs live notification counts and final backend policy alignment for KYC-blocked sellers. |
| Vendor category requests | Partial | Vendor category access now supports main/group selection, visible subcategory paths, ID-based request metadata, and admin path visibility. Needs final queue/drawer adoption when admin moderation pages are unified. |
| Vendor dashboard | Complete baseline | `VendorHome` and dashboard APIs provide KPIs, health scoring, SLA prompts, product advisor, onboarding, announcements, and workflow shortcuts. |
| Vendor products list | Partial | Status tabs, search, bulk selection, submit/delist actions, media center, bulk editor, mobile cards, and staff action locks exist. Needs final shared table standardization. |
| Add/edit product | Complete baseline | Vendor product form/detail pages now include moderation feedback, clone/edit actions, listing quality, SKU stock, and persisted edit history with reapproval signals. Needs true step wizard polish later. |
| Bulk upload | Complete | CSV upload job, report download, validation report route/UI, partial-success summary, and failed-row retry guidance exist. |
| Vendor orders | Complete | Orders list/detail, safe bulk Pack/Ready/Pickup Ready actions, pickup-ready, packing slip, barcode label APIs, delivery exception recording, mobile card fallback, and staff view-only action locks exist. |
| Vendor returns/disputes | Partial | Vendor returns, response APIs, vendor-owned detail API, `/vendor/returns/:returnId` evidence/timeline page, mobile card fallback, and staff view-only action locks exist. Needs admin decision panel alignment and final SLA/escalation polish. |
| Vendor finance | Partial | Finance summary, transactions, payouts, statements, commission rates, mobile ledger cards, payout action locks, and vendor-staff finance permission checks exist. Needs deeper ledger export/status consistency. |
| Shop management | Partial | Vendor shop, decoration, profile, vacation mode, categories exist. Needs final preview/policy/social workflow. |
| KYC/verification | Partial | Vendor KYC route, admin review, seller gate state, seller action-center prompts, document cards, rejection note display, and reupload guidance exist. Needs backend policy alignment for edge KYC-blocked sellers. |
| Shipping settings | Complete | Vendor settings now expose pickup/return addresses plus preparation time, default courier, cutoff, fee promises, pickup/self-delivery toggles, shipping notes, and return policy summary. Admin delivery settings still control final platform fee rules. |
| Vendor marketing | Partial | Vendor vouchers/campaigns and admin review exist. Needs seller promotion analytics and campaign UX polish. |
| Vendor support inbox | Partial | Vendor chat/support tools exist. Needs consistent ticket/chat thread model with customer/admin tabs. |
| Vendor staff/permissions | Complete | Vendor staff routes/model/settings exist with permission-aware seller navigation, route guards, owner-facing permission matrix, staff edit flow, owner audit history, backend finance/return permission checks, and action-level locks on key pages. |

## Admin Feature Audit

| Feature | Status | Notes |
|---|---|---|
| Admin shell | Partial | `AdminLayout`, shared `AdminRoute`, RBAC-aware navigation, route-level permission wrappers, topbar global route search, quick links, role badge, alert badges, and dark-mode toggle exist. Needs page action-level disables during queue polish. |
| Admin dashboard | Hardened baseline | Dashboard now exposes GMV, orders, active vendors, moderation queues, support SLA, payout exposure, refund rate, top vendors/categories/products, ops health, date range, and previous-period compare workflow. |
| Vendor list/detail/approval | Partial | Enhanced vendor page, detail, KYC, status actions, warnings exist. Needs consistent queue/detail drawer pattern. |
| Product moderation | Partial | Admin product queue, approve/reject/disable, duplicate/IP/brand tools exist. Needs one reusable moderation queue layout. |
| Category manager | Partial | Dynamic categories, category fields, attributes, commission concepts exist. Needs drag/drop tree and inheritance preview polish. |
| Review moderation | Partial | Admin reviews/trust-safety moderation exists. Needs unified queue/detail drawer and vendor reply visibility. |
| Orders overview/detail | Partial | Admin order management, URL/short-code search, auto-open detail, vendor split context, update forms, export, COD reconciliation, and SLA/fraud queues exist. Needs drawer/detail standardization. |
| Returns queue/decision | Partial | Admin returns and trust-safety disputes exist. Needs side-by-side evidence and decision panel consistency. |
| Payout queue/detail | Partial | Admin payouts, payout requests, finance queue exist. Needs linked-orders detail and risk indicators polish. |
| Commission settings | Partial | Finance/platform commission rules exist. Needs category inheritance preview and safer explanations. |
| Delivery/logistics settings | Partial | Logistics overview, zones, couriers, fee rules, dispatch, failed delivery exist. Needs shipment state machine as first-class model. |
| Promotions manager | Partial | Campaigns, vouchers, flash deals, homepage slots, clearance, loyalty rules exist. Needs conflict detection and order discount snapshots. |
| Notification templates/logs | Partial | Platform controls include templates/broadcast/email campaigns. Needs delivery log, retry monitor, and event bus integration. |
| Support queue | Partial | Admin support queue is now professional UI with stats/SLA/drawer. Needs internal notes, assignment persistence verification, and SLA automation. |
| Staff roles/permissions | Partial | Platform staff access, role/session policy, user permissions exist. Needs permission matrix UI and route-level enforcement pass. |
| Audit logs | Complete | `/api/admin/audit-logs` now supports unified search/filter/pagination/summary, and `/admin/audit-logs` gives admins a detail drawer for evidence review. |
| Ops monitoring | Partial | Admin operations page now merges marketplace workload queues, failed jobs, cron health, notification failures, support/return issues, payout exposure, and recent audit trails. Needs deeper retry actions and external alerting. |

## Shared Design And UI Audit

| Feature | Status | Notes |
|---|---|---|
| Design tokens | Complete | `styles/tokens.css` and `components/ui/tokens.js` define shared colors, spacing, type, radii, shadows, z-index, breakpoints, and status colors. |
| Core components | Partial | New `foundation`, `forms`, `data`, `feedback`, `overlays`, `layout`, `shopping` modules exist. Legacy `Button`, `Badge`, `Modal`, `EmptyState`, `Skeleton` also remain. |
| Layout wrappers | Partial | `CustomerLayout`, `AuthLayout`, `VendorLayout`, `AdminLayout`, `PageShell`, `PageHeader`, `SectionCard`, and `SplitLayout` exist. Needs adoption pass across older pages. |
| Status badges | Complete | `components/ui/status.js` is now the canonical status dictionary with aliases for customer, vendor, and admin labels. |
| Form system | Partial | New form components exist, but older input/form patterns remain across pages. |
| Table system | Partial | `Table`, `DataTable`, admin/vendor custom tables coexist. Needs one mobile-friendly table standard. |
| Drawer/modal system | Partial | Overlay components exist. Needs consistent use in admin/vendor queues. |
| Toast/alert system | Partial | `react-hot-toast`, custom toast context, and `Toast` coexist. Needs one placement/style system. |
| Mobile nav | Partial | Customer bottom nav exists and vendor shell now has a responsive drawer/sidebar. Needs product/cart/checkout mobile regression pass. |
| Dark mode | Partial | Theme context exists; vendor shell now follows dark-mode tokens; older vendor/admin pages still need cleanup. |
| Accessibility | Partial | Some aria/focus patterns exist. Needs route-by-route audit. |

## Backend Operations Audit

| Feature | Status | Notes |
|---|---|---|
| MongoDB models | Partial | Broad model set exists: orders, returns, vendors, payouts, analytics, audit, notifications, campaigns, dispatch. Needs model ownership and migration discipline. |
| Firebase auth | Partial | Firebase admin validates env and tokens. Needs local user fallback/error consistency. |
| Redis | Partial | Redis config and queue/cache concepts exist. Needs readiness checks and required/optional classification. |
| Supabase/storage | Partial | `storageService` and Supabase dependency exist. Needs env validation and failure-mode docs. |
| Email | Mock | Email service can run in mock mode without Brevo/SMTP config. Good for local, not production-ready. |
| Push | Partial | Push services exist; VAPID config can fail with limited functionality. Needs boot readiness classification. |
| Realtime | Partial | WebSocket realtime service attaches to server. Needs ops monitoring and auth hardening review. |
| Background jobs | Partial | Campaign scheduler, analytics cron, newsletter cron exist. Needs job dashboard and retry strategy. |
| Analytics summaries | Partial | Analytics summary rebuild and reports exist. Needs event tracking completeness. |
| Export/reporting | Partial | CSV/PDF exports exist in finance, analytics, orders, logistics. Needs job status/history center. |

## First 10 Concrete Moves - Current Status

| Move | Status | Next Action |
|---|---|---|
| 1. Add full audit log | Complete | Sensitive-operation audit middleware, unified admin audit endpoint, and searchable admin audit viewer are implemented and tested. |
| 2. Add admin RBAC | Complete | Admin backend permissions, frontend nav filtering, and admin route guards are resource/action aware. |
| 3. Add guest checkout | Complete | Existing guest checkout is now protected by critical-write idempotency. UX polish continues in buyer-flow phase. |
| 4. Rebuild product page | Partial | Finish above-fold hierarchy and sticky purchase bar behavior. |
| 5. Rebuild cart and checkout | Partial | Idempotent order placement is complete. Remaining work belongs to the Phase 3 buyer-flow rebuild. |
| 6. Add support ticket system | Partial | Add internal notes, order/product quick-open entry points, attachment preview, SLA automation. |
| 7. Add returns case workflow | Partial | Finish customer wizard, vendor dispute page, admin decision panel, refund tracking. |
| 8. Add vendor status + KYC pages | Partial | Shared vendor gate now has missing-profile, role-sync, missing-KYC, KYC-pending, rejected, suspended, and pending states. Finish richer KYC document cards and backend policy alignment. |
| 9. Add admin moderation queues | Partial | Convert vendor/product/review/return/support/payout pages to one queue + drawer pattern. |
| 10. Add logistics state machine | Partial | Define canonical shipment/COD/reverse-logistics state machine and enforce transitions. |

## Recommended Build Order For This Codebase

1. Close Phase 1 reliability gaps: env validator, health/ready/ops, rate limiter wiring, sanitizer wiring, helmet, idempotency.
2. Do a design-system adoption pass on the highest-traffic pages: product, cart, checkout, account, vendor products, vendor orders, admin queues.
3. Finish customer buy flow: product detail, cart, checkout, guest checkout, order success, order detail.
4. Finish support/returns/reviews: customer entry points, vendor response, admin queues, audit events.
5. Finish vendor seller center: dashboard, product workflow, orders, finance, shop, KYC, marketing.
6. Finish admin operations: queue pattern, detail drawers, RBAC navigation, retry controls.
7. Build canonical logistics and COD state machines.
8. Consolidate promotions, notifications, analytics, and exports behind event-driven workflows.
9. Run UI consistency and mobile-first review across every role.
10. Prepare scale work: cache category/homepage blocks, paginate large lists, move heavy jobs to queues.

## Phase 1 Definition Of Done

Phase 1 reliability/security implementation is done when:

- This audit is reviewed and updated with owner/date per feature.
- No new unrelated feature work is merged during cleanup.
- `/health`, `/ready`, and `/ops` exist and are tested. Done.
- Required env values are validated before server startup. Done.
- Rate limiting, sanitization, helmet, and CORS allowlist are wired. Done.
- Idempotency exists for order placement, refunds, payouts, and payment verification. Done.
- Audit logging covers admin, finance, payout, refund, vendor status, KYC, support, and moderation actions. Done through sensitive route middleware.
- Admin RBAC is enforced on backend routes and frontend page/action visibility. Done for backend checks, admin navigation, and admin route elements.

Structural cleanup remains an ongoing safety task: remove duplicate UI components and dead pages only when their replacement route has tests or a verified owner. Mass deletion is intentionally not part of the Phase 1 reliability gate because this project still has many active legacy routes.

## Phase 2 Implementation Snapshot

Current Phase 2 foundation work completed:

- Shared CSS/JS token foundation added in `Client/src/styles/tokens.css` and `Client/src/components/ui/tokens.js`.
- Canonical status registry added in `Client/src/components/ui/status.js`.
- Legacy and new status badges now read from the same status language.
- Shared route guards added in `Client/src/routes/guards.jsx`: `PublicRoute`, `CustomerRoute`, `VendorRoute`, `VendorStatusGuard`, `AdminRoute`, `RBACGuard`, and `GuestCheckoutRoute`.
- `CustomerLayout` and `AuthLayout` are now explicit shells; `MainLayout` remains a compatibility export.
- `VendorLayout` was rebuilt with lucide icons, stable seller-center navigation order, desktop sidebar, mobile drawer, dark mode support, and consistent content width.
- `VendorLayout` now includes a seller action center instead of a decorative notification bell, with KYC, order, product, return, payout, campaign, and support shortcuts.
- Route-level error boundaries now wrap lazy route elements.

Remaining Phase 2 adoption work:

- Replace legacy root-level buttons/forms/tables page by page.
- Convert vendor/admin tables to the shared table plus mobile card fallback.
- Remove page-local `Toaster` instances after each page moves to the global feedback pattern.
- Run a visual mobile pass on product, cart, checkout, vendor products, vendor orders, and admin queues.

## Phase 3 Customer Journey Snapshot

Phase 3 is not fully complete yet. The customer route map is broad and many buying-flow pieces exist, but the journey is still a set of partial workflows rather than a fully polished end-to-end customer system.

Current Phase 3 status by step:

| Step | Status | Evidence / Gap |
|---|---|---|
| 3.1 Homepage | Partial | Hero, category strip, flash sale, personalized/trending/new-arrival sections, skeletons, and empty fallbacks exist. Category strip is now sticky. Needs final top-vendor and footer trust block consistency. |
| 3.2 Category browsing | Partial | `/categories`, `/category/:category`, and `/products?category=` exist. Search catalog has filters, bottom sheet, applied chips, sort, pagination, and zero-state recovery. Dedicated category landing pages still need the same filter depth. |
| 3.3 Search | Partial | Autocomplete, recent/popular/product/category suggestions, search result filters, chips, sort, and zero-result recovery exist. Product suggestions now route to `/product/:id`. Needs analytics for popular/zero-result/click events. |
| 3.4 Product detail | Partial | Gallery, title/rating/sold count, price, variants, delivery, seller info, reviews, Q&A, related products, and view dedupe exist. Needs final above-fold hierarchy and sticky purchase regression pass. |
| 3.5 Cart | Partial | Vendor grouping, voucher, delivery breakdown, empty state, and sticky mobile CTA exist. Needs final loyalty/coin consistency between cart and checkout. |
| 3.6 Guest checkout | Partial | Public `/checkout/guest`, cart preservation, address capture, and payment selection exist. Needs optional account creation/merge workflow. |
| 3.7 Checkout | Partial | Address, payment, review progress, saved addresses, payment cards, vouchers, loyalty points, and idempotent order placement exist. Authenticated checkout now lands on the success page. Needs stricter step blocking and payment confirmation hardening. |
| 3.8 Success/tracking | Partial | Success page, `/orders/:orderId`, `/orders/:orderId/track`, timeline, invoice summary, support/return shortcuts, and invoice download exist. Needs guest-accessible tracking and recommended items. |
| 3.9 Account dashboard | Partial | Profile hub links orders, addresses, wishlist, coins, notifications, support, returns, and reviews. Needs embedded summaries instead of mostly navigation cards. |
| 3.10 Orders pages | Partial | Order history, detail, tracking, reorder, invoice, return, support, and review entry points exist. Needs item-level tracking polish. |
| 3.11 Support pages | Partial | Support list/detail/thread, create-ticket, FAQ, bot, linked order/return fields, and escalation entry points exist. Needs attachment preview polish and persistent assignment/SLA refinement. |
| 3.12 Returns pages | Partial | Returns wizard, active/completed returns, evidence upload, refund method, timeline, and support escalation exist. Needs dedicated per-return detail route. |
| 3.13 Reviews pages | Partial | Product review form and `/my-reviews` list/edit/remove page exist. Needs final moderation-status language and richer media editing. |
| 3.14 Notifications | Partial | `/notifications` now consolidates order, return, support, promotion, and wishlist updates with Today/Yesterday/Earlier groups, filters, stats, mark-all-read, clear, and click-through actions. Needs event-driven backend consolidation and delivery-log linkage. |
| 3.15 Trust content | Partial | Delivery, seller, buyer protection, return/support/review signals appear across key pages. Needs a final copy/placement pass across every customer route. |

Latest Phase 3 implementation slice:

- Authenticated checkout now routes to `/order-confirmation` with order ID, ETA, payment method, total, and item count.
- Order success now includes order ID copy, trust steps, Track Order, and Order Details CTAs.
- Added dedicated private routes `/orders/:orderId` and `/orders/:orderId/track`.
- Added `OrderDetail` with timeline, delivery/payment details, invoice summary, invoice download, support shortcut, return shortcut, and review shortcuts.
- Added `/my-reviews` for customer review management with status badges, verified badge, edit, remove, media preview, and vendor reply display.
- Added `customerOrders` helper coverage with black-box and white-box Jest tests.
- Fixed search autocomplete product suggestions to navigate to `/product/:id`.
- Added `/notifications` customer notification center with grouped timeline sections, unread/type filters, summary stats, refresh, mark-all-read, clear actions, product-alert handoff, and black-box/white-box helper tests.

## Phase 4 Vendor Seller Center Snapshot

Phase 4 seller-center implementation is complete for the current codebase baseline. The vendor area now has operational coverage for shell/status access, dashboard, product workflow, bulk upload, orders, returns, finance, reports, shop, KYC, marketing, support/reviews, settings, and staff permissions. Remaining work is advanced polish that belongs to later admin/logistics/design-system phases: shared table adoption, cross-role queue alignment, and richer analytics.

Current Phase 4 status by step:

| Step | Status | Evidence / Gap |
|---|---|---|
| 4.1 Vendor shell/status gate | Complete | `VendorLayout` has grouped seller navigation, responsive sidebar, seller action center, `/vendor` dashboard redirect, shared status gate states, and permission-filtered staff navigation. |
| 4.2 Dashboard home | Complete | `VendorHome` has KPIs, action widgets, health scoring, announcements, top products, sales chart, SLA/stock signals, and pending-task prompts. |
| 4.3 Products workflow | Complete | Product list, add/edit, product detail/performance view, moderation status, mobile product cards, mobile bulk-edit cards, media center, CSV upload route, category requests, variants/SKU concepts, and staff action locks exist. |
| 4.4 Bulk upload/media | Complete | Bulk upload and media-center views exist with CSV validation, job processing, partial-success report snapshots, failed-row guidance, and report download. |
| 4.5 Orders operations | Complete | Vendor orders queue, filters, status actions, packing slips, labels, pickup scheduling, buyer messages, return links, timeline, `/vendor/orders/:orderId` detail workspace, delivery exception recording, mobile card fallback, and staff action locks exist. |
| 4.6 Returns/disputes | Complete | Vendor returns list, response flow, vendor-owned detail API, mobile card fallback, financial exposure summary, customer/seller evidence panels, timeline, counter-evidence response UX, and staff action locks exist. |
| 4.7 Finance center | Complete | Finance overview, transactions, mobile ledger cards, statements, commissions, payouts, payout request components, and finance staff action locks exist. |
| 4.8 Reports/analytics | Complete | Vendor reports routes for sales, products, traffic, inventory, trend comparison, top products, visibility, repeat buyers, and risk signals exist. |
| 4.9 Store customization | Complete | Vendor shop profile, decoration, categories, banner/logo, policies, coupon banner, campaign theme mode, seller picks, and preview concepts exist. |
| 4.10 KYC/verification | Complete | KYC upload/review exists, seller gate exposes missing-KYC/KYC-pending states, and the seller KYC page has document cards, reviewer notes, status guidance, and reupload flow. |
| 4.11 Marketing tools | Complete | Vendor vouchers, campaigns, campaign nominations, bundles, free shipping, seller picks, submissions, and marketing analytics exist. |
| 4.12 Support/reviews | Complete | Vendor messages, support chat/tools, quick replies/templates, reviews, Q&A, and staff-aware access exist. |
| 4.13 Settings/staff | Complete | Payout, address, shipping rules, vacation, staff, staff audit trail, notifications, security, staff role presets, owner permission matrix editing, permission-aware route guards, and backend finance/return permission checks exist. |

Latest Phase 4 implementation slice:

- Added `vendorSellerCenter` helper utilities for KYC state mapping, vendor gate decisions, action-center items, action counts, and readiness scoring.
- Replaced the static vendor header bell with a real seller action center linking KYC, orders, products, returns, payouts, campaigns, and customer communication.
- Added `/vendor` index redirect to `/vendor/dashboard`.
- Expanded the shared vendor status gate with role-sync, missing-KYC, and KYC-pending states while keeping KYC/settings/support self-service routes reachable.
- Added black-box and white-box Jest tests for seller-center gate and action logic.
- Added `/vendor/products/:id` product detail view with media, moderation state, listing quality, SKU inventory, sales signals, timeline, submit/delist/delete actions, and black-box/white-box helper tests.
- Added `/vendor/returns/:returnId` return dispute detail view with customer evidence, seller evidence, financial exposure, order context, timeline, and approve/dispute/reject response submission.
- Added vendor return detail API coverage and black-box/white-box frontend tests for return status, evidence, financial exposure, and timeline logic.
- Added `/vendor/orders/:orderId` order detail workspace with fulfillment actions, pickup scheduling, buyer messaging, packing slip/waybill downloads, customer address copy, product list, financial summary, timeline, and linked returns.
- Added black-box and white-box frontend tests for vendor order status derivation, action availability, financial totals, address formatting, and timeline logic.
- Added `vendorStaffPermissions` helper, route guard, seller navigation filtering, staff-aware action shortcuts, vendor-staff seller gate support, and black-box/white-box tests for permission behavior.
- Added mobile card fallbacks for vendor orders and vendor returns so seller operations are usable below desktop table widths.
- Extended vendor finance, return, report, marketing, and category-access routes to use vendor-staff permission checks, and allowed vendor-staff users to load their linked vendor profile.
- Added mobile product-list cards, mobile bulk-edit cards, finance transaction cards, payout action locks, richer KYC document cards, owner staff permission matrix editing, and staff view-only action locks across product/order/return detail flows.
- Added owner-only vendor staff audit history backed by `vendor_staff_audit_logs`, with invite/update/remove audit entries and staff permission diff summaries in settings.
- Added vendor delivery exception recording for order detail so sellers can log missed pickup, address, damage, COD dispute, retry, and admin-help cases against order timelines.
- Added vendor shipping-rule clarity in settings with preparation time, default courier, cutoff hour, fee promises, pickup/self-delivery toggles, shipping notes, and return-policy summary persisted through the vendor profile.
- Added bulk-upload report snapshots so completed CSV jobs expose partial success, failed-row samples, and clearer retry guidance while keeping the downloadable report.
- Added backend white-box tests for vendor staff audit helpers and bulk-upload report snapshots, and expanded vendor settings controller coverage for delivery settings.
- Added safe vendor order bulk workflow helpers and UI actions for Pack, Ready to Ship, and Pickup Ready without moving shipped/delivered/returned orders backward.
- Added persisted vendor product edit history for changed listing fields, staff attribution, critical-field detection, and reapproval-required signals in the vendor product timeline.
- Added frontend black-box/white-box tests for vendor bulk order workflow and backend controller tests for critical/non-critical product edit history.

## Phase 5 Admin Marketplace Operations Snapshot

Phase 5 admin operating-system work is now implemented as a queue-driven baseline for the current codebase. The admin area already had many role-specific pages; the latest work connects those surfaces through a single operations command center and shared queue detail patterns for marketplace workloads, SLA pressure, payout exposure, failed notifications, job health, and recent audit activity.

Current Phase 5 status by step:

| Step | Status | Evidence / Gap |
|---|---|---|
| 5.1 Admin shell | Hardened baseline | Admin shell includes RBAC-aware navigation, alert badges, resource-aware topbar search, quick links, role badge, and dark-mode toggle. |
| 5.2 Queue-based model | Complete | `/admin/operations` now normalizes vendor approval, KYC, product moderation, review moderation, returns, support, payouts, and failed-notification queues with SLA/risk/exposure signals. |
| 5.3 Vendor management | Complete baseline | Vendor requests, detail, KYC, status actions, category access, bulk actions, and shared vendor approval drawer exist. Advanced history/risk scoring can continue in later hardening. |
| 5.4 Product moderation | Complete baseline | Product queue, approve/reject/disable, scans, duplicates, IP, brand tools, and shared queue detail drawer exist. |
| 5.5 Review moderation | Complete baseline | Review moderation/trust-safety queues feed operations workload, and review management now has shared risk metrics plus a right-side detail drawer with reply/delete actions. |
| 5.6 Support operations | Complete baseline | Support queue has stats, SLA, assignment UI, linked resources, and thread drawer. Future hardening: deeper internal-note automation verification. |
| 5.7 Returns decision | Complete baseline | Return queue/dispute workflows feed operations workload, and returns now use shared decision metrics plus a side-by-side customer/vendor evidence drawer. |
| 5.8 Payout operations | Hardened baseline | Payout queue, payout requests, approvals/rejections/paid states, finance overview, payout exposure signals, linked eligible orders, return deductions, prior payout history, and payout request detail drawer exist. |
| 5.9 Order operations | Hardened baseline | Admin orders, hash-style short-code search, auto-open detail on single search result, vendor split context, status/payment/delivery views, SLA/fraud queues, export, and override endpoints exist. Future hardening: override action audit UI polish. |
| 5.10 Categories/commission | Complete baseline | Dynamic categories, attributes, category requests, platform commission rules, and finance rules exist. Future hardening: drag/drop tree and inheritance preview polish. |
| 5.11 Delivery/logistics | Complete baseline | Logistics overview, zones, couriers, fee rules, dispatch manifest, failed delivery, COD float, and audit log exist. Future hardening: canonical shipment state-machine enforcement. |
| 5.12 Promotions manager | Complete baseline | Promotions, coupons, flash sales, offers, campaigns, and vendor marketing review exist. Future hardening: stronger conflict detection and order discount snapshots. |
| 5.13 Notifications/templates | Complete baseline | Platform controls include broadcasts, templates, email campaigns, announcements, and failed delivery signals in operations. Future hardening: retry controls from delivery-log rows. |
| 5.14 Analytics/reports | Hardened baseline | Admin dashboard/analytics expose GMV, commission, vendors, categories, products, refunds, payout exposure, support SLA, ops health, exports, date range, and previous-period compare controls. Future hardening: more event-backed funnel data. |
| 5.15 Audit/observability | Complete baseline | Audit middleware, domain audit logs, operations page, queue monitors, and searchable `/admin/audit-logs` viewer exist. Future hardening: external alerting and retry actions from failed-job/notification rows. |
| 5.16 Staff/RBAC | Complete baseline | Staff access, roles, permissions, session policy, 2FA setup, RBAC route guards, and permission-filtered navigation exist. Future hardening: richer permission matrix editing UX. |

Latest Phase 5 implementation slice:

- Added backend `buildAdminQueueWorkload` helpers for vendor approval, KYC review, product moderation, review moderation, returns/disputes, support, payouts, and failed notifications.
- Extended `/api/admin/dashboard/operations` to return `queueWorkload`, open queue item totals, SLA breach counts, warning queue counts, and payout exposure.
- Added queue issue rows for vendor, KYC, product, review, and payout work so the operations issue list points to the right admin workspace.
- Added marketplace workload cards to `AdminOperations` with queue status, open count, SLA breaches, risk count, exposure, and direct links.
- Added `adminOperationsCenter` frontend helpers plus black-box and white-box Jest tests for queue summaries, filtering, tones, and exposure formatting.
- Added admin shell topbar route search and dark-mode toggle while preserving permission-filtered navigation.
- Expanded backend operations helper tests for queue SLA scoring and normalized Phase 5 workload generation.
- Added unified `/api/admin/audit-logs` filters for search, module, severity, actor, target, date range, pagination, and operational summaries.
- Added `/admin/audit-logs` with summary cards, desktop table, mobile cards, and a right-side evidence drawer for actor/target/request/metadata/diff review.
- Added admin audit-log frontend black-box/white-box helper tests and backend controller tests for query construction, severity derivation, normalization, and paginated responses.
- Added shared admin queue primitives for status badges, queue metrics, right-side detail drawers, and key/value evidence sections.
- Added `adminQueuePattern` helpers plus black-box and white-box tests for product, payout, vendor, review, return, and support queue normalization, search/status/type filtering, tone mapping, date fallbacks, vendor readiness, and summary cards.
- Adopted the shared queue drawer in product moderation and payout requests so admins can review listing evidence, vendor/payment detail, and decision actions without leaving the queue.
- Expanded the shared queue drawer pattern to vendor approvals, review moderation, and return decisions so Phase 5 admin operations now use one queue contract across the highest-risk workflows.

Phase 5 hardening pass:

- Added resource-aware admin topbar search for order references, vendor IDs, product IDs, payout requests, returns, support tickets, email, and phone lookups while preserving RBAC-filtered route suggestions.
- Wired admin search query parameters into product, vendor, payout, return, and support queues so searched resources land in an already-filtered workspace.
- Hardened payout request review with linked eligible-balance context, delivered-order rows, return deductions, and prior payout history inside the finance drawer.
- Added `adminResourceSearch` black-box and white-box tests, and expanded payout queue risk tests for large/held payout requests.

Order search hardening pass:

- Added `#DD3556FE`-style admin order search support from the topbar into `/admin/orders?search=...`.
- The admin orders page now hydrates URL search/vendor filters, filters on first load, and auto-opens the detail/update forms when one matching order is found.
- Admin order detail now shows buyer/payment/delivery summary plus vendor order split, vendor-order status, commission, vendor earnings, item statuses, and vendor profile/order shortcuts.
- Backend order search now normalizes `#` and `order` prefixes, escapes regex input, searches order/invoice/tracking fields, and matches short ObjectId fragments through `$toString`.
- Added `Order.adminSearch` model tests alongside admin order management coverage.

Admin dashboard workflow pass:

- Expanded `/api/admin/dashboard/overview` with active vendors, support open/SLA breach counts, review moderation count, failed notifications, failed bulk jobs, payout exposure, refund amount/rate, previous-period comparison, operations summary, and top categories.
- Updated `/admin` dashboard cards so every major marketplace signal links into the relevant workflow: orders, approvals, support, payouts, operations, analytics, categories, products, returns, reviews, KYC, and notification failures.
- Added dashboard UI for support SLA, failed notifications, failed jobs, analytics cron health, top categories, refund rate, payout exposure, and previous-period GMV/order/commission/refund compare chips.
- Expanded admin dashboard controller tests for the new workflow metrics, top categories, compare payload, and ops summary fields.
