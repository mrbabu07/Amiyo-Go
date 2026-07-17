import {
  formatVendorOrderMoney,
  getVendorOrderFinancials,
  getVendorOrderPaymentSummary,
} from "./vendorOrderDetail";

const textValue = (value, fallback = "") => {
  if (value === null || value === undefined) return fallback;
  return String(value).trim() || fallback;
};

const idValue = (value) => {
  if (!value) return "";
  return value?.toString?.() || String(value);
};

const numberValue = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const shortId = (value, length = 8) =>
  textValue(value, "ORDER").slice(-length).toUpperCase();

const normalizeStatus = (value) =>
  textValue(value, "pending")
    .replace(/-/g, "_")
    .replace(/\s+/g, "_")
    .toLowerCase();

const statusLabel = (value) =>
  normalizeStatus(value)
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const itemTitle = (item = {}) =>
  textValue(item.title || item.productDetails?.title || item.name, "Product");

const itemVariant = (item = {}) => {
  const color = typeof item.selectedColor === "object"
    ? item.selectedColor?.name || item.selectedColor?.value
    : item.selectedColor;
  return [item.sku, item.selectedSize, color].filter(Boolean).map(String).join(" / ");
};

const addressText = (address = {}) => {
  if (typeof address === "string") return textValue(address);
  return [
    address.line1 || address.address,
    address.line2,
    address.area,
    address.union,
    address.upazila,
    address.city || address.district,
    address.division,
    address.zipCode || address.postalCode,
    address.country,
  ]
    .filter(Boolean)
    .map(String)
    .join(", ");
};

const getVendorProducts = (order = {}, vendorId = "") => {
  const products = Array.isArray(order.products) ? order.products : [];
  const hasVendorMarkers = products.some((item) => idValue(item?.vendorId));
  if (!vendorId || !hasVendorMarkers) return products;
  return products.filter((item) => idValue(item?.vendorId) === vendorId);
};

export const buildVendorParcelLabelModel = (order = {}, vendor = {}) => {
  const rawProducts = Array.isArray(order.products) ? order.products : [];
  const firstProduct = rawProducts[0] || {};
  const orderId = idValue(order._id || order.parentOrderId);
  const vendorId = idValue(order.vendorId || vendor._id || vendor.id || firstProduct.vendorId);
  const products = getVendorProducts(order, vendorId);
  const firstVendorProduct = products[0] || firstProduct;
  const shipping = order.shippingInfo || order.shippingAddress || {};
  const trackingNumber = textValue(
    order.trackingNumber ||
      order.shipment?.trackingNumber ||
      firstVendorProduct.trackingNumber ||
      firstVendorProduct.deliveryTrackingNumber,
  );
  const shopName = textValue(
    vendor.shopName ||
      vendor.businessName ||
      firstVendorProduct.shopName ||
      firstVendorProduct.vendorName ||
      firstVendorProduct.productDetails?.shopName,
    "Vendor",
  );
  const vendorPhone = textValue(vendor.phone || firstVendorProduct.vendorPhone);
  const vendorAddress = addressText(
    vendor.pickupAddress || vendor.address || firstVendorProduct.vendorAddress || {},
  );
  const quantity = products.reduce(
    (sum, item) => sum + Math.max(1, numberValue(item.quantity, 1)),
    0,
  );
  const orderStatus = firstVendorProduct.itemStatus || order.vendorOrderStatus || order.status;
  const parcelId = `AG-${shortId(orderId, 8)}-${shortId(vendorId, 6)}`;
  const financials = getVendorOrderFinancials({ ...order, products });
  const payment = getVendorOrderPaymentSummary(order, financials);

  return {
    orderId,
    vendorId,
    parcelId,
    trackingNumber,
    shopName,
    vendorPhone,
    vendorAddress,
    customerName: textValue(shipping.name, "Customer"),
    customerPhone: textValue(shipping.phone),
    customerAddress: addressText(shipping),
    paymentMethod: payment.methodLabel,
    paymentType: payment.type,
    paymentStatus: payment.status,
    paymentStatusLabel: payment.statusLabel,
    vendorSubtotal: financials.vendorSubtotal,
    deliveryCharge: financials.deliveryFee,
    discountAmount: financials.discount,
    payableAmount: payment.payableAmount,
    codAmount: payment.collectAmount,
    status: statusLabel(orderStatus),
    itemCount: products.length,
    quantity,
    isPartialOrder: Boolean(order.isPartialOrder),
    items: products.map((item) => ({
      title: itemTitle(item),
      variant: itemVariant(item),
      quantity: Math.max(1, numberValue(item.quantity, 1)),
    })),
  };
};

