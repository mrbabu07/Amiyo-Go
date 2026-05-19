require("dotenv").config();
const {
  buildCorsOptions,
  validateStartupEnv,
} = require("./config/env");

const startupEnv = validateStartupEnv(process.env);
if (!startupEnv.ok) {
  console.error("Server startup blocked by missing critical environment values:");
  startupEnv.errors.forEach((error) => {
    console.error(`- ${error.key}: ${error.message}`);
  });
  process.exit(1);
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
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("📁 Created uploads directory");
}

// Import models
const User = require("./models/User");
const Product = require("./models/Product");
const Category = require("./models/Category");
const Order = require("./models/Order");
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
const questionRoutes = require("./routes/questionRoutes");
const deliverySettingsRoutes = require("./routes/deliverySettingsRoutes");
const vendorRoutes = require("./routes/vendorRoutes");
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
const auditRoutes = require("./routes/auditRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const analyticsEventRoutes = require("./routes/analyticsEventRoutes");
const dispatchRoutes = require("./routes/dispatchRoutes");
const vendorStaffRoutes = require("./routes/vendorStaffRoutes");
const accountRoutes = require("./routes/accountRoutes");
const growthRoutes = require("./routes/growthRoutes");
const trustSafetyRoutes = require("./routes/trustSafetyRoutes");
const adminGrowthRoutes = require("./routes/adminGrowthRoutes");
const vendorGrowthRoutes = require("./routes/vendorGrowthRoutes");

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
app.set("trust proxy", 1);
app.locals.boot = {
  startedAt: new Date().toISOString(),
  env: startupEnv,
};
app.locals.mongoose = mongoose;
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
app.use(express.json({ limit: '10mb' })); // Increased limit for image uploads
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(sanitizeMiddleware);
app.use("/api/search", searchLimiter);
app.use("/api/payments", paymentLimiter);
app.use("/api/products/:id/view", productViewLimiter);
app.use("/api/uploads", uploadLimiter);
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

app.use("/uploads", express.static("uploads")); // Serve uploaded images

// MongoDB client
const uri = process.env.MONGO_URI;
// Use explicit DB name, defaulting to main cluster DB
const DB_NAME = process.env.DB_NAME || "BazarBD";
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect MongoDB client (for existing models)
    await client.connect();
    await client.db(DB_NAME).command({ ping: 1 });
    console.log(`✅ MongoDB connected successfully (${DB_NAME})`);

    // Connect Mongoose (for Offer model and future Mongoose models)
    await mongoose.connect(uri);
    console.log("✅ Mongoose connected successfully");

    const db = client.db(DB_NAME);

    // Initialize models
    app.locals.models = {
      User: new User(db),
      Product: new Product(db),
      Category: new Category(db),
      Order: new Order(db),
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
    initBulkUploadQueue(app);
    initMarketplaceEventBus(app);

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
    console.log("✅ Coupons routes registered");

    app.use("/api/addresses", addressRoutes);
    console.log("✅ Addresses routes registered");

    app.use("/api/returns", returnRoutes);
    console.log("✅ Returns routes registered");
    app.use("/api/payments", paymentRoutes);
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
    console.log("✅ Recommendations routes registered");

    app.use("/api/stock-alerts", stockAlertRoutes);
    console.log("✅ Stock Alerts routes registered");

    app.use("/api/loyalty", loyaltyRoutes);
    console.log("✅ Loyalty routes registered");

    app.use("/api/notifications", notificationRoutes);
    console.log("✅ Notification routes registered");

    app.use("/api", questionRoutes);
    console.log("✅ Question routes registered");

    app.use("/api/delivery-settings", deliverySettingsRoutes);
    console.log("✅ Delivery Settings routes registered");

    app.use("/api/vendors/staff", vendorStaffRoutes);
    app.use("/api/vendors", vendorRoutes);
    console.log("✅ Vendor routes registered");

    app.use("/api/vendor/products", vendorProductRoutes);
    console.log("✅ Vendor Product routes registered");

    app.use("/api/vendors/finance", vendorFinanceRoutes);
    console.log("✅ Vendor Finance routes registered");

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

    app.use("/api/admin/vendors", adminVendorRoutes);
    console.log("✅ Admin Vendor routes registered");

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
    app.use("/api/admin/audit-logs", auditRoutes);
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
    await CampaignCacheService.initialize();
    console.log("✅ Campaign Cache Service initialized");

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
    app.locals.ready = true;

    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).json({ success: false, error: "Something went wrong!" });
    });

    // Start server
    const server = app.listen(port);
    server.once("listening", () => {
      console.log(`🔥 Server running on port ${port}`);
      realtimeService.attach(server, app);
    });

    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(
          `Port ${port} is already in use. Stop the existing backend server or set a different PORT in Server/.env.`,
        );
        process.exit(1);
      }

      console.error("Server startup failed:", error);
      process.exit(1);
    });
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

run();
