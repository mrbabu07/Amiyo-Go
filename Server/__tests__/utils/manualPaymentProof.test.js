const {
  normalizeManualPaymentMethod,
  isSupportedManualPaymentMethod,
  validateManualPaymentProof,
  buildManualPaymentRecord,
  canTransitionManualPaymentStatus,
  round2,
} = require("../../utils/manualPaymentProof");

describe("manualPaymentProof white-box behavior", () => {
  test("normalizes payment method aliases used by Bangladeshi buyers", () => {
    expect(normalizeManualPaymentMethod("bKash")).toBe("bkash");
    expect(normalizeManualPaymentMethod("dbbl rocket")).toBe("rocket");
    expect(normalizeManualPaymentMethod("bank_transfer")).toBe("bankTransfer");
    expect(isSupportedManualPaymentMethod("Nagad")).toBe(true);
    expect(isSupportedManualPaymentMethod("paypal")).toBe(false);
  });

  test("rounds amounts consistently for payment comparisons", () => {
    expect(round2(100.005)).toBe(100.01);
    expect(round2("200.236")).toBe(200.24);
    expect(round2(null)).toBe(0);
  });

  test("enforces status transitions by actor role", () => {
    expect(canTransitionManualPaymentStatus({
      from: "unpaid",
      to: "submitted",
      actorRole: "buyer",
    })).toBe(true);
    expect(canTransitionManualPaymentStatus({
      from: "submitted",
      to: "verified",
      actorRole: "admin",
    })).toBe(true);
    expect(canTransitionManualPaymentStatus({
      from: "submitted",
      to: "verified",
      actorRole: "buyer",
    })).toBe(false);
    expect(canTransitionManualPaymentStatus({
      from: "verified",
      to: "submitted",
      actorRole: "admin",
    })).toBe(false);
  });
});

describe("manualPaymentProof black-box marketplace behavior", () => {
  test("accepts a complete bKash payment proof without any paid gateway", () => {
    const result = validateManualPaymentProof({
      method: "bkash",
      amount: 1250,
      orderTotal: 1250,
      transactionId: "9AA7BC12",
      senderAccount: "01700000000",
    });

    expect(result).toEqual({
      valid: true,
      errors: [],
      method: "bkash",
      methodLabel: "bKash",
      amount: 1250,
      orderTotal: 1250,
    });
  });

  test("rejects incomplete MFS proof and amount mismatch before admin verification", () => {
    const result = validateManualPaymentProof({
      method: "nagad",
      amount: 900,
      orderTotal: 950,
      transactionId: "",
      senderAccount: "",
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      "Payment amount must match the order total.",
      "Transaction ID is required.",
      "Sender account number is required.",
    ]);
  });

  test("requires screenshot proof for bank transfer records", () => {
    const result = validateManualPaymentProof({
      method: "bank transfer",
      amount: 5000,
      orderTotal: 5000,
      transactionId: "BRAC-2026-0001",
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(["Payment proof image is required."]);
  });

  test("builds a submitted payment record when proof and ownership data are valid", () => {
    const submittedAt = new Date("2026-05-16T10:00:00.000Z");
    const result = buildManualPaymentRecord({
      orderId: "order-1",
      userId: "user-1",
      method: "Rocket",
      amount: 780,
      orderTotal: 780,
      transactionId: "TXN-780",
      senderAccount: "01800000000",
      note: "Paid from personal wallet",
      submittedAt,
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.record).toEqual(expect.objectContaining({
      orderId: "order-1",
      userId: "user-1",
      method: "rocket",
      methodLabel: "Rocket",
      amount: 780,
      orderTotal: 780,
      status: "submitted",
      submittedAt,
    }));
  });

  test("does not build a record when order or user ownership is missing", () => {
    const result = buildManualPaymentRecord({
      method: "bkash",
      amount: 100,
      orderTotal: 100,
      transactionId: "TXN-100",
      senderAccount: "01700000000",
    });

    expect(result.valid).toBe(false);
    expect(result.record).toBeNull();
    expect(result.errors).toEqual(["Order ID is required.", "User ID is required."]);
  });
});
