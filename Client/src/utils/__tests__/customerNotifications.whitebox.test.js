import { describe, expect, test } from "@jest/globals";
import {
  getNotificationGroup,
  getNotificationMeta,
  getNotificationTimeGroup,
  sortNotifications,
} from "../customerNotifications";

describe("customer notification helper white-box behavior", () => {
  test("maps raw notification types into customer workflow groups", () => {
    expect(getNotificationGroup({ type: "delivery" })).toBe("orders");
    expect(getNotificationGroup({ type: "order_status" })).toBe("orders");
    expect(getNotificationGroup({ type: "refund" })).toBe("returns");
    expect(getNotificationGroup({ type: "price_drop" })).toBe("wishlist");
    expect(getNotificationGroup({ type: "voucher.expiring" })).toBe("promotions");
    expect(getNotificationGroup({ type: "unknown" })).toBe("system");
  });

  test("provides display metadata with a safe system fallback", () => {
    expect(getNotificationMeta("order")).toMatchObject({
      label: "Order update",
      icon: "package",
    });
    expect(getNotificationMeta("mystery")).toMatchObject({
      label: "Notification",
      icon: "bell",
    });
  });

  test("handles future timestamps as today and invalid timestamps safely", () => {
    const now = new Date("2026-05-18T12:00:00.000Z");

    expect(getNotificationTimeGroup("2026-05-19T08:00:00.000Z", now)).toBe("Today");
    expect(getNotificationTimeGroup("not-a-date", now)).toBe("Today");
  });

  test("sorts newest notifications first using timestamp or createdAt", () => {
    const sorted = sortNotifications([
      { id: "old", createdAt: "2026-05-17T12:00:00.000Z" },
      { id: "new", timestamp: "2026-05-18T12:00:00.000Z" },
    ]);

    expect(sorted.map((item) => item.id)).toEqual(["new", "old"]);
  });
});
