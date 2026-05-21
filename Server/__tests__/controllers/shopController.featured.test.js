const shopController = require("../../controllers/shopController");

const createRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const matchesQuery = (doc, query = {}) =>
  Object.entries(query).every(([key, expected]) => {
    if (expected && typeof expected === "object" && expected.$ne !== undefined) {
      return doc[key] !== expected.$ne;
    }
    return doc[key] === expected;
  });

const createFindCursor = (docs) => ({
  limit: jest.fn(() => ({
    toArray: jest.fn().mockResolvedValue(docs),
  })),
});

describe("shopController featured shops", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("listShops returns only admin-featured shops for the homepage strip", async () => {
    const vendors = [
      {
        _id: "vendor-featured",
        shopName: "Featured Store",
        slug: "featured-store",
        status: "approved",
        isShopOpen: true,
        featuredOnHomepage: true,
        homepageFeaturedAt: new Date("2026-05-20T00:00:00.000Z"),
      },
      {
        _id: "vendor-hidden",
        shopName: "Hidden Store",
        slug: "hidden-store",
        status: "approved",
        isShopOpen: true,
        featuredOnHomepage: false,
      },
    ];
    const find = jest.fn((query) => createFindCursor(vendors.filter((vendor) => matchesQuery(vendor, query))));
    const req = {
      query: { featured: "true", sort: "featured", limit: "14" },
      app: {
        locals: {
          models: {
            Vendor: { collection: { find } },
            Product: {
              collection: {
                aggregate: jest.fn(() => ({
                  toArray: jest.fn().mockResolvedValue([]),
                })),
              },
            },
          },
        },
      },
    };
    const res = createRes();

    await shopController.listShops(req, res);

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "approved",
        isShopOpen: { $ne: false },
        featuredOnHomepage: true,
      }),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: [
          expect.objectContaining({
            _id: "vendor-featured",
            shopName: "Featured Store",
            featuredOnHomepage: true,
          }),
        ],
      }),
    );
  });
});
