import { describe, expect, test } from "@jest/globals";
import {
  filterNotifications,
  formatRelativeNotificationTime,
  getNotificationStats,
  groupNotificationsByDate,
} from "../customerNotifications";

describe("customer notification center black-box behavior", () => {
  const now = new Date("2026-05-18T12:00:00.000Z");
  const notifications = [
    {
      id: "n1",
      type: "order",
      title: "Order shipped",
      timestamp: "2026-05-18T11:50:00.000Z",
      read: false,
    },
    {
      id: "n2",
      type: "return",
      title: "Return approved",
      timestamp: "2026-05-17T08:00:00.000Z",
      read: true,
    },
    {
      id: "n3",
      type: "voucher",
      title: "Voucher expiring",
      timestamp: "2026-05-10T08:00:00.000Z",
      read: false,
    },
  ];

  test("groups notifications into Today, Yesterday, and Earlier sections", () => {
    const groups = groupNotificationsByDate(notifications, now);

    expect(groups.map((group) => group.label)).toEqual([
      "Today",
      "Yesterday",
      "Earlier",
    ]);
    expect(groups[0].items[0].id).toBe("n1");
    expect(groups[1].items[0].id).toBe("n2");
    expect(groups[2].items[0].id).toBe("n3");
  });

  test("supports unread and marketplace workflow filters", () => {
    expect(filterNotifications(notifications, "unread").map((item) => item.id)).toEqual([
      "n1",
      "n3",
    ]);
    expect(filterNotifications(notifications, "orders").map((item) => item.id)).toEqual([
      "n1",
    ]);
    expect(filterNotifications(notifications, "promotions").map((item) => item.id)).toEqual([
      "n3",
    ]);
  });

  test("summarizes notification counts for the page header", () => {
    expect(getNotificationStats(notifications)).toEqual({
      total: 3,
      unread: 2,
      orders: 1,
      returns: 1,
      promotions: 1,
    });
  });

  test("renders stable relative time labels", () => {
    expect(formatRelativeNotificationTime("2026-05-18T11:59:30.000Z", now)).toBe("Just now");
    expect(formatRelativeNotificationTime("2026-05-18T11:20:00.000Z", now)).toBe("40m ago");
    expect(formatRelativeNotificationTime("2026-05-18T08:00:00.000Z", now)).toBe("4h ago");
    expect(formatRelativeNotificationTime("2026-05-16T08:00:00.000Z", now)).toBe("2d ago");
  });
});
