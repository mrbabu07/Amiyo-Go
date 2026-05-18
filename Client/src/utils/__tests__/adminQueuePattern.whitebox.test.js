import {
  formatQueueDate,
  getVendorQueueReadiness,
  getQueueStatusTone,
  normalizePayoutQueueItem,
  normalizeProductQueueItem,
  normalizeReturnQueueItem,
  normalizeReviewQueueItem,
  normalizeSupportQueueItem,
  normalizeVendorQueueItem,
} from "../adminQueuePattern";

describe("adminQueuePattern white-box helpers", () => {
  test("maps operational statuses to stable shared tones", () => {
    expect(getQueueStatusTone("approved")).toBe("success");
    expect(getQueueStatusTone("processing")).toBe("info");
    expect(getQueueStatusTone("in_progress")).toBe("info");
    expect(getQueueStatusTone("open")).toBe("warning");
    expect(getQueueStatusTone("replied")).toBe("success");
    expect(getQueueStatusTone("pending")).toBe("warning");
    expect(getQueueStatusTone("suspended")).toBe("danger");
    expect(getQueueStatusTone("custom_state")).toBe("neutral");
  });

  test("falls back safely when source records are partial", () => {
    expect(normalizeProductQueueItem({})).toEqual(expect.objectContaining({
      id: "",
      title: "Untitled product",
      status: "approved",
      riskLabel: "No moderation flags",
    }));
    expect(normalizePayoutQueueItem({})).toEqual(expect.objectContaining({
      id: "",
      title: "Unknown vendor",
      subtitle: "bank payout request",
      status: "pending",
    }));
    expect(normalizeVendorQueueItem({})).toEqual(expect.objectContaining({
      id: "",
      title: "Unnamed vendor",
      status: "pending",
      riskCount: 5,
    }));
    expect(normalizeReviewQueueItem({})).toEqual(expect.objectContaining({
      id: "",
      title: "No star review",
      status: "pending",
    }));
    expect(normalizeReturnQueueItem({})).toEqual(expect.objectContaining({
      id: "",
      title: "Return request",
      status: "pending",
    }));
    expect(normalizeSupportQueueItem({})).toEqual(expect.objectContaining({
      id: "",
      title: "Support ticket",
      status: "open",
      riskCount: 2,
    }));
  });

  test("calculates vendor readiness from address and payout detail branches", () => {
    const ready = getVendorQueueReadiness({
      shopName: "Fresh Mart",
      phone: "01700000000",
      address: { districtId: "dhaka" },
      allowedCategoryIds: ["grocery"],
      mobileBankingProvider: "bkash",
      mobileBankingNumber: "01700000000",
    });

    expect(ready).toMatchObject({
      completed: 5,
      total: 5,
      missing: [],
    });
  });

  test("formats invalid queue timestamps without throwing", () => {
    expect(formatQueueDate()).toBe("No timestamp");
    expect(formatQueueDate("bad-date")).toBe("No timestamp");
  });
});
