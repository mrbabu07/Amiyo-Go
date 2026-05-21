export const generateVendorPackingSlip = (order, vendorInfo = {}) => {
  const shortOrderId = order?._id ? order._id.toString().slice(-8).toUpperCase() : "N/A";
  const products = Array.isArray(order?.products) ? order.products : [];
  const shipping = order?.shippingInfo || {};
  const storeName =
    vendorInfo.businessName ||
    vendorInfo.shopName ||
    products[0]?.shopName ||
    products[0]?.vendorName ||
    "Vendor Store";

  const orderDate = order?.createdAt
    ? new Date(order.createdAt).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "N/A";

  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const formatPrice = (price) =>
    `Tk ${Math.round(Number(price || 0)).toLocaleString()}`;

  const renderColor = (color) => {
    if (!color) return "";
    if (typeof color === "string") return color;
    if (typeof color === "object" && color.name) return color.name;
    return "";
  };

  const totalItems = products.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const subtotal = products.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
    0,
  );
  const commission = products.reduce(
    (sum, item) => sum + Number(item.adminCommissionAmount || 0),
    0,
  );
  const grossVendorEarnings = products.reduce(
    (sum, item) =>
      sum +
      Number(
        item.vendorEarningAmount ??
          Number(item.price || 0) * Number(item.quantity || 0) -
            Number(item.adminCommissionAmount || 0),
      ),
    0,
  );
  const deliveryCharge = Number(order?.deliveryCharge || 0);
  const discount = Number(
    order?.totalDiscount ??
    order?.vendorVoucherDiscount ??
    order?.sellerVoucherDiscount ??
    order?.discount ??
    order?.vendorDiscount ??
    order?.couponDiscount ??
    0,
  );
  const vendorEarnings = Math.max(
    0,
    Number(order?.vendorEarnings ?? grossVendorEarnings - Number(order?.vendorVoucherDiscount || 0)),
  );
  const payableTotal = Number(order?.payableTotal ?? order?.customerPayableTotal ?? 0) ||
    Math.max(0, subtotal + deliveryCharge - discount);
  const trackingNumber =
    order?.trackingNumber ||
    products.find((item) => item.trackingNumber)?.trackingNumber ||
    "";

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

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Vendor Invoice #${escapeHtml(shortOrderId)}</title>
      <style>
        * { box-sizing: border-box; }
        body {
          margin: 0;
          background: #f4f6f8;
          color: #172033;
          font-family: "Plus Jakarta Sans", "Noto Sans Bengali", Arial, Helvetica, sans-serif;
          font-size: 12px;
          line-height: 1.45;
        }
        .page {
          max-width: 900px;
          margin: 18px auto;
          background: #fff;
          border: 1px solid #dbe4ee;
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.12);
        }
        .header {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          padding: 24px 28px;
          color: #fff;
          background: #0f766e;
        }
        .brand { font-size: 24px; font-weight: 800; }
        .muted-light { color: #ccfbf1; font-size: 12px; margin-top: 3px; }
        .right { text-align: right; }
        .invoice-no { font-size: 22px; font-weight: 800; margin-top: 4px; }
        .content { padding: 24px 28px; }
        .grid-3 {
          display: grid;
          grid-template-columns: 1.1fr 1.2fr 0.9fr;
          gap: 12px;
          margin-bottom: 18px;
        }
        .card {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: #f8fafc;
          padding: 13px;
          min-height: 110px;
        }
        .label {
          color: #64748b;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-bottom: 7px;
        }
        .strong { font-weight: 700; color: #0f172a; }
        .muted { color: #64748b; }
        .tiny { font-size: 11px; }
        .status {
          display: inline-block;
          border-radius: 999px;
          padding: 3px 8px;
          background: #ecfdf5;
          color: #047857;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          border-radius: 8px;
        }
        th {
          background: #f1f5f9;
          color: #475569;
          padding: 9px;
          text-align: left;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border-bottom: 1px solid #dbe4ee;
        }
        td {
          padding: 10px 9px;
          border-bottom: 1px solid #edf2f7;
          vertical-align: top;
        }
        tr:last-child td { border-bottom: 0; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .summary {
          display: grid;
          grid-template-columns: 1fr 280px;
          gap: 16px;
          margin-top: 16px;
        }
        .summary-box {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: #f8fafc;
          padding: 13px;
        }
        .row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 5px 0;
        }
        .row.total {
          border-top: 1px solid #cbd5e1;
          margin-top: 8px;
          padding-top: 10px;
          font-size: 15px;
          font-weight: 800;
        }
        .checklist {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          margin-top: 8px;
        }
        .check {
          border: 1px solid #dbe4ee;
          border-radius: 6px;
          padding: 8px;
          background: #fff;
        }
        .footer {
          border-top: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #64748b;
          text-align: center;
          padding: 14px 28px;
          font-size: 11px;
        }
        .print-actions {
          max-width: 900px;
          margin: 0 auto 18px;
          text-align: center;
        }
        .print-actions button {
          border: 0;
          border-radius: 8px;
          background: #0f766e;
          color: white;
          padding: 10px 22px;
          font-weight: 800;
          cursor: pointer;
        }
        @media print {
          body { background: #fff; }
          .page { margin: 0; max-width: none; border: 0; box-shadow: none; }
          .print-actions { display: none; }
        }
      </style>
    </head>
    <body>
      <main class="page">
        <header class="header">
          <div>
            <div class="brand">${escapeHtml(storeName)}</div>
            <div class="muted-light">Vendor invoice and packing slip</div>
            ${vendorInfo.phone ? `<div class="muted-light">${escapeHtml(vendorInfo.phone)}</div>` : ""}
          </div>
          <div class="right">
            <div class="muted-light">ORDER</div>
            <div class="invoice-no">#${escapeHtml(shortOrderId)}</div>
            <div class="muted-light">${escapeHtml(orderDate)}</div>
          </div>
        </header>

        <section class="content">
          <div class="grid-3">
            <div class="card">
              <div class="label">Customer</div>
              <div class="strong">${escapeHtml(shipping.name || "N/A")}</div>
              <div class="muted">${escapeHtml(shipping.phone || "N/A")}</div>
              <div class="muted tiny">${escapeHtml(shipping.email || "N/A")}</div>
            </div>

            <div class="card">
              <div class="label">Delivery Address</div>
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
              <div class="label">Fulfillment</div>
              <div><span class="muted">Status:</span> <span class="status">${escapeHtml(order?.status || "pending")}</span></div>
              <div class="tiny muted" style="margin-top: 7px;">Payment: <span class="strong">${escapeHtml(order?.paymentMethod?.toUpperCase() || "COD")}</span></div>
              <div class="tiny muted">Items: <span class="strong">${escapeHtml(totalItems)}</span></div>
              <div class="tiny muted">Tracking: <span class="strong">${escapeHtml(trackingNumber || "Not added")}</span></div>
            </div>
          </div>

          <div class="label">Items To Pack</div>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th class="text-center" style="width: 60px;">Qty</th>
                <th class="text-right" style="width: 95px;">Unit</th>
                <th class="text-right" style="width: 95px;">Subtotal</th>
                <th class="text-right" style="width: 95px;">Earning</th>
              </tr>
            </thead>
            <tbody>
              ${
                products.length
                  ? products
                      .map((product) => {
                        const meta = [
                          product.selectedSize ? `Size: ${product.selectedSize}` : "",
                          product.selectedColor ? `Color: ${renderColor(product.selectedColor)}` : "",
                          product.itemStatus ? `Status: ${product.itemStatus}` : "",
                        ].filter(Boolean);
                        const itemSubtotal = Number(product.price || 0) * Number(product.quantity || 0);
                        const earning = Number(product.vendorEarningAmount ?? itemSubtotal - Number(product.adminCommissionAmount || 0));
                        return `
                          <tr>
                            <td>
                              <div class="strong">${escapeHtml(product.title || product.name || product.productDetails?.title || "Product")}</div>
                              ${meta.length ? `<div class="muted tiny">${escapeHtml(meta.join(" | "))}</div>` : ""}
                            </td>
                            <td class="text-center strong">${escapeHtml(product.quantity || 0)}</td>
                            <td class="text-right">${escapeHtml(formatPrice(product.price || 0))}</td>
                            <td class="text-right strong">${escapeHtml(formatPrice(itemSubtotal))}</td>
                            <td class="text-right strong">${escapeHtml(formatPrice(earning))}</td>
                          </tr>
                        `;
                      })
                      .join("")
                  : `<tr><td colspan="5" class="text-center muted">No vendor items found</td></tr>`
              }
            </tbody>
          </table>

          <div class="summary">
            <div class="summary-box">
              <div class="label">Packing Checklist</div>
              <div class="checklist">
                <div class="check">[ ] Items verified</div>
                <div class="check">[ ] Product condition checked</div>
                <div class="check">[ ] Invoice included</div>
                <div class="check">[ ] Package sealed</div>
                <div class="check">[ ] Label attached</div>
                <div class="check">[ ] Tracking recorded</div>
              </div>
            </div>

            <div class="summary-box">
              <div class="label">Vendor Summary</div>
              <div class="row"><span>Gross subtotal</span><span>${escapeHtml(formatPrice(subtotal))}</span></div>
              <div class="row"><span>Delivery share</span><span>${deliveryCharge ? escapeHtml(formatPrice(deliveryCharge)) : "FREE"}</span></div>
              ${discount > 0 ? `<div class="row"><span>Voucher discount</span><span>- ${escapeHtml(formatPrice(discount))}</span></div>` : ""}
              <div class="row"><span>Customer payable</span><span>${escapeHtml(formatPrice(payableTotal))}</span></div>
              <div class="row"><span>Platform commission</span><span>- ${escapeHtml(formatPrice(commission))}</span></div>
              <div class="row total"><span>Vendor earning</span><span>${escapeHtml(formatPrice(vendorEarnings))}</span></div>
            </div>
          </div>
        </section>

        <footer class="footer">
          <div>Keep this invoice with the packed order. Customer payment and payout are handled by HnilaBazar.</div>
          <div>Generated: ${escapeHtml(new Date().toLocaleString())}</div>
        </footer>
      </main>

      <div class="print-actions">
        <button onclick="window.print()">Print Vendor Invoice</button>
      </div>
    </body>
    </html>
  `;
};
