const Product = require("../../models/Product");

const buildProductModel = ({ aggregateResult = [] } = {}) => {
  let capturedPipeline = null;
  const collection = {
    createIndex: jest.fn().mockResolvedValue(undefined),
    aggregate: jest.fn((pipeline) => {
      capturedPipeline = pipeline;
      return {
        toArray: jest.fn().mockResolvedValue(aggregateResult),
      };
    }),
  };
  const db = {
    collection: jest.fn(() => collection),
  };

  const product = new Product(db);
  return {
    product,
    collection,
    getPipeline: () => capturedPipeline,
  };
};

describe("Product model filters", () => {
  test("getFilterOptions returns normalized filter metadata", async () => {
    const { product } = buildProductModel({
      aggregateResult: [{
        minPrice: 10,
        maxPrice: 200,
        allSizes: [["M", "L"], ["M"], null],
        allColors: [[{ name: "Red" }, { name: "Blue" }], [{ name: "Red" }]],
        allBrands: ["Beta", " Alpha ", "Beta", null],
        categories: ["cat-1", null],
      }],
    });

    await expect(product.getFilterOptions()).resolves.toEqual({
      priceRange: { min: 10, max: 200 },
      sizes: ["M", "L"],
      colors: ["Red", "Blue"],
      brands: ["Alpha", "Beta"],
      categories: ["cat-1"],
    });
  });

  test("getFilterOptions returns empty defaults when no product metadata exists", async () => {
    const { product } = buildProductModel({ aggregateResult: [] });

    await expect(product.getFilterOptions()).resolves.toEqual({
      priceRange: { min: 0, max: 0 },
      sizes: [],
      colors: [],
      brands: [],
      categories: [],
    });
  });

  test("findWithFilters builds a product listing query from supported filters", async () => {
    const { product, getPipeline } = buildProductModel({ aggregateResult: [] });

    await product.findWithFilters({
      minPrice: "100",
      maxPrice: "500",
      sizes: ["M"],
      brands: ["Acme"],
      colors: ["Black"],
      inStock: true,
      limit: 10,
    });

    const [{ $match: query }] = getPipeline();
    expect(query).toEqual(expect.objectContaining({
      isActive: { $ne: false },
      price: { $gte: 100, $lte: 500 },
      stock: { $gt: 0 },
      sizes: { $in: ["M"] },
      "colors.name": { $in: ["Black"] },
    }));
    expect(query.$or).toEqual([
      { approvalStatus: { $exists: false } },
      { approvalStatus: null },
      { approvalStatus: "approved" },
    ]);
    expect(query.$and).toEqual([
      {
        $or: [
          { brand: { $in: ["Acme"] } },
          { "attributes.brand": { $in: ["Acme"] } },
        ],
      },
    ]);
  });
});
