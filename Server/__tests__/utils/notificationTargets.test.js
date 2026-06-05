const {
  buildNotificationLink,
  withResolvedNotificationLink,
} = require("../../utils/notificationTargets");

describe("notification target resolver", () => {
  test("routes order notifications to the exact order detail page", () => {
    expect(buildNotificationLink({ type: "order_status", orderId: "order-123", link: "/orders" })).toBe(
      "/orders/order-123",
    );
  });

  test("routes product and campaign notifications to public detail pages", () => {
    expect(buildNotificationLink({ type: "back_in_stock", data: { productId: "product-1" } })).toBe(
      "/product/product-1",
    );
    expect(buildNotificationLink({ type: "promotion.started", data: { campaignId: "campaign-1" } })).toBe(
      "/campaigns/campaign-1",
    );
  });

  test("routes voucher notifications to cart with the voucher code", () => {
    expect(buildNotificationLink({ type: "voucher.expiring", data: { code: "SAVE10" } })).toBe(
      "/cart?coupon=SAVE10",
    );
  });

  test("stores resolved link, url, and data url together", () => {
    expect(withResolvedNotificationLink({ type: "order_created", data: { orderId: "o1" } })).toMatchObject({
      link: "/orders/o1",
      url: "/orders/o1",
      data: { url: "/orders/o1" },
    });
  });
});
