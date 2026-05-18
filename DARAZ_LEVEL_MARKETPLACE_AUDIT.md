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
- Frontend tests: 6 suites / 25 tests at last verification.
- Backend tests: 54 suites / 372 tests at last verification.
- Major frontend shells: `MainLayout`, `VendorLayout`, `AdminLayout`.
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
| Audit logs | Complete | Sensitive admin/vendor/order/payment/return/support/upload actions are audited with redaction and clearer target types. | Add a dedicated admin audit viewer UI when the admin queue pass happens. |
| Rate limits | Complete | Global API, search, payment, upload, KYC, and bulk-upload limiters are wired in `Server/index.js`. | Tune thresholds from production traffic. |
| Sanitization | Complete | `sanitizeMiddleware` is wired before API routes. | Add route-specific validation schemas during page cleanup. |
| Helmet/security headers | Complete | `helmet` and strict CORS allowlist config are wired during startup. | Maintain `CORS_ORIGINS` per environment. |
| Upload hardening | Partial | Multer filters exist for uploads and vendor product routes. | Add file scanning policy, stricter MIME/extension checks, image processing limits, and audit events. |

## Customer Feature Audit

| Feature | Status | Notes |
|---|---|---|
| Homepage discovery | Partial | `Home`, discovery APIs, hero/category/flash/recommendation concepts exist. Needs one consistent section order and skeleton/empty handling everywhere. |
| Category listing | Partial | `CategoryPage`, dynamic categories, category fields, and filters exist. Needs cleaner subcategory chips, SEO block consistency, and mobile filter bottom sheet completion. |
| Product listing `/products` | Partial | Products page exists and has improved category/daily needs work. Needs final grid consistency and complete mobile polish. |
| Search results | Partial | Search routes, autocomplete, navigation, history, and search UI exist. Needs final chips, bottom-sheet filters, and zero-result recovery consistency. |
| Product detail | Partial | Gallery, delivery, seller, Q&A, reviews, trust widgets exist. Needs final above-fold hierarchy and consistent sticky purchase bar behavior. |
| Vendor storefront | Partial | `VendorStore`, public vendor APIs, follow status, marketing items exist. Needs final trust metrics, policy accordion, and storefront consistency. |
| Flash sale page | Partial | `FlashSales`, flash sale API/admin exist. Needs expired-state handling and stock-left UX consistency. |
| Deals/vouchers | Partial | Coupons, offers, promotions, vendor marketing exist. Needs a unified customer deals page. |
| Login/register | Partial | Pages and auth context exist. Needs full validation polish, intended URL consistency, and password/reset flows. |
| Forgot/reset password | Missing | No dedicated frontend routes found. |
| Address onboarding | Partial | Address pages and Bangladesh location components exist. Needs onboarding-specific flow and validation polish. |
| Cart | Partial | Cart exists with vendor grouping and checkout CTA work. Needs final sticky summary and full voucher/coin/shipping breakdown consistency. |
| Guest checkout | Partial | `/checkout/guest` exists and guest order API exists. Needs final validation, optional account creation, and success path hardening. |
| Checkout | Partial | Checkout page and order creation exist. Needs stricter stepper enforcement, idempotency, and payment confirmation hardening. |
| Order success | Partial | `OrderConfirmation` exists. Needs clearer ETA/order summary/recommended items. |
| Account dashboard | Partial | `Profile` links profile/orders/addresses/coins/notifications/support. Needs one complete hub with embedded summaries. |
| Orders/history/detail | Partial | `Orders`, order timeline, invoice download APIs exist. Needs dedicated detail route and action shortcuts polish. |
| Wishlist | Partial | Wishlist, collections, sharing, alerts exist. Needs final grid, move-to-cart, and price-drop states. |
| Loyalty/coins | Partial | Loyalty dashboard/API exists. Needs checkout integration consistency. |
| Notifications center | Partial | `MyAlerts`, notification context, preferences, push services exist. Needs event-driven backend consolidation. |
| Support center | Partial | Ticket list/detail concepts and admin queue exist. Needs order-detail entry points and attachment UX finish. |
| Returns flow | Partial | `Returns`, return model/controller, vendor/admin flows exist. Needs full self-serve wizard and case detail polish. |
| Reviews | Partial | Review APIs, review components, admin moderation, vendor reply exist. Needs verified-purchase enforcement review and My Reviews polish. |

