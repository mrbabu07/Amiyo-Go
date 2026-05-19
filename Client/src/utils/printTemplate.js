// Professional e-commerce invoice template.

export const generateProfessionalInvoice = (order) => {
  const shortOrderId = order?._id ? order._id.slice(-8).toUpperCase() : "N/A";
  const orderDate = order?.createdAt
    ? new Date(order.createdAt).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "N/A";

  const roundMoney = (value) =>
    Math.round(((Number(value) || 0) + Number.EPSILON) * 100) / 100;

  const subtotal = order?.subtotal || order?.total || 0;
  const deliveryCharge = order?.deliveryCharge || 0;
  const couponDiscount = order?.couponDiscount || 0;
  const pointsDiscount = order?.pointsDiscount || 0;
  const totalDiscount = order?.totalDiscount || couponDiscount + pointsDiscount;
  const tax = order?.tax || 0;
  const computedTotal = Math.max(0, subtotal + deliveryCharge + tax - totalDiscount);
  const storedTotal = Number(order?.total ?? order?.finalTotal ?? order?.totalAmount ?? 0);
  const preDiscountTotal = subtotal + deliveryCharge + tax;
  const total =
    totalDiscount > 0 && storedTotal > computedTotal && Math.abs(storedTotal - preDiscountTotal) <= 0.01
      ? computedTotal
      : storedTotal || computedTotal;
  const shipping = order?.shippingInfo || {};
  const products = Array.isArray(order?.products) ? order.products : [];

  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const formatPrice = (price) => {
    const amount = Number(price || 0);
    return `Tk ${Math.round(amount).toLocaleString()}`;
  };

  const renderColor = (color) => {
    if (!color) return "";
    if (typeof color === "string") return color;
    if (typeof color === "object" && color.name) return color.name;
    return "Unknown";
  };

  const getStoreName = (item) =>
    item?.shopName ||
    item?.vendorName ||
    item?.storeName ||
    item?.vendor?.shopName ||
    item?.vendor?.name ||
    "HnilaBazar";

  const distributeDiscount = (lineTotals, amount) => {
    const discountAmount = Math.max(0, roundMoney(amount));
    const base = lineTotals.reduce((sum, value) => sum + value, 0);
    if (discountAmount <= 0 || base <= 0) return lineTotals.map(() => 0);

    let assigned = 0;
    return lineTotals.map((lineTotal, index) => {
      const share = index === lineTotals.length - 1
        ? roundMoney(discountAmount - assigned)
        : roundMoney((discountAmount * lineTotal) / base);
      const clipped = Math.min(lineTotal, Math.max(0, share));
      assigned = roundMoney(assigned + clipped);
      return clipped;
    });
  };

  const lineTotals = products.map((item) => roundMoney((item.price || 0) * (item.quantity || 1)));
  const lineDiscounts = distributeDiscount(lineTotals, totalDiscount);

  const addressLines = [
    shipping.name,
    shipping.phone,
    shipping.address,
    shipping.area,
    shipping.wardNo ? `Ward: ${shipping.wardNo}` : "",
    shipping.union,
    shipping.upazila,
    shipping.district || shipping.city,
    shipping.division,
    shipping.zipCode ? `Postal: ${shipping.zipCode}` : "",
  ].filter(Boolean);

  const uniqueStores = [
    ...new Set(products.map((item) => getStoreName(item)).filter(Boolean)),
  ];

  const status = (order?.status || "pending").toUpperCase();
  const paymentMethod = order?.paymentMethod
    ? order.paymentMethod.toUpperCase()
    : "N/A";
  const paymentStatus =
    order?.paymentStatus ||
    (order?.paymentMethod === "cod" ? "Cash on delivery" : "Pending/paid");

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice #${escapeHtml(shortOrderId)}</title>
      <style>
        * { box-sizing: border-box; }
        body {
          margin: 0;
          background: #f4f6f8;
          color: #172033;
          font-family: "Plus Jakarta Sans", "Noto Sans Bengali", Arial, Helvetica, sans-serif;
          font-size: 13px;
          line-height: 1.45;
        }
        .page {
          max-width: 920px;
          margin: 18px auto;
          background: #fff;
          border: 1px solid #d9e1ea;
          box-shadow: 0 16px 42px rgba(15, 23, 42, 0.12);
        }
        .header {
          display: flex;
          justify-content: space-between;
          gap: 24px;
          padding: 28px 32px;
          color: #fff;
          background: #155e75;
        }
        .brand { font-size: 28px; font-weight: 800; letter-spacing: 0; }
        .tagline { margin-top: 4px; color: #cffafe; font-size: 12px; }
        .invoice-title { text-align: right; }
        .invoice-title .label { color: #cffafe; font-size: 12px; font-weight: 700; }
        .invoice-title .number { margin-top: 4px; font-size: 24px; font-weight: 800; }
        .content { padding: 28px 32px 24px; }
        .grid-3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-bottom: 22px;
        }
        .card {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 14px;
          background: #f8fafc;
          min-height: 112px;
        }
        .card-title {
          color: #475569;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .strong { font-weight: 700; color: #0f172a; }
        .muted { color: #64748b; }
        .tiny { font-size: 11px; }
        .status {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 999px;
          background: #ecfeff;
          color: #155e75;
          font-weight: 800;
          font-size: 11px;
        }
        .section-title {
          color: #0f172a;
          font-size: 13px;
          font-weight: 800;
          margin: 22px 0 10px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
        }
        th {
          background: #f1f5f9;
          color: #475569;
          font-size: 11px;
          text-align: left;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 10px;
          border-bottom: 1px solid #dbe4ee;
        }
        td {
          padding: 11px 10px;
          border-bottom: 1px solid #edf2f7;
          vertical-align: top;
        }
        tr:last-child td { border-bottom: 0; }
        .product-cell {
          display: flex;
          gap: 10px;
          align-items: flex-start;
        }
        .product-image {
          width: 46px;
          height: 46px;
          object-fit: cover;
          border-radius: 6px;
          border: 1px solid #dbe4ee;
          background: #f8fafc;
          flex-shrink: 0;
        }
        .placeholder {
          width: 46px;
          height: 46px;
          border-radius: 6px;
          border: 1px solid #dbe4ee;
          background: #f8fafc;
          color: #94a3b8;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          flex-shrink: 0;
        }
        .item-meta { margin-top: 4px; color: #64748b; font-size: 11px; }
        .store-name {
          margin-top: 5px;
          color: #155e75;
          font-size: 11px;
          font-weight: 800;
        }
        .right { text-align: right; }
        .center { text-align: center; }
        .summary-wrap {
          display: grid;
          grid-template-columns: 1fr 280px;
          gap: 18px;
          margin-top: 18px;
        }
        .note-box {
          border: 1px solid #fde68a;
          border-radius: 8px;
          padding: 12px;
          background: #fffbeb;
          color: #92400e;
        }
        .summary {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 14px;
          background: #f8fafc;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 6px 0;
          color: #475569;
        }
        .summary-row.total {
          margin-top: 8px;
          padding-top: 12px;
          border-top: 1px solid #cbd5e1;
          color: #0f172a;
          font-size: 16px;
          font-weight: 800;
        }
        .footer {
          padding: 16px 32px;
          border-top: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #64748b;
          text-align: center;
          font-size: 11px;
        }
        .print-actions {
          max-width: 920px;
          margin: 0 auto 18px;
          text-align: center;
        }
        .print-actions button {
          border: 0;
          border-radius: 8px;
          background: #155e75;
          color: white;
          padding: 10px 22px;
          font-weight: 800;
          cursor: pointer;
        }
        @media print {
          body { background: #fff; }
          .page { margin: 0; border: 0; box-shadow: none; max-width: none; }
          .print-actions { display: none; }
        }
      </style>
    </head>
    <body>
      <main class="page">
        <header class="header">
          <div>
            <div class="brand">HnilaBazar</div>
            <div class="tagline">Customer invoice and delivery document</div>
          </div>
          <div class="invoice-title">
            <div class="label">INVOICE</div>
            <div class="number">#${escapeHtml(shortOrderId)}</div>
            <div class="tagline">${escapeHtml(orderDate)}</div>
          </div>
        </header>

        <section class="content">
          <div class="grid-3">
            <div class="card">
              <div class="card-title">Customer</div>
              <div class="strong">${escapeHtml(shipping.name || "N/A")}</div>
              <div class="muted">${escapeHtml(shipping.phone || "N/A")}</div>
              <div class="muted tiny">${escapeHtml(shipping.email || "N/A")}</div>
            </div>

            <div class="card">
              <div class="card-title">Delivery Address</div>
              ${
                addressLines.length
                  ? addressLines
                      .map((line, index) =>
                        index === 0
                          ? `<div class="strong">${escapeHtml(line)}</div>`
                          : `<div class="muted tiny">${escapeHtml(line)}</div>`,
                      )
                      .join("")
                  : `<div class="muted">No delivery address found</div>`
              }
            </div>

            <div class="card">
              <div class="card-title">Order</div>
              <div><span class="muted">Status:</span> <span class="status">${escapeHtml(status)}</span></div>
              <div class="tiny muted" style="margin-top: 7px;">Payment: <span class="strong">${escapeHtml(paymentMethod)}</span></div>
              <div class="tiny muted">Payment status: <span class="strong">${escapeHtml(paymentStatus)}</span></div>
              ${
                order?.transactionId
                  ? `<div class="tiny muted">Transaction: <span class="strong">${escapeHtml(order.transactionId)}</span></div>`
                  : ""
              }
              <div class="tiny muted">Stores: <span class="strong">${escapeHtml(uniqueStores.length || 1)}</span></div>
            </div>
          </div>

          <div class="section-title">Order Items (${products.length})</div>
          <table>
            <thead>
              <tr>
                <th>Product and Store</th>
                <th style="width: 70px;" class="center">Qty</th>
                <th style="width: 110px;" class="right">Unit Price</th>
                <th style="width: 100px;" class="right">Discount</th>
                <th style="width: 110px;" class="right">Payable</th>
              </tr>
            </thead>
            <tbody>
              ${
                products.length
                  ? products
                      .map((item, index) => {
                        const lineDiscount = lineDiscounts[index] || 0;
                        const payableLineTotal = Math.max(0, lineTotals[index] - lineDiscount);
                        const meta = [
                          item.selectedSize ? `Size: ${item.selectedSize}` : "",
                          item.selectedColor
                            ? `Color: ${renderColor(item.selectedColor)}`
                            : "",
                          item.trackingNumber
                            ? `Tracking: ${item.trackingNumber}`
                            : "",
                        ].filter(Boolean);
                        return `
                          <tr>
                            <td>
                              <div class="product-cell">
                                ${
                                  item.image
                                    ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title || "Product")}" class="product-image" />`
                                    : `<div class="placeholder">No img</div>`
                                }
                                <div>
                                  <div class="strong">${escapeHtml(item.title || "Product")}</div>
                                  <div class="store-name">Store: ${escapeHtml(getStoreName(item))}</div>
                                  ${meta.length ? `<div class="item-meta">${escapeHtml(meta.join(" | "))}</div>` : ""}
                                  ${
                                    item.itemStatus
                                      ? `<div class="item-meta">Item status: ${escapeHtml(item.itemStatus)}</div>`
                                      : ""
                                  }
                                </div>
                              </div>
                            </td>
                            <td class="center strong">${escapeHtml(item.quantity || 1)}</td>
                            <td class="right">${escapeHtml(formatPrice(item.price || 0))}</td>
                            <td class="right">${lineDiscount > 0 ? `- ${escapeHtml(formatPrice(lineDiscount))}` : "-"}</td>
                            <td class="right strong">${escapeHtml(formatPrice(payableLineTotal))}</td>
                          </tr>
                        `;
                      })
                      .join("")
                  : `<tr><td colspan="5" class="center muted">No items in this order</td></tr>`
              }
            </tbody>
          </table>

          <div class="summary-wrap">
            <div>
              ${
                uniqueStores.length
                  ? `
                    <div class="section-title" style="margin-top: 0;">Seller Stores</div>
                    <div class="card" style="min-height: 0;">
                      ${uniqueStores.map((store) => `<div class="strong">${escapeHtml(store)}</div>`).join("")}
                    </div>
                  `
                  : ""
              }
              ${
                order?.specialInstructions
                  ? `
                    <div class="section-title">Customer Notes</div>
                    <div class="note-box">${escapeHtml(order.specialInstructions)}</div>
                  `
                  : ""
              }
            </div>

            <div class="summary">
              <div class="card-title">Invoice Summary</div>
              <div class="summary-row"><span>Subtotal</span><span>${escapeHtml(formatPrice(subtotal))}</span></div>
              <div class="summary-row"><span>Delivery charge</span><span>${deliveryCharge > 0 ? escapeHtml(formatPrice(deliveryCharge)) : "FREE"}</span></div>
              ${
                totalDiscount > 0
                  ? `<div class="summary-row"><span>Discount</span><span>- ${escapeHtml(formatPrice(totalDiscount))}</span></div>`
                  : ""
              }
              ${
                tax > 0
                  ? `<div class="summary-row"><span>Tax</span><span>${escapeHtml(formatPrice(tax))}</span></div>`
                  : ""
              }
              <div class="summary-row total"><span>Total</span><span>${escapeHtml(formatPrice(total))}</span></div>
            </div>
          </div>
        </section>

        <footer class="footer">
          <div>This is a computer-generated invoice. No signature required.</div>
          <div>Support: +880 1521-721946 | mdjahedulislamjaved@gmail.com</div>
          <div>Generated: ${escapeHtml(new Date().toLocaleString())} | Invoice #${escapeHtml(shortOrderId)}</div>
        </footer>
      </main>

      <div class="print-actions">
        <button onclick="window.print()">Print Invoice</button>
      </div>
    </body>
    </html>
  `;
};
