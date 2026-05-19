# Daraz-Level Professional Feature Gap Status

This file maps the latest professional marketplace feature list against the current Amiyo-Go implementation. Use it as the working checklist for future sprints.

## Product And Catalog

| Feature | Status | Notes |
| --- | --- | --- |
| Product Q&A | Present | Customer Q&A exists on product detail with vendor/admin/community answer support. |
| Photo reviews | Present | Review upload and display support images. |
| Video reviews | Partial | Reviews now store and display hosted video URLs; direct video file upload/storage workflow is still future. |
| Review filtering and sorting | Present | Backend now honors star, verified, photo, video, newest, oldest, highest, lowest, and helpful controls. |
| Variant-specific images | Present | Product gallery prioritizes selected variant media. |
| Product video support | Present/partial | Product gallery displays product videos from product media fields; vendor upload workflow depth depends on storage setup. |
| Comparison | Present | Compare page and compare buttons exist. |
| Recently viewed | Present/partial | Recent product view recording exists; broader carousel coverage can still be expanded. |
| Product badges | Present | Product cards show flash sale, free shipping, official store, and top-rated badges. |

## Search And Discovery

| Feature | Status | Notes |
| --- | --- | --- |
| Autocomplete, history, trending | Present/partial | Search routes support autocomplete and search history. Trending depth depends on analytics volume. |
| Ranking blend | Partial | Search supports scoring/filtering; sponsored and ML-style ranking are future enhancements. |
| Sponsored product slots | Future | Needs campaign billing, placement rules, and clear promoted labels. |
| Flash sale/deal page | Present | Flash sale components/pages exist. |
| Category mega-menu | Partial | Search/navigation source exists; richer banners/featured brand panels can be expanded. |
| Brand pages | Partial | Brand fields/search exist; official brand storefront routes need dedicated polish. |

## Cart And Checkout

| Feature | Status | Notes |
| --- | --- | --- |
| Multi-vendor cart splitting | Present | Checkout groups cart by vendor and delivery breakdown. |
| Saved addresses | Present | Saved/default addresses exist with Bangladesh cascading address fields. |
| Map pin addresses | Future | Leaflet/OpenStreetMap pin capture is not complete. |
| Coupon stacking rules | Present/partial | One coupon/voucher flow exists with server-side validation; bank discount layering remains future. |
| EMI display | Future | Needs product/payment metadata and checkout display. |
| Vendor minimum order value | Partial | Vendor vouchers/minimums exist; vendor basket minimum enforcement needs central rule. |
| Checkout stepper | Present | Checkout uses progress steps and sticky mobile CTA. |

## Post-Purchase And Trust

| Feature | Status | Notes |
| --- | --- | --- |
| Estimated delivery date | Present/partial | Delivery estimate widgets exist; final accuracy improves with courier SLA data. |
| Return window countdown | Present/partial | Order/admin return-window metadata exists; customer UI can be made more prominent. |
| Buyer protection badges | Present | Product and checkout trust blocks exist. |
| Invoice PDF download | Present | Server-side invoice generation is implemented. |
| Order cancellation window | Present/partial | Order detail supports cancellation metadata; policy tuning remains operational. |

## Loyalty And Growth

| Feature | Status | Notes |
| --- | --- | --- |
| Loyalty coins | Present | Points dashboard and checkout redemption exist. |
| Membership tiers | Present/partial | Tier concepts exist in customer/vendor data; benefit automation needs depth. |
| Daily check-in | Present | Daily check-in APIs are routed and protected. |
| Referral program | Present/partial | Admin/customer referral surfaces exist; campaign depth can improve. |
| Wishlist price-drop alerts | Present/partial | Wishlist and alerts exist; lifecycle notification triggers can be expanded. |
| Bundle deals | Partial | Frequently bought together exists; formal bundle promotion rules remain future. |
| Platform sale events | Present/partial | Campaign/flash sale systems exist; 11.11/12.12 templates can be added. |
| Vendor follow | Present/partial | Vendor follow/update surfaces exist in growth layers; feed depth can grow. |

## Vendor Seller Center

| Feature | Status | Notes |
| --- | --- | --- |
| Vendor scorecard | Present | Vendor dashboard and admin vendor detail expose health/performance metrics. |
| Seller badges | Present/partial | Admin/vendor tiering exists; customer card badge rules can be expanded. |
| Performance alerts | Present/partial | Dashboard actions/health exist; automated alert thresholds can deepen. |
| Advertising dashboard | Future | Needs sponsored product budget, billing, CPC, impressions, and click tracking. |
| Commission statement | Present/partial | Finance ledger and payout statements exist; monthly downloadable statement can be hardened. |

## Trust, Safety, And Mobile

| Feature | Status | Notes |
| --- | --- | --- |
| Counterfeit/IP report | Present/partial | Product report and admin IP review routes exist. |
| Seller fraud detection | Present/partial | Trust/risk queues exist; scoring can be tuned with real data. |
| 2FA for vendor/admin | Present/partial | Speakeasy dependency and vendor security routes exist; enforce-on-role policy remains future. |
| Rate limiting | Present | Rate limiter middleware and tests exist. |
| Legal pages/versioning | Present/partial | Terms policy routes exist; customer re-acceptance UX can improve. |
| PWA | Present | Service worker/offline/PWA components exist. |
| Swipeable gallery | Present | Product media gallery supports touch swipe and zoom. |
| Mobile bottom navigation | Present | Bottom navigation component exists. |

## Highest Remaining Professional Gaps

1. Sponsored product advertising with CPC budget, promoted labels, and analytics.
2. Direct video upload for reviews/products using the chosen storage provider.
3. Map-pin address capture with Leaflet/OpenStreetMap.
4. EMI metadata and payment display.
5. Formal bundle promotion rules.
6. Deep brand storefront pages.
7. Stronger automated alert thresholds for seller health, fraud, and lifecycle marketing.
