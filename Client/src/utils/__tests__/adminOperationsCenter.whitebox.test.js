import {
  formatQueueCurrency,
  getQueueTone,
} from "../adminOperationsCenter";

describe("adminOperationsCenter white-box helpers", () => {
  test("maps queue status and severity to stable tones", () => {
    expect(getQueueTone({ status: "breached", severity: "watch" })).toBe("rose");
    expect(getQueueTone({ status: "needs_review", severity: "watch" })).toBe("amber");
    expect(getQueueTone({ status: "clear", severity: "healthy" })).toBe("emerald");
  });

  test("formats queue exposure without decimals for compact cards", () => {
    expect(formatQueueCurrency(123456.78)).toBe("123,457");
    expect(formatQueueCurrency()).toBe("0");
  });
});
