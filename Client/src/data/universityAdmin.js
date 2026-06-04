export const adminUniversityRole = {
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
  };

export const adminUniversityQuickGuides = [
  {
    title: { en: "Queue-first control", bn: "কিউ-ফার্স্ট কন্ট্রোল" },
    body: {
      en: "Start from approvals, moderation, returns, payouts, failed delivery, fraud, and support exceptions before routine browsing.",
      bn: "রুটিন ব্রাউজিংয়ের আগে অ্যাপ্রুভাল, মডারেশন, রিটার্ন, পেআউট, ফেইল্ড ডেলিভারি, ফ্রড ও সাপোর্ট এক্সসেপশন দেখুন।",
    },
  },
  {
    title: { en: "Evidence rule", bn: "প্রমাণের নিয়ম" },
    body: {
      en: "Every rejection, refund, hold, enforcement, and override must have a reason, evidence, and audit trail.",
      bn: "প্রতি রিজেকশন, রিফান্ড, হোল্ড, এনফোর্সমেন্ট ও ওভাররাইডে কারণ, প্রমাণ ও অডিট ট্রেইল থাকতে হবে।",
    },
  },
  {
    title: { en: "Permission habit", bn: "পারমিশন অভ্যাস" },
    body: {
      en: "Give staff only the permissions needed for their section and keep delete/settings access restricted.",
      bn: "স্টাফকে শুধু তার সেকশনের দরকারি পারমিশন দিন এবং delete/settings access সীমিত রাখুন।",
    },
  },
];
