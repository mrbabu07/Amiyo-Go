import University from "../University";
import { vendorUniversityQuickGuides, vendorUniversityRole } from "../../data/universityVendor";

const VENDOR_ROLES = [vendorUniversityRole];
const VENDOR_UNIVERSITY_HERO = {
  title: "Seller learning center",
  description: {
    en: "Protected seller-center guides for onboarding, products, orders, fulfillment, finance, and reputation.",
    bn: "অনবোর্ডিং, পণ্য, অর্ডার, ফুলফিলমেন্ট, ফাইন্যান্স ও রেপুটেশনের protected seller-center guide.",
  },
};

export default function VendorUniversity() {
  return (
    <University
      roles={VENDOR_ROLES}
      quickGuides={vendorUniversityQuickGuides}
      heroCopy={VENDOR_UNIVERSITY_HERO}
      defaultRole="vendor"
    />
  );
}
