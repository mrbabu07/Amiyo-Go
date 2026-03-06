require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { MongoClient, ServerApiVersion } = require("mongodb");
const fs = require("fs");
const path = require("path");

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
const NotificationSubscription = require("./models/NotificationSubscription");
const Question = require("./models/Question");
const Vendor = require("./models/Vendor");
const VendorOrder = require("./models/VendorOrder");
const VendorPayout = require("./models/VendorPayout");
const VendorChat = require("./models/VendorChat");
const CategoryRequest = require("./models/CategoryRequest");

// Import routes
const productRoutes = require("./routes/productRoutes");
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
const stockAlertRoutes = require("./routes/stockAlertRoutes");
const loyaltyRoutes = require("./routes/loyaltyRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const questionRoutes = require("./routes/questionRoutes");
const deliverySettingsRoutes = require("./routes/deliverySettingsRoutes");
const vendorRoutes = require("./routes/vendorRoutes");
const vendorProductRoutes = require("./routes/vendorProductRoutes");
const vendorFinanceRoutes = require("./routes/vendorFinanceRoutes");
const adminUserRoutes = require("./routes/adminUserRoutes");
const adminProductRoutes = require("./routes/adminProductRoutes");
const adminFinanceRoutes = require("./routes/adminFinanceRoutes");
const adminPayoutRoutes  = require("./routes/adminPayoutRoutes");
const adminVendorRoutes = require("./routes/adminVendorRoutes");
const categoryRequestRoutes = require("./routes/categoryRequestRoutes");
const vendorChatRoutes = require("./routes/vendorChatRoutes");

// Import middleware and controllers for direct routes
const { verifyToken, verifyAdmin } = require("./middleware/auth");
const {
  createReturnRequest,
  getUserReturns,
  getAllReturns,
  updateReturnStatus,
} = require("./controllers/returnController");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increased limit for image uploads
app.use(express.urlencoded({ limit: '10mb', extended: true }));

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
    // await client.connect();
    // await client.db(DB_NAME).command({ ping: 1 });
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
      NotificationSubscription: new NotificationSubscription(db),
      Question: new Question(db),
      Vendor: new Vendor(db),
      VendorOrder: new VendorOrder(db),
      VendorPayout: new VendorPayout(db),
      VendorChat: new VendorChat(db),
      CategoryRequest: new CategoryRequest(db),
    };

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

    app.use("/api/products", productRoutes);
    console.log("✅ Products routes registered");

    app.use("/api/categories", categoryRoutes);
    console.log("✅ Categories routes registered");

    app.use("/api/orders", orderRoutes);
    console.log("✅ Orders routes registered");

    app.use("/api/user", userRoutes);
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

    app.use("/api/vendors", vendorRoutes);
    console.log("✅ Vendor routes registered");

    app.use("/api/vendor/products", vendorProductRoutes);
    console.log("✅ Vendor Product routes registered");

    app.use("/api/vendors/finance", vendorFinanceRoutes);
    console.log("✅ Vendor Finance routes registered");

    app.use("/api/admin/users",    adminUserRoutes);
    console.log("✅ Admin User Management routes registered");

    app.use("/api/admin/products", adminProductRoutes);
    console.log("✅ Admin Product Moderation routes registered");

    app.use("/api/admin/vendors", adminVendorRoutes);
    console.log("✅ Admin Vendor routes registered");

    app.use("/api/admin/finance",  adminFinanceRoutes);
    console.log("✅ Admin Finance routes registered");

    app.use("/api/admin/payouts",  adminPayoutRoutes);
    console.log("✅ Admin Payout routes registered");

    app.use("/api/category-requests", categoryRequestRoutes);
    console.log("✅ Category Request routes registered");

    app.use("/api/vendor-chat", vendorChatRoutes);
    console.log("✅ Vendor Chat routes registered");

    // Returns routes
    app.post("/api/returns", verifyToken, createReturnRequest);
    app.get("/api/returns/my-returns", verifyToken, getUserReturns);
    app.get("/api/returns/admin", verifyToken, verifyAdmin, getAllReturns);
    app.patch(
      "/api/returns/:id/status",
      verifyToken,
      verifyAdmin,
      updateReturnStatus,
    );

    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).json({ success: false, error: "Something went wrong!" });
    });

    // Start server
    app.listen(port, () => {
      console.log(`🔥 Server running on port ${port}`);
    });
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
  }
}

run();
