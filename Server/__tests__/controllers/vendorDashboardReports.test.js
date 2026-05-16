const { ObjectId } = require("mongodb");
const { getVendorReports } = require("../../controllers/vendorDashboardController");

const createRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const cursorFrom = (rows) => {
  const cursor = {
    project: jest.fn(() => cursor),
    sort: jest.fn(() => cursor),
    limit: jest.fn(() => cursor),
    toArray: jest.fn().mockResolvedValue(rows),
  };
  return cursor;
};

const daysAgo = (days) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
};

const sameId = (left, right) => left?.toString?.() === right?.toString?.();

const filterByQuery = (rows, query = {}) => rows.filter((row) => {
  if (query.createdAt) {
    const createdAt = new Date(row.createdAt);
    if (query.createdAt.$gte && createdAt < query.createdAt.$gte) return false;
    if (query.createdAt.$lt && createdAt >= query.createdAt.$lt) return false;
  }

  if (query.vendorId?.$in) {
    return query.vendorId.$in.some((id) => sameId(row.vendorId, id));
  }

  if (query["products.vendorId"]?.$in) {
    return (row.products || []).some((product) =>
      query["products.vendorId"].$in.some((id) => sameId(product.vendorId, id)),
    );
  }

  return true;
});

const collectionFrom = (rows = []) => ({
  find: jest.fn((query) => cursorFrom(filterByQuery(rows, query))),
  countDocuments: jest.fn((query) => Promise.resolve(filterByQuery(rows, query).length)),
  aggregate: jest.fn(() => cursorFrom(rows)),
});

const buildReq = ({
  vendorId = new ObjectId(),
  products = [],
  orders = [],
  reviews = [],
  marketingEvents = [],
  pageViews = [],
  query = { period: "7" },
  vendor = {},
} = {}) => {
  const collections = {
    orders: collectionFrom(orders),
    products: collectionFrom(products),
    reviews: collectionFrom(reviews),
    vendorMarketingEvents: collectionFrom(marketingEvents),
    pageViews: collectionFrom(pageViews),
  };

  return {
    query,
    user: { uid: "vendor-user", role: "vendor" },
    app: {
      locals: {
        db: {
          collection: jest.fn((name) => collections[name] || collectionFrom([])),
        },
        models: {
          User: {
            findByFirebaseUid: jest.fn().mockResolvedValue({ _id: "user-1" }),
          },
          Vendor: {
            findByUserId: jest.fn().mockResolvedValue({
              _id: vendorId,
              shopName: "Dhaka Seller",
              shopSlug: "dhaka-seller",
              ...vendor,
            }),
          },
        },
      },
    },
  };
};

