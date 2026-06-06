import { describe, expect, test } from "@jest/globals";
import {
  canVendorConfirmReceipt,
  canVendorRespond,
  getReasonLabel,
  getVendorReturnEvidence,
  getVendorReturnFinancials,
  getVendorReturnStatusMeta,
} from "../vendorReturnDispute";

describe("vendor return dispute black-box behavior", () => {
  test("shows pending seller cases as action-required", () => {
    const status = getVendorReturnStatusMeta({ status: "pending", vendorResponse: null });

    expect(status).toMatchObject({
      key: "needs_response",
      label: "Needs response",
      nextAction: "Respond with approval, rejection, or evidence",
    });
    expect(canVendorRespond({ status: "pending", vendorResponse: null })).toBe(true);
  });

  test("shows approved returns as ready for vendor receipt confirmation", () => {
    expect(canVendorConfirmReceipt({ status: "approved", vendorResponse: "approved" })).toBe(true);

    const status = getVendorReturnStatusMeta({
      status: "processing",
      itemReceivedAt: "2026-05-04T08:00:00.000Z",
    });

    expect(status).toMatchObject({
      key: "item_received",
      label: "Item received",
      nextAction: "Admin can inspect and process the refund",
    });
  });

  test("summarizes seller financial impact for an approved return", () => {
    const summary = getVendorReturnFinancials({
      status: "approved",
      productPrice: 500,
      quantity: 2,
      refundAmount: 1000,
      vendorEarningAmount: 850,
      adminCommissionAmount: 150,
      commissionRateSnapshot: 15,
    });

    expect(summary).toMatchObject({
      quantity: 2,
      unitPrice: 500,
      customerRefund: 1000,
      vendorDeduction: 850,
      adminCommissionAmount: 150,
      commissionRate: 15,
      noDeductionExpected: false,
    });
  });

  test("separates customer and seller evidence for review", () => {
    const evidence = getVendorReturnEvidence({
      images: ["https://cdn.test/customer.jpg"],
      vendorEvidenceImages: [{ url: "https://cdn.test/vendor.png", name: "qc.png" }],
    });

    expect(evidence.customer).toHaveLength(1);
    expect(evidence.vendor).toHaveLength(1);
    expect(evidence.total).toBe(2);
    expect(evidence.customer[0]).toMatchObject({ source: "customer", isImage: true });
    expect(evidence.vendor[0]).toMatchObject({ source: "vendor", name: "qc.png" });
  });

  test("uses buyer-friendly reason labels", () => {
    expect(getReasonLabel("wrong_item")).toBe("Wrong item received");
    expect(getReasonLabel("custom_reason")).toBe("custom reason");
  });
});
