import {
  buildAdminSearchSuggestions,
  getAdminResourceSuggestions,
} from "../adminResourceSearch";

describe("adminResourceSearch white-box helpers", () => {
  test("detects email and phone lookup branches", () => {
    expect(getAdminResourceSuggestions("buyer@example.com")[0]).toMatchObject({
      path: "/admin/customers?search=buyer%40example.com",
      description: "Customer and account lookup",
    });
    expect(getAdminResourceSuggestions("+880 1711-111111")[0]).toMatchObject({
      path: "/admin/customers?search=%2B880%201711-111111",
      description: "Customer and order contact lookup",
    });
  });

  test("falls back to safe broad lookup before direct object routes for bare object IDs", () => {
    const id = "64f0aabbccddeeff00112233";
    const suggestions = getAdminResourceSuggestions(id);

    expect(suggestions.map((item) => item.path)).toEqual([
      `/admin/orders?search=${id}`,
      `/admin/products/edit/${id}`,
      `/admin/vendors/${id}`,
    ]);
  });

  test("deduplicates resource and route suggestions by path", () => {
    const suggestions = buildAdminSearchSuggestions("orders", [
      { name: "All Orders", path: "/admin/orders" },
      { name: "Orders Again", path: "/admin/orders" },
    ]);

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({ path: "/admin/orders" });
  });
});
