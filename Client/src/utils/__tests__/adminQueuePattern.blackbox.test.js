import {
  buildQueueSummary,
  filterQueueItems,
  normalizePayoutQueueItem,
  normalizeProductQueueItem,
} from "../adminQueuePattern";

describe("adminQueuePattern black-box behavior", () => {
  test("normalizes product and payout queues into one dashboard contract", () => {
    const product = normalizeProductQueueItem({
      _id: "product-1",
      title: "Premium Rice",
      sku: "RICE-1",
      approvalStatus: "flagged",
      vendorShopName: "Daily Bazar",
      moderationFlags: [{ message: "Missing nutrition attribute" }],
      price: 650,
    });
    const payout = normalizePayoutQueueItem({
      _id: "pay-1",
      vendorName: "Daily Bazar",
      vendorEmail: "vendor@example.com",
      status: "pending",
      amount: 1200,
    });

    expect(product).toEqual(expect.objectContaining({
      id: "product-1",
      type: "product",
      title: "Premium Rice",
      tone: "danger",
      riskCount: 1,
    }));
    expect(payout).toEqual(expect.objectContaining({
      id: "pay-1",
      type: "payout",
      title: "Daily Bazar",
      tone: "warning",
      amount: 1200,
    }));
  });

  test("filters queue rows by common search, status, and type fields", () => {
    const rows = [
      normalizeProductQueueItem({ _id: "p1", title: "Rice", approvalStatus: "pending", sku: "RICE-1" }),
      normalizePayoutQueueItem({ _id: "pay1", vendorName: "Finance Shop", status: "paid" }),
      normalizePayoutQueueItem({ _id: "pay2", vendorName: "Daily Shop", status: "pending" }),
    ];

    expect(filterQueueItems(rows, { search: "rice" })).toEqual([rows[0]]);
    expect(filterQueueItems(rows, { status: "pending" })).toEqual([rows[0], rows[2]]);
    expect(filterQueueItems(rows, { type: "payout", status: "pending" })).toEqual([rows[2]]);
  });

  test("summarizes risk, status, tone, and exposure for shared queue cards", () => {
    const rows = [
      normalizeProductQueueItem({ _id: "p1", approvalStatus: "flagged", moderationFlags: [{ message: "Risk" }], price: 100 }),
      normalizePayoutQueueItem({ _id: "pay1", status: "pending", amount: 250 }),
      normalizePayoutQueueItem({ _id: "pay2", status: "paid", amount: 400 }),
    ];

    expect(buildQueueSummary(rows)).toEqual({
      total: 3,
      risk: 1,
      amount: 750,
      byStatus: { flagged: 1, pending: 1, paid: 1 },
      byTone: { danger: 1, warning: 1, success: 1 },
    });
  });
});
