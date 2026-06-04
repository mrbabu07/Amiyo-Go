export const universityRoles = [
  {
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
  },
  {
    id: "vendor",
    label: { en: "Vendor", bn: "সেলার" },
    title: {
      en: "Run your shop like a seller-center operation",
      bn: "সেলার সেন্টারের মতো আপনার শপ পরিচালনা করুন",
    },
    description: {
      en: "Learn onboarding, catalog, fulfillment, finance, marketing, and reputation workflows.",
      bn: "অনবোর্ডিং, ক্যাটালগ, ফুলফিলমেন্ট, ফাইন্যান্স, মার্কেটিং ও রেপুটেশন ওয়ার্কফ্লো শিখুন।",
    },
    cta: { label: { en: "Open seller center", bn: "সেলার সেন্টার খুলুন" }, path: "/vendor/dashboard" },
    modules: [
      {
        id: "vendor-onboarding",
        title: { en: "Onboarding, KYC, and shop readiness", bn: "অনবোর্ডিং, KYC ও শপ রেডিনেস" },
        summary: {
          en: "Complete KYC, payout details, shop profile, policies, and pickup address before selling.",
          bn: "সেলিং শুরুর আগে KYC, পেআউট তথ্য, শপ প্রোফাইল, পলিসি ও পিকআপ ঠিকানা সম্পূর্ণ করুন।",
        },
        steps: [
          { en: "Submit accurate business and identity documents.", bn: "সঠিক ব্যবসা ও পরিচয়পত্রের ডকুমেন্ট জমা দিন।" },
          { en: "Set logo, banner, description, policies, and location.", bn: "লোগো, ব্যানার, বিবরণ, পলিসি ও লোকেশন সেট করুন।" },
          { en: "Check rejection or resubmission notes before editing.", bn: "এডিট করার আগে রিজেকশন বা রিসাবমিশন নোট দেখুন।" },
        ],
        links: [
          { label: { en: "KYC", bn: "KYC" }, path: "/vendor/kyc" },
          { label: { en: "Shop settings", bn: "শপ সেটিংস" }, path: "/vendor/shop/settings" },
        ],
      },
      {
        id: "vendor-catalog",
        title: { en: "Products, variants, and inventory", bn: "পণ্য, ভ্যারিয়েন্ট ও ইনভেন্টরি" },
        summary: {
          en: "Create accurate listings, manage stock, and respond to moderation feedback quickly.",
          bn: "সঠিক লিস্টিং তৈরি করুন, স্টক ম্যানেজ করুন এবং মডারেশন ফিডব্যাক দ্রুত ঠিক করুন।",
        },
        steps: [
          { en: "Use clear titles, category, images, SKU, price, stock, and variant data.", bn: "পরিষ্কার টাইটেল, ক্যাটাগরি, ছবি, SKU, দাম, স্টক ও ভ্যারিয়েন্ট দিন।" },
          { en: "Submit products for approval and fix rejected listings.", bn: "পণ্য অনুমোদনের জন্য সাবমিট করুন এবং রিজেক্টেড লিস্টিং ঠিক করুন।" },
          { en: "Watch low stock and update inventory before sales stop.", bn: "লো স্টক দেখুন এবং সেল বন্ধ হওয়ার আগে ইনভেন্টরি আপডেট করুন।" },
        ],
        links: [
          { label: { en: "Products", bn: "পণ্য" }, path: "/vendor/products" },
          { label: { en: "Add product", bn: "পণ্য যোগ করুন" }, path: "/vendor/products/add" },
        ],
      },
      {
        id: "vendor-fulfillment",
        title: { en: "Orders, packing, dispatch, and returns", bn: "অর্ডার, প্যাকিং, ডিসপ্যাচ ও রিটার্ন" },
        summary: {
          en: "Process orders through packing, pickup-ready, courier tracking, failed delivery, and return workflows.",
          bn: "অর্ডারকে প্যাকিং, পিকআপ-রেডি, কুরিয়ার ট্র্যাকিং, ফেইল্ড ডেলিভারি ও রিটার্ন ওয়ার্কফ্লোতে চালান।",
        },
        steps: [
          { en: "Open each order and confirm item, address, payment, and notes.", bn: "প্রতি অর্ডারে পণ্য, ঠিকানা, পেমেন্ট ও নোট যাচাই করুন।" },
          { en: "Pack items, print slips/labels, and mark pickup-ready on time.", bn: "পণ্য প্যাক করুন, স্লিপ/লেবেল প্রিন্ট করুন এবং সময়মতো পিকআপ-রেডি করুন।" },
          { en: "Respond to return/dispute evidence from the return queue.", bn: "রিটার্ন কিউ থেকে রিটার্ন/ডিসপিউট এভিডেন্সের জবাব দিন।" },
        ],
        links: [
          { label: { en: "Orders", bn: "অর্ডার" }, path: "/vendor/orders" },
          { label: { en: "Returns", bn: "রিটার্ন" }, path: "/vendor/returns" },
        ],
      },
      {
        id: "vendor-finance-marketing",
        title: { en: "Finance, payouts, vouchers, and reputation", bn: "ফাইন্যান্স, পেআউট, ভাউচার ও রেপুটেশন" },
        summary: {
          en: "Track gross sales, commission, refunds, COD settlement, payouts, campaigns, reviews, and Q&A.",
          bn: "গ্রস সেল, কমিশন, রিফান্ড, COD সেটেলমেন্ট, পেআউট, ক্যাম্পেইন, রিভিউ ও Q&A ট্র্যাক করুন।",
        },
        steps: [
          { en: "Check finance before requesting payout.", bn: "পেআউট রিকোয়েস্ট করার আগে ফাইন্যান্স দেখুন।" },
          { en: "Use vouchers and campaigns only when margins allow.", bn: "মার্জিন থাকলে ভাউচার ও ক্যাম্পেইন ব্যবহার করুন।" },
          { en: "Reply to reviews and Q&A to improve buyer trust.", bn: "ক্রেতার আস্থা বাড়াতে রিভিউ ও Q&A-তে রিপ্লাই দিন।" },
        ],
        links: [
          { label: { en: "Finance", bn: "ফাইন্যান্স" }, path: "/vendor/finance" },
          { label: { en: "Marketing", bn: "মার্কেটিং" }, path: "/vendor/marketing" },
          { label: { en: "Reviews", bn: "রিভিউ" }, path: "/vendor/reviews" },
        ],
      },
    ],
  },
  {
    id: "admin",
    label: { en: "Admin", bn: "অ্যাডমিন" },
    title: {
      en: "Operate the marketplace through queues, controls, and evidence",
      bn: "কিউ, কন্ট্রোল ও প্রমাণের মাধ্যমে মার্কেটপ্লেস পরিচালনা করুন",
    },
    description: {
      en: "Learn approvals, moderation, orders, finance, logistics, trust, growth, analytics, staff, and audit workflows.",
      bn: "অ্যাপ্রুভাল, মডারেশন, অর্ডার, ফাইন্যান্স, লজিস্টিকস, ট্রাস্ট, গ্রোথ, অ্যানালিটিক্স, স্টাফ ও অডিট শিখুন।",
    },
    cta: { label: { en: "Open admin", bn: "অ্যাডমিন খুলুন" }, path: "/admin" },
    modules: [
      {
        id: "admin-queues",
        title: { en: "Queue-first operations", bn: "কিউ-ফার্স্ট অপারেশন" },
        summary: {
          en: "Start each shift from operations, approvals, moderation, support, returns, payouts, and failed-delivery queues.",
          bn: "প্রতি শিফটে অপারেশন, অ্যাপ্রুভাল, মডারেশন, সাপোর্ট, রিটার্ন, পেআউট ও ফেইল্ড ডেলিভারি কিউ থেকে শুরু করুন।",
        },
        steps: [
          { en: "Use filters, priority, and assignment before taking action.", bn: "অ্যাকশন নেওয়ার আগে ফিল্টার, প্রায়োরিটি ও অ্যাসাইনমেন্ট ব্যবহার করুন।" },
          { en: "Keep every approval/rejection reason clear and auditable.", bn: "প্রতি অ্যাপ্রুভাল/রিজেকশন কারণ পরিষ্কার ও অডিটযোগ্য রাখুন।" },
          { en: "Escalate exceptions instead of editing unrelated records.", bn: "অপ্রাসঙ্গিক ডেটা এডিট না করে এক্সসেপশন এসকেলেট করুন।" },
        ],
        links: [
          { label: { en: "Operations", bn: "অপারেশন" }, path: "/admin/operations" },
          { label: { en: "Vendors", bn: "ভেন্ডর" }, path: "/admin/vendor-requests" },
          { label: { en: "Products", bn: "পণ্য" }, path: "/admin/products" },
        ],
      },
      {
        id: "admin-money",
        title: { en: "Payments, COD, refunds, and payouts", bn: "পেমেন্ট, COD, রিফান্ড ও পেআউট" },
        summary: {
          en: "Reconcile payment proof, COD float, return deductions, refund status, and vendor payout exposure.",
          bn: "পেমেন্ট প্রুফ, COD ফ্লোট, রিটার্ন ডিডাকশন, রিফান্ড স্ট্যাটাস ও ভেন্ডর পেআউট এক্সপোজার মিলিয়ে দেখুন।",
        },
        steps: [
          { en: "Verify manual payments only after matching amount, order, and transaction proof.", bn: "অ্যামাউন্ট, অর্ডার ও ট্রানজেকশন প্রুফ মিলিয়ে ম্যানুয়াল পেমেন্ট ভেরিফাই করুন।" },
          { en: "Check COD collected, remitted, failed, disputed, and settled states.", bn: "COD collected, remitted, failed, disputed ও settled স্টেট দেখুন।" },
          { en: "Hold payouts when risk, disputes, or return deductions are unresolved.", bn: "রিস্ক, ডিসপিউট বা রিটার্ন ডিডাকশন অমীমাংসিত থাকলে পেআউট হোল্ড করুন।" },
        ],
        links: [
          { label: { en: "Payment verification", bn: "পেমেন্ট ভেরিফিকেশন" }, path: "/admin/payment-verification" },
          { label: { en: "COD reconciliation", bn: "COD রিকনসিলিয়েশন" }, path: "/admin/cod-reconciliation" },
          { label: { en: "Payouts", bn: "পেআউট" }, path: "/admin/payouts" },
        ],
      },
      {
        id: "admin-logistics-trust",
        title: { en: "Logistics, returns, trust, and disputes", bn: "লজিস্টিকস, রিটার্ন, ট্রাস্ট ও ডিসপিউট" },
        summary: {
          en: "Monitor shipment state, courier assignment, RTO, reverse logistics, suspicious behavior, and dispute evidence.",
          bn: "শিপমেন্ট স্টেট, কুরিয়ার অ্যাসাইনমেন্ট, RTO, রিভার্স লজিস্টিকস, সন্দেহজনক আচরণ ও ডিসপিউট এভিডেন্স মনিটর করুন।",
        },
        steps: [
          { en: "Assign courier only after packed/pickup-ready state is clear.", bn: "প্যাকড/পিকআপ-রেডি স্টেট পরিষ্কার হলে কুরিয়ার অ্যাসাইন করুন।" },
          { en: "Use evidence and policy notes before resolving disputes.", bn: "ডিসপিউট সমাধানের আগে এভিডেন্স ও পলিসি নোট ব্যবহার করুন।" },
          { en: "Audit every enforcement, refund, hold, or override action.", bn: "প্রতি এনফোর্সমেন্ট, রিফান্ড, হোল্ড বা ওভাররাইড অডিট করুন।" },
        ],
        links: [
          { label: { en: "Logistics", bn: "লজিস্টিকস" }, path: "/admin/logistics" },
          { label: { en: "Returns", bn: "রিটার্ন" }, path: "/admin/returns" },
          { label: { en: "Trust & Safety", bn: "ট্রাস্ট ও সেফটি" }, path: "/admin/trust-safety" },
        ],
      },
      {
        id: "admin-growth-governance",
        title: { en: "Growth, settings, staff, analytics, and audit", bn: "গ্রোথ, সেটিংস, স্টাফ, অ্যানালিটিক্স ও অডিট" },
        summary: {
          en: "Control banners, vouchers, flash sales, reports, RBAC, platform settings, and audit logs responsibly.",
          bn: "ব্যানার, ভাউচার, ফ্ল্যাশ সেল, রিপোর্ট, RBAC, প্ল্যাটফর্ম সেটিংস ও অডিট লগ দায়িত্ব নিয়ে পরিচালনা করুন।",
        },
        steps: [
          { en: "Schedule campaigns with clear scope, dates, and discount limits.", bn: "স্পষ্ট স্কোপ, তারিখ ও ডিসকাউন্ট লিমিট দিয়ে ক্যাম্পেইন শিডিউল করুন।" },
          { en: "Give staff the minimum permissions needed for their section.", bn: "স্টাফকে তার সেকশনের জন্য যতটুকু দরকার ততটুকু পারমিশন দিন।" },
          { en: "Review analytics and audit logs before changing platform rules.", bn: "প্ল্যাটফর্ম রুল বদলানোর আগে অ্যানালিটিক্স ও অডিট লগ দেখুন।" },
        ],
        links: [
          { label: { en: "Banners", bn: "ব্যানার" }, path: "/admin/banners" },
          { label: { en: "Staff", bn: "স্টাফ" }, path: "/admin/staff" },
          { label: { en: "Audit", bn: "অডিট" }, path: "/admin/audit" },
        ],
      },
    ],
  },
];