export const buildVendorParcelQrPayload = (label = {}) =>
  [
    "AGP2",
    `P=${textValue(label.parcelId)}`,
    `O=${textValue(label.orderId)}`,
    `V=${textValue(label.vendorId)}`,
    `T=${textValue(label.trackingNumber, "PENDING")}`,
    `PM=${textValue(label.paymentType, "UNKNOWN")}`,
    `PS=${normalizeStatus(label.paymentStatusLabel).toUpperCase()}`,
    `OS=${normalizeStatus(label.status).toUpperCase()}`,
    `A=${numberValue(label.payableAmount).toFixed(2)}`,
    `I=${Math.max(0, numberValue(label.itemCount))}`,
    `Q=${Math.max(0, numberValue(label.quantity))}`,
    "C=BDT",
  ].join("|");

const renderItems = (label) => {
  const visibleItems = label.items.slice(0, 4);
  const remaining = Math.max(0, label.items.length - visibleItems.length);
  return `
    <div class="items">
      ${visibleItems
        .map(
          (item) => `
            <div class="item-row">
              <span class="item-name">${escapeHtml(item.title)}${item.variant ? `<small>${escapeHtml(item.variant)}</small>` : ""}</span>
              <strong>x${item.quantity}</strong>
            </div>
          `,
        )
        .join("")}
      ${remaining > 0 ? `<div class="more-items">+${remaining} more item${remaining === 1 ? "" : "s"}</div>` : ""}
    </div>
  `;
};

