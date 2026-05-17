const { ObjectId } = require("mongodb");
const mongoose = require("mongoose");
const {
  _productDetailTestUtils,
} = require("../../controllers/productController");

describe("product detail white-box utilities", () => {
  const {
    buildProductMedia,
    buildVariantMatrix,
    buildStockSummary,
    buildDeliveryEstimate,
    buildBuyerProtection,
    buildPriceHistory,
    buildSellerStrip,
    normalizeForJson,
    publicProductCard,
    stringifyId,
  } = _productDetailTestUtils;

  test("builds a variant matrix with crossed-out unavailable combinations", () => {
    const product = {
      price: 1200,
      allowBackorder: false,
      colors: [{ name: "Red", value: "#ff0000" }, { name: "Blue", value: "#0000ff" }],
      sizes: ["S", "M"],
      variants: [
        { _id: "red-s", size: "S", color: "Red", stock: 8, sku: "RED-S", price: 1200 },
        { _id: "red-m", size: "M", color: "Red", stock: 0, sku: "RED-M", price: 1200 },
        { _id: "blue-m", size: "M", color: "Blue", stock: 2, sku: "BLUE-M", price: 1300 },
      ],
    };

    const matrix = buildVariantMatrix(product);
    const redM = matrix.cells.find((cell) => cell.size === "M" && cell.color === "Red");
    const blueM = matrix.cells.find((cell) => cell.size === "M" && cell.color === "Blue");

    expect(matrix.sizes).toEqual(["S", "M"]);
    expect(matrix.colors.map((color) => color.name)).toEqual(["Red", "Blue"]);
    expect(redM).toMatchObject({ exists: true, stock: 0, available: false, crossedOut: true });
    expect(blueM).toMatchObject({ exists: true, stock: 2, available: true, crossedOut: false });
  });

  test("builds media from variant images, gallery images, and demo videos", () => {
    const media = buildProductMedia({
      image: "cover.jpg",
      images: ["front.jpg", "side.jpg"],
      videoUrl: "demo.mp4",
      variants: [{ sku: "A", image: "variant.jpg", images: ["variant-2.jpg"] }],
    });

    expect(media.images).toEqual(["variant-2.jpg", "variant.jpg", "front.jpg", "side.jpg", "cover.jpg"]);
    expect(media.videos).toEqual([{ url: "demo.mp4", title: "Product demo" }]);
    expect(media.variantImages[0]).toMatchObject({ sku: "A", images: ["variant-2.jpg", "variant.jpg"] });
  });

  test("builds media safely when legacy variants are missing or object-shaped", () => {
    const withoutVariants = buildProductMedia({ image: "cover.jpg" });
    const objectVariant = buildProductMedia({
      variants: { sku: "LEGACY", image: "legacy.jpg" },
      images: ["gallery.jpg"],
    });

    expect(withoutVariants.images).toEqual(["cover.jpg"]);
    expect(objectVariant.images).toEqual(["legacy.jpg", "gallery.jpg"]);
    expect(objectVariant.variantImages[0]).toMatchObject({ sku: "LEGACY" });
  });

  test("summarizes real-time stock and out-of-stock notification state", () => {
    const summary = buildStockSummary({ stock: 0, allowBackorder: false });

    expect(summary).toMatchObject({
      stock: 0,
      available: false,
      allowNotify: true,
      status: "out_of_stock",
      urgency: "critical",
    });
  });

  test("calculates delivery estimate from cutoff, SLA, and courier days", () => {
    const estimate = buildDeliveryEstimate(
      { shipWithinHours: 24, courierMinDays: 1, courierMaxDays: 2, orderCutoffHour: 12 },
      {},
      new Date(2026, 4, 17, 9, 45),
    );

    expect(estimate.orderWithin).toBe("2h 15m");
    expect(estimate.processingHours).toBe(24);
    expect(estimate.label).toContain("Order within 2h 15m -> Get it by");
    expect(estimate.rangeLabel).toContain(" - ");
  });

  test("builds buyer protection badges and deterministic fallback price history", () => {
    const product = { price: 900, originalPrice: 1200, returnWindowDays: 7 };
    const protections = buildBuyerProtection(product, {});
    const history = buildPriceHistory(product, [], new Date("2026-05-17T00:00:00.000Z"));

    expect(protections.map((item) => item.label)).toEqual([
      "7-Day Return",
      "Secure Payment",
      "Authentic Product",
    ]);
    expect(history).toHaveLength(30);
    expect(history[0].price).toBe(1200);
    expect(history[29].price).toBe(900);
  });

  test("builds seller strip and public product cards with safe defaults", () => {
    const vendorId = new ObjectId();
    const seller = buildSellerStrip(
      { _id: vendorId, shopName: "Amiyo Mart", status: "approved", responseRate: 97 },
      { vendorId },
    );
    const card = publicProductCard({ _id: "p1", title: "Rice", price: 100, images: ["rice.jpg"] }, "similar");

    expect(seller).toMatchObject({
      vendorId: vendorId.toString(),
      shopName: "Amiyo Mart",
      responseRate: 97,
      verified: true,
    });
    expect(card).toMatchObject({ title: "Rice", image: "rice.jpg", price: 100, reason: "similar" });
  });

  test("normalizes product detail payloads for safe JSON responses", () => {
    const productId = new ObjectId();
    const payload = { _id: productId, createdAt: new Date("2026-05-17T00:00:00.000Z") };
    payload.self = payload;

    const normalized = normalizeForJson(payload);

    expect(normalized).toEqual({
      _id: productId.toString(),
      createdAt: "2026-05-17T00:00:00.000Z",
    });
    expect(() => JSON.stringify(normalized)).not.toThrow();
  });

  test("stringifies MongoDB and Mongoose ObjectIds without recursing through _id getters", () => {
    const nativeId = new ObjectId();
    const mongooseId = new mongoose.Types.ObjectId();

    expect(stringifyId(nativeId)).toBe(nativeId.toString());
    expect(stringifyId(mongooseId)).toBe(mongooseId.toString());
    expect(stringifyId({ _id: nativeId })).toBe(nativeId.toString());
  });
});
