require("dotenv").config();
const dns = require("dns");
const {
  buildCorsOptions,
  validateStartupEnv,
} = require("./config/env");
const { validateEnv } = require("./config/validateEnv");

if (process.env.NODE_DNS_SERVERS) {
  const dnsServers = process.env.NODE_DNS_SERVERS
    .split(",")
    .map((server) => server.trim())
    .filter(Boolean);
  if (dnsServers.length > 0) {
    dns.setServers(dnsServers);
    console.log(`Node DNS servers configured: ${dnsServers.join(", ")}`);
  }
}

const startupEnv = validateStartupEnv(process.env);
const serviceEnv = validateEnv(process.env, { throwOnMissing: false, allowMissingMongo: true });
const isVercelRuntime = process.env.VERCEL === "1" || process.env.VERCEL === "true";
let startupError = null;

if (!startupEnv.ok) {
  console.error("Server startup blocked by missing critical environment values:");
  startupEnv.errors.forEach((error) => {
    console.error(`- ${error.key}: ${error.message}`);
  });
  const message = startupEnv.errors.map((error) => `${error.key}: ${error.message}`).join("; ");
  startupError = new Error(`Server startup blocked by missing critical environment values: ${message}`);
  startupError.details = startupEnv.errors;
}
startupEnv.warnings.forEach((warning) => {
  console.warn(`Startup warning: ${warning.service} - ${warning.message}`);
});

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const mongoose = require("mongoose");
const cron = require("node-cron");
const { MongoClient, ServerApiVersion } = require("mongodb");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { auditSensitiveOperations } = require("./middleware/audit");
const sanitizeMiddleware = require("./middleware/sanitize");
const {
  apiLimiter,
  paymentLimiter,
  productViewLimiter,
  searchLimiter,
  uploadLimiter,
} = require("./middleware/rateLimiter");
const realtimeService = require("./services/realtimeService");
const healthRoutes = require("./routes/healthRoutes").router;

// Ensure uploads directory exists
const uploadsDir =
  process.env.UPLOADS_DIR ||
  (isVercelRuntime ? path.join(os.tmpdir(), "amiyo-go-uploads") : path.join(__dirname, "uploads"));
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log("📁 Created uploads directory");
  }
} catch (error) {
  console.warn(`Uploads directory is not writable: ${error.message}`);
}

// Import models
const User = require("./models/User");
const Product = require("./models/Product");
const Category = require("./models/Category");
const Order = require("./models/Order");
const Cart = require("./models/Cart");
const Wishlist = require("./models/Wishlist");
const Review = require("./models/Review");
const Coupon = require("./models/Coupon");
const Address = require("./models/Address");
const Return = require("./models/Return");
const Payment = require("./models/Payment");
const SupportTicket = require("./models/SupportTicket");
const LiveChat = require("./models/LiveChat");
const CustomerInsight = require("./models/CustomerInsight");
const Offer = require("./models/Offer");
const Notification = require("./models/Notification");
const NotificationDeliveryLog = require("./models/NotificationDeliveryLog");
const NotificationSubscription = require("./models/NotificationSubscription");
const Question = require("./models/Question");
const Vendor = require("./models/Vendor");
const VendorOrder = require("./models/VendorOrder");
const VendorPayout = require("./models/VendorPayout");
const VendorChat = require("./models/VendorChat");
const CategoryRequest = require("./models/CategoryRequest");
const AdminVendorChat = require("./models/AdminVendorChat");
const CategoryField = require("./models/CategoryField");
const DeliverySettings = require("./models/DeliverySettings");
const FlashSale = require("./models/FlashSale");
const Listing = require("./models/Listing");
const Recommendation = require("./models/Recommendation");
const SellerProfile = require("./models/SellerProfile");
const StockAlert = require("./models/StockAlert");
const StoreLocation = require("./models/StoreLocation");
const Permission = require("./models/Permission");
const AuditLog = require("./models/AuditLog");
const Banner = require("./models/Banner");
const PaymentVerification = require("./models/PaymentVerification");
const PlatformSettings = require("./models/PlatformSettings");
const VendorShop = require("./models/VendorShop");
const AnalyticsSummary = require("./models/AnalyticsSummary");
const OrderEvent = require("./models/OrderEvent");
const DispatchAssignment = require("./models/DispatchAssignment");
const VendorStaff = require("./models/VendorStaff");
const Shipment = require("./models/Shipment");
const Promotion = require("./models/Promotion");
const TrustSafety = require("./models/TrustSafety");
const { DEFAULT_ROLE_PERMISSIONS } = require("./config/permissions");
const analyticsService = require("./services/analyticsService");
const { initBulkUploadQueue } = require("./services/bulkUploadQueue");
const { initMarketplaceEventBus } = require("./services/marketplaceEventBus");
const newsletterBroadcastService = require("./services/newsletterBroadcastService");

