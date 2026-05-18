const clamp = (value, min = 0, max = 100) => Math.min(Math.max(value, min), max);

const toArray = (value) => (Array.isArray(value) ? value : []);

const hasValue = (value) => {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  return Boolean(value);
};

const countDone = (items) => items.filter((item) => item.done).length;

export const getWorkflowTone = (score) => {
  if (score >= 85) return "healthy";
  if (score >= 60) return "watch";
  return "risk";
};

export const summarizeWorkflow = ({ role, title, description, items = [], fallbackScore = null }) => {
  const normalizedItems = items.map((item) => ({
    priority: "normal",
    actionLabel: item.done ? "Open" : "Fix now",
    ...item,
    done: Boolean(item.done),
  }));

  const total = normalizedItems.length;
  const completed = countDone(normalizedItems);
  const score = total
    ? Math.round((completed / total) * 100)
    : clamp(Number(fallbackScore ?? 100));

  const openItems = normalizedItems
    .filter((item) => !item.done)
    .sort((a, b) => {
      const priorityWeight = { high: 0, medium: 1, normal: 2, low: 3 };
      return (priorityWeight[a.priority] ?? 2) - (priorityWeight[b.priority] ?? 2);
    });

  return {
    role,
    title,
    description,
    items: normalizedItems,
    openItems,
    completed,
    total,
    score,
    tone: getWorkflowTone(score),
  };
};

export const buildCustomerWorkflow = ({ account = {}, addresses = [] } = {}) => {
  const profile = account.profile || {};
  const verification = account.verificationBadges || {};
  const paymentMethods = toArray(account.savedPaymentMethods);
  const deliveryAddresses = toArray(addresses);
  const notificationPreferences = account.notificationPreferences || {};
  const orderUpdates = notificationPreferences.orderUpdates || {};

  const profileReady = hasValue(profile.displayName) && hasValue(profile.email) && hasValue(profile.phone);
  const deliveryReady = deliveryAddresses.length > 0;
  const paymentReady = paymentMethods.length > 0;
  const securityReady = Boolean(verification.emailVerified && (verification.phoneVerified || profile.phone));
  const updateReady = Object.values(orderUpdates).some(Boolean);

  return summarizeWorkflow({
    role: "customer",
    title: "Buying workflow readiness",
    description: "Keep account, delivery, payment, and update settings ready before checkout.",
    items: [
      {
        key: "profile",
        label: "Profile contact is complete",
        description: "Name, email, and phone are needed for checkout and delivery calls.",
        done: profileReady,
        to: "/profile",
        priority: "high",
      },
      {
        key: "address",
        label: "Delivery address is saved",
        description: "Save at least one Bangladesh delivery address for faster checkout.",
        done: deliveryReady,
        to: "/addresses",
        priority: "high",
      },
      {
        key: "payment",
        label: "Payment method is ready",
        description: "Save bKash, Nagad, or card details for fewer checkout mistakes.",
        done: paymentReady,
        to: "/profile",
        priority: "medium",
      },
      {
        key: "security",
        label: "Contact verification is usable",
        description: "Verified contact details help with delivery, support, and account recovery.",
        done: securityReady,
        to: "/profile",
        priority: "medium",
      },
      {
        key: "updates",
        label: "Order update channels are enabled",
        description: "Keep at least one order notification channel enabled.",
        done: updateReady,
        to: "/notifications",
        priority: "normal",
      },
    ],
  });
};

export const buildVendorWorkflow = ({
  onboardingProgress = 0,
  healthScore = 100,
  actionRequiredOrders = 0,
  breachedShipments = 0,
  listingIssues = 0,
  pendingModeration = 0,
  marketingItems = 0,
} = {}) =>
  summarizeWorkflow({
    role: "vendor",
    title: "Seller workflow control",
    description: "Keep fulfilment, listings, moderation, and growth work moving from one checklist.",
    fallbackScore: Math.round((Number(onboardingProgress || 0) + Number(healthScore || 0)) / 2),
    items: [
      {
        key: "onboarding",
        label: "Seller onboarding is complete",
        description: `${clamp(Number(onboardingProgress || 0))}% of setup tasks are complete.`,
        done: Number(onboardingProgress || 0) >= 100,
        to: "/vendor/settings",
        priority: "high",
      },
      {
        key: "shipments",
        label: "No breached shipment SLA",
        description: breachedShipments
          ? `${breachedShipments} shipment deadline needs immediate action.`
          : `${actionRequiredOrders} active orders are inside SLA.`,
        done: Number(breachedShipments || 0) === 0,
        to: "/vendor/orders",
        priority: "high",
      },
      {
        key: "listings",
        label: "Listing quality is clean",
        description: listingIssues
          ? `${listingIssues} products need stock, media, attributes, or visibility fixes.`
          : "No urgent product quality issues found.",
        done: Number(listingIssues || 0) === 0,
        to: "/vendor/products",
        priority: "medium",
      },
      {
        key: "moderation",
        label: "No products waiting on moderation",
        description: pendingModeration
          ? `${pendingModeration} products are waiting for review.`
          : "All submitted products have cleared the current moderation wait.",
        done: Number(pendingModeration || 0) === 0,
        to: "/vendor/products",
        priority: "normal",
      },
      {
        key: "marketing",
        label: "Growth channel is active",
        description: marketingItems
          ? `${marketingItems} campaign or voucher items are available.`
          : "Join a campaign or create a seller voucher to build demand.",
        done: Number(marketingItems || 0) > 0,
        to: "/vendor/marketing",
        priority: "low",
      },
    ],
  });

export const buildAdminWorkflow = ({
  queueSummary = {},
  metrics = {},
  health = {},
  notificationHealth = {},
  jobMonitors = [],
} = {}) => {
  const failedJobs = toArray(jobMonitors).reduce((sum, job) => sum + Number(job.failures || 0), 0);
  const notificationFailures =
    Number(metrics.failedNotifications || 0) +
    Number(metrics.failedNewsletterRecipients || 0) +
    Number(notificationHealth.failedDeliveries || 0);

  return summarizeWorkflow({
    role: "admin",
    title: "Marketplace operations workflow",
    description: "Resolve SLA, payout, support, notification, and job health issues by priority.",
    fallbackScore: health.score,
    items: [
      {
        key: "sla",
        label: "No breached marketplace queues",
        description: `${Number(queueSummary.slaBreached || 0)} SLA breaches across ${Number(queueSummary.totalOpen || 0)} open items.`,
        done: Number(queueSummary.slaBreached || 0) === 0,
        to: "/admin/operations",
        priority: "high",
      },
      {
        key: "critical",
        label: "Critical queues are clear",
        description: `${Number(queueSummary.criticalQueues || 0)} critical queue groups require review.`,
        done: Number(queueSummary.criticalQueues || 0) === 0,
        to: "/admin/operations",
        priority: "high",
      },
      {
        key: "support",
        label: "Support backlog is controlled",
        description: `${Number(metrics.openSupportTickets || 0)} support tickets are open or in progress.`,
        done: Number(metrics.openSupportTickets || 0) === 0,
        to: "/admin/support",
        priority: "medium",
      },
      {
        key: "notifications",
        label: "Notification delivery is healthy",
        description: `${notificationFailures} notification or newsletter delivery failures in window.`,
        done: notificationFailures === 0,
        to: "/admin/platform-controls",
        priority: "medium",
      },
      {
        key: "jobs",
        label: "Background jobs are healthy",
        description: `${failedJobs} job failures reported by cron and queue monitors.`,
        done: failedJobs === 0,
        to: "/admin/operations",
        priority: "normal",
      },
    ],
  });
};
