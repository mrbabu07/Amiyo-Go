const {
  buildCustomerOrderExperience,
  buildReturnTracker,
  buildTrackingProfile,
  canCancelOrder,
  sanitizeCancellationReason,
} = require("../../utils/customerOrderExperience");

describe("customerOrderExperience utility", () => {
  const now = new Date("2026-05-17T06:00:00.000Z");

  it("builds a six-step customer tracking profile with ETA and courier state", () => {
    const order = {
      _id: "order-1",
      status: "shipped",
      createdAt: "2026-05-15T06:00:00.000Z",
      shippingInfo: { city: "Dhaka" },
      products: [
        {
          title: "Cotton Shirt",
          quantity: 2,
          price: 500,
          vendorName: "Style BD",
          itemStatus: "shipped",
          packedAt: "2026-05-16T01:00:00.000Z",
          shippedAt: "2026-05-16T08:00:00.000Z",
          trackingNumber: "REDX-100",
          courierName: "Redx",
        },
      ],
    };

    const tracking = buildTrackingProfile(order, [], now);

    expect(tracking.steps).toHaveLength(6);
    expect(tracking.currentStep).toBe("dispatched");
    expect(tracking.steps.map((step) => step.title)).toEqual([
      "Order Placed",
      "Confirmed",
      "Packed",
      "Dispatched",
      "Out for Delivery",
      "Delivered",
    ]);
    expect(tracking.steps.find((step) => step.key === "packed")).toMatchObject({
      state: "completed",
      date: "2026-05-16T01:00:00.000Z",
    });
    expect(tracking.courierName).toBe("Redx");
    expect(tracking.trackingNumber).toBe("REDX-100");
    expect(tracking.integrationMode).toBe("internal_status");
    expect(tracking.eta.label).toBe("Sunday, May 17");
  });

  it("builds itemized receipt, invoice URL, cancellation, and review prompt metadata", () => {
    const order = {
      _id: "order-2",
      status: "delivered",
      createdAt: "2026-05-10T06:00:00.000Z",
      deliveredAt: "2026-05-14T06:00:00.000Z",
      paymentMethod: "cod",
      products: [
        {
          productId: "product-1",
          title: "Rice Bag",
          quantity: 3,
          price: 900,
          vendorName: "Grocery Hub",
        },
      ],
    };

    const experience = buildCustomerOrderExperience(order, [], now);

    expect(experience.invoiceUrl).toBe("/api/orders/order-2/invoice");
    expect(experience.itemizedReceipt[0]).toMatchObject({
      title: "Rice Bag",
      quantity: 3,
      unitPrice: 900,
      lineTotal: 2700,
      vendorName: "Grocery Hub",
      paymentMethod: "cod",
    });
    expect(experience.cancellation.canCancel).toBe(false);
    expect(experience.reviewPrompt).toMatchObject({
      due: true,
      channelPlan: "in_app_email_push",
    });
  });

  it("tracks return and refund status with expected credit dates", () => {
    const returnItem = {
      _id: "return-1",
      orderId: "order-3",
      productId: "product-2",
      productTitle: "Headphone",
      status: "processing",
      createdAt: "2026-05-12T06:00:00.000Z",
      approvedAt: "2026-05-13T06:00:00.000Z",
      refundMethod: "bkash",
      refundAmount: 1200,
    };

    const tracker = buildReturnTracker(returnItem, now);

    expect(tracker.steps).toHaveLength(4);
    expect(tracker.steps.find((step) => step.key === "pickup_scheduled")).toMatchObject({
      state: "completed",
      date: "2026-05-13T06:00:00.000Z",
    });
    expect(tracker.steps.find((step) => step.key === "item_received").state).toBe("active");
    expect(tracker.refund).toMatchObject({
      amount: 1200,
      method: "bkash",
      status: "pending",
      expectedCreditLabel: "Wednesday, May 20",
    });
  });

  it("matches return orders to the return tab and keeps pending cancellation inside the window", () => {
    const order = {
      _id: "order-4",
      status: "pending",
      createdAt: "2026-05-17T05:45:00.000Z",
      canCancelUntil: "2026-05-17T06:15:00.000Z",
      products: [],
    };
    const returns = [{ _id: "return-4", orderId: "order-4", status: "pending" }];

    const experience = buildCustomerOrderExperience(order, returns, now);

    expect(experience.statusTab).toBe("return");
    expect(experience.hasReturn).toBe(true);
    expect(experience.returns[0].status).toBe("pending");
    expect(canCancelOrder(order, now)).toBe(true);
  });

  it("normalizes cancellation reasons for dropdown and custom text", () => {
    expect(sanitizeCancellationReason("wrong_address")).toEqual({
      value: "wrong_address",
      label: "Wrong delivery address",
      message: "Customer cancelled: Wrong delivery address",
    });
    expect(sanitizeCancellationReason("Need to change phone number")).toEqual({
      value: "other",
      label: "Need to change phone number",
      message: "Customer cancelled: Need to change phone number",
    });
    expect(sanitizeCancellationReason("").message).toBe(
      "User cancelled this order within 30 minutes.",
    );
  });
});
