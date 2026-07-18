const {
  buildParcelQrPayload,
  parseParcelQrPayload,
  verifyParcelQrPayload,
} = require("../../services/parcelQrService");

const secret = "test-parcel-secret-that-is-long-enough";
const nowMs = 1_800_000_000_000;

describe("parcelQrService", () => {
  test("signs and verifies a compact vendor parcel without customer PII", () => {
    const payload = buildParcelQrPayload({
      orderId: "order-1",
      vendorId: "vendor-1",
      trackingNumber: "TRK-1",
      paymentType: "cod",
      paymentStatus: "collect_on_delivery",
      orderStatus: "ready_to_ship",
      payableAmount: 950,
      itemCount: 2,
      quantity: 3,
      customerName: "Must not leak",
      customerPhone: "01700000000",
    }, { secret, nowMs, ttlSeconds: 3600 });

    expect(payload).toContain("AGP2|O=order-1|V=vendor-1");
    expect(payload).toContain("|M=C|");
    expect(payload).toContain("|A=950.00|");
    expect(payload).toContain("|H=");
    expect(payload).not.toContain("Must not leak");
    expect(payload).not.toContain("01700000000");
    expect(verifyParcelQrPayload(payload, { secret, nowMs })).toEqual(expect.objectContaining({
      orderId: "order-1",
      vendorId: "vendor-1",
      payableAmount: 950,
      itemCount: 2,
      quantity: 3,
    }));
  });

  test("rejects tampering and expiry", () => {
    const payload = buildParcelQrPayload({
      orderId: "order-2",
      vendorId: "vendor-2",
      payableAmount: 100,
    }, { secret, nowMs, ttlSeconds: 60 });

    expect(() => verifyParcelQrPayload(payload.replace("A=100.00", "A=900.00"), { secret, nowMs })).toThrow(
      "Parcel QR signature is invalid",
    );
    expect(() => verifyParcelQrPayload(payload, { secret, nowMs: nowMs + 61_000 })).toThrow(
      "Parcel QR has expired",
    );
    expect(parseParcelQrPayload(payload).expiresAt).toBe(Math.floor(nowMs / 1000) + 60);
  });
});