## Vendor Feature Audit

| Feature | Status | Notes |
|---|---|---|
| Vendor route/status guard | Partial | Guard and status screens exist for pending/rejected/suspended/missing profile. Needs reuse of shared `VendorStatusGuard` and KYC-specific state. |
| Vendor dashboard | Partial | `VendorHome` and dashboard APIs exist. Needs stable KPI/action-widget layout and real pending task prioritization. |
| Vendor products list | Partial | Status tabs, search, bulk selection, submit/delist actions exist. Needs final table standardization and mobile fallback. |
| Add/edit product | Partial | Vendor product form/wizard-like pages exist. Needs true step wizard and moderation feedback consistency. |
| Bulk upload | Partial | CSV upload job, report download, validation report route/UI exist. Needs partial success and validation table polish. |
| Vendor orders | Partial | Orders list, status actions, pickup-ready, packing slip, barcode label APIs exist. Needs detail drawer/page consistency and label workflow hardening. |
| Vendor returns/disputes | Partial | Vendor returns and response APIs exist. Needs dispute detail UI and evidence workflow finish. |
| Vendor finance | Partial | Finance summary, transactions, payouts, statements, commission rates exist. Needs unified ledger and payout request UX completion. |
| Shop management | Partial | Vendor shop, decoration, profile, vacation mode, categories exist. Needs final preview/policy/social workflow. |
| KYC/verification | Partial | Vendor KYC route and admin review exist. Needs rejection reason/reupload polish. |
| Shipping settings | Partial | Shop/vendor settings have delivery concepts; admin delivery settings exist. Needs vendor-controlled shipping page clarity. |
| Vendor marketing | Partial | Vendor vouchers/campaigns and admin review exist. Needs seller promotion analytics and campaign UX polish. |
| Vendor support inbox | Partial | Vendor chat/support tools exist. Needs consistent ticket/chat thread model with customer/admin tabs. |
| Vendor staff/permissions | Partial | Vendor staff routes/model/settings exist. Needs permission matrix consistency and tests across UI/backend. |

## Admin Feature Audit

| Feature | Status | Notes |
|---|---|---|
| Admin shell | Partial | `AdminLayout`, `AdminRoute`, many admin pages exist. Needs RBAC-aware navigation hiding/disabling per role. |
| Admin dashboard | Partial | Dashboard and operations analytics exist. Needs final real-time ops alert quality and date compare UX. |
| Vendor list/detail/approval | Partial | Enhanced vendor page, detail, KYC, status actions, warnings exist. Needs consistent queue/detail drawer pattern. |
| Product moderation | Partial | Admin product queue, approve/reject/disable, duplicate/IP/brand tools exist. Needs one reusable moderation queue layout. |
| Category manager | Partial | Dynamic categories, category fields, attributes, commission concepts exist. Needs drag/drop tree and inheritance preview polish. |
| Review moderation | Partial | Admin reviews/trust-safety moderation exists. Needs unified queue/detail drawer and vendor reply visibility. |
| Orders overview/detail | Partial | Admin order management, detail, export, COD reconciliation, SLA/fraud queues exist. Needs drawer/detail standardization. |
| Returns queue/decision | Partial | Admin returns and trust-safety disputes exist. Needs side-by-side evidence and decision panel consistency. |
| Payout queue/detail | Partial | Admin payouts, payout requests, finance queue exist. Needs linked-orders detail and risk indicators polish. |
| Commission settings | Partial | Finance/platform commission rules exist. Needs category inheritance preview and safer explanations. |
| Delivery/logistics settings | Partial | Logistics overview, zones, couriers, fee rules, dispatch, failed delivery exist. Needs shipment state machine as first-class model. |
| Promotions manager | Partial | Campaigns, vouchers, flash deals, homepage slots, clearance, loyalty rules exist. Needs conflict detection and order discount snapshots. |
| Notification templates/logs | Partial | Platform controls include templates/broadcast/email campaigns. Needs delivery log, retry monitor, and event bus integration. |
| Support queue | Partial | Admin support queue is now professional UI with stats/SLA/drawer. Needs internal notes, assignment persistence verification, and SLA automation. |
| Staff roles/permissions | Partial | Platform staff access, role/session policy, user permissions exist. Needs permission matrix UI and route-level enforcement pass. |
| Audit logs | Partial | General audit route and domain audit logs exist. Needs a unified admin audit viewer page. |
| Ops monitoring | Partial | Admin operations page and backend operation helpers exist. Needs queue dashboards, failed jobs, cron/email/push status. |

