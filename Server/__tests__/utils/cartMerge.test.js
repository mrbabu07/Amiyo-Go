const { mergeCartState, sanitizeCartState } = require("../../utils/cartMerge");

describe("cartMerge utilities", () => {
  test("merges guest cart into server cart without duplicating variants", () => {
    const merged = mergeCartState(
      {
        items: [
          { _id: "p1", quantity: 1, selectedSize: "M", selectedColor: { name: "Red" }, price: 100 },
        ],
      },
      {
        items: [
          { productId: "p1", quantity: 2, selectedSize: "M", selectedColor: "red", price: 100 },
          { _id: "p2", quantity: 1, selectedSize: "L", price: 250 },
        ],
      },
    );

    expect(merged.items).toHaveLength(2);
    expect(merged.items.find((item) => item.productId === "p1")).toEqual(
      expect.objectContaining({ quantity: 3, selectedSize: "M" }),
    );
    expect(merged.items.find((item) => item.productId === "p2")).toEqual(
      expect.objectContaining({ quantity: 1, price: 250 }),
    );
  });

  test("sanitizes invalid quantities and drops items without product ids", () => {
    const cart = sanitizeCartState({
      items: [
        { title: "No id", quantity: 2 },
        { _id: "p1", quantity: -4, title: "Valid" },
        { _id: "p2", quantity: 999 },
      ],
    });

    expect(cart.items).toHaveLength(2);
    expect(cart.items.find((item) => item.productId === "p1").quantity).toBe(1);
    expect(cart.items.find((item) => item.productId === "p2").quantity).toBe(99);
  });
});
