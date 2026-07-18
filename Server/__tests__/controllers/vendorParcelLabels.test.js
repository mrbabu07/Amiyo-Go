const { getVendorParcelLabels } = require("../../controllers/vendorDashboardController");
const { verifyParcelQrPayload } = require("../../services/parcelQrService");

describe("vendor parcel label endpoint", () => {
  const secret = "shared-vendor-label-test-secret";
  const previousSecret = process.env.PARCEL_QR_SIGNING_SECRET;

  beforeAll(() => {
    process.env.PARCEL_QR_SIGNING_SECRET = secret;
  });

  afterAll(() => {
    if (previousSecret === undefined) delete process.env.PARCEL_QR_SIGNING_SECRET;
    else process.env.PARCEL_QR_SIGNING_SECRET = previousSecret;
  });

  test("returns a signed vendor-scoped amount with shipment and pickup data", async () => {
    const order = {
      _id: "order-1",
      paymentMethod: "cod",
      paymentStatus: "pending",
      subtotal: 1000,
      vendorSubtotal: 1000,
      deliveryCharge: 50,
      totalDiscount: 100,
      products: [{ vendorId: "vendor-1", title: "Item", price: 500, quantity: 2, itemStatus: "ready_to_ship" }],
    };
    const vendor = {
      _id: { toString: () => "vendor-1" },
      businessName: "Vendor One",
      phone: "01800000000",
      pickupAddresses: [{ isDefault: true, address: "Warehouse 1", district: "Dhaka" }],
    };
    const req = {
      body: { orderIds: ["order-1"] },
      dbUser: { _id: "user-1" },
      vendor,
      app: {
        locals: {
          models: {
            User: {},
            Vendor: {},
            Order: { getVendorItems: jest.fn().mockResolvedValue(order) },
            Shipment: { findByOrderVendor: jest.fn().mockResolvedValue({ trackingNumber: "AMG-1001" }) },
          },
        },
      },
    };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json: jest.fn(function json(body) { this.body = body; return this; }),
    };

    await getVendorParcelLabels(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.labels).toHaveLength(1);
    expect(res.body.labels[0]).toEqual(expect.objectContaining({
      orderId: "order-1",
      vendorId: "vendor-1",
      trackingNumber: "AMG-1001",
      payableAmount: 950,
      pickupAddress: expect.objectContaining({ address: "Warehouse 1" }),
    }));
    expect(verifyParcelQrPayload(res.body.labels[0].qrPayload, { secret })).toEqual(expect.objectContaining({
      orderId: "order-1",
      vendorId: "vendor-1",
      payableAmount: 950,
      orderStatus: "READY_TO_SHIP",
    }));
  });
});
