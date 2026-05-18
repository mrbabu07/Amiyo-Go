const KPI_GROUPS = {
  customer: [
    { key: "sessions", label: "Sessions", definition: "Unique browsing sessions in the selected period.", source: "event_stream", grain: "daily" },
    { key: "productViews", label: "Product views", definition: "Count of product detail impressions.", source: "event_stream.product_viewed", grain: "daily" },
    { key: "addToCartRate", label: "Add-to-cart rate", definition: "Add-to-cart events divided by product views.", source: "event_stream", grain: "daily" },
    { key: "checkoutStartRate", label: "Checkout start rate", definition: "Checkout-started events divided by add-to-cart events.", source: "event_stream", grain: "daily" },
    { key: "checkoutCompletionRate", label: "Checkout completion rate", definition: "Placed orders divided by checkout-started events.", source: "orders,event_stream", grain: "daily" },
    { key: "conversionRate", label: "Conversion rate", definition: "Paid or placed orders divided by sessions.", source: "orders,event_stream", grain: "daily" },
    { key: "averageOrderValue", label: "AOV", definition: "GMV divided by non-cancelled orders.", source: "orders", grain: "daily" },
    { key: "repeatPurchaseRate", label: "Repeat purchase rate", definition: "Customers with more than one delivered order divided by buyers.", source: "orders", grain: "cohort" },
    { key: "retentionByCohort", label: "Retention by cohort", definition: "Repeat activity by first-purchase cohort.", source: "orders,event_stream", grain: "monthly" },
    { key: "wishlistUsage", label: "Wishlist usage", definition: "Wishlist-add events and active wishlist customers.", source: "event_stream,wishlists", grain: "daily" },
    { key: "notificationCtr", label: "Notification CTR", definition: "Notification clicks divided by opens or delivered notifications.", source: "event_stream,notification_queue", grain: "daily" },
  ],
  vendor: [
    { key: "gmv", label: "GMV", definition: "Gross merchandise value from non-cancelled vendor orders.", source: "orders", grain: "daily" },
    { key: "netSales", label: "Net sales", definition: "Vendor GMV minus returns, refunds, commission, and adjustments.", source: "orders,returns,payouts", grain: "daily" },
    { key: "orderCount", label: "Order count", definition: "Vendor order count excluding failed orders.", source: "orders", grain: "daily" },
    { key: "productApprovalRate", label: "Product approval rate", definition: "Approved listings divided by submitted listings.", source: "products", grain: "daily" },
    { key: "returnRate", label: "Return rate", definition: "Returned order items divided by sold order items.", source: "returns,orders", grain: "daily" },
    { key: "cancellationRate", label: "Cancellation rate", definition: "Cancelled vendor orders divided by vendor orders.", source: "orders", grain: "daily" },
    { key: "fulfilmentSpeed", label: "Fulfilment speed", definition: "Average time from order placement to packed or pickup-ready.", source: "shipments,shipment_events", grain: "daily" },
    { key: "stockoutRate", label: "Stockout rate", definition: "Out-of-stock SKUs divided by active SKUs.", source: "products,stock_alerts", grain: "daily" },
    { key: "voucherUsage", label: "Voucher usage", definition: "Vendor voucher redemptions and influenced GMV.", source: "promotion_redemptions", grain: "daily" },
    { key: "campaignGmv", label: "Campaign GMV", definition: "GMV influenced by active campaigns.", source: "campaign_orders,promotion_snapshots", grain: "daily" },
  ],
  platform: [
    { key: "totalGmv", label: "Total GMV", definition: "Marketplace GMV from non-cancelled orders.", source: "orders", grain: "daily" },
    { key: "commissionRevenue", label: "Commission revenue", definition: "Platform commission captured from order items.", source: "orders", grain: "daily" },
    { key: "refundRate", label: "Refund rate", definition: "Refunded order value divided by GMV.", source: "returns,orders", grain: "daily" },
    { key: "payoutExposure", label: "Payout exposure", definition: "Pending payout liability and active payout holds.", source: "vendor_payouts,payout_holds", grain: "daily" },
    { key: "supportSla", label: "Support SLA", definition: "Support tickets resolved within SLA.", source: "support_tickets", grain: "daily" },
    { key: "logisticsSla", label: "Logistics SLA", definition: "Shipments meeting packing, pickup, and delivery SLA.", source: "shipments", grain: "daily" },
    { key: "rtoRate", label: "RTO rate", definition: "Return-to-origin shipments divided by shipped orders.", source: "shipments", grain: "daily" },
    { key: "codExposure", label: "COD exposure", definition: "COD collected or pending but not remitted.", source: "shipments,payments", grain: "daily" },
    { key: "fraudDisputeRate", label: "Fraud/dispute rate", definition: "Open trust cases divided by order volume.", source: "risk_profiles,reports,trust_disputes", grain: "daily" },
    { key: "activeVendors", label: "Active vendors", definition: "Approved vendors with orders or active listings.", source: "vendors,orders,products", grain: "daily" },
    { key: "activeCustomers", label: "Active customers", definition: "Customers with sessions, carts, wishlists, or orders.", source: "event_stream,orders", grain: "daily" },
  ],
};