export const universityQuickGuides = [
  {
    title: { en: "Daily habit", bn: "প্রতিদিনের অভ্যাস" },
    body: {
      en: "Customers check order status, vendors check action queues, admins check exceptions first.",
      bn: "কাস্টমার অর্ডার স্ট্যাটাস দেখবে, সেলার অ্যাকশন কিউ দেখবে, অ্যাডমিন আগে এক্সসেপশন দেখবে।",
    },
  },
  {
    title: { en: "Money rule", bn: "টাকার নিয়ম" },
    body: {
      en: "Never trust only a displayed total. Check subtotal, delivery, discount, refund, COD, and payout state.",
      bn: "শুধু মোট দাম দেখে বিশ্বাস করবেন না। সাবটোটাল, ডেলিভারি, ডিসকাউন্ট, রিফান্ড, COD ও পেআউট স্টেট দেখুন।",
    },
  },
  {
    title: { en: "Evidence rule", bn: "প্রমাণের নিয়ম" },
    body: {
      en: "For KYC, returns, disputes, payments, and enforcement, keep evidence and notes attached.",
      bn: "KYC, রিটার্ন, ডিসপিউট, পেমেন্ট ও এনফোর্সমেন্টে প্রমাণ ও নোট সংযুক্ত রাখুন।",
    },
  },
];
