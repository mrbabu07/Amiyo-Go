const {
  FREE_API_REPLACEMENTS,
  MARKETPLACE_STEPS,
  normalizeFeatureId,
  getFreeApiReplacement,
  getMarketplaceSteps,
  buildStepReadiness,
  getNextMarketplaceStep,
  evaluatePaidApiDependency,
} = require("../../utils/noPaidMarketplacePolicy");

describe("noPaidMarketplacePolicy white-box behavior", () => {
  test("normalizes ids from human labels, snake case, and kebab case", () => {
    expect(normalizeFeatureId("manual MFS proof")).toBe("manualMFSProof");
    expect(normalizeFeatureId("payment_gateway")).toBe("paymentGateway");
    expect(normalizeFeatureId("courier-tracking")).toBe("courierTracking");
  });

  test("exposes immutable policy source data through copied step objects", () => {
    const steps = getMarketplaceSteps();

    steps[0].title = "Changed outside";

    expect(MARKETPLACE_STEPS[0].title).toBe("Role, catalog, and checkout foundation");
    expect(FREE_API_REPLACEMENTS.paymentGateway.requiredFeatures).toContain("manualMfsProof");
  });

  test("calculates completion, missing features, and progress for each roadmap step", () => {
    const readiness = buildStepReadiness({
      implementedFeatures: [
        "buyerSellerAdminRoles",
        "sellerRegistration",
        "productListings",
        "localAddressDataset",
        "cartCheckout",
        "cashOnDelivery",
        "manualMfsProof",
      ],
    });

    expect(readiness[0]).toEqual(expect.objectContaining({
      id: "foundation",
      isReady: true,
      progress: 100,
      missingFeatures: [],
    }));
    expect(readiness[1]).toEqual(expect.objectContaining({
      id: "manual-payments",
      isReady: false,
      progress: 33,
      missingFeatures: ["adminPaymentVerification", "paymentAuditTrail"],
    }));
  });
});

describe("noPaidMarketplacePolicy black-box marketplace decisions", () => {
  test("chooses manual payments as the next step after the marketplace foundation", () => {
    const nextStep = getNextMarketplaceStep({
      implementedFeatures: [
        "buyer seller admin roles",
        "seller registration",
        "product listings",
        "local address dataset",
        "cart checkout",
        "cash on delivery",
      ],
    });

    expect(nextStep).toEqual(expect.objectContaining({
      id: "manual-payments",
      title: "Manual payment proof flow",
    }));
  });

  test("approves replacing a paid payment gateway only when all free workflow pieces exist", () => {
    const blocked = evaluatePaidApiDependency({
      dependencyKey: "payment gateway",
      implementedFeatures: ["cash on delivery", "manual mfs proof"],
    });

    expect(blocked.supported).toBe(false);
    expect(blocked.freeAlternative).toMatch(/manual MFS payment proof/i);
    expect(blocked.missingFeatures).toEqual(["adminPaymentVerification"]);

    const supported = evaluatePaidApiDependency({
      dependencyKey: "payment_gateway",
      implementedFeatures: ["cashOnDelivery", "manualMfsProof", "adminPaymentVerification"],
    });

    expect(supported).toEqual(expect.objectContaining({
      supported: true,
      blockedDependency: "Paid payment gateway",
      missingFeatures: [],
    }));
  });

  test("returns a clear unsupported result for unknown paid API dependencies", () => {
    expect(getFreeApiReplacement("unknown api")).toBeNull();
    expect(evaluatePaidApiDependency({ dependencyKey: "unknown api" })).toEqual({
      supported: false,
      reason: "Unknown paid API dependency.",
      missingFeatures: [],
    });
  });
});