// Campaign Manager models
const Campaign = require("./models/Campaign");
const CampaignProduct = require("./models/CampaignProduct");
const CampaignView = require("./models/CampaignView");
const CampaignOrder = require("./models/CampaignOrder");
const CampaignAnalytics = require("./models/CampaignAnalytics");
const CampaignAuditLog = require("./models/CampaignAuditLog");
const CampaignNotification = require("./models/CampaignNotification");

// Dynamic Category & Product models
const DynamicCategory = require("./models/DynamicCategory");
const DynamicProduct = require("./models/DynamicProduct");

// Import routes
const productRoutes = require("./routes/productRoutes");
const searchRoutes = require("./routes/searchRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const orderRoutes = require("./routes/orderRoutes");
const cartRoutes = require("./routes/cartRoutes");
const userRoutes = require("./routes/userRoutes");
const wishlistRoutes = require("./routes/wishlistRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const couponRoutes = require("./routes/couponRoutes");
const addressRoutes = require("./routes/addressRoutes");
const returnRoutes = require("./routes/returnRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const offerRoutes = require("./routes/offerRoutes");
const supportRoutes = require("./routes/supportRoutes");
const userManagementRoutes = require("./routes/userManagementRoutes");
const flashSaleRoutes = require("./routes/flashSaleRoutes");
const recommendationRoutes = require("./routes/recommendationRoutes");
const discoveryRoutes = require("./routes/discoveryRoutes");
const stockAlertRoutes = require("./routes/stockAlertRoutes");
const loyaltyRoutes = require("./routes/loyaltyRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const pushRoutes = require("./routes/pushRoutes");
const questionRoutes = require("./routes/questionRoutes");
const deliverySettingsRoutes = require("./routes/deliverySettingsRoutes");
const deliveryRoutes = require("./routes/deliveryRoutes");
const vendorRoutes = require("./routes/vendorRoutes");
const vendorKycRoutes = require("./routes/vendorKycRoutes");
const shopRoutes = require("./routes/shops");
const bannerRoutes = require("./routes/bannerRoutes");
const vendorShopRoutes = require("./routes/vendorShopRoutes");
const vendorProductRoutes = require("./routes/vendorProductRoutes");
const vendorFinanceRoutes = require("./routes/vendorFinanceRoutes");
const vendorOrderManagementRoutes = require("./routes/vendorOrderManagementRoutes");
const vendorLogisticsRoutes = require("./routes/vendorLogisticsRoutes");
const shipmentRoutes = require("./routes/shipmentRoutes");
const adminUserRoutes = require("./routes/adminUserRoutes");
const adminProductRoutes = require("./routes/adminProductRoutes");
const adminFinanceRoutes = require("./routes/adminFinanceRoutes");
const adminPayoutRoutes  = require("./routes/adminPayoutRoutes");
const adminVendorRoutes = require("./routes/adminVendorRoutes");
const adminVendorKycRoutes = require("./routes/adminVendorKycRoutes");
const adminPaymentVerificationRoutes = require("./routes/adminPaymentVerificationRoutes");
const adminBannerRoutes = require("./routes/adminBannerRoutes");
const adminSettingsRoutes = require("./routes/adminSettingsRoutes");
const adminStaffRoutes = require("./routes/adminStaffRoutes");
const adminVoucherRoutes = require("./routes/adminVoucherRoutes");
const adminCodRoutes = require("./routes/adminCodRoutes");
const adminReviewRoutes = require("./routes/adminReviewRoutes");
const adminOrderExportRoutes = require("./routes/adminOrderExportRoutes");
const adminVendorMarketingRoutes = require("./routes/adminVendorMarketingRoutes");
const adminAlertRoutes = require("./routes/adminAlertRoutes");
const adminDashboardRoutes = require("./routes/adminDashboardRoutes");
const adminPromotionRoutes = require("./routes/adminPromotionRoutes");
const adminLogisticsRoutes = require("./routes/adminLogisticsRoutes");
const adminCustomerRoutes = require("./routes/adminCustomerRoutes");
const adminTrustSafetyRoutes = require("./routes/adminTrustSafetyRoutes");
const adminPlatformRoutes = require("./routes/adminPlatformRoutes");
const adminSearchRoutes = require("./routes/adminSearchRoutes");
const categoryRequestRoutes = require("./routes/categoryRequestRoutes");
const vendorChatRoutes = require("./routes/vendorChatRoutes");
const adminVendorChatRoutes = require("./routes/chatRoutes");
const categoryFieldRoutes = require("./routes/categoryFieldRoutes");
const storeLocationRoutes = require("./routes/storeLocationRoutes");
const newsletterRoutes = require("./routes/newsletterRoutes");
const rewardRoutes = require("./routes/rewardRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const uploadServiceRoutes = require("./routes/uploadServiceRoutes");
const auditRoutes = require("./routes/auditRoutes");
const adminAuditServiceRoutes = require("./routes/admin/auditRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const analyticsEventRoutes = require("./routes/analyticsEventRoutes");
const dispatchRoutes = require("./routes/dispatchRoutes");
const vendorStaffRoutes = require("./routes/vendorStaffRoutes");
const accountRoutes = require("./routes/accountRoutes");
const growthRoutes = require("./routes/growthRoutes");
const trustSafetyRoutes = require("./routes/trustSafetyRoutes");
const adminGrowthRoutes = require("./routes/adminGrowthRoutes");
const vendorGrowthRoutes = require("./routes/vendorGrowthRoutes");
const platformRoutes = require("./routes/platformRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const voucherRoutes = require("./routes/voucherRoutes");
const webhookRoutes = require("./routes/webhookRoutes");
const pushService = require("./services/push/pushService");

// Campaign Manager routes
const campaignRoutes = require("./routes/campaignRoutes");

// Dynamic Category & Product routes
const dynamicCategoryRoutes = require("./routes/dynamicCategoryRoutes");
const dynamicProductRoutes = require("./routes/dynamicProductRoutes");

// Campaign Manager services
const CampaignCacheService = require("./services/CampaignCacheService");
const campaignScheduler = require("./jobs/campaignScheduler");

const app = express();
const port = process.env.PORT || 5000;
let bootstrapPromise = null;
let serverInstance = null;
app.set("trust proxy", 1);
app.locals.boot = {
  startedAt: new Date().toISOString(),
  env: startupEnv,
  serviceEnv,
};
app.locals.mongoose = mongoose;
app.locals.runtime = isVercelRuntime ? "vercel" : "node";
app.locals.jobs = {
  campaignScheduler: false,
  analyticsSummary: false,
  newsletterBroadcasts: false,
};

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: false,
}));
app.use(cors(buildCorsOptions(process.env)));
app.use(healthRoutes);
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    if (
      req.originalUrl?.startsWith("/api/delivery/") ||
      req.originalUrl?.startsWith("/api/webhooks/") ||
      req.originalUrl?.startsWith("/api/payments/webhooks/")
    ) {
      req.rawBody = buf.toString("utf8");
    }
  },
})); // Increased limit for image uploads
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(sanitizeMiddleware);
app.use("/api/search", searchLimiter);
app.use("/api/payments", paymentLimiter);
app.use("/api/products/:id/view", productViewLimiter);
app.use("/api/uploads", uploadLimiter);
app.use("/api/upload", uploadLimiter);
app.use("/api/vendor/products/bulk-jobs", uploadLimiter);
app.use("/api/vendors/kyc", uploadLimiter);
app.use("/api", apiLimiter);

