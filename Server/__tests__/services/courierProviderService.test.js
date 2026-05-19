const {
  bookShipment,
  getCourierProviderStatus,
  normalizeProvider,
  summarizeBookingForStorage,
} = require("../../services/courierProviderService");

const shipment = {
  _id: "shipment-1",
  orderId: "order-1",
  codAmount: 1250,
  weight: 1.5,
  itemCount: 2,
  deliveryAddress: {
    name: "Rahim",
    phone: "01700000000",
    address: "Mirpur 10",
    district: "Dhaka",
    area: "Mirpur",
  },
  pickupAddress: {
    shopName: "BD Shop",
    phone: "01800000000",
    address: "Uttara",
  },
};

describe("courierProviderService", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  test("normalizes provider aliases and reports configured courier credentials", () => {
    expect(normalizeProvider("Red-X")).toBe("redx");
    expect(normalizeProvider("Packzy")).toBe("steadfast");
    expect(normalizeProvider("instant")).toBe("local");

    const status = getCourierProviderStatus({
      REDX_API_TOKEN: "redx-token",
      STEADFAST_API_KEY: "steadfast-key",
      STEADFAST_SECRET_KEY: "steadfast-secret",
    });

    expect(status.providers.redx).toMatchObject({ configured: true, status: "ready" });
    expect(status.providers.steadfast).toMatchObject({ configured: true, status: "ready" });
  });

  test("books a RedX shipment with env credentials and stores safe booking metadata", async () => {
    global.fetch = jest.fn(async (url, options) => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ tracking_id: "RX-100", parcel_id: "parcel-9" }),
      url,
      options,
    }));

    const result = await bookShipment({
      shipment,
      courier: { provider: "redx", trackingUrlPattern: "https://redx.example/track/{trackingNumber}" },
      env: {
        REDX_API_TOKEN: "redx-token",
        REDX_API_BASE_URL: "https://redx.example/api",
        REDX_CREATE_PARCEL_PATH: "/parcel",
      },
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://redx.example/api/parcel",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "API-ACCESS-TOKEN": "redx-token" }),
      }),
    );
    expect(result).toMatchObject({
      attempted: true,
      status: "booked",
      provider: "redx",
      trackingNumber: "RX-100",
      consignmentId: "parcel-9",
      trackingUrl: "https://redx.example/track/RX-100",
    });
    expect(summarizeBookingForStorage(result)).toEqual(
      expect.objectContaining({
        provider: "redx",
        status: "booked",
        trackingNumber: "RX-100",
        consignmentId: "parcel-9",
      }),
    );
    expect(JSON.stringify(summarizeBookingForStorage(result))).not.toContain("redx-token");
  });

  test("books a Steadfast shipment with API key and secret headers", async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ consignment: { consignment_id: "SF-9", tracking_code: "TRK-9" } }),
    }));

    const result = await bookShipment({
      shipment,
      courier: { provider: "steadfast" },
      env: {
        STEADFAST_API_KEY: "api-key",
        STEADFAST_SECRET_KEY: "secret",
        STEADFAST_API_BASE_URL: "https://steadfast.example/api/v1",
        STEADFAST_CREATE_ORDER_PATH: "/create_order",
      },
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://steadfast.example/api/v1/create_order",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Api-Key": "api-key",
          "Secret-Key": "secret",
        }),
      }),
    );
    expect(result).toMatchObject({
      attempted: true,
      provider: "steadfast",
      trackingNumber: "TRK-9",
      consignmentId: "SF-9",
    });
  });

  test("keeps manual dispatch when live credentials are missing", async () => {
    const result = await bookShipment({
      shipment,
      courier: { provider: "redx" },
      env: {},
    });

    expect(result).toEqual(expect.objectContaining({
      attempted: false,
      status: "manual_required",
      warning: expect.stringContaining("RedX credentials"),
    }));
  });
});
