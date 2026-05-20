import { createElement, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import AuthLayout from "../layouts/AuthLayout";
import AdminLayout from "../layouts/AdminLayout";
import VendorLayout from "../layouts/VendorLayout";
import Loading from "../components/Loading";
import { ErrorBoundary } from "../components/ui/feedback";
import {
  AdminRoute,
  CustomerRoute,
  GuestCheckoutRoute,
  PublicRoute,
  RBACGuard,
  VendorPermissionGuard,
  VendorRoute,
} from "./guards";
import { lazyLoadWithRetry } from "../utils/lazyLoad";

const Home = lazyLoadWithRetry(() => import("../pages/Home"));
const About = lazyLoadWithRetry(() => import("../pages/About"));
const Contact = lazyLoadWithRetry(() => import("../pages/Contact"));
const Login = lazyLoadWithRetry(() => import("../pages/Login"));
const Register = lazyLoadWithRetry(() => import("../pages/Register"));
const CategoryPage = lazyLoadWithRetry(() => import("../pages/CategoryPage"));
const Products = lazyLoadWithRetry(() => import("../pages/Products"));
const ProductDetail = lazyLoadWithRetry(() => import("../pages/ProductDetail"));
const Cart = lazyLoadWithRetry(() => import("../pages/Cart"));
const Wishlist = lazyLoadWithRetry(() => import("../pages/Wishlist"));
const SharedWishlist = lazyLoadWithRetry(() => import("../pages/SharedWishlist"));
const Compare = lazyLoadWithRetry(() => import("../pages/Compare"));
const Checkout = lazyLoadWithRetry(() => import("../pages/Checkout"));
const GuestCheckout = lazyLoadWithRetry(() => import("../components/GuestCheckout"));
const OrderConfirmation = lazyLoadWithRetry(() => import("../pages/OrderConfirmation"));
const Orders = lazyLoadWithRetry(() => import("../pages/Orders"));
const OrderDetail = lazyLoadWithRetry(() => import("../pages/OrderDetail"));
const Profile = lazyLoadWithRetry(() => import("../pages/Profile"));
const Messages = lazyLoadWithRetry(() => import("../pages/Messages"));
const Returns = lazyLoadWithRetry(() => import("../pages/Returns"));
const Support = lazyLoadWithRetry(() => import("../pages/Support"));
const Addresses = lazyLoadWithRetry(() => import("../pages/Addresses"));
const FlashSales = lazyLoadWithRetry(() => import("../pages/FlashSales"));
const ShopsPage = lazyLoadWithRetry(() => import("../pages/ShopsPage"));
const ShopDetailPage = lazyLoadWithRetry(() => import("../pages/ShopDetailPage"));
const MyAlerts = lazyLoadWithRetry(() => import("../pages/MyAlerts"));
const Notifications = lazyLoadWithRetry(() => import("../pages/Notifications"));
const LoyaltyDashboard = lazyLoadWithRetry(() => import("../pages/LoyaltyDashboard"));
const MyReviews = lazyLoadWithRetry(() => import("../pages/MyReviews"));
const SearchResults = lazyLoadWithRetry(() => import("../pages/SearchResults"));
const AuthDebug = lazyLoadWithRetry(() => import("../pages/AuthDebug"));
const VendorStore = lazyLoadWithRetry(() => import("../pages/VendorStore"));
const VendorRegister = lazyLoadWithRetry(() => import("../pages/VendorRegister"));
const CampaignLandingPage = lazyLoadWithRetry(() => import("../pages/CampaignLandingPage"));

const VendorHome = lazyLoadWithRetry(() => import("../pages/vendor/VendorHome"));
const VendorAddProduct = lazyLoadWithRetry(() => import("../pages/vendor/VendorAddProduct"));
const VendorEditProduct = lazyLoadWithRetry(() => import("../pages/vendor/VendorEditProduct"));
const VendorProductDetail = lazyLoadWithRetry(() => import("../pages/vendor/VendorProductDetail"));
const VendorProducts = lazyLoadWithRetry(() => import("../pages/vendor/VendorProducts"));
const VendorCategoryRequests = lazyLoadWithRetry(() => import("../pages/vendor/VendorCategoryRequests"));
const VendorOrders = lazyLoadWithRetry(() => import("../pages/vendor/VendorOrders"));
const VendorOrderDetail = lazyLoadWithRetry(() => import("../pages/vendor/VendorOrderDetail"));
const VendorSettings = lazyLoadWithRetry(() => import("../pages/vendor/VendorSettings"));
const VendorFinance = lazyLoadWithRetry(() => import("../pages/vendor/VendorFinance"));
const VendorBankSettings = lazyLoadWithRetry(() => import("../pages/vendor/VendorBankSettings"));
const VendorMarketing = lazyLoadWithRetry(() => import("../pages/vendor/VendorMarketing"));
const VendorReports = lazyLoadWithRetry(() => import("../pages/vendor/VendorReports"));
const VendorShop = lazyLoadWithRetry(() => import("../pages/vendor/VendorShop"));
const VendorShopSettings = lazyLoadWithRetry(() => import("../pages/vendor/VendorShopSettings"));
const VendorMessages = lazyLoadWithRetry(() => import("../pages/vendor/VendorMessages"));
const VendorReviews = lazyLoadWithRetry(() => import("../pages/vendor/VendorReviews"));
const VendorQA = lazyLoadWithRetry(() => import("../pages/vendor/VendorQA"));
const VendorReturns = lazyLoadWithRetry(() => import("../pages/vendor/VendorReturns"));
const VendorReturnDetail = lazyLoadWithRetry(() => import("../pages/vendor/VendorReturnDetail"));
const VendorBulkUpload = lazyLoadWithRetry(() => import("../pages/vendor/VendorBulkUpload"));
const VendorSupportChat = lazyLoadWithRetry(() => import("../pages/vendor/VendorSupportChat"));
const VendorKyc = lazyLoadWithRetry(() => import("../pages/vendor/VendorKyc"));

const AdminDashboard = lazyLoadWithRetry(() => import("../pages/admin/AdminDashboard"));
const AdminOperations = lazyLoadWithRetry(() => import("../pages/admin/AdminOperations"));
const AdminAuditLogs = lazyLoadWithRetry(() => import("../pages/admin/AdminAuditLogs"));
const AdminAnalyticsReports = lazyLoadWithRetry(() => import("../pages/admin/AdminAnalyticsReports"));
const AdminDynamicCategories = lazyLoadWithRetry(() => import("../pages/admin/AdminDynamicCategories"));
const AdminCategoryManagement = lazyLoadWithRetry(() => import("../pages/admin/AdminCategoryManagement"));
const AdminEditCategoryAttributes = lazyLoadWithRetry(() => import("../pages/admin/AdminEditCategoryAttributes"));
const AdminProducts = lazyLoadWithRetry(() => import("../pages/admin/AdminProducts"));
const AdminCategoryRequests = lazyLoadWithRetry(() => import("../pages/admin/AdminCategoryRequests"));
const AdminOrders = lazyLoadWithRetry(() => import("../pages/admin/AdminOrders"));
const AdminInventory = lazyLoadWithRetry(() => import("../pages/admin/AdminInventory"));
const ProductForm = lazyLoadWithRetry(() => import("../pages/admin/ProductForm"));
const AdminCoupons = lazyLoadWithRetry(() => import("../pages/admin/AdminCoupons"));
const AdminPromotions = lazyLoadWithRetry(() => import("../pages/admin/AdminPromotions"));
const AdminReturns = lazyLoadWithRetry(() => import("../pages/admin/AdminReturns"));
const AdminOffers = lazyLoadWithRetry(() => import("../pages/admin/AdminOffers"));
const AdminReviews = lazyLoadWithRetry(() => import("../pages/admin/AdminReviews"));
const AdminUserManagement = lazyLoadWithRetry(() => import("../pages/admin/AdminUserManagement"));
const AdminCustomers = lazyLoadWithRetry(() => import("../pages/admin/AdminCustomers"));
const AdminTrustSafety = lazyLoadWithRetry(() => import("../pages/admin/AdminTrustSafety"));
const AdminCustomerInsights = lazyLoadWithRetry(() => import("../pages/admin/AdminCustomerInsights"));
const AdminSupport = lazyLoadWithRetry(() => import("../pages/admin/AdminSupport"));
const AdminQA = lazyLoadWithRetry(() => import("../pages/admin/AdminQA"));
const AdminFlashSales = lazyLoadWithRetry(() => import("../pages/admin/AdminFlashSales"));
const AdminDeliverySettings = lazyLoadWithRetry(() => import("../pages/admin/AdminDeliverySettings"));
const AdminLogistics = lazyLoadWithRetry(() => import("../pages/admin/AdminLogistics"));
const OfferForm = lazyLoadWithRetry(() => import("../pages/admin/OfferForm"));
const AdminVendors = lazyLoadWithRetry(() => import("../pages/admin/AdminVendorsEnhanced"));
const AdminVendorDetail = lazyLoadWithRetry(() => import("../pages/admin/AdminVendorDetail"));
const AdminPayouts = lazyLoadWithRetry(() => import("../pages/admin/AdminPayouts"));
const AdminPayoutRequests = lazyLoadWithRetry(() => import("../pages/admin/AdminPayoutRequests"));
const AdminPaymentVerifications = lazyLoadWithRetry(() => import("../pages/admin/AdminPaymentVerifications"));
const AdminVendorChats = lazyLoadWithRetry(() => import("../pages/admin/AdminVendorChats"));
const AdminChatDetail = lazyLoadWithRetry(() => import("../pages/admin/AdminChatDetail"));
const VendorActivityDashboard = lazyLoadWithRetry(() => import("../pages/admin/VendorActivityDashboard"));
const AdminVendorKyc = lazyLoadWithRetry(() => import("../pages/admin/AdminVendorKyc"));
const AdminNewsletter = lazyLoadWithRetry(() => import("../pages/admin/AdminNewsletter"));
const AdminPlatformControls = lazyLoadWithRetry(() => import("../pages/admin/AdminPlatformControls"));

const lazyElement = (Component) => (
  <ErrorBoundary>
    <Suspense fallback={<Loading />}>
      {createElement(Component)}
    </Suspense>
  </ErrorBoundary>
);

const privateElement = (Component) => (
  <CustomerRoute>
    {lazyElement(Component)}
  </CustomerRoute>
);

const publicElement = (Component, options) => (
  <PublicRoute {...options}>
    {lazyElement(Component)}
  </PublicRoute>
);

const adminElement = (Component, resource = "system", action = "read") => (
  <RBACGuard resource={resource} action={action}>
    {lazyElement(Component)}
  </RBACGuard>
);

const vendorElement = (Component, permission) => (
  <VendorPermissionGuard permission={permission}>
    {lazyElement(Component)}
  </VendorPermissionGuard>
);

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      { path: "/", element: lazyElement(Home) },
      { path: "/about", element: lazyElement(About) },
      { path: "/contact", element: lazyElement(Contact) },
      { path: "/auth-debug", element: lazyElement(AuthDebug) },
      { path: "/category/:category", element: lazyElement(CategoryPage) },
      { path: "/categories", element: lazyElement(CategoryPage) },
      { path: "/products", element: lazyElement(Products) },
      { path: "/search", element: lazyElement(SearchResults) },
      { path: "/flash-sales", element: lazyElement(FlashSales) },
      { path: "/campaigns/:slugOrId", element: lazyElement(CampaignLandingPage) },
      { path: "/shops", element: lazyElement(ShopsPage) },
      { path: "/shops/:slug", element: lazyElement(ShopDetailPage) },
      { path: "/mens", element: lazyElement(CategoryPage) },
      { path: "/womens", element: lazyElement(CategoryPage) },
      { path: "/electronics", element: lazyElement(CategoryPage) },
      { path: "/baby", element: lazyElement(CategoryPage) },
      { path: "/product/:id", element: lazyElement(ProductDetail) },
      { path: "/vendor/:vendorId/products", element: lazyElement(VendorStore) },
      { path: "/shop/:shopSlug", element: lazyElement(VendorStore) },
      { path: "/cart", element: lazyElement(Cart) },
      { path: "/compare", element: lazyElement(Compare) },
      { path: "/wishlist", element: privateElement(Wishlist) },
      { path: "/wishlist/shared/:shareId", element: lazyElement(SharedWishlist) },
      { path: "/checkout", element: privateElement(Checkout) },
      { path: "/checkout/guest", element: <GuestCheckoutRoute>{lazyElement(GuestCheckout)}</GuestCheckoutRoute> },
      { path: "/order-confirmation", element: lazyElement(OrderConfirmation) },
      { path: "/orders", element: privateElement(Orders) },
      { path: "/orders/:orderId", element: privateElement(OrderDetail) },
      { path: "/orders/:orderId/track", element: privateElement(OrderDetail) },
      { path: "/profile", element: privateElement(Profile) },
      { path: "/messages", element: privateElement(Messages) },
      { path: "/returns", element: privateElement(Returns) },
      { path: "/support", element: privateElement(Support) },
      { path: "/addresses", element: privateElement(Addresses) },
      { path: "/my-alerts", element: privateElement(MyAlerts) },
      { path: "/notifications", element: privateElement(Notifications) },
      { path: "/loyalty", element: privateElement(LoyaltyDashboard) },
      { path: "/my-reviews", element: privateElement(MyReviews) },
      { path: "/vendor/register", element: privateElement(VendorRegister) },
    ],
  },
  {
    element: <AuthLayout />,
    children: [
      { path: "/login", element: publicElement(Login, { redirectAuthenticated: true }) },
      { path: "/register", element: publicElement(Register, { redirectAuthenticated: true }) },
    ],
  },
  {
    path: "/vendor",
    element: (
      <VendorRoute>
        <VendorLayout />
      </VendorRoute>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: "dashboard", element: lazyElement(VendorHome) },
      { path: "products", element: vendorElement(VendorProducts, "products:view") },
      { path: "products/add", element: vendorElement(VendorAddProduct, "products:manage") },
      { path: "products/edit/:id", element: vendorElement(VendorEditProduct, "products:manage") },
      { path: "products/bulk", element: vendorElement(VendorBulkUpload, "products:manage") },
      { path: "products/:id", element: vendorElement(VendorProductDetail, "products:view") },
      { path: "orders", element: vendorElement(VendorOrders, "orders:view") },
      { path: "orders/:orderId", element: vendorElement(VendorOrderDetail, "orders:view") },
      { path: "finance", element: vendorElement(VendorFinance, "finance:view") },
      { path: "finance/reconciliation", element: vendorElement(VendorFinance, "finance:view") },
      { path: "finance/payouts", element: vendorElement(VendorFinance, "finance:view") },
      { path: "finance/transactions", element: vendorElement(VendorFinance, "finance:view") },
      { path: "finance/statements", element: vendorElement(VendorFinance, "finance:view") },
      { path: "finance/commissions", element: vendorElement(VendorFinance, "finance:view") },
      { path: "settings/bank", element: vendorElement(VendorBankSettings, "finance:manage") },
      { path: "marketing/promotions", element: vendorElement(VendorMarketing, "marketing:manage") },
      { path: "marketing/vouchers", element: vendorElement(VendorMarketing, "marketing:manage") },
      { path: "marketing/campaigns", element: vendorElement(VendorMarketing, "marketing:manage") },
      { path: "marketing", element: vendorElement(VendorMarketing, "marketing:manage") },
      { path: "reports/sales", element: vendorElement(VendorReports, "reports:view") },
      { path: "reports/products", element: vendorElement(VendorReports, "reports:view") },
      { path: "reports/traffic", element: vendorElement(VendorReports, "reports:view") },
      { path: "reports/inventory", element: vendorElement(VendorReports, "reports:view") },
      { path: "reports", element: vendorElement(VendorReports, "reports:view") },
      { path: "shop/profile", element: vendorElement(VendorShop, "shop:manage") },
      { path: "shop/decoration", element: vendorElement(VendorShop, "shop:manage") },
      { path: "shop/categories", element: vendorElement(VendorShop, "shop:manage") },
      { path: "shop/settings", element: vendorElement(VendorShopSettings, "shop:manage") },
      { path: "shop/media", element: vendorElement(VendorShopSettings, "shop:manage") },
      { path: "shop/location", element: vendorElement(VendorShopSettings, "shop:manage") },
      { path: "shop", element: vendorElement(VendorShop, "shop:manage") },
      { path: "messages", element: vendorElement(VendorMessages, "support:view") },
      { path: "reviews", element: vendorElement(VendorReviews, "reviews:view") },
      { path: "returns", element: vendorElement(VendorReturns, "returns:view") },
      { path: "returns/:returnId", element: vendorElement(VendorReturnDetail, "returns:view") },
      { path: "qa", element: vendorElement(VendorQA, "support:view") },
      { path: "support-chat", element: vendorElement(VendorSupportChat, "support:view") },
      { path: "kyc", element: vendorElement(VendorKyc, "settings:manage") },
      { path: "category-requests", element: vendorElement(VendorCategoryRequests, "products:manage") },
      { path: "settings", element: vendorElement(VendorSettings, "settings:manage") },
    ],
  },
  {
    path: "/admin",
    element: (
      <AdminRoute>
        <AdminLayout />
      </AdminRoute>
    ),
    children: [
      { path: "", element: adminElement(AdminDashboard, "system", "read") },
      { path: "operations", element: adminElement(AdminOperations, "system", "read") },
      { path: "audit-logs", element: adminElement(AdminAuditLogs, "audit_logs", "read") },
      { path: "analytics", element: adminElement(AdminAnalyticsReports, "analytics", "read") },
      { path: "platform", element: adminElement(AdminPlatformControls, "system", "read") },
      { path: "vendors", element: adminElement(AdminVendors, "vendors", "read") },
      { path: "vendor-requests", element: adminElement(AdminVendors, "vendors", "read") },
      { path: "vendors/:vendorId", element: adminElement(AdminVendorDetail, "vendors", "read") },
      { path: "vendor-activity", element: adminElement(VendorActivityDashboard, "vendors", "read") },
      { path: "vendor-kyc", element: adminElement(AdminVendorKyc, "vendors", "update") },
      { path: "chats", element: adminElement(AdminVendorChats, "vendors", "read") },
      { path: "chat/:vendorId", element: adminElement(AdminChatDetail, "vendors", "read") },
      { path: "products", element: adminElement(AdminProducts, "products", "read") },
      { path: "products/add", element: adminElement(ProductForm, "products", "create") },
      { path: "products/edit/:id", element: adminElement(ProductForm, "products", "update") },
      { path: "inventory", element: adminElement(AdminInventory, "inventory", "read") },
      { path: "orders", element: adminElement(AdminOrders, "orders", "read") },
      { path: "returns", element: adminElement(AdminReturns, "returns", "read") },
      { path: "payouts", element: adminElement(AdminPayouts, "payments", "read") },
      { path: "payout-requests", element: adminElement(AdminPayoutRequests, "payments", "read") },
      { path: "payment-verifications", element: adminElement(AdminPaymentVerifications, "payments", "read") },
      { path: "newsletter", element: adminElement(AdminNewsletter, "communications", "read") },
      { path: "categories", element: adminElement(AdminDynamicCategories, "categories", "read") },
      { path: "categories/manage", element: adminElement(AdminCategoryManagement, "categories", "update") },
      { path: "categories/:categoryId/attributes", element: adminElement(AdminEditCategoryAttributes, "categories", "update") },
      { path: "category-requests", element: adminElement(AdminCategoryRequests, "categories", "read") },
      { path: "promotions", element: adminElement(AdminPromotions, "promotions", "read") },
      { path: "coupons", element: adminElement(AdminCoupons, "coupons", "read") },
      { path: "flash-sales", element: adminElement(AdminFlashSales, "promotions", "read") },
      { path: "offers", element: adminElement(AdminOffers, "promotions", "read") },
      { path: "offers/add", element: adminElement(OfferForm, "promotions", "create") },
      { path: "offers/edit/:id", element: adminElement(OfferForm, "promotions", "update") },
      { path: "logistics", element: adminElement(AdminLogistics, "orders", "read") },
      { path: "delivery-settings", element: adminElement(AdminDeliverySettings, "orders", "update") },
      { path: "customers", element: adminElement(AdminCustomers, "users", "read") },
      { path: "trust-safety", element: adminElement(AdminTrustSafety, "system", "read") },
      { path: "users", element: adminElement(AdminUserManagement, "users", "read") },
      { path: "insights", element: adminElement(AdminCustomerInsights, "users", "read") },
      { path: "support", element: adminElement(AdminSupport, "support", "read") },
      { path: "reviews", element: adminElement(AdminReviews, "reviews", "read") },
      { path: "qa", element: adminElement(AdminQA, "products", "read") },
    ],
  },
]);

export default router;