export const renderVendorParcelLabelDocument = (labels = []) => {
  const pages = labels
    .map(
      ({ label, qrDataUrl }) => `
        <section class="label-page">
          <header class="label-header">
            <div>
              <div class="brand">AMIYO-GO PARCEL</div>
              <div class="parcel-id">${escapeHtml(label.parcelId)}</div>
            </div>
            <div class="status">${escapeHtml(label.status)}</div>
          </header>

          <div class="route-row">
            <div class="route-copy">
              <span class="section-label">DELIVER TO</span>
              <strong class="customer-name">${escapeHtml(label.customerName)}</strong>
              ${label.customerPhone ? `<span class="phone">${escapeHtml(label.customerPhone)}</span>` : ""}
              <span class="address">${escapeHtml(label.customerAddress || "Address unavailable")}</span>
            </div>
            <div class="qr-wrap">
              <img src="${escapeHtml(qrDataUrl)}" alt="Parcel QR code" />
              <span>Scan parcel + amount</span>
            </div>
          </div>

          <div class="meta-grid">
            <div><span>ORDER</span><strong>#${escapeHtml(shortId(label.orderId))}</strong></div>
            <div><span>PAYMENT</span><strong>${escapeHtml(label.paymentMethod)}</strong><small>${escapeHtml(label.paymentStatusLabel)}</small></div>
            <div><span>UNITS</span><strong>${label.quantity}</strong></div>
            <div><span>${label.codAmount > 0 ? "COLLECT" : "VENDOR TOTAL"}</span><strong>${escapeHtml(formatVendorOrderMoney(label.payableAmount))}</strong></div>
          </div>

          <div class="amount-breakdown">
            <div><span>ITEMS</span><strong>${escapeHtml(formatVendorOrderMoney(label.vendorSubtotal))}</strong></div>
            <div><span>DELIVERY</span><strong>${escapeHtml(formatVendorOrderMoney(label.deliveryCharge))}</strong></div>
            <div><span>DISCOUNT</span><strong>${numberValue(label.discountAmount) > 0 ? "-" : ""}${escapeHtml(formatVendorOrderMoney(label.discountAmount))}</strong></div>
            <div class="amount-total"><span>TOTAL</span><strong>${escapeHtml(formatVendorOrderMoney(label.payableAmount))}</strong></div>
          </div>

          <div class="contents">
            <span class="section-label">PACKAGE CONTENTS</span>
            ${renderItems(label)}
          </div>

          <div class="sender">
            <span class="section-label">PICKUP FROM</span>
            <strong>${escapeHtml(label.shopName)}</strong>
            ${label.vendorPhone ? `<span>${escapeHtml(label.vendorPhone)}</span>` : ""}
            ${label.vendorAddress ? `<span class="sender-address">${escapeHtml(label.vendorAddress)}</span>` : ""}
          </div>

          <footer>
            <span>${label.trackingNumber ? `Tracking: ${escapeHtml(label.trackingNumber)}` : "Tracking assigned at pickup"}</span>
            <strong>${label.isPartialOrder ? "VENDOR PARCEL" : "SINGLE PARCEL"}</strong>
          </footer>
        </section>
      `,
    )
    .join("");

  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Amiyo-Go parcel labels</title>
      <style>
        @page { size: 100mm 150mm; margin: 0; }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: #e5e7eb; color: #050505; font-family: Arial, Helvetica, sans-serif; }
        body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        .label-page { display: grid; width: 100mm; height: 150mm; grid-template-rows: 16mm 38mm 24mm 12mm 23mm 18mm 7mm; align-content: start; margin: 8mm auto; padding: 4mm; overflow: hidden; background: #fff; page-break-after: always; break-after: page; }
        .label-page:last-child { page-break-after: auto; break-after: auto; }
        .label-header { display: flex; min-width: 0; overflow: hidden; align-items: flex-start; justify-content: space-between; gap: 3mm; border-bottom: 1.2mm solid #050505; padding-bottom: 2.5mm; }
        .brand { font-size: 12pt; font-weight: 900; letter-spacing: 0; }
        .parcel-id { margin-top: 1mm; font-family: "Courier New", monospace; font-size: 10pt; font-weight: 700; overflow-wrap: anywhere; }
        .status { max-width: 34mm; border: .6mm solid #050505; padding: 1.2mm 2mm; font-size: 8pt; font-weight: 800; text-align: center; text-transform: uppercase; }
        .route-row { display: grid; grid-template-columns: minmax(0, 1fr) 30mm; gap: 3mm; overflow: hidden; border-bottom: .5mm solid #050505; padding: 3mm 0; }
        .route-copy { display: flex; min-width: 0; flex-direction: column; }
        .section-label { display: block; margin-bottom: 1mm; font-size: 6.5pt; font-weight: 900; }
        .customer-name { font-size: 13pt; line-height: 1.1; overflow-wrap: anywhere; }
        .phone { margin-top: 1mm; font-size: 10pt; font-weight: 800; }
        .address { margin-top: 1.5mm; font-size: 8.5pt; font-weight: 600; line-height: 1.25; overflow-wrap: anywhere; }
        .qr-wrap { display: flex; align-items: center; flex-direction: column; justify-content: flex-start; }
        .qr-wrap img { width: 26mm; height: 26mm; image-rendering: pixelated; }
        .qr-wrap span { max-width: 29mm; margin-top: .8mm; font-size: 5.7pt; font-weight: 800; line-height: 1.05; text-align: center; text-transform: uppercase; }
        .meta-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: 13mm 11mm; overflow: hidden; border-bottom: .5mm solid #050505; }
        .meta-grid div { min-height: 0; overflow: hidden; padding: 1.4mm 2mm; border-right: .35mm solid #050505; border-bottom: .35mm solid #050505; }
        .meta-grid div:nth-child(2n) { border-right: 0; }
        .meta-grid div:nth-last-child(-n+2) { border-bottom: 0; }
        .meta-grid span { display: block; font-size: 6pt; font-weight: 800; }
        .meta-grid strong { display: block; margin-top: .7mm; font-size: 8.5pt; line-height: 1.05; overflow-wrap: anywhere; }
        .meta-grid small { display: block; margin-top: .5mm; font-size: 5.7pt; font-weight: 700; line-height: 1; text-transform: uppercase; }
        .amount-breakdown { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); overflow: hidden; border-bottom: .5mm solid #050505; }
        .amount-breakdown div { min-width: 0; padding: 1.5mm 1mm; border-right: .35mm solid #050505; text-align: center; }
        .amount-breakdown div:last-child { border-right: 0; }
        .amount-breakdown span { display: block; font-size: 5.4pt; font-weight: 800; }
        .amount-breakdown strong { display: block; margin-top: .7mm; font-size: 7pt; overflow-wrap: anywhere; }
        .amount-breakdown .amount-total { color: #fff; background: #050505; }
        .contents { overflow: hidden; border-bottom: .5mm solid #050505; padding: 2.5mm 0; }
        .items { display: grid; gap: 1mm; }
        .item-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 2mm; font-size: 8pt; line-height: 1.15; }
        .item-name { min-width: 0; font-weight: 700; overflow-wrap: anywhere; }
        .item-name small { display: block; margin-top: .4mm; font-size: 6.5pt; font-weight: 500; }
        .item-row strong { flex: 0 0 auto; font-size: 8pt; }
        .more-items { font-size: 7pt; font-weight: 800; }
        .sender { display: grid; grid-template-columns: minmax(0, 1fr); align-content: start; overflow: hidden; padding: 2.5mm 0; font-size: 8pt; line-height: 1.2; }
        .sender strong { font-size: 9.5pt; overflow-wrap: anywhere; }
        .sender-address { margin-top: .7mm; font-size: 7pt; overflow-wrap: anywhere; }
        footer { display: flex; min-width: 0; overflow: hidden; align-items: center; justify-content: space-between; gap: 2mm; border-top: 1mm solid #050505; padding-top: 1.5mm; font-size: 6.5pt; }
        footer span { min-width: 0; overflow-wrap: anywhere; }
        footer strong { flex: 0 0 auto; }
        @media print {
          html, body { width: 100mm; background: #fff; }
          .label-page { margin: 0; }
        }
      </style>
    </head>
    <body>${pages}</body>
  </html>`;
};

export const generateVendorParcelLabels = async (orders = [], vendor = {}) => {
  const sourceOrders = Array.isArray(orders) ? orders : [orders];
  const labels = sourceOrders.filter(Boolean).map((order) => buildVendorParcelLabelModel(order, vendor));
  if (labels.length === 0) throw new Error("No vendor orders were provided for label printing");

  const qrModule = await import("qrcode");
  const toDataURL = qrModule.toDataURL || qrModule.default?.toDataURL;
  if (typeof toDataURL !== "function") throw new Error("QR code generator is unavailable");

  const printableLabels = await Promise.all(
    labels.map(async (label) => ({
      label,
      qrDataUrl: await toDataURL(buildVendorParcelQrPayload(label), {
        width: 256,
        margin: 1,
        errorCorrectionLevel: "M",
        color: { dark: "#000000", light: "#FFFFFF" },
      }),
    })),
  );

  return renderVendorParcelLabelDocument(printableLabels);
};

export const generateVendorParcelLabel = (order, vendor = {}) =>
  generateVendorParcelLabels([order], vendor);

export const writeVendorParcelLabelPrintDocument = (printWindow, html) => {
  if (!printWindow?.document) throw new Error("Parcel label print window is unavailable");

  let printRequested = false;
  const requestPrint = () => {
    if (printRequested || printWindow.closed) return;
    printRequested = true;
    window.setTimeout(() => {
      if (printWindow.closed) return;
      printWindow.focus();
      printWindow.print();
    }, 120);
  };

  printWindow.onload = requestPrint;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  if (printWindow.document.readyState === "complete") requestPrint();
};
