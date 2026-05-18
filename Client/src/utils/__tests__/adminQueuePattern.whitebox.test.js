import {
  formatQueueDate,
  getQueueStatusTone,
  normalizePayoutQueueItem,
  normalizeProductQueueItem,
} from "../adminQueuePattern";

describe("adminQueuePattern white-box helpers", () => {
  test("maps operational statuses to stable shared tones", () => {
    expect(getQueueStatusTone("approved")).toBe("success");
    expect(getQueueStatusTone("processing")).toBe("info");
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
  });

  test("formats invalid queue timestamps without throwing", () => {
    expect(formatQueueDate()).toBe("No timestamp");
    expect(formatQueueDate("bad-date")).toBe("No timestamp");
  });
});
