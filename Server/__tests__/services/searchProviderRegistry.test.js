const { createSearchProvider, normalizeProviderName } = require("../../services/search/searchProviderRegistry");

describe("search provider registry", () => {
  test("creates the Mongo provider and normalizes search filters", async () => {
    const dependencies = {
      loadSource: jest.fn().mockResolvedValue({
        products: [{ _id: "product-1", title: "Phone" }],
        categories: [{ _id: "category-1", name: "Mobiles" }],
      }),
      runSearch: jest.fn().mockReturnValue({ query: "phone", totalCount: 1, products: [] }),
      buildFacets: jest.fn().mockReturnValue({ brands: [] }),
    };
    const provider = createSearchProvider(dependencies, "mongodb");

    const response = await provider.search({
      query: {
        q: "phone",
        brands: "Samsung,Sony",
        minPrice: "1000",
        maxPrice: "40000",
        minRating: "4",
        discountMin: "10",
        inStock: "true",
        location: "Dhaka",
      },
    });

    expect(provider.name).toBe("mongo");
    expect(response.facets).toEqual({ brands: [] });
    expect(dependencies.runSearch).toHaveBeenCalledWith(expect.objectContaining({
      query: "phone",
      filters: expect.objectContaining({
        brands: ["Samsung", "Sony"],
        minPrice: 1000,
        maxPrice: 40000,
        minRating: 4,
        discountMin: 10,
        inStock: true,
        location: "Dhaka",
      }),
    }));
  });

  test("keeps provider names predictable and rejects unsupported adapters", () => {
    expect(normalizeProviderName(" MongoDB ")).toBe("mongodb");
    expect(() => createSearchProvider({}, "typesense")).toThrow("Unsupported search provider");
  });
});
