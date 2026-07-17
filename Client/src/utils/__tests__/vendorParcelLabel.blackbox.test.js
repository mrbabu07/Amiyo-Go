import { describe, expect, jest, test } from "@jest/globals";
import {
  buildVendorParcelLabelModel,
  renderVendorParcelLabelDocument,
  writeVendorParcelLabelPrintDocument,
} from "../vendorParcelLabel";
import { generateVendorPackingSlip } from "../vendorPackingSlip";

describe("vendor parcel label black-box behavior", () => {
  test("renders a compact thermal sticker with a small QR and pickup details", () => {
    const label = buildVendorParcelLabelModel(
      {
        _id: "order-thermal-1",
        vendorId: "vendor-a",
        paymentMethod: "prepaid",
        status: "ready_to_ship",
        shippingInfo: {
          name: "Customer One",
          phone: "01700000000",
          address: "House 10",
          area: "Uttara",
          city: "Dhaka",
        },
        products: [
          { vendorId: "vendor-a", title: "<Premium> Shirt", quantity: 1, selectedSize: "M" },
        ],
      },
      {
        _id: "vendor-a",
        shopName: "Amiyo Fashion",
        phone: "01800000000",
        address: { line1: "Shop 2", area: "Banani", city: "Dhaka" },
      },
    );

    const html = renderVendorParcelLabelDocument([
      { label, qrDataUrl: "data:image/png;base64,TESTQR" },
    ]);

    expect(html).toContain("@page { size: 100mm 150mm; margin: 0; }");
    expect(html).toContain("grid-template-rows: 16mm 38mm 24mm 12mm 23mm 18mm 7mm");
    expect(html).toContain("grid-template-rows: 13mm 11mm");
    expect(html).toContain(".meta-grid { display: grid;");
    expect(html).toContain("overflow: hidden; border-bottom: .5mm solid #050505;");
    expect(html).toContain(".qr-wrap img { width: 26mm; height: 26mm;");
    expect(html).toContain("Parcel QR code");
    expect(html).toContain("Scan parcel + amount");
    expect(html).toContain("Customer One");
    expect(html).toContain("Amiyo Fashion");
    expect(html).toContain("PICKUP FROM");
    expect(html).toContain("&lt;Premium&gt; Shirt");
    expect(html).not.toContain("<Premium> Shirt");
  });

  test("opens the print dialog exactly once after the label document is ready", () => {
    jest.useFakeTimers();
    const printWindow = {
      closed: false,
      focus: jest.fn(),
      print: jest.fn(),
      document: {
        readyState: "complete",
        open: jest.fn(),
        write: jest.fn(),
        close: jest.fn(),
      },
      onload: null,
    };

    writeVendorParcelLabelPrintDocument(printWindow, "<html>Label</html>");
    printWindow.onload();
    jest.runAllTimers();

    expect(printWindow.document.write).toHaveBeenCalledWith("<html>Label</html>");
    expect(printWindow.focus).toHaveBeenCalledTimes(1);
    expect(printWindow.print).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  test("shows the same vendor payable on the invoice and compact COD sticker", () => {
    const order = {
      _id: "multi-vendor-order",
      vendorId: "vendor-a",
      paymentMethod: "cod",
      vendorSubtotal: 1000,
      deliveryCharge: 50,
      deliveryFee: 200,
      totalDiscount: 100,
      totalAmount: 5000,
      shippingInfo: { name: "Customer" },
      products: [{ vendorId: "vendor-a", title: "Vendor item", price: 1000, quantity: 1 }],
    };
    const label = buildVendorParcelLabelModel(order, { _id: "vendor-a" });
    const labelHtml = renderVendorParcelLabelDocument([
      { label, qrDataUrl: "data:image/png;base64,TESTQR" },
    ]);
    const packingSlipHtml = generateVendorPackingSlip(order, { shopName: "Vendor A" });

    expect(label.codAmount).toBe(950);
    expect(label.payableAmount).toBe(950);
    expect(labelHtml).toContain("Tk 950");
    expect(labelHtml).toContain("ITEMS");
    expect(labelHtml).toContain("Tk 1,000");
    expect(labelHtml).toContain("DELIVERY");
    expect(labelHtml).toContain("Tk 50");
    expect(labelHtml).toContain("DISCOUNT");
    expect(labelHtml).toContain("-Tk 100");
    expect(labelHtml).toContain("TOTAL");
    expect(labelHtml).toContain("Collect on delivery");
    expect(packingSlipHtml).toContain("Customer payable</span><span>Tk 950</span>");
    expect(labelHtml).not.toContain("Tk 5,000");
    expect(packingSlipHtml).not.toContain("Customer payable</span><span>Tk 5,000</span>");
  });

  test("shows prepaid vendor total without incorrectly claiming an unverified payment is paid", () => {
    const label = buildVendorParcelLabelModel({
      _id: "prepaid-vendor-order",
      vendorId: "vendor-a",
      paymentMethod: "bkash",
      paymentStatus: "pending_verification",
      payableTotal: 725,
      products: [{ vendorId: "vendor-a", title: "Vendor item", price: 725, quantity: 1 }],
    });
    const html = renderVendorParcelLabelDocument([{ label, qrDataUrl: "data:image/png;base64,TESTQR" }]);

    expect(html).toContain("VENDOR TOTAL");
    expect(html).toContain("Tk 725");
    expect(html).toContain("Verify payment");
    expect(html).not.toContain(">PAID<");
  });
});