## Shared Design And UI Audit

| Feature | Status | Notes |
|---|---|---|
| Design tokens | Partial | `components/ui/designTokens.js`, `tokens.js`, `premium-theme.css`, Tailwind classes exist. Needs one token source of truth. |
| Core components | Partial | New `foundation`, `forms`, `data`, `feedback`, `overlays`, `layout`, `shopping` modules exist. Legacy `Button`, `Badge`, `Modal`, `EmptyState`, `Skeleton` also remain. |
| Layout wrappers | Partial | `PageShell`, `PageHeader`, `SectionCard`, `SplitLayout`, shells exist. Needs adoption pass across pages. |
| Status badges | Partial | Multiple badge/status systems exist. Needs one status dictionary across customer/vendor/admin. |
| Form system | Partial | New form components exist, but older input/form patterns remain across pages. |
| Table system | Partial | `Table`, `DataTable`, admin/vendor custom tables coexist. Needs one mobile-friendly table standard. |
| Drawer/modal system | Partial | Overlay components exist. Needs consistent use in admin/vendor queues. |
| Toast/alert system | Partial | `react-hot-toast`, custom toast context, and `Toast` coexist. Needs one placement/style system. |
| Mobile nav | Partial | Customer bottom nav exists. Needs full mobile regression pass after page cleanup. |
| Dark mode | Partial | Theme context exists; vendor/admin dark mode is inconsistent. |
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
| 1. Add full audit log | Complete | Sensitive-operation audit middleware is expanded and tested. Admin audit viewer UI remains part of the admin polish pass. |
| 2. Add admin RBAC | Complete | Admin backend permissions, frontend nav filtering, and admin route guards are resource/action aware. |
| 3. Add guest checkout | Complete | Existing guest checkout is now protected by critical-write idempotency. UX polish continues in buyer-flow phase. |
| 4. Rebuild product page | Partial | Finish above-fold hierarchy and sticky purchase bar behavior. |
| 5. Rebuild cart and checkout | Partial | Idempotent order placement is complete. Remaining work belongs to the Phase 3 buyer-flow rebuild. |
| 6. Add support ticket system | Partial | Add internal notes, order/product quick-open entry points, attachment preview, SLA automation. |
| 7. Add returns case workflow | Partial | Finish customer wizard, vendor dispute page, admin decision panel, refund tracking. |
| 8. Add vendor status + KYC pages | Partial | Merge duplicate status screens and finish missing-KYC/rejection/reupload UX. |
| 9. Add admin moderation queues | Partial | Convert vendor/product/review/return/support/payout pages to one queue + drawer pattern. |
| 10. Add logistics state machine | Partial | Define canonical shipment/COD/reverse-logistics state machine and enforce transitions. |

## Recommended Build Order For This Codebase

1. Close Phase 1 reliability gaps: env validator, health/ready/ops, rate limiter wiring, sanitizer wiring, helmet, idempotency.
2. Do a design-system adoption pass on the highest-traffic pages: product, cart, checkout, account, vendor products, vendor orders, admin queues.
3. Finish customer buy flow: product detail, cart, checkout, guest checkout, order success, order detail.
4. Finish support/returns/reviews: customer entry points, vendor response, admin queues, audit events.
5. Finish vendor seller center: dashboard, product workflow, orders, finance, shop, KYC, marketing.
6. Finish admin operations: queue pattern, detail drawers, RBAC navigation, audit viewer.
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
