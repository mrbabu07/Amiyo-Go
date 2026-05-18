import { describe, expect, test } from "@jest/globals";
import {
  buildVendorReturnTimeline,
  canVendorRespond,
  getVendorReturnEvidence,
  getVendorReturnFinancials,
  normalizeVendorReturnStatus,
} from "../vendorReturnDispute";

describe("vendor return dispute white-box behavior", () => {
  test("normalizes seller response driven statuses", () => {
    expect(normalizeVendorReturnStatus({ status: "pending" })).toBe("needs_response");
    expect(normalizeVendorReturnStatus({ status: "pending", vendorResponse: "disputed" })).toBe("disputed");
    expect(normalizeVendorReturnStatus({ status: "pending", vendorResponse: "rejected" })).toBe("rejected");
    expect(normalizeVendorReturnStatus({ status: "Refunded" })).toBe("refunded");
  });

  test("requires a clean pending case before seller response is available", () => {
    expect(canVendorRespond({ status: "submitted" })).toBe(true);
    expect(canVendorRespond({ status: "approved" })).toBe(false);
    expect(canVendorRespond({ status: "pending", vendorResponse: "disputed" })).toBe(false);
  });

  test("falls back to product price and vendor earning when amounts are missing", () => {
    expect(
      getVendorReturnFinancials({
        status: "approved",
        productPrice: 120,
        quantity: 3,
        vendorEarningAmount: 300,
      }),
    ).toMatchObject({
      refundAmount: 360,
      customerRefund: 360,
      vendorDeduction: 300,
      netExposure: 300,
    });
  });

  test("filters unusable evidence and detects non-image files", () => {
    const evidence = getVendorReturnEvidence({
      images: ["", null, { url: "https://cdn.test/photo.webp", name: "photo.webp" }],
      vendorEvidenceFiles: [{ url: "https://cdn.test/report.pdf", name: "report.pdf" }],
    });

    expect(evidence.customer).toHaveLength(1);
    expect(evidence.vendor).toHaveLength(1);
    expect(evidence.customer[0].isImage).toBe(true);
    expect(evidence.vendor[0].isImage).toBe(false);
  });

  test("builds a chronological timeline and removes duplicate system events", () => {
    const timeline = buildVendorReturnTimeline({
      createdAt: "2026-05-01T08:00:00.000Z",
      vendorResponse: "disputed",
      vendorResponseDate: "2026-05-02T08:00:00.000Z",
      vendorResponseNotes: "Item was sealed during handover.",
      approvedAt: "2026-05-03T08:00:00.000Z",
      timeline: [
        {
          status: "submitted",
          at: "2026-05-01T08:00:00.000Z",
          actorRole: "user",
        },
      ],
    });

    expect(timeline.map((event) => event.label)).toEqual([
      "Return submitted",
      "Vendor disputed return",
      "Return approved",
    ]);
    expect(timeline[1]).toMatchObject({
      type: "disputed",
      actorRole: "vendor",
      note: "Item was sealed during handover.",
    });
  });
});