describe("vendor dashboard reports", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("getVendorReports calculates period sales, comparison, repeat rate, and risk metrics", async () => {
    const vendorId = new ObjectId();
    const productId = new ObjectId();
    const secondProductId = new ObjectId();
    const orders = [
      {
        _id: new ObjectId(),
        userId: "buyer-repeat",
        status: "delivered",
        createdAt: daysAgo(1),
        products: [
          {
            productId,
            vendorId: vendorId.toString(),
            title: "Cotton panjabi",
            price: 500,
            quantity: 2,
            itemStatus: "delivered",
            vendorEarningAmount: 900,
          },
        ],
      },
      {
        _id: new ObjectId(),
        userId: "buyer-repeat",
        status: "delivered",
        createdAt: daysAgo(2),
        products: [
          {
            productId: secondProductId,
            vendorId,
            title: "Linen scarf",
            price: 300,
            quantity: 1,
            itemStatus: "delivered",
            vendorEarningAmount: 300,
          },
        ],
      },
      {
        _id: new ObjectId(),
        userId: "buyer-cancelled",
        status: "cancelled",
        createdAt: daysAgo(1),
        products: [
          {
            productId,
            vendorId,
            title: "Cotton panjabi",
            price: 500,
            quantity: 1,
            itemStatus: "cancelled",
          },
        ],
      },
      {
        _id: new ObjectId(),
        userId: "buyer-returned",
        status: "returned",
        createdAt: daysAgo(3),
        products: [
          {
            productId,
            vendorId,
            title: "Cotton panjabi",
            price: 500,
            quantity: 1,
            itemStatus: "returned",
          },
        ],
      },
      {
        _id: new ObjectId(),
        userId: "buyer-repeat",
        status: "delivered",
        createdAt: daysAgo(8),
        products: [
          {
            productId,
            vendorId,
            title: "Cotton panjabi",
            price: 400,
            quantity: 1,
            itemStatus: "delivered",
            vendorEarningAmount: 400,
          },
        ],
      },
    ];
    const req = buildReq({
      vendorId,
      orders,
      products: [
        {
          _id: productId,
          vendorId,
          title: "Cotton panjabi",
          sku: "PANJABI-BLUE-M",
          views: 100,
          addToCartCount: 20,
          stock: 6,
          isActive: true,
        },
        {
          _id: secondProductId,
          vendorId,
          title: "Linen scarf",
          sku: "SCARF-RED",
          views: 40,
          cartAdds: 5,
          stock: 0,
          isActive: true,
        },
      ],
      reviews: [{ _id: productId, avgRating: 4.5 }],
      marketingEvents: [
        { vendorId, createdAt: daysAgo(1), event: "view" },
        { vendorId, createdAt: daysAgo(1), event: "click" },
      ],
      pageViews: [{ vendorId, createdAt: daysAgo(1), referrer: "https://facebook.com" }],
      query: { period: "7" },
    });
    const res = createRes();

    await getVendorReports(req, res);

    const payload = res.json.mock.calls[0][0].data;
    expect(payload.period.days).toBe(7);
    expect(payload.summary).toEqual(expect.objectContaining({
      totalSales: 1200,
      totalOrders: 4,
      deliveredOrders: 2,
      cancelledOrders: 1,
      returnedOrders: 1,
      averageOrderValue: 600,
      revenueChangePercent: 200,
      cancellationReturnRate: 50,
      customerRepeatRate: 50,
    }));
    expect(payload.salesTrend).toHaveLength(7);
    expect(payload.salesTrend.reduce((sum, day) => sum + day.revenue, 0)).toBe(1200);
    expect(payload.salesTrend.reduce((sum, day) => sum + day.previousRevenue, 0)).toBe(400);
    expect(payload.cancellationReturnTrend.some((day) => day.rate > 0)).toBe(true);
    expect(payload.benchmark.platformCancellationReturnRate).toBe(50);
  });

  test("getVendorReports returns product funnel, top products, traffic sources, and inventory forecast", async () => {
    const vendorId = new ObjectId();
    const productId = new ObjectId();
    const secondProductId = new ObjectId();
    const req = buildReq({
      vendorId,
      orders: [
        {
          _id: new ObjectId(),
          userId: "buyer-1",
          status: "delivered",
          createdAt: daysAgo(0),
          products: [
            {
              productId,
              vendorId,
              title: "Cotton panjabi",
              sku: "PANJABI-BLUE-M",
              price: 500,
              quantity: 2,
              itemStatus: "delivered",
              vendorEarningAmount: 900,
            },
            {
              productId: secondProductId,
              vendorId,
              title: "Linen scarf",
              sku: "SCARF-RED",
              price: 300,
              quantity: 1,
              itemStatus: "delivered",
              vendorEarningAmount: 300,
            },
          ],
        },
      ],
      products: [
        {
          _id: productId,
          vendorId,
          title: "Cotton panjabi",
          sku: "PANJABI-BLUE-M",
          views: 100,
          addToCartCount: 20,
          stock: 6,
        },
        {
          _id: secondProductId,
          vendorId,
          title: "Linen scarf",
          sku: "SCARF-RED",
          views: 40,
          cartAdds: 5,
          stock: 0,
        },
      ],
      marketingEvents: [
        { vendorId, createdAt: daysAgo(0), event: "view" },
        { vendorId, createdAt: daysAgo(0), event: "click" },
      ],
      pageViews: [{ vendorId, createdAt: daysAgo(0), referrer: "https://example.com" }],
      query: { period: "7" },
    });
    const res = createRes();

    await getVendorReports(req, res);

    const payload = res.json.mock.calls[0][0].data;
    expect(payload.topProducts[0]).toEqual(expect.objectContaining({
      productId: productId.toString(),
      name: "Cotton panjabi",
      revenue: 900,
      unitsSold: 2,
      views: 100,
      addToCart: 20,
      conversionRate: 2,
    }));
    expect(payload.productFunnel[0]).toEqual(expect.objectContaining({
      addToCartRate: 20,
      purchaseConversionRate: 2,
    }));
    expect(payload.trafficSources).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "organic", value: 137 }),
      expect.objectContaining({ id: "campaign", value: 2 }),
      expect.objectContaining({ id: "external", value: 1 }),
    ]));
    expect(payload.inventoryForecast).toEqual(expect.arrayContaining([
      expect.objectContaining({
        productId: secondProductId.toString(),
        status: "out_of_stock",
      }),
    ]));
  });

  test("getVendorReports returns 404 when the vendor account cannot be found", async () => {
    const req = buildReq();
    req.app.locals.models.Vendor.findByUserId = jest.fn().mockResolvedValue(null);
    const res = createRes();

    await getVendorReports(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Vendor not found" });
  });
});
