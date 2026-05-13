const { calculateDeliveryBreakdown } = require("../../utils/deliveryCalculator");

describe("deliveryCalculator", () => {
  test("calculates per-vendor village zone delivery fees", () => {
    const result = calculateDeliveryBreakdown({
      settings: {
        zoneFees: {
          sameUnion: 30,
          sameUpazila: 50,
          sameDistrict: 80,
          outsideDistrict: 120,
        },
        freeDeliveryEnabled: true,
        freeDeliveryThreshold: 1000,
        estimatedDeliveryDays: { min: 2, max: 5 },
      },
      shippingInfo: {
        district: "Cox's Bazar",
        upazila: "Teknaf",
        union: "Hnila",
      },
      vendorsById: {
        "vendor-1": {
          shopName: "Hnila Fresh",
          address: {
            city: "Cox's Bazar",
            upazila: "Teknaf",
            union: "Hnila",
          },
        },
        "vendor-2": {
          shopName: "Town Electronics",
          address: {
            city: "Cox's Bazar",
            upazila: "Sadar",
            union: "Jhilongjha",
          },
        },
      },
      items: [
        { vendorId: "vendor-1", price: 100, quantity: 2 },
        { vendorId: "vendor-2", price: 500, quantity: 1 },
      ],
    });

    expect(result.totalDeliveryFee).toBe(110);
    expect(result.breakdown).toEqual([
      expect.objectContaining({
        vendorId: "vendor-1",
        vendorName: "Hnila Fresh",
        zoneType: "sameUnion",
        deliveryFee: 30,
      }),
      expect.objectContaining({
        vendorId: "vendor-2",
        vendorName: "Town Electronics",
        zoneType: "sameDistrict",
        deliveryFee: 80,
      }),
    ]);
  });

  test("uses vendor overrides and keeps perishable fee after free base delivery", () => {
    const result = calculateDeliveryBreakdown({
      deliveryMethod: "standard",
      settings: {
        zoneFees: { sameUnion: 30 },
        freeDeliveryEnabled: true,
        freeDeliveryThreshold: 1000,
        perishableFee: 20,
      },
      shippingInfo: {
        district: "Cox's Bazar",
        upazila: "Teknaf",
        union: "Hnila",
      },
      vendorsById: {
        "vendor-1": {
          shopName: "Fish Seller",
          deliverySettings: {
            selfDeliveryEnabled: true,
            sameUnionFee: 15,
            freeDeliveryThreshold: 500,
            perishableFee: 25,
          },
          address: {
            city: "Cox's Bazar",
            upazila: "Teknaf",
            union: "Hnila",
          },
        },
      },
      items: [
        { vendorId: "vendor-1", price: 600, quantity: 1, deliveryClass: "fish" },
      ],
    });

    expect(result.totalDeliveryFee).toBe(25);
    expect(result.breakdown[0]).toEqual(expect.objectContaining({
      deliveryMethod: "vendor_delivery",
      baseFee: 15,
      freeDeliveryApplied: true,
      perishableFee: 25,
      deliveryFee: 25,
    }));
  });

  test("pickup has no delivery fee when vendor allows pickup", () => {
    const result = calculateDeliveryBreakdown({
      deliveryMethod: "pickup",
      vendorsById: {
        "vendor-1": {
          shopName: "Pickup Shop",
          deliverySettings: { pickupEnabled: true },
        },
      },
      items: [{ vendorId: "vendor-1", price: 200, quantity: 1 }],
    });

    expect(result.totalDeliveryFee).toBe(0);
    expect(result.breakdown[0]).toEqual(expect.objectContaining({
      deliveryMethod: "pickup",
      deliveryFee: 0,
    }));
  });

  test("normalizes Chattogram Coxsbazar Teknaf Hnila aliases", () => {
    const result = calculateDeliveryBreakdown({
      settings: {
        zoneFees: {
          sameUnion: 30,
          sameUpazila: 50,
          sameDistrict: 80,
          outsideDistrict: 120,
        },
      },
      shippingInfo: {
        division: "Chattogram",
        district: "Cox's Bazar",
        upazila: "Teknaf",
        union: "Hnila Union",
      },
      vendorsById: {
        "vendor-1": {
          shopName: "Local Shop",
          address: {
            division: "Chittagong",
            district: "Coxsbazar",
            upazila: "Teknaf",
            union: "Hnila",
          },
        },
      },
      items: [{ vendorId: "vendor-1", price: 200, quantity: 1 }],
    });

    expect(result.totalDeliveryFee).toBe(30);
    expect(result.breakdown[0]).toEqual(expect.objectContaining({
      zoneType: "sameUnion",
      zoneLabel: "Same union",
    }));
  });

  test("uses Hnila platform location for vendors without saved address", () => {
    const result = calculateDeliveryBreakdown({
      settings: {
        zoneFees: {
          sameUnion: 30,
          sameUpazila: 50,
          sameDistrict: 80,
          outsideDistrict: 120,
        },
      },
      shippingInfo: {
        district: "Coxsbazar",
        upazila: "Teknaf",
        union: "Hnila",
      },
      vendorsById: {
        "vendor-1": {
          shopName: "Old Vendor",
        },
      },
      items: [{ vendorId: "vendor-1", price: 200, quantity: 1 }],
    });

    expect(result.totalDeliveryFee).toBe(30);
    expect(result.breakdown[0]).toEqual(expect.objectContaining({
      zoneType: "sameUnion",
      deliveryFee: 30,
    }));
  });

  test("adds perishable handling for restaurant food orders", () => {
    const result = calculateDeliveryBreakdown({
      settings: {
        zoneFees: { sameUnion: 30 },
        perishableFee: 20,
      },
      shippingInfo: {
        district: "Coxsbazar",
        upazila: "Teknaf",
        union: "Hnila",
      },
      vendorsById: {
        "vendor-1": {
          shopName: "Hnila Food Corner",
          address: {
            district: "Coxsbazar",
            upazila: "Teknaf",
            union: "Hnila",
          },
        },
      },
      items: [
        { vendorId: "vendor-1", price: 180, quantity: 2, deliveryClass: "restaurant" },
      ],
    });

    expect(result.totalDeliveryFee).toBe(50);
    expect(result.breakdown[0]).toEqual(expect.objectContaining({
      zoneType: "sameUnion",
      baseFee: 30,
      perishableFee: 20,
      deliveryFee: 50,
    }));
  });
});
