import { createBrowserRouter } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import Home from "../pages/Home";
import About from "../pages/About";
import Contact from "../pages/Contact";
import Login from "../pages/Login";
import Register from "../pages/Register";
import CategoryPage from "../pages/CategoryPage";
import Products from "../pages/Products";
import ProductDetail from "../pages/ProductDetail";
import Cart from "../pages/Cart";
import Wishlist from "../pages/Wishlist";
import SharedWishlist from "../pages/SharedWishlist";
import Compare from "../pages/Compare";
import Checkout from "../pages/Checkout";
import Orders from "../pages/Orders";
import Profile from "../pages/Profile";
import AdminDashboard from "../pages/admin/AdminDashboard";
import AdminProducts from "../pages/admin/AdminProducts";
import AdminCategories from "../pages/admin/AdminCategories";
import AdminOrders from "../pages/admin/AdminOrders";
import AdminInventory from "../pages/admin/AdminInventory";
import ProductForm from "../pages/admin/ProductForm";
import AdminCoupons from "../pages/admin/AdminCoupons";
import AdminReturns from "../pages/admin/AdminReturns";
import AdminOffers from "../pages/admin/AdminOffers";
import AdminReviews from "../pages/admin/AdminReviews";
import AdminUserManagement from "../pages/admin/AdminUserManagement";
import AdminCustomerInsights from "../pages/admin/AdminCustomerInsights";
import AdminSupport from "../pages/admin/AdminSupport";
import AdminQA from "../pages/admin/AdminQA";
import AdminFlashSales from "../pages/admin/AdminFlashSales";
import AdminDeliverySettings from "../pages/admin/AdminDeliverySettings";
import OfferForm from "../pages/admin/OfferForm";
import Returns from "../pages/Returns";
import Support from "../pages/Support";
import Addresses from "../pages/Addresses";
import FlashSales from "../pages/FlashSales";
import MyAlerts from "../pages/MyAlerts";
import LoyaltyDashboard from "../pages/LoyaltyDashboard";
import PrivateRoute from "../components/PrivateRoute";
import AdminRoute from "../components/AdminRoute";
import SearchResults from "../pages/SearchResults";

// Vendor imports
import VendorLayout from "../layouts/VendorLayout";
import VendorRegister from "../pages/VendorRegister";
import VendorHome from "../pages/vendor/VendorHome";
import VendorAddProduct from "../pages/vendor/VendorAddProduct";
import VendorEditProduct from "../pages/vendor/VendorEditProduct";
import VendorProducts from "../pages/vendor/VendorProducts";
import VendorOrders from "../pages/vendor/VendorOrders";
import VendorSettings from "../pages/vendor/VendorSettings";
import VendorFinance from "../pages/vendor/VendorFinance";
import VendorMarketing from "../pages/vendor/VendorMarketing";
import VendorReports from "../pages/vendor/VendorReports";
import VendorShop from "../pages/vendor/VendorShop";
import VendorMessages from "../pages/vendor/VendorMessages";
import VendorReviews from "../pages/vendor/VendorReviews";
import VendorQA from "../pages/vendor/VendorQA";
import VendorBulkUpload from "../pages/vendor/VendorBulkUpload";
import ComingSoon from "../pages/vendor/ComingSoon";
import AdminVendors from "../pages/admin/AdminVendors";
import AuthDebug from "../pages/AuthDebug";