// Add cache control headers for API responses
app.use((req, res, next) => {
  // Disable caching for API routes
  if (req.path.startsWith("/api/")) {
    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      "Surrogate-Control": "no-store",
    });
  }
  next();
});

app.use("/uploads", express.static(uploadsDir)); // Serve uploaded images

// MongoDB client
const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
// Use explicit DB name, defaulting to main cluster DB
const DB_NAME = process.env.DB_NAME || "BazarBD";
let client = null;

function getMongoClient() {
  if (!client) {
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
  }

  return client;
}

async function initializeApp(options = {}) {
  if (app.locals.ready) return app;
  if (startupError) throw startupError;

  const enableBackgroundJobs = options.enableBackgroundJobs ?? !isVercelRuntime;
  const enableRealtime = options.enableRealtime ?? !isVercelRuntime;
  const startLocalServer = options.startServer === true;

  try {
    const mongoClient = getMongoClient();

    // Connect MongoDB client (for existing models)
    await mongoClient.connect();
    await mongoClient.db(DB_NAME).command({ ping: 1 });
    console.log(`✅ MongoDB connected successfully (${DB_NAME})`);

    // Connect Mongoose (for Offer model and future Mongoose models)
    await mongoose.connect(uri);
    console.log("✅ Mongoose connected successfully");

    const db = mongoClient.db(DB_NAME);

    // Initialize models
    app.locals.models = {
      User: new User(db),
      Product: new Product(db),
      Category: new Category(db),
      Order: new Order(db),
      Cart: new Cart(db),
      Wishlist: new Wishlist(db),
      Review: new Review(db),
      Coupon: new Coupon(db),
      Address: new Address(db),
      Return: new Return(db),
      Payment: new Payment(db),
      SupportTicket: new SupportTicket(db),
      LiveChat: new LiveChat(db),
      CustomerInsight: new CustomerInsight(db),
      Offer: new Offer(db),
      Notification: new Notification(db),
      NotificationDeliveryLog: new NotificationDeliveryLog(db),
      NotificationSubscription: new NotificationSubscription(db),
      Question: new Question(db),
      Vendor: new Vendor(db),
      VendorOrder: new VendorOrder(db),
      VendorPayout: new VendorPayout(db),
      VendorChat: new VendorChat(db),
      CategoryRequest: new CategoryRequest(db),
      AdminVendorChat: new AdminVendorChat(db),
      CategoryField: new CategoryField(db),
      DeliverySettings: new DeliverySettings(db),
      FlashSale: new FlashSale(db),
      Listing: new Listing(db),
      Recommendation: new Recommendation(db),
      SellerProfile: new SellerProfile(db),
      StockAlert: new StockAlert(db),
      StoreLocation: new StoreLocation(db),
      Permission: new Permission(db),
      AuditLog: new AuditLog(db),
      Banner: new Banner(db),
      PaymentVerification: new PaymentVerification(db),
      PlatformSettings: new PlatformSettings(db),
      VendorShop: new VendorShop(db),
      AnalyticsSummary: new AnalyticsSummary(db),
      OrderEvent: new OrderEvent(db),
      DispatchAssignment: new DispatchAssignment(db),
      VendorStaff: new VendorStaff(db),
      Shipment: new Shipment(db),
      Promotion: new Promotion(db),
      TrustSafety: new TrustSafety(db),
    };

    await app.locals.models.Permission.syncDefaults(DEFAULT_ROLE_PERMISSIONS);
    if (enableBackgroundJobs) {
      initBulkUploadQueue(app);
      initMarketplaceEventBus(app);
    } else {
      console.log("Queue workers skipped for serverless runtime");
    }

    // Store db reference for controllers that need it
    app.locals.db = db;

    // Routes
    app.get("/", (req, res) => {
      res.json({
        message: "HnilaBazar API is running 🚀",
        endpoints: {
          products: "/api/products",
          categories: "/api/categories",
          orders: "/api/orders",
          user: "/api/user",
          wishlist: "/api/wishlist",
          reviews: "/api/reviews",
          coupons: "/api/coupons",
          addresses: "/api/addresses",
          returns: "/api/returns",
          payments: "/api/payments",
          support: "/api/support",
          userManagement: "/api/admin",
        },
      });
    });

    console.log("🔧 Registering routes...");
    app.use(auditSensitiveOperations);

    app.use("/api/products", productRoutes);
    app.use("/api/search", searchRoutes);
    console.log("✅ Products routes registered");

    app.use("/api/categories", categoryRoutes);
    console.log("✅ Categories routes registered");

    app.use("/api/orders", orderRoutes);
    app.use("/api/cart", cartRoutes);
    app.use("/api/shipments", shipmentRoutes);
    console.log("✅ Orders routes registered");

    app.use("/api/user", userRoutes);
    app.use("/api/account", accountRoutes);
    console.log("✅ User routes registered");

    app.use("/api/wishlist", wishlistRoutes);
    console.log("✅ Wishlist routes registered");

    app.use("/api/reviews", reviewRoutes);
    console.log("✅ Reviews routes registered");

    app.use("/api/coupons", couponRoutes);
    app.use("/api/vouchers", voucherRoutes);
    console.log("✅ Coupons routes registered");

    app.use("/api/addresses", addressRoutes);
    console.log("✅ Addresses routes registered");

    app.use("/api/returns", returnRoutes);
    console.log("✅ Returns routes registered");
    app.use("/api/payments", paymentRoutes);
    app.use("/api/webhooks", webhookRoutes);
    console.log("✅ Payments routes registered");
    app.use("/api/offers", offerRoutes);
    console.log("✅ Offers routes registered");

    app.use("/api/support", supportRoutes);
    console.log("✅ Support routes registered");

    app.use("/api/admin", userManagementRoutes);
    console.log("✅ User Management routes registered");

    app.use("/api/flash-sales", flashSaleRoutes);
    console.log("✅ Flash Sales routes registered");

    app.use("/api/recommendations", recommendationRoutes);
    app.use("/api/discovery", discoveryRoutes);
    app.use("/api/growth", growthRoutes);
    app.use("/api/trust-safety", trustSafetyRoutes);
    app.use("/api/platform", platformRoutes);
    app.use("/api/settings", settingsRoutes);
    console.log("✅ Recommendations routes registered");

    app.use("/api/stock-alerts", stockAlertRoutes);
    console.log("✅ Stock Alerts routes registered");

    app.use("/api/loyalty", loyaltyRoutes);
    console.log("✅ Loyalty routes registered");

    app.use("/api/notifications", notificationRoutes);
    app.use("/api/push", pushRoutes);
    pushService.initVapid();
    console.log("✅ Notification routes registered");

    app.use("/api", questionRoutes);
    console.log("✅ Question routes registered");

    app.use("/api/delivery-settings", deliverySettingsRoutes);
    app.use("/api/delivery", deliveryRoutes);
    console.log("✅ Delivery Settings routes registered");

    app.use("/api/vendors/staff", vendorStaffRoutes);
    app.use("/api/vendors/finance", vendorFinanceRoutes);
    console.log("✅ Vendor Finance routes registered");
    app.use("/api/vendor/kyc", vendorKycRoutes);
    app.use("/api/vendors", vendorRoutes);
    console.log("✅ Vendor routes registered");

    app.use("/api/shops", shopRoutes);
    app.use("/api/banners", bannerRoutes);
    console.log("✅ Shop storefront routes registered");

    app.use("/api/vendor/shop", vendorShopRoutes);
    console.log("✅ Vendor shop editor routes registered");

    app.use("/api/vendor/products", vendorProductRoutes);
    console.log("✅ Vendor Product routes registered");

    app.use("/api/vendors", vendorOrderManagementRoutes);
    console.log("✅ Vendor Order Management routes registered");
    app.use("/api/vendor/logistics", vendorLogisticsRoutes);
    console.log("Vendor Logistics routes registered");
    app.use("/api/vendor/growth", vendorGrowthRoutes);
    console.log("Vendor Growth routes registered");

    app.use("/api/admin/users",    adminUserRoutes);
    console.log("✅ Admin User Management routes registered");

    app.use("/api/admin/products", adminProductRoutes);
    console.log("✅ Admin Product Moderation routes registered");

    app.use("/api/admin/vendors/kyc", adminVendorKycRoutes);
    app.use("/api/admin/vendors", adminVendorRoutes);
    console.log("✅ Admin Vendor routes registered");

    app.use("/api/admin/payment-verification", adminPaymentVerificationRoutes);
    app.use("/api/admin/banners", adminBannerRoutes);
    app.use("/api/admin/settings", adminSettingsRoutes);
    app.use("/api/admin/staff", adminStaffRoutes);
    app.use("/api/admin/vouchers", adminVoucherRoutes);
    app.use("/api/admin/cod", adminCodRoutes);
    app.use("/api/admin/reviews", adminReviewRoutes);
    app.use("/api/admin/orders", adminOrderExportRoutes);
    app.use("/api/admin/vendor-marketing", adminVendorMarketingRoutes);
    console.log("✅ Admin Vendor Marketing routes registered");

    app.use("/api/admin/finance",  adminFinanceRoutes);
    console.log("✅ Admin Finance routes registered");

    app.use("/api/admin/payouts",  adminPayoutRoutes);
    console.log("✅ Admin Payout routes registered");

    app.use("/api/admin/alerts", adminAlertRoutes);
    console.log("✅ Admin Alert routes registered");

    app.use("/api/admin/search", adminSearchRoutes);
    console.log("Admin Global Search routes registered");

    app.use("/api/admin/dashboard", adminDashboardRoutes);
    console.log("Admin Dashboard routes registered");

    app.use("/api/admin/promotions", adminPromotionRoutes);
    console.log("Admin Promotions routes registered");
    app.use("/api/admin/flash-sales", flashSaleRoutes);
    app.use("/api/admin/growth", adminGrowthRoutes);
    console.log("Admin Growth routes registered");

    app.use("/api/admin/logistics", adminLogisticsRoutes);
    console.log("Admin Logistics routes registered");

    app.use("/api/admin/customers", adminCustomerRoutes);
    console.log("Admin Customer routes registered");

    app.use("/api/admin/trust-safety", adminTrustSafetyRoutes);
    console.log("Admin Trust Safety routes registered");

    app.use("/api/admin/platform", adminPlatformRoutes);
    console.log("Admin Platform Control routes registered");

    app.use("/api/category-requests", categoryRequestRoutes);
    console.log("✅ Category Request routes registered");

    app.use("/api/vendor-chat", vendorChatRoutes);
    console.log("✅ Vendor Chat routes registered");
    
    app.use("/api/chat", adminVendorChatRoutes);
    console.log("✅ Admin-Vendor Chat routes registered");

    app.use("/api/category-fields", categoryFieldRoutes);
    console.log("✅ Category Fields routes registered");

    app.use("/api/store-locations", storeLocationRoutes);
    app.use("/api/newsletter", newsletterRoutes);
    app.use("/api/rewards", rewardRoutes);
    app.use("/api/uploads", uploadRoutes);
    app.use("/api/upload", uploadServiceRoutes);
    app.use("/api/admin/audit-logs", auditRoutes);
    app.use("/api/admin/audit", adminAuditServiceRoutes);
    app.use("/api/admin/analytics", analyticsRoutes);
    app.use("/api/analytics", analyticsEventRoutes);
    app.use("/api/admin/dispatch", dispatchRoutes);
    console.log("✅ Store Locations routes registered");

    // Dynamic Category & Product routes
    app.use("/api/dynamic-categories", dynamicCategoryRoutes);
    console.log("✅ Dynamic Category routes registered");

    app.use("/api/dynamic-products", dynamicProductRoutes);
    console.log("✅ Dynamic Product routes registered");

    // Campaign Manager routes
    app.use("/api/campaigns", campaignRoutes);
    console.log("✅ Campaign Manager routes registered");

    // Initialize Campaign Manager services
    if (enableBackgroundJobs || process.env.REDIS_URL || process.env.REDIS_HOST) {
      await CampaignCacheService.initialize();
      console.log("✅ Campaign Cache Service initialized");
    } else {
      console.log("Campaign cache skipped for serverless runtime without Redis");
    }

    if (enableBackgroundJobs) {
      campaignScheduler.initializeJobs();
      cron.schedule("17 * * * *", () => {
        analyticsService
          .rebuildDailySummary({
            db,
            AnalyticsSummary: app.locals.models.AnalyticsSummary,
            start: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
            end: new Date(Date.now() + 24 * 60 * 60 * 1000),
          })
          .catch((error) => console.error("Analytics summary rebuild failed:", error.message));
      });
      cron.schedule("* * * * *", () => {
        newsletterBroadcastService
          .sendDueBroadcasts(app)
          .catch((error) => console.error("Newsletter broadcast scheduler failed:", error.message));
      });
      console.log("Analytics summary cron scheduled");
      console.log("Newsletter broadcast cron scheduled");
      console.log("✅ Campaign Scheduler initialized");
      app.locals.jobs = {
        campaignScheduler: true,
        analyticsSummary: true,
        newsletterBroadcasts: true,
      };
    } else {
      console.log("Background schedulers skipped for serverless runtime");
      app.locals.jobs = {
        mode: "serverless",
        campaignScheduler: false,
        analyticsSummary: false,
        newsletterBroadcasts: false,
      };
    }
    app.locals.ready = true;

    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).json({ success: false, error: "Something went wrong!" });
    });

    if (startLocalServer) {
      startServer({ enableRealtime });
    }

    return app;
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    if (options.exitOnError) {
      process.exit(1);
    }
    throw error;
  }
}

