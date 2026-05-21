import {
  buildVendorSearchSuggestions,
  getVendorResourceSuggestions,
  vendorSearchTypes,
} from "../vendorResourceSearch";

describe("vendorResourceSearch white-box helpers", () => {
  test("includes the header type options used by seller search", () => {
    expect(vendorSearchTypes.map((type) => type.value)).toEqual([
      "all",
      "orders",
      "products",
      "returns",
      "marketing",
      "finance",
    ]);
  });

  test("opens product IDs directly when the product prefix is used", () => {
    const id = "64f0aabbccddeeff00112233";

    expect(getVendorResourceSuggestions(`product ${id}`)[0]).toMatchObject({
      path: `/vendor/products/${id}`,
      description: "Find listings, SKUs, stock, and moderation status",
    });
  });

  test("falls back to broad order lookup before direct product route for bare object IDs", () => {
    const id = "64f0aabbccddeeff00112233";
    const suggestions = getVendorResourceSuggestions(id);

    expect(suggestions.map((item) => item.path)).toEqual([
      `/vendor/orders?status=all&search=${id}`,
      `/vendor/products/${id}`,
    ]);
  });

  test("filters route suggestions by selected type", () => {
    const suggestions = buildVendorSearchSuggestions("report", [
      { name: "Sales report", path: "/vendor/reports/sales", group: "Reports", searchType: "all" },
      { name: "Finance report", path: "/vendor/finance/transactions", group: "Finance", searchType: "finance" },
    ], "finance");

    expect(suggestions.every((item) => item.type === "finance" || item.searchType === "finance")).toBe(true);
    expect(suggestions).toContainEqual(
      expect.objectContaining({ path: "/vendor/finance/transactions", typeLabel: "Finance" }),
    );
  });
});
