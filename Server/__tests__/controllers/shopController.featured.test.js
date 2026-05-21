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

const createProjectedFindCursor = (docs) => ({
  project: jest.fn(() => ({
    limit: jest.fn(() => ({
      toArray: jest.fn().mockResolvedValue(docs),
    })),
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

  test("getShopProducts ignores blank filter params from the shop page", async () => {
    const vendor = {
      _id: "vendor-1",
      shopName: "Tech World Bangladesh",
      slug: "tech-world-bangladesh",
      status: "approved",
      isShopOpen: true,
    };
    const product = {
      _id: "product-1",
      title: "Laptop",
      price: 10000,
      vendorId: "vendor-1",
      isActive: true,
      approvalStatus: "approved",
    };
    const aggregate = jest.fn((pipeline) => ({
      toArray: jest.fn().mockResolvedValue(
        pipeline.some((stage) => stage.$count === "total")
          ? [{ total: 1 }]
          : [product],
      ),
    }));
    const req = {
      params: { slug: "tech-world-bangladesh" },
      query: {
        search: "",
        category: "",
        minPrice: "",
        maxPrice: "",
        rating: "",
        sort: "newest",
        page: "1",
        limit: "16",
      },
      app: {
        locals: {
          models: {
            Vendor: {
              collection: {
                findOne: jest.fn().mockResolvedValue(vendor),
              },
            },
            Product: {
              collection: { aggregate },
            },
            Category: {
              collection: {
                find: jest.fn(),
              },
            },
          },
        },
      },
    };
    const res = createRes();

    await shopController.getShopProducts(req, res);

    const firstPipeline = aggregate.mock.calls[0][0];
    const initialMatch = firstPipeline[0].$match;
    expect(JSON.stringify(initialMatch)).not.toContain('"price"');
    expect(firstPipeline).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ $match: { averageRating: expect.any(Object) } }),
      ]),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: [expect.objectContaining({ _id: "product-1", vendorName: "Tech World Bangladesh" })],
        pagination: expect.objectContaining({ totalCount: 1 }),
      }),
    );
  });

  test("getShopProducts includes child categories when filtering by shop category name", async () => {
    const parentCategoryId = "6a02fc5befef5fe23b2c7d9b";
    const childCategoryId = "6a02fc5befef5fe23b2c7da1";
    const vendor = {
      _id: "vendor-1",
      shopName: "Tech World Bangladesh",
      slug: "tech-world-bangladesh",
      status: "approved",
      isShopOpen: true,
    };
    const product = {
      _id: "product-1",
      title: "Laptop",
      price: 10000,
      vendorId: "vendor-1",
      categoryId: childCategoryId,
      isActive: true,
      approvalStatus: "approved",
    };
    const aggregate = jest.fn((pipeline) => ({
      toArray: jest.fn().mockResolvedValue(
        pipeline.some((stage) => stage.$count === "total")
          ? [{ total: 1 }]
          : [product],
      ),
    }));
    const categoryFind = jest.fn(() => createProjectedFindCursor([{ _id: parentCategoryId }]));
    const getDescendantIds = jest.fn().mockResolvedValue([childCategoryId]);
    const req = {
      params: { slug: "tech-world-bangladesh" },
      query: {
        category: "Electronics",
        sort: "newest",
        page: "1",
        limit: "16",
      },
      app: {
        locals: {
          models: {
            Vendor: {
              collection: {
                findOne: jest.fn().mockResolvedValue(vendor),
              },
            },
            Product: {
              collection: { aggregate },
            },
            Category: {
              collection: {
                find: categoryFind,
              },
              getDescendantIds,
            },
          },
        },
      },
    };
    const res = createRes();

    await shopController.getShopProducts(req, res);

    const firstPipeline = aggregate.mock.calls[0][0];
    const categoryCondition = firstPipeline[0].$match.$and.find((item) => item.categoryId?.$in);
    const categoryFilterIds = categoryCondition.categoryId.$in.map((value) => value.toString());

    expect(categoryFind).toHaveBeenCalledWith({ name: expect.any(RegExp) });
    expect(getDescendantIds).toHaveBeenCalled();
    expect(categoryFilterIds).toEqual(expect.arrayContaining([parentCategoryId, childCategoryId]));
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: [expect.objectContaining({ _id: "product-1" })],
      }),
    );
  });
});