const EVENT_TAXONOMY = [
  "homepage_viewed",
  "category_viewed",
  "search_performed",
  "search_no_result",
  "product_viewed",
  "product_shared",
  "add_to_cart",
  "remove_from_cart",
  "checkout_started",
  "payment_method_selected",
  "order_placed",
  "order_paid",
  "order_delivered",
  "return_requested",
  "return_approved",
  "voucher_applied",
  "flash_sale_clicked",
  "wishlist_added",
  "vendor_followed",
  "notification_sent",
  "notification_delivered",
  "notification_opened",
  "notification_clicked",
  "shipment_packed",
  "shipment_picked_up",
  "shipment_in_transit",
  "shipment_out_for_delivery",
  "shipment_delivered",
  "shipment_delivery_failed",
  "return_to_origin",
  "review_submitted",
  "support_ticket_created",
  "support_ticket_resolved",
  "payout_requested",
  "payout_paid",
  "trust_report_submitted",
  "enforcement_created",
  "experiment_exposed",
  "experiment_converted",
];

const EVENT_ALIASES = {
  "homepage.viewed": "homepage_viewed",
  "category.viewed": "category_viewed",
  "search.performed": "search_performed",
  search: "search_performed",
  "search.no_result": "search_no_result",
  "product.viewed": "product_viewed",
  "product.shared": "product_shared",
  "cart.added": "add_to_cart",
  "cart.removed": "remove_from_cart",
  "checkout.started": "checkout_started",
  "payment_method.selected": "payment_method_selected",
  "order.placed": "order_placed",
  "order.paid": "order_paid",
  "order.delivered": "order_delivered",
  "return.requested": "return_requested",
  "return.approved": "return_approved",
  "voucher.applied": "voucher_applied",
  "flash_sale.clicked": "flash_sale_clicked",
  "wishlist.added": "wishlist_added",
  "vendor.followed": "vendor_followed",
  "notification.opened": "notification_opened",
  "notification.clicked": "notification_clicked",
  "shipment.out_for_delivery": "shipment_out_for_delivery",
  "shipment.delivered": "shipment_delivered",
  addToCart: "add_to_cart",
  checkoutStarted: "checkout_started",
};

const EVENT_SCHEMA_VERSION = "analytics-event-v1";

const normalizeEventName = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const cleaned = raw.replace(/([a-z])([A-Z])/g, "$1_$2").replace(/[.\s-]+/g, "_").toLowerCase();
  return EVENT_ALIASES[raw] || EVENT_ALIASES[cleaned] || cleaned;
};

const getEventDefinition = (eventName) => {
  const normalized = normalizeEventName(eventName);
  return {
    eventName: normalized,
    valid: EVENT_TAXONOMY.includes(normalized),
    schemaVersion: EVENT_SCHEMA_VERSION,
    required: ["eventName", "timestamp"],
    dimensions: ["actorId", "role", "sessionId", "anonymousId", "sourcePage", "device", "resource", "metadata"],
  };
};

const listKpis = (role = "all") => {
  if (role === "all") return KPI_GROUPS;
  return KPI_GROUPS[role] || [];
};

module.exports = {
  EVENT_ALIASES,
  EVENT_SCHEMA_VERSION,
  EVENT_TAXONOMY,
  KPI_GROUPS,
  getEventDefinition,
  listKpis,
  normalizeEventName,
};
