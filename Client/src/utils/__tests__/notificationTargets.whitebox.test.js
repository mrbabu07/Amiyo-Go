import { describe, expect, test } from "@jest/globals";
import {
  enrichNotificationTarget,
  resolveNotificationLink,
} from "../notificationTargets";

describe("customer notification target resolver", () => {
  test("prefers exact order detail over generic order links", () => {
    expect(
      resolveNotificationLink({
        type: "order_status",
        link: "/orders",
        data: { orderId: "64f123" },
      }),
    ).toBe("/orders/64f123");
  });

  test("routes product alerts and promotion events to exact customer pages", () => {
    expect(resolveNotificationLink({ type: "back_in_stock", productId: "p1" })).toBe("/product/p1");
    expect(resolveNotificationLink({ type: "promotion.started", data: { campaignSlug: "eid-sale" } })).toBe(
      "/campaigns/eid-sale",
    );
    expect(
      resolveNotificationLink({
        type: "promotion.started",
        data: { campaignSlug: "eid-sale", productId: "p1" },
      }),
    ).toBe("/campaigns/eid-sale");
  });

  test("routes voucher notifications to cart with coupon query", () => {
    expect(resolveNotificationLink({ type: "voucher.expiring", data: { code: "SUMMER26" } })).toBe(
      "/cart?coupon=SUMMER26",
    );
    expect(
      resolveNotificationLink({
        type: "offer.unlocked",
        data: { code: "DEAL26", productId: "p1" },
      }),
    ).toBe("/cart?coupon=DEAL26");
  });

  test("routes flash sale notifications to flash-sale surface even when product data exists", () => {
    expect(
      resolveNotificationLink({
        type: "flash_sale",
        data: { flashSaleId: "flash-1", productId: "p1" },
      }),
    ).toBe("/flash-sales?flashSaleId=flash-1");
  });

  test("enriches legacy notifications with link, url, and data url", () => {
    expect(enrichNotificationTarget({ type: "return", returnId: "r1" })).toMatchObject({
      link: "/returns?returnId=r1",
      url: "/returns?returnId=r1",
      data: { url: "/returns?returnId=r1" },
    });
  });
});
