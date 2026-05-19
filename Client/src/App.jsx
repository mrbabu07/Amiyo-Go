import { RouterProvider } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import AuthProvider from "./context/AuthContext";
import CartProvider from "./context/CartContext";
import WishlistProvider from "./context/WishlistContext";
import { ThemeProvider } from "./context/ThemeContext";
import { NotificationProvider } from "./context/NotificationContext";
import { ToastProvider } from "./context/ToastContext";
import { ComparisonProvider } from "./context/ComparisonContext";
import { PlatformConfigProvider } from "./context/PlatformConfigContext";
import OfferPopup from "./components/OfferPopup";
import ToastContainer from "./components/Toast";
import GlobalLoading from "./components/GlobalLoading";
import MobileOptimized from "./components/MobileOptimized";
import LanguagePreferenceSync from "./components/LanguagePreferenceSync";
import { ErrorBoundary } from "./components/ui/feedback";
import router from "./routes/Routes";

function App() {
  return (
    <MobileOptimized>
      <ThemeProvider>
        <AuthProvider>
          <LanguagePreferenceSync />
          <NotificationProvider>
            <ToastProvider>
              <ComparisonProvider>
                <CartProvider>
                  <WishlistProvider>
                    <PlatformConfigProvider>
                      <ErrorBoundary>
                        <RouterProvider router={router} />
                      </ErrorBoundary>
                    </PlatformConfigProvider>
                    <OfferPopup />
                    <ToastContainer />
                    <GlobalLoading />
                    <Toaster
                      position="bottom-center"
                      toastOptions={{
                        duration: 3000,
                        style: {
                          background: "white",
                          color: "#374151",
                          fontWeight: "600",
                          borderRadius: "8px",
                          padding: "12px 16px",
                          boxShadow:
                            "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                          border: "1px solid #E5E7EB",
                        },
                      }}
                    />
                  </WishlistProvider>
                </CartProvider>
              </ComparisonProvider>
            </ToastProvider>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </MobileOptimized>
  );
}

export default App;
