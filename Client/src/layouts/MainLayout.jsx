import { motion } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ScrollToTop from "../components/ScrollToTop";
import ComparisonFloatingButton from "../components/ComparisonFloatingButton";
import SpinWheelFAB from "../components/SpinWheelFAB";
import BottomNavigation from "../components/BottomNavigation";

export default function MainLayout() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <Navbar />
      <motion.main
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="flex-1 pb-20 lg:pb-0"
      >
        <Outlet />
      </motion.main>
      <Footer />
      <BottomNavigation />
      <ScrollToTop />
      <ComparisonFloatingButton />
      <SpinWheelFAB />
    </div>
  );
}
