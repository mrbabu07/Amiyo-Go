import {
  buildAdminSearchSuggestions,
  getAdminResourceSuggestions,
  getAdminSearchSubmitPath,
} from "../adminResourceSearch";

describe("adminResourceSearch black-box behavior", () => {
  test("returns direct resource suggestions for prefixed admin searches", () => {
    expect(getAdminResourceSuggestions("order ORD-102")[0]).toMatchObject({
      name: "Find order ORD-102",
      path: "/admin/orders?search=ORD-102",
      kind: "resource",
    });
    expect(getAdminResourceSuggestions("support SUP-9")[0]).toMatchObject({
      path: "/admin/support?search=SUP-9",
    });
    expect(getAdminResourceSuggestions("return RET-8")[0]).toMatchObject({
      path: "/admin/returns?search=RET-8",
    });
  });

  test("opens exact vendor and product IDs when the search uses a resource prefix", () => {
    const id = "64f0aabbccddeeff00112233";

    expect(getAdminResourceSuggestions(`vendor ${id}`)[0]).toMatchObject({
      path: `/admin/vendors/${id}`,
    });
    expect(getAdminResourceSuggestions(`product ${id}`)[0]).toMatchObject({
      path: `/admin/products/edit/${id}`,
    });
  });

  test("prioritizes resource suggestions before route search matches", () => {
    const suggestions = buildAdminSearchSuggestions("payout 500", [
      { name: "Payout Requests", path: "/admin/payout-requests" },
      { name: "Products", path: "/admin/products" },
    ]);

    expect(suggestions.map((item) => item.path)).toEqual([
      "/admin/payout-requests?status=all&search=500",
    ]);
  });

  test("uses the first suggestion as submit target and falls back to order search", () => {
    expect(getAdminSearchSubmitPath("orders", [{ path: "/admin/orders" }])).toBe("/admin/orders");
    expect(getAdminSearchSubmitPath("loose text", [])).toBe("/admin/orders?search=loose%20text");
  });
});
