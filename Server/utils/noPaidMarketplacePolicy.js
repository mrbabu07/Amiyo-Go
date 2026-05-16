const FREE_API_REPLACEMENTS = Object.freeze({
  smsOtp: {
    blockedDependency: "Paid SMS OTP",
    freeAlternative: "Email verification plus manual phone review from the admin panel",
    requiredFeatures: ["emailVerification", "manualPhoneReview"],
  },
  mapPlaces: {
    blockedDependency: "Google Maps or paid places API",
    freeAlternative: "Local Bangladesh division, district, upazila, and union datasets",
    requiredFeatures: ["localAddressDataset", "areaBasedDeliveryRules"],
  },
  paymentGateway: {
    blockedDependency: "Paid payment gateway",
    freeAlternative: "Cash on delivery and manual MFS payment proof verification",
    requiredFeatures: ["cashOnDelivery", "manualMfsProof", "adminPaymentVerification"],
  },
  courierTracking: {
    blockedDependency: "Paid courier API",
    freeAlternative: "Manual courier name, tracking number, shipment status, and delivery logs",
    requiredFeatures: ["manualShipmentLog", "sellerFulfillmentDashboard"],
  },
  externalAnalytics: {
    blockedDependency: "Paid analytics platform",
    freeAlternative: "Internal reports from marketplace orders, users, products, and seller data",
    requiredFeatures: ["internalAnalytics", "adminReports"],
  },
  paidAi: {
    blockedDependency: "Paid AI recommendation API",
    freeAlternative: "Rule-based recommendations from category, price, views, orders, and reviews",
    requiredFeatures: ["ruleBasedRecommendations", "recentlyViewed", "popularProducts"],
  },
});

const MARKETPLACE_STEPS = Object.freeze([
  {
    id: "foundation",
    title: "Role, catalog, and checkout foundation",
    goal: "Let buyers browse and sellers list products without any paid service.",
    featureIds: [
      "buyerSellerAdminRoles",
      "sellerRegistration",
      "productListings",
      "localAddressDataset",
      "cartCheckout",
      "cashOnDelivery",
    ],
  },
  {
    id: "manual-payments",
    title: "Manual payment proof flow",
    goal: "Support bKash, Nagad, Rocket, and bank transfer without a gateway fee.",
    featureIds: ["manualMfsProof", "adminPaymentVerification", "paymentAuditTrail"],
  },
  {
    id: "delivery-operations",
    title: "Local delivery operations",
    goal: "Run delivery by area rules and manual courier tracking before integrations.",
    featureIds: [
      "areaBasedDeliveryRules",
      "manualShipmentLog",
      "sellerFulfillmentDashboard",
      "deliveryStatusTimeline",
    ],
  },
  {
    id: "trust-safety",
    title: "Trust and safety",
    goal: "Reduce marketplace risk with moderation, seller checks, and dispute workflows.",
    featureIds: [
      "manualPhoneReview",
      "sellerKycReview",
      "productModeration",
      "prohibitedProductRules",
      "returnsDisputes",
    ],
  },
  {
    id: "growth-reporting",
    title: "Growth and reporting",
    goal: "Add marketing and analytics from internal platform data.",
    featureIds: [
      "couponsOffers",
      "ruleBasedRecommendations",
      "internalAnalytics",
      "adminReports",
      "sellerReports",
    ],
  },
]);

const normalizeFeatureId = (value) =>
  String(value || "")
    .trim()
    .replace(/[\s_-]+(.)?/g, (_, char = "") => char.toUpperCase())
    .replace(/^[A-Z]/, (char) => char.toLowerCase());

const normalizeFeatureSet = (features = []) =>
  new Set((features || []).map(normalizeFeatureId).filter(Boolean));

const getFreeApiReplacement = (dependencyKey) =>
  FREE_API_REPLACEMENTS[normalizeFeatureId(dependencyKey)] || null;

const getMarketplaceSteps = () => MARKETPLACE_STEPS.map((step) => ({ ...step }));

const buildStepReadiness = ({ implementedFeatures = [] } = {}) => {
  const implemented = normalizeFeatureSet(implementedFeatures);

  return MARKETPLACE_STEPS.map((step) => {
    const missingFeatures = step.featureIds.filter((featureId) => !implemented.has(featureId));
    const completedFeatures = step.featureIds.filter((featureId) => implemented.has(featureId));

    return {
      ...step,
      completedFeatures,
      missingFeatures,
      isReady: missingFeatures.length === 0,
      progress: step.featureIds.length === 0
        ? 100
        : Math.round((completedFeatures.length / step.featureIds.length) * 100),
    };
  });
};

const getNextMarketplaceStep = ({ implementedFeatures = [] } = {}) =>
  buildStepReadiness({ implementedFeatures }).find((step) => !step.isReady) || null;

const evaluatePaidApiDependency = ({ dependencyKey, implementedFeatures = [] } = {}) => {
  const replacement = getFreeApiReplacement(dependencyKey);

  if (!replacement) {
    return {
      supported: false,
      reason: "Unknown paid API dependency.",
      missingFeatures: [],
    };
  }

  const implemented = normalizeFeatureSet(implementedFeatures);
  const missingFeatures = replacement.requiredFeatures.filter((featureId) => !implemented.has(featureId));

  return {
    supported: missingFeatures.length === 0,
    ...replacement,
    missingFeatures,
  };
};

module.exports = {
  FREE_API_REPLACEMENTS,
  MARKETPLACE_STEPS,
  normalizeFeatureId,
  getFreeApiReplacement,
  getMarketplaceSteps,
  buildStepReadiness,
  getNextMarketplaceStep,
  evaluatePaidApiDependency,
};
