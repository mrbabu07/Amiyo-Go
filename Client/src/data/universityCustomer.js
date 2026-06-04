export const customerUniversityRole = {
    id: "customer",
    label: { en: "Customer", bn: "কাস্টমার" },
    title: {
      en: "Buy safely, track clearly, and get help fast",
      bn: "নিরাপদে কিনুন, সহজে ট্র্যাক করুন, দ্রুত সহায়তা নিন",
    },
    description: {
      en: "Learn the full buyer journey from product discovery to delivery, return, review, and support.",
      bn: "পণ্য খোঁজা থেকে ডেলিভারি, রিটার্ন, রিভিউ ও সাপোর্ট পর্যন্ত সম্পূর্ণ ক্রেতা জার্নি শিখুন।",
    },
    cta: { label: { en: "Start shopping", bn: "কেনাকাটা শুরু করুন" }, path: "/products" },
    modules: [
      {
        id: "customer-account",
        title: { en: "Account, address, and trust basics", bn: "অ্যাকাউন্ট, ঠিকানা ও নিরাপত্তার বেসিক" },
        summary: {
          en: "Keep profile, phone, address, and notification settings correct before checkout.",
          bn: "চেকআউটের আগে প্রোফাইল, ফোন, ঠিকানা ও নোটিফিকেশন সেটিংস ঠিক রাখুন।",
        },
        steps: [
          { en: "Sign in or use guest checkout when allowed.", bn: "সাইন ইন করুন বা অনুমতি থাকলে গেস্ট চেকআউট ব্যবহার করুন।" },
          { en: "Save delivery addresses and mark one as default.", bn: "ডেলিভারি ঠিকানা সংরক্ষণ করুন এবং একটি ডিফল্ট করুন।" },
          { en: "Turn on order, return, and offer notifications.", bn: "অর্ডার, রিটার্ন ও অফার নোটিফিকেশন চালু রাখুন।" },
        ],
        links: [
          { label: { en: "Profile", bn: "প্রোফাইল" }, path: "/profile" },
          { label: { en: "Addresses", bn: "ঠিকানা" }, path: "/addresses" },
        ],
      },
      {
        id: "customer-shopping",
        title: { en: "Find the right product", bn: "সঠিক পণ্য খুঁজে নিন" },
        summary: {
          en: "Use search, categories, filters, vendor shops, reviews, and comparison before buying.",
          bn: "কেনার আগে সার্চ, ক্যাটাগরি, ফিল্টার, ভেন্ডর শপ, রিভিউ ও কম্পেয়ার ব্যবহার করুন।",
        },
        steps: [
          { en: "Search by product, brand, category, or shop name.", bn: "পণ্য, ব্র্যান্ড, ক্যাটাগরি বা শপ নাম দিয়ে সার্চ করুন।" },
          { en: "Check seller badges, product rating, stock, and delivery estimate.", bn: "সেলার ব্যাজ, রেটিং, স্টক ও ডেলিভারি সময় দেখুন।" },
          { en: "Follow shops and save wishlist items for alerts.", bn: "শপ ফলো করুন এবং অ্যালার্টের জন্য উইশলিস্টে রাখুন।" },
        ],
        links: [
          { label: { en: "Search", bn: "সার্চ" }, path: "/search" },
          { label: { en: "Shops", bn: "শপসমূহ" }, path: "/shops" },
          { label: { en: "Compare", bn: "তুলনা" }, path: "/compare" },
        ],
      },
      {
        id: "customer-checkout",
        title: { en: "Checkout, vouchers, and payment", bn: "চেকআউট, ভাউচার ও পেমেন্ট" },
        summary: {
          en: "Review item price, delivery charge, discount, and final payable amount before placing the order.",
          bn: "অর্ডার করার আগে পণ্যের দাম, ডেলিভারি চার্জ, ডিসকাউন্ট ও মোট পেমেন্ট ভালোভাবে দেখুন।",
        },
        steps: [
          { en: "Apply voucher or coins and confirm the discount row is visible.", bn: "ভাউচার বা কয়েন ব্যবহার করুন এবং ডিসকাউন্ট লাইন দেখা যাচ্ছে কি না দেখুন।" },
          { en: "Choose COD or available manual/online payment method.", bn: "COD বা চালু থাকা ম্যানুয়াল/অনলাইন পেমেন্ট বেছে নিন।" },
          { en: "Keep transaction proof if manual payment is used.", bn: "ম্যানুয়াল পেমেন্ট করলে ট্রানজেকশন প্রুফ সংরক্ষণ করুন।" },
        ],
        links: [
          { label: { en: "Cart", bn: "কার্ট" }, path: "/cart" },
          { label: { en: "Loyalty", bn: "লয়্যালটি" }, path: "/loyalty" },
        ],
      },
      {
        id: "customer-post-purchase",
        title: { en: "Track, return, review, and support", bn: "ট্র্যাকিং, রিটার্ন, রিভিউ ও সাপোর্ট" },
        summary: {
          en: "After ordering, use order detail as your single source for shipment, invoice, return, and support actions.",
          bn: "অর্ডারের পর শিপমেন্ট, ইনভয়েস, রিটার্ন ও সাপোর্টের জন্য অর্ডার ডিটেইল পেজ ব্যবহার করুন।",
        },
        steps: [
          { en: "Open order detail to see current shipment and courier state.", bn: "শিপমেন্ট ও কুরিয়ার স্টেট দেখতে অর্ডার ডিটেইল খুলুন।" },
          { en: "Request returns only inside the eligible return window.", bn: "যোগ্য রিটার্ন উইন্ডোর মধ্যে রিটার্ন রিকোয়েস্ট করুন।" },
          { en: "Review only purchased items and add useful evidence/photos.", bn: "কেনা পণ্যেই রিভিউ দিন এবং দরকারি ছবি/প্রমাণ যোগ করুন।" },
        ],
        links: [
          { label: { en: "Orders", bn: "অর্ডার" }, path: "/orders" },
          { label: { en: "Returns", bn: "রিটার্ন" }, path: "/returns" },
          { label: { en: "Support", bn: "সাপোর্ট" }, path: "/support" },
        ],
      },
    ],
  };

export const customerUniversityQuickGuides = [
  {
    title: { en: "Before checkout", bn: "চেকআউটের আগে" },
    body: {
      en: "Check item price, delivery charge, voucher discount, address, and payment method before placing the order.",
      bn: "অর্ডার করার আগে পণ্যের দাম, ডেলিভারি চার্জ, ভাউচার ডিসকাউন্ট, ঠিকানা ও পেমেন্ট মেথড দেখে নিন।",
    },
  },
  {
    title: { en: "After order", bn: "অর্ডারের পরে" },
    body: {
      en: "Use order detail to track shipment, download invoice, request return, review products, or contact support.",
      bn: "শিপমেন্ট ট্র্যাক, ইনভয়েস, রিটার্ন, রিভিউ বা সাপোর্টের জন্য অর্ডার ডিটেইল ব্যবহার করুন।",
    },
  },
  {
    title: { en: "Safety habit", bn: "নিরাপত্তার অভ্যাস" },
    body: {
      en: "Keep your phone, address, transaction proof, and notification settings updated for smoother support.",
      bn: "সহজ সাপোর্টের জন্য ফোন, ঠিকানা, ট্রানজেকশন প্রুফ ও নোটিফিকেশন সেটিংস আপডেট রাখুন।",
    },
  },
];
