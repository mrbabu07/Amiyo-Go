import { describe, expect, test } from "@jest/globals";
import {
  buildVendorProductTimeline,
  getVendorProductQualityChecks,
  normalizeVendorProductStatus,
  summarizeVendorInventory,
} from "../vendorProductDetail";

describe("vendor product detail white-box behavior", () => {
  test("normalizes inactive and stock-driven product statuses", () => {
    expect(normalizeVendorProductStatus({ isActive: false, approvalStatus: "approved" })).toBe("delisted");
    expect(normalizeVendorProductStatus({ status: "inactive", approvalStatus: "approved" })).toBe("delisted");
    expect(normalizeVendorProductStatus({ approvalStatus: "approved", stock: 0 })).toBe("out_of_stock");
    expect(normalizeVendorProductStatus({ approvalStatus: "Pending Moderation", stock: 3 })).toBe("pending_moderation");
  });

  test("falls back to product-level inventory when variants are absent", () => {
    expect(summarizeVendorInventory({ stock: 3, lowStockThreshold: 5 })).toMatchObject({
      totalStock: 3,
      variantCount: 0,
      stockState: "low",
    });
  });

  test("returns missing quality checks for incomplete listing fields", () => {
    const quality = getVendorProductQualityChecks({
      price: 0,
      stock: 0,
      images: [],
      description: "short",
    });

    expect(quality.score).toBeLessThan(50);
    expect(quality.missing.map((item) => item.id)).toEqual([
      "images",
      "description",
      "price",
      "category",
      "inventory",
      "seo",
      "attributes",
    ]);
  });

  test("builds newest-first timeline from system dates and moderation history", () => {
    const timeline = buildVendorProductTimeline({
      createdAt: "2026-05-10T08:00:00.000Z",
      lastSubmittedAt: "2026-05-11T08:00:00.000Z",
      updatedAt: "2026-05-12T08:00:00.000Z",
      moderationHistory: [
        {
          action: "request_changes",
          at: "2026-05-13T08:00:00.000Z",
          reason: "Needs better images",
        },
      ],
    });

    expect(timeline.map((event) => event.label)).toEqual([
      "request changes",
      "Last updated",
      "Submitted for moderation",
      "Listing created",
    ]);
  });
});
