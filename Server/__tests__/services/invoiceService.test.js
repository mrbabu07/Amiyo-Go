const invoiceService = require("../../services/invoiceService");

describe("invoiceService customer invoice data", () => {
  it("builds buyer-facing invoice totals without double-counting discounts", () => {
    const invoice = invoiceService.buildInvoiceData({
      _id: "64f000000000000000000001",
      status: "pending",
      paymentMethod: "cod",
      paymentStatus: "pending",
      createdAt: "2026-05-17T08:00:00.000Z",
      shippingInfo: {
        name: "Rahim Uddin",
        phone: "01700000000",
        email: "rahim@example.com",
        address: "House 12, Road 3",
        area: "Dhanmondi",
        wardNo: "12",
        union: "Kalabagan",
        thana: "Dhanmondi",
        district: "Dhaka",
        division: "Dhaka",
        zipCode: "1205",
      },
      products: [
        {
          title: "Cotton Panjabi",
          sku: "PNJ-BLK-M",
          selectedSize: "M",
          selectedColor: { name: "Black" },
          vendorName: "Style BD",
          quantity: 2,
          price: 1000,
          adminCommissionAmount: 120,
        },
        {
          title: "Leather Belt",
          vendorName: "Style BD",
          quantity: 1,
          price: 500,
          adminCommissionAmount: 30,
        },
      ],
      couponApplied: { code: "EID200" },
      couponDiscount: 200,
      pointsDiscount: 50,
      totalDiscount: 250,
      deliveryCharge: 80,
      total: 2330,
    });

    expect(invoice.shortOrderId).toBe("00000001");
    expect(invoice.items).toEqual([
      expect.objectContaining({
        name: "Cotton Panjabi",
        sku: "PNJ-BLK-M",
        options: "Size: M, Color: Black",
        vendorName: "Style BD",
        quantity: 2,
        unitPrice: 1000,
        lineTotal: 2000,
      }),
      expect.objectContaining({
        name: "Leather Belt",
        quantity: 1,
        unitPrice: 500,
        lineTotal: 500,
      }),
    ]);
    expect(invoice.items[0]).not.toHaveProperty("adminCommissionAmount");
    expect(invoice.subtotal).toBe(2500);
    expect(invoice.discountTotal).toBe(250);
    expect(invoice.otherDiscount).toBe(0);
    expect(invoice.deliveryCharge).toBe(80);
    expect(invoice.computedTotal).toBe(2330);
    expect(invoice.total).toBe(2330);
    expect(invoice.summaryRows.map((row) => row.label)).toEqual([
      "Subtotal",
      "Coupon (EID200)",
      "Loyalty points",
      "Delivery charge",
    ]);
    expect(invoice.addressLines).toEqual(
      expect.arrayContaining([
        "House 12, Road 3",
        "Dhanmondi, Ward 12, Kalabagan",
        "Dhanmondi, Dhaka",
        "1205, Bangladesh",
        "Phone: 01700000000",
        "Email: rahim@example.com",
      ]),
    );
  });

  it("uses delivery breakdown and transparent adjustment when stored paid total differs", () => {
    const invoice = invoiceService.buildInvoiceData({
      _id: "order-2",
      products: [{ title: "Rice", quantity: 1, price: 100 }],
      couponDiscount: 10,
      totalDiscount: 10,
      deliveryBreakdown: [{ finalCharge: 20 }],
      total: 115,
    });

    expect(invoice.deliveryCharge).toBe(20);
    expect(invoice.computedTotal).toBe(110);
    expect(invoice.adjustment).toBe(5);
    expect(invoice.total).toBe(115);
    expect(invoice.summaryRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Order adjustment", amount: 5 }),
      ]),
    );
  });

  it("repairs stale undiscounted stored totals when a promo discount is present", () => {
    const invoice = invoiceService.buildInvoiceData({
      _id: "order-legacy-promo",
      products: [{ title: "Laptop", quantity: 1, price: 10000 }],
      couponApplied: { code: "PROMO1000", discountAmount: 1000 },
      totalDiscount: 1000,
      deliveryCharge: 0,
      total: 10000,
    });

    expect(invoice.couponDiscount).toBe(1000);
    expect(invoice.discountTotal).toBe(1000);
    expect(invoice.computedTotal).toBe(9000);
    expect(invoice.total).toBe(9000);
    expect(invoice.adjustment).toBe(0);
    expect(invoice.summaryRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Coupon (PROMO1000)", amount: -1000 }),
      ]),
    );
  });

  it("formats money with ASCII BDT text for PDF font compatibility", () => {
    expect(invoiceService.formatMoney(1234.5)).toBe("BDT 1,234.50");
  });

  it("does not invent a Bangladesh-only address for empty shipping info", () => {
    const invoice = invoiceService.buildInvoiceData({
      _id: "order-3",
      products: [{ title: "Notebook", quantity: 1, price: 50 }],
    });

    expect(invoice.addressLines).toEqual([]);
  });
});
