import {
  buildVendorSearchSuggestions,
  getVendorResourceSuggestions,
  getVendorSearchSubmitPath,
} from "../vendorResourceSearch";

describe("vendorResourceSearch black-box behavior", () => {
  test("returns direct seller resource suggestions for prefixed searches", () => {
    expect(getVendorResourceSuggestions("order ORD-102")[0]).toMatchObject({
      name: "Find order ORD-102",
      path: "/vendor/orders?status=all&search=ORD-102",
      kind: "resource",
    });
    expect(getVendorResourceSuggestions("sku PHONE-9")[0]).toMatchObject({
      path: "/vendor/products?search=PHONE-9",
      type: "products",
    });
    expect(getVendorResourceSuggestions("return RET-8")[0]).toMatchObject({
      path: "/vendor/returns?search=RET-8",
    });
    expect(getVendorResourceSuggestions("voucher SAVE10")[0]).toMatchObject({
      path: "/vendor/marketing/vouchers?search=SAVE10",
    });
  });

  test("respects the selected resource type", () => {
    const suggestions = getVendorResourceSuggestions("order ORD-102", "products");

    expect(suggestions[0]).toMatchObject({
      path: "/vendor/products?search=order%20ORD-102",
      type: "products",
    });
    expect(suggestions.every((item) => item.type === "products")).toBe(true);
  });

  test("uses the first suggestion as submit target and falls back by type", () => {
    expect(getVendorSearchSubmitPath("orders", [{ path: "/vendor/orders" }])).toBe("/vendor/orders");
    expect(getVendorSearchSubmitPath("loose text", [], "returns")).toBe("/vendor/returns?search=loose%20text");
  });

  test("combines resource and page matches without duplicates", () => {
    const suggestions = buildVendorSearchSuggestions("products", [
      { name: "All products", path: "/vendor/products", group: "Products", searchType: "products" },
      { name: "Products Again", path: "/vendor/products", group: "Products", searchType: "products" },
    ]);

    expect(suggestions.filter((item) => item.path === "/vendor/products")).toHaveLength(1);
  });
});