function startServer({ enableRealtime = true } = {}) {
  if (serverInstance) return serverInstance;

  serverInstance = app.listen(port);
  serverInstance.once("listening", () => {
    console.log(`🔥 Server running on port ${port}`);
    if (enableRealtime) {
      realtimeService.attach(serverInstance, app);
    } else {
      console.log("Realtime server disabled for this runtime");
    }
  });

  serverInstance.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(
        `Port ${port} is already in use. Stop the existing backend server or set a different PORT in Server/.env.`,
      );
      process.exit(1);
    }

    console.error("Server startup failed:", error);
    process.exit(1);
  });

  return serverInstance;
}

async function bootstrap(options = {}) {
  if (app.locals.ready) return app;

  if (!bootstrapPromise) {
    bootstrapPromise = initializeApp(options).catch((error) => {
      bootstrapPromise = null;
      throw error;
    });
  }

  return bootstrapPromise;
}

async function vercelHandler(req, res) {
  try {
    const requestPath = String(req.url || "").split("?")[0];
    if (requestPath === "/health" || requestPath === "/api/health") {
      return app(req, res);
    }

    await bootstrap({
      enableBackgroundJobs: false,
      enableRealtime: false,
      startServer: false,
    });
    return app(req, res);
  } catch (error) {
    console.error("Vercel function bootstrap failed:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({
      success: false,
      error: "Server failed to initialize",
      message: error.message,
      missing: Array.isArray(error.details)
        ? error.details.map((item) => item.key).filter((key) => key === key.toUpperCase())
        : undefined,
    }));
  }
}

if (require.main === module) {
  bootstrap({
    enableBackgroundJobs: true,
    enableRealtime: true,
    startServer: true,
    exitOnError: true,
  }).catch((error) => {
    console.error("Server startup failed:", error);
    process.exit(1);
  });
}

module.exports = vercelHandler;
module.exports.app = app;
module.exports.bootstrap = bootstrap;
