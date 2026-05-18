import { describe, expect, test } from "@jest/globals";
import {
  getVendorProductQualityChecks,
  getVendorProductStatusMeta,
  summarizeVendorInventory,
} from "../vendorProductDetail";

describe("vendor product detail black-box behavior", () => {
  test("summarizes listing status for seller decisions", () => {
    expect(getVendorProductStatusMeta({ approvalStatus: "approved", stock: 12 })).toMatchObject({
      key: "approved",
      label: "Live",
      nextAction: "Monitor stock and performance",
    });

    expect(getVendorProductStatusMeta({ approvalStatus: "rejected", stock: 4 })).toMatchObject({
      key: "rejected",
      label: "Rejected",
      nextAction: "Fix rejection reason and resubmit",
    });
  });

  test("summarizes variant inventory and low-stock risk", () => {
    expect(
      summarizeVendorInventory({
        lowStockThreshold: 5,
        variants: [
          { sku: "A", stock: 0 },
          { sku: "B", stock: 3 },
          { sku: "C", stock: 10 },
        ],
      }),
    ).toMatchObject({
      totalStock: 13,
      variantCount: 3,
      lowStockVariants: 1,
      outOfStockVariants: 1,
      stockState: "healthy",
    });
  });

  test("scores listing quality from buyer-visible fields", () => {
    const quality = getVendorProductQualityChecks({
      title: "Rice",
      price: 120,
      stock: 8,
      categoryId: "cat-1",
      images: ["image.jpg"],
      description: "Premium miniket rice for daily family meals.",
      seo: { metaTitle: "Rice", metaDescription: "Daily rice" },
      attributes: { weight: "5kg" },
    });

    expect(quality.score).toBe(100);
    expect(quality.missing).toEqual([]);
  });
});
