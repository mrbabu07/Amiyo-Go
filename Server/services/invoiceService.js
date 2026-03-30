const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

class InvoiceService {
  constructor() {
    // Ensure invoices directory exists
    this.invoicesDir = path.join(__dirname, "../invoices");
    if (!fs.existsSync(this.invoicesDir)) {
      fs.mkdirSync(this.invoicesDir, { recursive: true });
    }
  }

  async generateInvoice(order) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: "A4" });
        const fileName = `invoice-${order._id}.pdf`;
        const filePath = path.join(this.invoicesDir, fileName);

        // Pipe to file
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Header
        this.generateHeader(doc);
        this.generateCustomerInformation(doc, order);
        this.generateInvoiceTable(doc, order);
        this.generateFooter(doc);

        // Finalize PDF
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

  generateHeader(doc) {
    doc
      .fillColor("#10B981")
      .fontSize(28)
      .text("Amiyo-Go", 50, 45)
      .fillColor("#444444")
      .fontSize(10)
      .text("E-commerce Platform", 50, 75)
      .text("Chittagong, Bangladesh", 50, 88)
      .text("Phone: +880 1521-721946", 50, 101)
      .text("Email: mdjahedulislamjaved@gmail.com", 50, 114)
      .moveDown();

    // Invoice title
    doc
      .fillColor("#10B981")
      .fontSize(20)
      .text("INVOICE", 400, 50, { align: "right" })
      .fillColor("#444444")
      .fontSize(10)
      .text(`Date: ${new Date().toLocaleDateString()}`, 400, 75, {
        align: "right",
      })
      .moveDown();

    // Line
    doc
      .strokeColor("#10B981")
      .lineWidth(2)
      .moveTo(50, 130)
      .lineTo(550, 130)
      .stroke();
  }

  generateCustomerInformation(doc, order) {
    doc.fillColor("#444444").fontSize(12).text("Bill To:", 50, 150);

    const customerInformationTop = 170;

    doc
      .fontSize(10)
      .text(order.shippingInfo.name, 50, customerInformationTop)
      .text(order.shippingInfo.address, 50, customerInformationTop + 15)
      .text(
        `${order.shippingInfo.city}, ${order.shippingInfo.zipCode || ""}`,
        50,
        customerInformationTop + 30,
      )
      .text(order.shippingInfo.phone, 50, customerInformationTop + 45)
      .text(order.shippingInfo.email, 50, customerInformationTop + 60);

    // Order information
    doc
      .fontSize(12)
      .text("Order Details:", 300, 150)
      .fontSize(10)
      .text(
        `Order ID: #${order._id.toString().slice(-8).toUpperCase()}`,
        300,
        customerInformationTop,
      )
      .text(
        `Order Date: ${new Date(order.createdAt).toLocaleDateString()}`,
        300,
        customerInformationTop + 15,
      )
      .text(
        `Status: ${order.status.toUpperCase()}`,
        300,
        customerInformationTop + 30,
      )
      .text(
        `Payment: ${order.paymentMethod === "cod" ? "Cash on Delivery" : order.paymentMethod.toUpperCase()}`,
        300,
        customerInformationTop + 45,
      );

    // Add transaction ID if available
    if (order.transactionId) {
      doc.text(
        `Transaction ID: ${order.transactionId}`,
        300,
        customerInformationTop + 60,
      );
    }

    doc.moveDown();
  }

  generateInvoiceTable(doc, order) {
    let i;
    const invoiceTableTop = 280;

    // Table header
    doc
      .fillColor("#10B981")
      .fontSize(10)
      .text("Item", 50, invoiceTableTop)
      .text("Vendor", 200, invoiceTableTop, { width: 90 })
      .text("Qty", 290, invoiceTableTop, { width: 50, align: "right" })
      .text("Price", 340, invoiceTableTop, { width: 70, align: "right" })
      .text("Total", 410, invoiceTableTop, { width: 70, align: "right" })
      .text("Comm.", 480, invoiceTableTop, { width: 70, align: "right" });

    // Line under header
    doc
      .strokeColor("#10B981")
      .lineWidth(1)
      .moveTo(50, invoiceTableTop + 15)
      .lineTo(550, invoiceTableTop + 15)
      .stroke();

    // Table rows
    let position = invoiceTableTop + 25;
    doc.fillColor("#444444");

    for (i = 0; i < order.products.length; i++) {
      const item = order.products[i];
      const itemName = item.product?.name || item.title || "Product";
      const itemPrice = item.price || 0;
      const itemQuantity = item.quantity || 1;
      const itemTotal = itemPrice * itemQuantity;
      const vendorName = item.vendorName || item.shopName || "-";
      const commission = item.adminCommissionAmount != null
        ? `৳${Math.round(item.adminCommissionAmount * 110)}`
        : "-";

      // Item details
      let itemText = itemName;
      if (item.selectedSize) itemText += ` (${item.selectedSize})`;
      if (item.selectedColor) {
        const colorName = typeof item.selectedColor === "string"
          ? item.selectedColor
          : item.selectedColor.name || "N/A";
        itemText += ` (${colorName})`;
      }

      doc
        .fontSize(9)
        .text(itemText, 50, position, { width: 145, ellipsis: true })
        .text(vendorName, 200, position, { width: 85, ellipsis: true })
        .text(itemQuantity, 290, position, { width: 50, align: "right" })
        .text(`৳${Math.round(itemPrice * 110)}`, 340, position, { width: 70, align: "right" })
        .text(`৳${Math.round(itemTotal * 110)}`, 410, position, { width: 70, align: "right" })
        .text(commission, 480, position, { width: 70, align: "right" });

      position += 22;

      // Add new page if needed
      if (position > 700) {
        doc.addPage();
        position = 50;
      }
    }

    // Commission rate note
    if (order.products && order.products.some(p => p.commissionRateSnapshot != null)) {
      doc.fillColor("#888888").fontSize(7)
        .text("* Comm. = Admin Commission deducted from vendor earnings per item.", 50, position);
      position += 14;
      doc.fillColor("#444444");
    }

    // Summary section
    position += 10;

    // Line before summary
    doc
      .strokeColor("#CCCCCC")
      .lineWidth(1)
      .moveTo(50, position)
      .lineTo(550, position)
      .stroke();

    position += 15;

    // Subtotal
    const subtotal = order.subtotal || 0;
    doc
      .fontSize(10)
      .text("Subtotal:", 370, position)
      .text(`৳${Math.round(subtotal * 110)}`, 0, position, { align: "right" });

    position += 20;

    // Discount (if any)
    if (order.totalDiscount && order.totalDiscount > 0) {
      doc
        .fillColor("#EF4444")
        .text("Discount:", 370, position)
        .text(`-৳${Math.round(order.totalDiscount * 110)}`, 0, position, { align: "right" });
      position += 20;
      doc.fillColor("#444444");
    }

    // Coupon discount (if any)
    if (order.couponDiscount && order.couponDiscount > 0) {
      doc
        .fillColor("#EF4444")
        .text(`Coupon (${order.couponApplied?.code || "DISCOUNT"}):`, 370, position)
        .text(`-৳${Math.round(order.couponDiscount * 110)}`, 0, position, { align: "right" });
      position += 20;
      doc.fillColor("#444444");
    }

    // Points discount (if any)
    if (order.pointsDiscount && order.pointsDiscount > 0) {
      doc
        .fillColor("#EF4444")
        .text("Loyalty Points:", 370, position)
        .text(`-৳${Math.round(order.pointsDiscount * 110)}`, 0, position, { align: "right" });
      position += 20;
      doc.fillColor("#444444");
    }

    // Delivery charge
    const deliveryCharge = order.deliveryCharge || 0;
    doc
      .text("Delivery Charge:", 370, position)
      .text(
        deliveryCharge === 0 ? "FREE" : `৳${Math.round(deliveryCharge * 110)}`,
        0, position, { align: "right" },
      );

    position += 20;

    // Commission summary (admin)
    if (order.totalCommission != null && order.totalCommission > 0) {
      doc
        .fillColor("#6366F1")
        .fontSize(9)
        .text("Platform Commission:", 370, position)
        .text(`৳${Math.round(order.totalCommission * 110)}`, 0, position, { align: "right" });
      position += 18;
      doc.fillColor("#444444").fontSize(10);
    }

    // Line before total
    doc
      .strokeColor("#10B981")
      .lineWidth(2)
      .moveTo(370, position)
      .lineTo(550, position)
      .stroke();

    position += 10;

    // Total
    const total = order.total || 0;
    doc
      .fillColor("#10B981")
      .fontSize(12)
      .text("Total Amount:", 370, position)
      .text(`৳${Math.round(total * 110)}`, 0, position, { align: "right" });

    doc.fillColor("#444444").fontSize(10);
    position += 30;

    // Order notes
    if (order.notes && order.notes.length > 0) {
      doc
        .strokeColor("#CCCCCC")
        .lineWidth(1)
        .moveTo(50, position)
        .lineTo(550, position)
        .stroke();

      position += 12;
      doc.fillColor("#444444").fontSize(10).text("Internal Notes:", 50, position);
      position += 15;
      order.notes.forEach(note => {
        const dateStr = note.addedAt ? new Date(note.addedAt).toLocaleString() : "";
        doc.fontSize(8).fillColor("#888888")
          .text(`[${dateStr}] ${note.text}`, 50, position, { width: 500 });
        position += 14;
      });
      doc.fillColor("#444444");
    }
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

  // Get invoice file path
  getInvoicePath(orderId) {
    const fileName = `invoice-${orderId}.pdf`;
    return path.join(this.invoicesDir, fileName);
  }

  // Check if invoice exists
  invoiceExists(orderId) {
    const filePath = this.getInvoicePath(orderId);
    return fs.existsSync(filePath);
  }

  // Delete invoice
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
