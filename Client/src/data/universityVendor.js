export const vendorUniversityRole = {
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
  };

export const vendorUniversityQuickGuides = [
  {
    title: { en: "Daily action queue", bn: "প্রতিদিনের অ্যাকশন কিউ" },
    body: {
      en: "Check pending orders, rejected products, low stock, return requests, and payout notices at the start of every shift.",
      bn: "প্রতি শিফটের শুরুতে পেন্ডিং অর্ডার, রিজেক্টেড পণ্য, লো স্টক, রিটার্ন রিকোয়েস্ট ও পেআউট নোটিস দেখুন।",
    },
  },
  {
    title: { en: "Fulfillment rule", bn: "ফুলফিলমেন্ট নিয়ম" },
    body: {
      en: "Pack on time, keep labels/slips ready, and mark pickup-ready only when the parcel is actually ready.",
      bn: "সময়মতো প্যাক করুন, লেবেল/স্লিপ প্রস্তুত রাখুন এবং পার্সেল সত্যি প্রস্তুত হলে পিকআপ-রেডি করুন।",
    },
  },
  {
    title: { en: "Finance habit", bn: "ফাইন্যান্স অভ্যাস" },
    body: {
      en: "Review commission, refund deduction, COD settlement, and payout eligibility before requesting payment.",
      bn: "পেমেন্ট রিকোয়েস্টের আগে কমিশন, রিফান্ড ডিডাকশন, COD সেটেলমেন্ট ও পেআউট যোগ্যতা দেখুন।",
    },
  },
];