const router = createBrowserRouter([
  // Main site routes
  {
    path: "/",
    element: <MainLayout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/about", element: <About /> },
      { path: "/contact", element: <Contact /> },
      { path: "/login", element: <Login /> },
      { path: "/register", element: <Register /> },
      { path: "/auth-debug", element: <AuthDebug /> },
      { path: "/category/:category", element: <CategoryPage /> },
      { path: "/categories", element: <CategoryPage /> },
      { path: "/products", element: <Products /> },
      { path: "/search", element: <SearchResults /> },
      { path: "/flash-sales", element: <FlashSales /> },

      // Legacy routes for backward compatibility
      { path: "/mens", element: <CategoryPage /> },
      { path: "/womens", element: <CategoryPage /> },
      { path: "/electronics", element: <CategoryPage /> },
      { path: "/baby", element: <CategoryPage /> },
      { path: "/product/:id", element: <ProductDetail /> },
      { path: "/cart", element: <Cart /> },
      { path: "/compare", element: <Compare /> },
      {
        path: "/wishlist",
        element: (
          <PrivateRoute>
            <Wishlist />
          </PrivateRoute>
        ),
      },
      { path: "/wishlist/shared/:shareId", element: <SharedWishlist /> },
      {
        path: "/checkout",
        element: (
          <PrivateRoute>
            <Checkout />
          </PrivateRoute>
        ),
      },
      {
        path: "/orders",
        element: (
          <PrivateRoute>
            <Orders />
          </PrivateRoute>
        ),
      },
      {
        path: "/profile",
        element: (
          <PrivateRoute>
            <Profile />
          </PrivateRoute>
        ),
      },
      {
        path: "/admin",
        element: (
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        ),
      },
      {
        path: "/admin/products",
        element: (
          <AdminRoute>
            <AdminProducts />
          </AdminRoute>
        ),
      },
      {
        path: "/admin/inventory",
        element: (
          <AdminRoute>
            <AdminInventory />
          </AdminRoute>
        ),
      },
      {
        path: "/admin/products/add",
        element: (
          <AdminRoute>
            <ProductForm />
          </AdminRoute>
        ),
      },
      {
        path: "/admin/products/edit/:id",
        element: (
          <AdminRoute>
            <ProductForm />
          </AdminRoute>
        ),
      },
      {
        path: "/admin/categories",
        element: (
          <AdminRoute>
            <AdminCategories />
          </AdminRoute>
        ),
      },
      {
        path: "/admin/orders",
        element: (
          <AdminRoute>
            <AdminOrders />
          </AdminRoute>
        ),
      },
      {
        path: "/admin/coupons",
        element: (
          <AdminRoute>
            <AdminCoupons />
          </AdminRoute>
        ),
      },
      {
        path: "/admin/returns",
        element: (
          <AdminRoute>
            <AdminReturns />
          </AdminRoute>
        ),
      },
      {
        path: "/admin/offers",
        element: (
          <AdminRoute>
            <AdminOffers />
          </AdminRoute>
        ),
      },
      {
        path: "/admin/offers/add",
        element: (
          <AdminRoute>
            <OfferForm />
          </AdminRoute>
        ),
      },
      {
        path: "/admin/offers/edit/:id",
        element: (
          <AdminRoute>
            <OfferForm />
          </AdminRoute>
        ),
      },
      {
        path: "/admin/reviews",
        element: (
          <AdminRoute>
            <AdminReviews />
          </AdminRoute>
        ),
      },
      {
        path: "/admin/qa",
        element: (
          <AdminRoute>
            <AdminQA />
          </AdminRoute>
        ),
      },
      {
        path: "/admin/users",
        element: (
          <AdminRoute>
            <AdminUserManagement />
          </AdminRoute>
        ),
      },
      {
        path: "/admin/insights",
        element: (
          <AdminRoute>
            <AdminCustomerInsights />
          </AdminRoute>
        ),
      },
      {
        path: "/admin/support",
        element: (
          <AdminRoute>
            <AdminSupport />
          </AdminRoute>
        ),
      },
      {
        path: "/admin/flash-sales",
        element: (
          <AdminRoute>
            <AdminFlashSales />
          </AdminRoute>
        ),
      },
      {
        path: "/admin/delivery-settings",
        element: (
          <AdminRoute>
            <AdminDeliverySettings />
          </AdminRoute>
        ),
      },
      {
        path: "/admin/vendors",
        element: (
          <AdminRoute>
            <AdminVendors />
          </AdminRoute>
        ),
      },
      {
        path: "/returns",
        element: (
          <PrivateRoute>
            <Returns />
          </PrivateRoute>
        ),
      },
      {
        path: "/support",
        element: (
          <PrivateRoute>
            <Support />
          </PrivateRoute>
        ),
      },
      {
        path: "/addresses",
        element: (
          <PrivateRoute>
            <Addresses />
          </PrivateRoute>
        ),
      },
      {
        path: "/my-alerts",
        element: (
          <PrivateRoute>
            <MyAlerts />
          </PrivateRoute>
        ),
      },
      {
        path: "/loyalty",
        element: (
          <PrivateRoute>
            <LoyaltyDashboard />
          </PrivateRoute>
        ),
      },
      // Vendor registration (uses main layout)
      {
        path: "/vendor/register",
        element: (
          <PrivateRoute>
            <VendorRegister />
          </PrivateRoute>
        ),
      },
    ],
  },
  // Vendor Seller Center routes (separate layout, no main site header)
  {
    path: "/vendor",
    element: (
      <PrivateRoute>
        <VendorLayout />
      </PrivateRoute>
    ),
    children: [
      { path: "dashboard", element: <VendorHome /> },
      { path: "products", element: <VendorProducts /> },
      { path: "products/add", element: <VendorAddProduct /> },
      { path: "products/edit/:id", element: <VendorEditProduct /> },
      { path: "products/bulk", element: <VendorBulkUpload /> },
      { path: "orders", element: <VendorOrders /> },
      { path: "finance/payments", element: <VendorFinance /> },
      { path: "finance/transactions", element: <VendorFinance /> },
      { path: "finance/statements", element: <VendorFinance /> },
      { path: "finance", element: <VendorFinance /> },
      { path: "marketing/promotions", element: <VendorMarketing /> },
      { path: "marketing/vouchers", element: <VendorMarketing /> },
      { path: "marketing/campaigns", element: <VendorMarketing /> },
      { path: "marketing", element: <VendorMarketing /> },
      { path: "reports/sales", element: <VendorReports /> },
      { path: "reports/products", element: <VendorReports /> },
      { path: "reports/traffic", element: <VendorReports /> },
      { path: "reports", element: <VendorReports /> },
      { path: "shop/profile", element: <VendorShop /> },
      { path: "shop/decoration", element: <VendorShop /> },
      { path: "shop/categories", element: <VendorShop /> },
      { path: "shop", element: <VendorShop /> },
      { path: "messages", element: <VendorMessages /> },
      { path: "reviews", element: <VendorReviews /> },
      { path: "qa", element: <VendorQA /> },
      { path: "settings", element: <VendorSettings /> },
    ],
  },
]);

export default router;
