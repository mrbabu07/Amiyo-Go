const {
  filterOrdersForLogisticsScope,
  filterShipmentsForLogisticsScope,
  getLogisticsScopeFromRequest,
} = require("../../utils/logisticsScope");

describe("logisticsScope", () => {
  const zones = [
    { code: "dhaka", name: "Dhaka", districts: ["Dhaka"] },
    { code: "sylhet", name: "Sylhet", districts: ["Sylhet"] },
  ];

  test("builds scoped area access from a logistics manager user", () => {
    const scope = getLogisticsScopeFromRequest({
      dbUser: {
        role: "logistics_manager",
        logisticsProfile: {
          assignedZones: ["dhaka"],
          assignedVendorIds: ["vendor-1"],
        },
      },
    });

    expect(scope).toEqual(
      expect.objectContaining({
        scoped: true,
        assignedZones: ["dhaka"],
        assignedVendorIds: ["vendor-1"],
      }),
    );
  });

  test("filters orders and shipments to assigned delivery areas", () => {
    const scope = { scoped: true, assignedZones: ["dhaka"], assignedVendorIds: [] };
    const orders = [
      { _id: "order-1", shippingInfo: { district: "Dhaka" }, products: [] },
      { _id: "order-2", shippingInfo: { district: "Sylhet" }, products: [] },
    ];
    const shipments = [
      { _id: "shipment-1", deliveryAddress: { district: "Dhaka" } },
      { _id: "shipment-2", deliveryAddress: { district: "Sylhet" } },
    ];

    expect(filterOrdersForLogisticsScope(orders, zones, scope).map((order) => order._id)).toEqual(["order-1"]);
    expect(filterShipmentsForLogisticsScope(shipments, zones, scope).map((shipment) => shipment._id)).toEqual(["shipment-1"]);
  });

  test("matches logistics scope by union name or union id", () => {
    const unionScope = { scoped: true, assignedZones: ["Hnila", "880"], assignedVendorIds: [] };
    const orders = [
      { _id: "order-union-name", shippingInfo: { district: "Cox's Bazar", upazila: "Teknaf", union: "Hnila" } },
      { _id: "order-union-id", shippingInfo: { district: "Chattogram", upazila: "Pahartali", unionId: "880" } },
      { _id: "order-other", shippingInfo: { district: "Cox's Bazar", upazila: "Teknaf", union: "Whykong" } },
    ];
    const shipments = [
      { _id: "shipment-union", deliveryAddress: { union: "Hnila" } },
      { _id: "shipment-other", deliveryAddress: { union: "Whykong" } },
    ];

    expect(filterOrdersForLogisticsScope(orders, [], unionScope).map((order) => order._id)).toEqual([
      "order-union-name",
      "order-union-id",
    ]);
    expect(filterShipmentsForLogisticsScope(shipments, [], unionScope).map((shipment) => shipment._id)).toEqual([
      "shipment-union",
    ]);
  });
});
