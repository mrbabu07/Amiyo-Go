import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ScrollToTop from "../components/ScrollToTop";
import RecentlyViewedIndicator from "../components/RecentlyViewedIndicator";
import ComparisonFloatingButton from "../components/ComparisonFloatingButton";
import SpinWheelFAB from "../components/SpinWheelFAB";

export default function MainLayout() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <ScrollToTop />
      <RecentlyViewedIndicator />
      <ComparisonFloatingButton />
      <SpinWheelFAB />
    </div>
  );
}
