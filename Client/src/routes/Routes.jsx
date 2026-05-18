import { createElement, lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import AdminLayout from "../layouts/AdminLayout";
import VendorLayout from "../layouts/VendorLayout";
import PrivateRoute from "../components/PrivateRoute";
import AdminRoute from "../components/AdminRoute";
import VendorRoute from "../components/VendorRoute";
import Loading from "../components/Loading";
import { RBACGuard } from "../components/ui/layout";

const Home = lazy(() => import("../pages/Home"));
const About = lazy(() => import("../pages/About"));
const Contact = lazy(() => import("../pages/Contact"));
const Login = lazy(() => import("../pages/Login"));
const Register = lazy(() => import("../pages/Register"));
const CategoryPage = lazy(() => import("../pages/CategoryPage"));
const Products = lazy(() => import("../pages/Products"));
const ProductDetail = lazy(() => import("../pages/ProductDetail"));
const Cart = lazy(() => import("../pages/Cart"));
const Wishlist = lazy(() => import("../pages/Wishlist"));
const SharedWishlist = lazy(() => import("../pages/SharedWishlist"));
const Compare = lazy(() => import("../pages/Compare"));
const Checkout = lazy(() => import("../pages/Checkout"));
const GuestCheckout = lazy(() => import("../components/GuestCheckout"));
const OrderConfirmation = lazy(() => import("../pages/OrderConfirmation"));
const Orders = lazy(() => import("../pages/Orders"));
const Profile = lazy(() => import("../pages/Profile"));
const Messages = lazy(() => import("../pages/Messages"));
const Returns = lazy(() => import("../pages/Returns"));
const Support = lazy(() => import("../pages/Support"));
const Addresses = lazy(() => import("../pages/Addresses"));
const FlashSales = lazy(() => import("../pages/FlashSales"));
const MyAlerts = lazy(() => import("../pages/MyAlerts"));
const LoyaltyDashboard = lazy(() => import("../pages/LoyaltyDashboard"));
const SearchResults = lazy(() => import("../pages/SearchResults"));
const AuthDebug = lazy(() => import("../pages/AuthDebug"));
const VendorStore = lazy(() => import("../pages/VendorStore"));
const VendorRegister = lazy(() => import("../pages/VendorRegister"));

const VendorHome = lazy(() => import("../pages/vendor/VendorHome"));
const VendorAddProduct = lazy(() => import("../pages/vendor/VendorAddProduct"));
const VendorEditProduct = lazy(() => import("../pages/vendor/VendorEditProduct"));
const VendorProducts = lazy(() => import("../pages/vendor/VendorProducts"));
const VendorCategoryRequests = lazy(() => import("../pages/vendor/VendorCategoryRequests"));
const VendorOrders = lazy(() => import("../pages/vendor/VendorOrders"));
const VendorSettings = lazy(() => import("../pages/vendor/VendorSettings"));
const VendorFinance = lazy(() => import("../pages/vendor/VendorFinance"));
const VendorBankSettings = lazy(() => import("../pages/vendor/VendorBankSettings"));
const VendorMarketing = lazy(() => import("../pages/vendor/VendorMarketing"));
const VendorReports = lazy(() => import("../pages/vendor/VendorReports"));
const VendorShop = lazy(() => import("../pages/vendor/VendorShop"));
const VendorMessages = lazy(() => import("../pages/vendor/VendorMessages"));
const VendorReviews = lazy(() => import("../pages/vendor/VendorReviews"));
const VendorQA = lazy(() => import("../pages/vendor/VendorQA"));
const VendorReturns = lazy(() => import("../pages/vendor/VendorReturns"));
const VendorBulkUpload = lazy(() => import("../pages/vendor/VendorBulkUpload"));
const VendorSupportChat = lazy(() => import("../pages/vendor/VendorSupportChat"));
const VendorKyc = lazy(() => import("../pages/vendor/VendorKyc"));

const AdminDashboard = lazy(() => import("../pages/admin/AdminDashboard"));
const AdminOperations = lazy(() => import("../pages/admin/AdminOperations"));
const AdminAnalyticsReports = lazy(() => import("../pages/admin/AdminAnalyticsReports"));
const AdminDynamicCategories = lazy(() => import("../pages/admin/AdminDynamicCategories"));
const AdminCategoryManagement = lazy(() => import("../pages/admin/AdminCategoryManagement"));
const AdminEditCategoryAttributes = lazy(() => import("../pages/admin/AdminEditCategoryAttributes"));
const AdminProducts = lazy(() => import("../pages/admin/AdminProducts"));
const AdminCategoryRequests = lazy(() => import("../pages/admin/AdminCategoryRequests"));
const AdminOrders = lazy(() => import("../pages/admin/AdminOrders"));
const AdminInventory = lazy(() => import("../pages/admin/AdminInventory"));
const ProductForm = lazy(() => import("../pages/admin/ProductForm"));
const AdminCoupons = lazy(() => import("../pages/admin/AdminCoupons"));
const AdminPromotions = lazy(() => import("../pages/admin/AdminPromotions"));
const AdminReturns = lazy(() => import("../pages/admin/AdminReturns"));
const AdminOffers = lazy(() => import("../pages/admin/AdminOffers"));
const AdminReviews = lazy(() => import("../pages/admin/AdminReviews"));
const AdminUserManagement = lazy(() => import("../pages/admin/AdminUserManagement"));
const AdminCustomers = lazy(() => import("../pages/admin/AdminCustomers"));
const AdminTrustSafety = lazy(() => import("../pages/admin/AdminTrustSafety"));
const AdminCustomerInsights = lazy(() => import("../pages/admin/AdminCustomerInsights"));
const AdminSupport = lazy(() => import("../pages/admin/AdminSupport"));
const AdminQA = lazy(() => import("../pages/admin/AdminQA"));
const AdminFlashSales = lazy(() => import("../pages/admin/AdminFlashSales"));
const AdminDeliverySettings = lazy(() => import("../pages/admin/AdminDeliverySettings"));
const AdminLogistics = lazy(() => import("../pages/admin/AdminLogistics"));
const OfferForm = lazy(() => import("../pages/admin/OfferForm"));
const AdminVendors = lazy(() => import("../pages/admin/AdminVendorsEnhanced"));
const AdminVendorDetail = lazy(() => import("../pages/admin/AdminVendorDetail"));
const AdminPayouts = lazy(() => import("../pages/admin/AdminPayouts"));
const AdminPayoutRequests = lazy(() => import("../pages/admin/AdminPayoutRequests"));
const AdminPaymentVerifications = lazy(() => import("../pages/admin/AdminPaymentVerifications"));
const AdminVendorChats = lazy(() => import("../pages/admin/AdminVendorChats"));
const AdminChatDetail = lazy(() => import("../pages/admin/AdminChatDetail"));
const VendorActivityDashboard = lazy(() => import("../pages/admin/VendorActivityDashboard"));
const AdminVendorKyc = lazy(() => import("../pages/admin/AdminVendorKyc"));
const AdminNewsletter = lazy(() => import("../pages/admin/AdminNewsletter"));
const AdminPlatformControls = lazy(() => import("../pages/admin/AdminPlatformControls"));

const lazyElement = (Component) => (
  <Suspense fallback={<Loading />}>
    {createElement(Component)}
  </Suspense>
);

const privateElement = (Component) => (
  <PrivateRoute>
    {lazyElement(Component)}
  </PrivateRoute>
);

const adminElement = (Component, resource = "system", action = "read") => (
  <RBACGuard resource={resource} action={action}>
    {lazyElement(Component)}
  </RBACGuard>
);

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      { path: "/", element: lazyElement(Home) },
      { path: "/about", element: lazyElement(About) },
      { path: "/contact", element: lazyElement(Contact) },
      { path: "/login", element: lazyElement(Login) },
      { path: "/register", element: lazyElement(Register) },
      { path: "/auth-debug", element: lazyElement(AuthDebug) },
      { path: "/category/:category", element: lazyElement(CategoryPage) },
      { path: "/categories", element: lazyElement(CategoryPage) },
      { path: "/products", element: lazyElement(Products) },
      { path: "/search", element: lazyElement(SearchResults) },
      { path: "/flash-sales", element: lazyElement(FlashSales) },
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
      { path: "/checkout/guest", element: lazyElement(GuestCheckout) },
      { path: "/order-confirmation", element: lazyElement(OrderConfirmation) },
      { path: "/orders", element: privateElement(Orders) },
      { path: "/profile", element: privateElement(Profile) },
      { path: "/messages", element: privateElement(Messages) },
      { path: "/returns", element: privateElement(Returns) },
      { path: "/support", element: privateElement(Support) },
      { path: "/addresses", element: privateElement(Addresses) },
      { path: "/my-alerts", element: privateElement(MyAlerts) },
      { path: "/loyalty", element: privateElement(LoyaltyDashboard) },
      { path: "/vendor/register", element: privateElement(VendorRegister) },
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
      { path: "dashboard", element: lazyElement(VendorHome) },
      { path: "products", element: lazyElement(VendorProducts) },
      { path: "products/add", element: lazyElement(VendorAddProduct) },
      { path: "products/edit/:id", element: lazyElement(VendorEditProduct) },
      { path: "products/bulk", element: lazyElement(VendorBulkUpload) },
      { path: "orders", element: lazyElement(VendorOrders) },
      { path: "finance", element: lazyElement(VendorFinance) },
      { path: "finance/payouts", element: lazyElement(VendorFinance) },
      { path: "finance/transactions", element: lazyElement(VendorFinance) },
      { path: "finance/statements", element: lazyElement(VendorFinance) },
      { path: "finance/commissions", element: lazyElement(VendorFinance) },
      { path: "settings/bank", element: lazyElement(VendorBankSettings) },
      { path: "marketing/promotions", element: lazyElement(VendorMarketing) },
      { path: "marketing/vouchers", element: lazyElement(VendorMarketing) },
      { path: "marketing/campaigns", element: lazyElement(VendorMarketing) },
      { path: "marketing", element: lazyElement(VendorMarketing) },
      { path: "reports/sales", element: lazyElement(VendorReports) },
      { path: "reports/products", element: lazyElement(VendorReports) },
      { path: "reports/traffic", element: lazyElement(VendorReports) },
      { path: "reports/inventory", element: lazyElement(VendorReports) },
      { path: "reports", element: lazyElement(VendorReports) },
      { path: "shop/profile", element: lazyElement(VendorShop) },
      { path: "shop/decoration", element: lazyElement(VendorShop) },
      { path: "shop/categories", element: lazyElement(VendorShop) },
      { path: "shop", element: lazyElement(VendorShop) },
      { path: "messages", element: lazyElement(VendorMessages) },
      { path: "reviews", element: lazyElement(VendorReviews) },
      { path: "returns", element: lazyElement(VendorReturns) },
      { path: "qa", element: lazyElement(VendorQA) },
      { path: "support-chat", element: lazyElement(VendorSupportChat) },
      { path: "kyc", element: lazyElement(VendorKyc) },
      { path: "category-requests", element: lazyElement(VendorCategoryRequests) },
      { path: "settings", element: lazyElement(VendorSettings) },
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
      { path: "newsletter", element: adminElement(AdminNewsletter, "system", "read") },
      { path: "categories", element: adminElement(AdminDynamicCategories, "categories", "read") },
      { path: "categories/manage", element: adminElement(AdminCategoryManagement, "categories", "update") },
      { path: "categories/:categoryId/attributes", element: adminElement(AdminEditCategoryAttributes, "categories", "update") },
      { path: "category-requests", element: adminElement(AdminCategoryRequests, "categories", "read") },
      { path: "promotions", element: adminElement(AdminPromotions, "system", "read") },
      { path: "coupons", element: adminElement(AdminCoupons, "coupons", "read") },
      { path: "flash-sales", element: adminElement(AdminFlashSales, "system", "read") },
      { path: "offers", element: adminElement(AdminOffers, "system", "read") },
      { path: "offers/add", element: adminElement(OfferForm, "system", "create") },
      { path: "offers/edit/:id", element: adminElement(OfferForm, "system", "update") },
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
