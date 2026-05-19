const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const EPSILON = 0.01;

const toNumber = (value, fallback = 0) => {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  const parsed = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const round2 = (value) => Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;

const hasMoneyValue = (value) =>
  value !== undefined && value !== null && Number.isFinite(Number(value));

const firstMoneyValue = (...values) => {
  const value = values.find(hasMoneyValue);
  return value === undefined ? null : round2(value);
};

const normalizeId = (value) => {
  if (!value) return "";
  return value.toString ? value.toString() : String(value);
};

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatStatus = (value) =>
  String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatPaymentMethod = (value) => {
  const normalized = String(value || "").toLowerCase();
  if (["cod", "cash_on_delivery", "cash on delivery"].includes(normalized)) {
    return "Cash on Delivery";
  }
  if (normalized === "bkash") return "bKash";
  if (normalized === "nagad") return "Nagad";
  if (normalized === "card") return "Card";
  return formatStatus(value);
};

const getColorName = (color) => {
  if (!color) return "";
  if (typeof color === "string") return color;
  return color.name || color.label || color.value || "";
};

const getDeliveryCharge = (order = {}) => {
  if (order.deliveryCharge !== undefined && order.deliveryCharge !== null) {
    return round2(order.deliveryCharge);
  }

  return round2(
    (order.deliveryBreakdown || []).reduce(
      (sum, item) =>
        sum +
        toNumber(
          item.finalCharge ??
            item.deliveryCharge ??
            item.charge ??
            item.fee ??
            item.amount,
        ),
      0,
    ),
  );
};

const distributeDiscount = (lineTotals = [], amount = 0, eligibleIndexes = []) => {
  const discountAmount = Math.max(0, round2(amount));
  const eligible = eligibleIndexes.filter((index) => lineTotals[index] > 0);
  if (discountAmount <= 0 || eligible.length === 0) return new Array(lineTotals.length).fill(0);

  const base = eligible.reduce((sum, index) => sum + lineTotals[index], 0);
  if (base <= 0) return new Array(lineTotals.length).fill(0);

  const result = new Array(lineTotals.length).fill(0);
  let assigned = 0;
  eligible.forEach((index, position) => {
    const share = position === eligible.length - 1
      ? round2(discountAmount - assigned)
      : round2((discountAmount * lineTotals[index]) / base);
    result[index] = Math.min(lineTotals[index], Math.max(0, share));
    assigned = round2(assigned + result[index]);
  });

  return result;
};

const getProductDiscountShares = ({ order = {}, items = [], couponDiscount = 0, pointsDiscount = 0, discountTotal = 0 }) => {
  const lineTotals = items.map((item) => round2(item.lineTotal));
  const discounts = new Array(items.length).fill(0);
  const totalDiscount = Math.max(0, round2(discountTotal));
  if (totalDiscount <= 0 || items.length === 0) return discounts;

  const couponAmount = Math.min(totalDiscount, Math.max(0, round2(couponDiscount)));
  const pointsAmount = Math.max(0, round2(pointsDiscount));
  const otherAmount = Math.max(0, round2(totalDiscount - couponAmount - pointsAmount));
  const allIndexes = items.map((_, index) => index);
  const couponScopeVendorId = order.couponApplied?.source === "vendor_voucher"
    ? normalizeId(order.couponApplied?.scopeVendorId)
    : "";
  const couponIndexes = couponScopeVendorId
    ? allIndexes.filter((index) => normalizeId(items[index].vendorId) === couponScopeVendorId)
    : allIndexes;

  distributeDiscount(lineTotals, couponAmount, couponIndexes).forEach((value, index) => {
    discounts[index] = round2(discounts[index] + value);
  });
  distributeDiscount(lineTotals, pointsAmount + otherAmount, allIndexes).forEach((value, index) => {
    discounts[index] = Math.min(lineTotals[index], round2(discounts[index] + value));
  });

  return discounts;
};

const uniqueAddressParts = (parts = []) => {
  const seen = new Set();
  return parts
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .filter((part) => {
      const key = part.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const buildAddressLines = (shippingInfo = {}) => {
  const hasShippingInfo = [
    shippingInfo.name,
    shippingInfo.phone,
    shippingInfo.email,
    shippingInfo.address,
    shippingInfo.area,
    shippingInfo.wardNo,
    shippingInfo.union,
    shippingInfo.thana,
    shippingInfo.upazila,
    shippingInfo.district,
    shippingInfo.city,
    shippingInfo.division,
    shippingInfo.zipCode,
    shippingInfo.postalCode,
    shippingInfo.country,
  ].some(Boolean);
  const houseLine = uniqueAddressParts([
    shippingInfo.address,
    shippingInfo.house,
    shippingInfo.houseNo,
    shippingInfo.road,
    shippingInfo.flat,
  ]).join(", ");
  const areaLine = uniqueAddressParts([
    shippingInfo.area,
    shippingInfo.wardNo ? `Ward ${shippingInfo.wardNo}` : "",
    shippingInfo.union,
  ]).join(", ");
  const localityLine = uniqueAddressParts([
    shippingInfo.thana || shippingInfo.upazila,
    shippingInfo.district || shippingInfo.city,
    shippingInfo.division,
  ]).join(", ");
  const postalLine = uniqueAddressParts([
    shippingInfo.zipCode || shippingInfo.postalCode,
    shippingInfo.country || (hasShippingInfo ? "Bangladesh" : ""),
  ]).join(", ");

  return [
    shippingInfo.name,
    houseLine,
    areaLine,
    localityLine,
    postalLine,
    shippingInfo.phone ? `Phone: ${shippingInfo.phone}` : "",
    shippingInfo.email ? `Email: ${shippingInfo.email}` : "",
  ].filter(Boolean);
};

class InvoiceService {
  constructor() {
    this.invoicesDir = path.join(__dirname, "../invoices");
    if (!fs.existsSync(this.invoicesDir)) {
      fs.mkdirSync(this.invoicesDir, { recursive: true });
    }
  }

  formatMoney(amount) {
    return `BDT ${round2(amount).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  buildInvoiceData(order = {}) {
    const orderId = normalizeId(order._id);
    const products = Array.isArray(order.products) ? order.products : [];
    let items = products.map((item, index) => {
      const quantity = Math.max(1, toNumber(item.quantity, 1));
      const unitPrice = round2(item.price ?? item.unitPrice ?? item.product?.price ?? 0);
      const lineTotal = round2(unitPrice * quantity);
      const selectedSize = item.selectedSize || item.size || "";
      const selectedColor = getColorName(item.selectedColor || item.color);
      const options = [selectedSize && `Size: ${selectedSize}`, selectedColor && `Color: ${selectedColor}`]
        .filter(Boolean)
        .join(", ");

      return {
        lineNo: index + 1,
        productId: normalizeId(item.productId || item._id || item.product?._id),
        vendorId: normalizeId(item.vendorId || item.vendor?._id || item.vendor?.id),
        sku: item.sku || item.variantSku || item.product?.sku || "",
        name: item.product?.name || item.title || item.name || "Product",
        options,
        vendorName: item.vendorName || item.shopName || item.storeName || "HnilaBazar",
        quantity,
        unitPrice,
        lineTotal,
      };
    });

    const calculatedSubtotal = round2(
      items.reduce((sum, item) => sum + item.lineTotal, 0),
    );
    const subtotal = calculatedSubtotal > 0 ? calculatedSubtotal : round2(order.subtotal);
    const couponDiscount = Math.max(
      0,
      firstMoneyValue(order.couponDiscount, order.couponApplied?.discountAmount) || 0,
    );
    const pointsDiscount = Math.max(0, round2(order.pointsDiscount));
    const totalDiscount = Math.max(
      0,
      firstMoneyValue(
        order.totalDiscount,
        order.discount,
        order.discountAmount,
        order.discountBreakdown?.totals?.discountTotal,
      ) || 0,
    );
    const namedDiscounts = round2(couponDiscount + pointsDiscount);
    const otherDiscount = Math.max(0, round2(totalDiscount - namedDiscounts));
    const discountTotal = round2(namedDiscounts + otherDiscount);
    const itemDiscountShares = getProductDiscountShares({
      order,
      items,
      couponDiscount,
      pointsDiscount,
      discountTotal,
    });
    items = items.map((item, index) => {
      const lineDiscount = Math.min(item.lineTotal, round2(itemDiscountShares[index] || 0));
      const payableLineTotal = round2(Math.max(0, item.lineTotal - lineDiscount));

      return {
        ...item,
        lineDiscount,
        payableLineTotal,
        payableUnitPrice: item.quantity > 0 ? round2(payableLineTotal / item.quantity) : payableLineTotal,
      };
    });
    const deliveryCharge = getDeliveryCharge(order);
    const taxAmount = Math.max(0, round2(order.taxAmount || order.vatAmount));
    const computedTotal = round2(Math.max(0, subtotal - discountTotal + deliveryCharge + taxAmount));
    const storedTotal = firstMoneyValue(
      order.total,
      order.finalTotal,
      order.totalAmount,
      order.grandTotal,
      order.payableTotal,
    );
    const preDiscountTotal = round2(subtotal + deliveryCharge + taxAmount);
    const storedLooksUndiscounted =
      discountTotal > 0 &&
      storedTotal !== null &&
      storedTotal > computedTotal &&
      Math.abs(storedTotal - preDiscountTotal) <= EPSILON;
    const hasStoredTotal = storedTotal !== null && !storedLooksUndiscounted;
    const total = hasStoredTotal ? storedTotal : computedTotal;
    const adjustment = hasStoredTotal && Math.abs(storedTotal - computedTotal) > EPSILON
      ? round2(storedTotal - computedTotal)
      : 0;

    const shippingInfo = order.shippingInfo || {};
    const addressLines = buildAddressLines(shippingInfo);

    const couponCode = order.couponApplied?.code || order.couponCode || "";
    const summaryRows = [
      { label: "Subtotal", amount: subtotal },
      couponDiscount > 0
        ? { label: `Coupon${couponCode ? ` (${couponCode})` : ""}`, amount: -couponDiscount }
        : null,
      pointsDiscount > 0
        ? { label: "Loyalty points", amount: -pointsDiscount }
        : null,
      otherDiscount > 0
        ? { label: "Other discount", amount: -otherDiscount }
        : null,
      { label: "Delivery charge", amount: deliveryCharge, freeLabel: deliveryCharge === 0 ? "FREE" : "" },
      taxAmount > 0 ? { label: "VAT / Tax", amount: taxAmount } : null,
      adjustment !== 0 ? { label: "Order adjustment", amount: adjustment } : null,
    ].filter(Boolean);

    return {
      orderId,
      shortOrderId: orderId ? orderId.slice(-8).toUpperCase() : "",
      invoiceDate: new Date(),
      orderDate: order.createdAt || order.orderDate || null,
      status: order.status || "",
      paymentMethod: order.paymentMethod || "",
      paymentStatus: order.paymentStatus || "",
      transactionId: order.transactionId || "",
      customerName: shippingInfo.name || "",
      addressLines,
      items,
      subtotal,
      couponDiscount,
      pointsDiscount,
      otherDiscount,
      discountTotal,
      deliveryCharge,
      taxAmount,
      adjustment,
      computedTotal,
      total,
      summaryRows,
      customerNotes: order.specialInstructions || "",
      vendorNotes: order.vendorNotes || {},
    };
  }

  async generateInvoice(order) {
    return new Promise((resolve, reject) => {
      try {
        const invoice = this.buildInvoiceData(order);
        const doc = new PDFDocument({ margin: 50, size: "A4" });
        const fileName = `invoice-${invoice.orderId}.pdf`;
        const filePath = path.join(this.invoicesDir, fileName);

        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        this.generateHeader(doc, invoice);
        const tableStartY = this.generateCustomerInformation(doc, invoice);
        this.generateInvoiceTable(doc, invoice, tableStartY);
        this.generateFooter(doc);

        doc.end();

        stream.on("finish", () => {
          resolve(filePath);
        });

        stream.on("error", (error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  generateHeader(doc, invoice) {
    doc
      .fillColor("#10B981")
      .fontSize(28)
      .text("Amiyo-Go", 50, 45)
      .fillColor("#444444")
      .fontSize(10)
      .text("Bangladesh Marketplace", 50, 75)
      .text("Chittagong, Bangladesh", 50, 88)
      .text("Phone: +880 1521-721946", 50, 101)
      .text("Email: mdjahedulislamjaved@gmail.com", 50, 114)
      .moveDown();

    doc
      .fillColor("#10B981")
      .fontSize(20)
      .text("CUSTOMER INVOICE", 335, 50, { align: "right", width: 215 })
      .fillColor("#444444")
      .fontSize(10)
      .text(`Invoice Date: ${formatDate(invoice.invoiceDate)}`, 335, 78, {
        align: "right",
        width: 215,
      })
      .text(`Invoice #: ${invoice.shortOrderId}`, 335, 93, {
        align: "right",
        width: 215,
      })
      .moveDown();

    doc
      .strokeColor("#10B981")
      .lineWidth(2)
      .moveTo(50, 130)
      .lineTo(550, 130)
      .stroke();
  }

  generateCustomerInformation(doc, invoice) {
    const top = 150;
    doc.fillColor("#444444").fontSize(12).text("Bill To", 50, top);

    let lineY = top + 20;
    const customerLines = invoice.addressLines.length > 0
      ? invoice.addressLines
      : ["Customer information unavailable"];
    customerLines.forEach((line) => {
      doc.fontSize(10).text(line, 50, lineY, { width: 220 });
      lineY += Math.max(15, doc.heightOfString(line, { width: 220 }) + 3);
    });

    doc
      .fontSize(12)
      .text("Order Details", 315, top)
      .fontSize(10)
      .text(`Order ID: #${invoice.shortOrderId}`, 315, top + 20)
      .text(`Order Date: ${formatDate(invoice.orderDate) || "N/A"}`, 315, top + 35)
      .text(`Status: ${formatStatus(invoice.status) || "N/A"}`, 315, top + 50)
      .text(`Payment: ${formatPaymentMethod(invoice.paymentMethod) || "N/A"}`, 315, top + 65)
      .text(`Payment Status: ${formatStatus(invoice.paymentStatus) || "N/A"}`, 315, top + 80);

    if (invoice.transactionId) {
      doc.text(`Transaction ID: ${invoice.transactionId}`, 315, top + 95);
    }

    return Math.max(280, lineY + 20);
  }

  drawInvoiceTableHeader(doc, y) {
    doc
      .fillColor("#10B981")
      .fontSize(9)
      .text("Item", 50, y, { width: 175 })
      .text("Vendor", 225, y, { width: 75 })
      .text("Qty", 300, y, { width: 35, align: "right" })
      .text("Unit", 335, y, { width: 60, align: "right" })
      .text("Discount", 395, y, { width: 65, align: "right" })
      .text("Payable", 460, y, { width: 90, align: "right" });

    doc
      .strokeColor("#10B981")
      .lineWidth(1)
      .moveTo(50, y + 15)
      .lineTo(550, y + 15)
      .stroke();
  }

  generateInvoiceTable(doc, invoice, startY = 280) {
    let position = startY;
    this.drawInvoiceTableHeader(doc, position);
    position += 25;
    doc.fillColor("#444444");

    const rows = invoice.items.length > 0
      ? invoice.items
      : [{ name: "No items available", vendorName: "-", quantity: 0, unitPrice: 0, lineTotal: 0, lineDiscount: 0, payableLineTotal: 0 }];

    rows.forEach((item) => {
      if (position > 700) {
        doc.addPage();
        position = 50;
        this.drawInvoiceTableHeader(doc, position);
        position += 25;
      }

      const itemText = [item.name, item.options, item.sku ? `SKU: ${item.sku}` : ""]
        .filter(Boolean)
        .join("\n");

      doc
        .fillColor("#444444")
        .fontSize(9)
        .text(itemText, 50, position, { width: 170, height: 34, ellipsis: true })
        .text(item.vendorName, 225, position, { width: 70, ellipsis: true })
        .text(String(item.quantity), 300, position, { width: 35, align: "right" })
        .text(this.formatMoney(item.unitPrice), 335, position, { width: 60, align: "right" })
        .fillColor(item.lineDiscount > 0 ? "#EF4444" : "#444444")
        .text(item.lineDiscount > 0 ? `-${this.formatMoney(item.lineDiscount)}` : "-", 395, position, { width: 65, align: "right" })
        .fillColor("#444444")
        .text(this.formatMoney(item.payableLineTotal ?? item.lineTotal), 460, position, { width: 90, align: "right" });

      position += 42;
    });

    position += 5;
    doc
      .strokeColor("#CCCCCC")
      .lineWidth(1)
      .moveTo(50, position)
      .lineTo(550, position)
      .stroke();

    position += 15;
    invoice.summaryRows.forEach((row) => {
      doc.fillColor(row.amount < 0 ? "#EF4444" : "#444444").fontSize(10);
      doc.text(`${row.label}:`, 350, position, { width: 100 });
      doc.text(row.freeLabel || this.formatMoney(row.amount), 450, position, {
        width: 100,
        align: "right",
      });
      position += 18;
    });

    doc
      .strokeColor("#10B981")
      .lineWidth(2)
      .moveTo(350, position)
      .lineTo(550, position)
      .stroke();

    position += 10;

    doc
      .fillColor("#10B981")
      .fontSize(13)
      .text("Total Amount:", 350, position, { width: 100 })
      .text(this.formatMoney(invoice.total), 450, position, {
        width: 100,
        align: "right",
      });

    position += 30;
    doc.fillColor("#444444").fontSize(9);

    if (invoice.customerNotes) {
      doc.text("Delivery Note", 50, position, { width: 120 });
      position += 14;
      doc.fillColor("#666666").text(invoice.customerNotes, 50, position, { width: 500 });
      position += 28;
    }

    doc
      .fillColor("#777777")
      .fontSize(8)
      .text(
        "This customer invoice shows the amount paid by the buyer. Vendor commission and payout deductions are kept in finance reports, not customer invoices.",
        50,
        Math.min(position, 700),
        { width: 500 },
      );
  }

  generateFooter(doc) {
    doc
      .fontSize(8)
      .fillColor("#999999")
      .text("Thank you for shopping with Amiyo-Go!", 50, 730, {
        align: "center",
        width: 500,
      })
      .text(
        "For any queries, contact us at +880 1521-721946 or mdjahedulislamjaved@gmail.com",
        50,
        745,
        {
          align: "center",
          width: 500,
        },
      );
  }

  getInvoicePath(orderId) {
    const fileName = `invoice-${orderId}.pdf`;
    return path.join(this.invoicesDir, fileName);
  }

  invoiceExists(orderId) {
    const filePath = this.getInvoicePath(orderId);
    return fs.existsSync(filePath);
  }

  deleteInvoice(orderId) {
    const filePath = this.getInvoicePath(orderId);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }
}

module.exports = new InvoiceService();
