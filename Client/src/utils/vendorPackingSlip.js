// Vendor Packing Slip Template - Daraz Style (One Page)
// Compact, professional layout for easy printing

export const generateVendorPackingSlip = (order, vendorInfo = {}) => {
  const orderDate = new Date(order.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const BDT_SYMBOL = "৳";

  // Format price in BDT
  const formatPrice = (price) => {
    if (!price && price !== 0) return `${BDT_SYMBOL}0`;
    return `${BDT_SYMBOL}${Math.round(price).toLocaleString()}`;
  };

  // Utility function to safely render color
  const renderColor = (color) => {
    if (!color) return '';
    if (typeof color === "string") return color;
    if (typeof color === "object" && color.name) return color.name;
    return "";
  };

  // Get vendor's products only
  const vendorProducts = order.products || [];
  const totalItems = vendorProducts.reduce((sum, p) => sum + (p.quantity || 0), 0);
  const subtotal = vendorProducts.reduce((sum, p) => sum + ((p.price || 0) * (p.quantity || 0)), 0);

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Packing Slip - #${order._id.slice(-8).toUpperCase()}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: Arial, sans-serif; 
          font-size: 11px;
          line-height: 1.3;
          color: #000;
          background: #fff;
        }
        .container { 
          max-width: 210mm; 
          margin: 0 auto; 
          padding: 10mm;
        }
        @media print {
          body { margin: 0; padding: 0; }
          .container { padding: 5mm; }
          .no-print { display: none !important; }
          @page { margin: 0; size: A4 portrait; }
        }
        .header { 
          border-bottom: 3px solid #f57224; 
          padding-bottom: 8px; 
          margin-bottom: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .header h1 { 
          font-size: 20px; 
          font-weight: bold; 
          color: #f57224;
          margin: 0;
        }
        .order-id { 
          font-size: 16px; 
          font-weight: bold; 
          color: #333;
        }
        .section { 
          margin-bottom: 10px; 
          padding: 8px;
          border: 1px solid #ddd;
        }
        .section-title { 
          font-size: 10px; 
          font-weight: bold; 
          color: #666; 
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .grid-2 { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 10px;
        }
        .grid-3 { 
          display: grid; 
          grid-template-columns: 1fr 1fr 1fr; 
          gap: 8px;
          text-align: center;
        }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin: 8px 0;
        }
        th { 
          background: #f5f5f5; 
          padding: 6px 4px; 
          text-align: left; 
          font-size: 10px;
          font-weight: bold;
          border: 1px solid #ddd;
        }
        td { 
          padding: 6px 4px; 
          border: 1px solid #ddd;
          font-size: 10px;
        }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-bold { font-weight: bold; }
        .text-orange { color: #f57224; }
        .bg-gray { background: #f9f9f9; }
        .status-badge {
          display: inline-block;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 9px;
          font-weight: bold;
        }
        .status-pending { background: #fef3c7; color: #92400e; }
        .status-processing { background: #dbeafe; color: #1e40af; }
        .status-packed { background: #e9d5ff; color: #6b21a8; }
        .status-shipped { background: #bfdbfe; color: #1e3a8a; }
        .status-delivered { background: #d1fae5; color: #065f46; }
        .tracking-box {
          border: 2px dashed #999;
          padding: 12px;
          text-align: center;
          font-family: 'Courier New', monospace;
          font-size: 16px;
          font-weight: bold;
          letter-spacing: 2px;
          background: #fafafa;
        }
        .info-row { 
          display: flex; 
          justify-content: space-between; 
          margin: 3px 0;
        }
        .checklist { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 4px;
          font-size: 9px;
        }
        .checkbox { 
          display: flex; 
          align-items: center; 
          gap: 4px;
        }
        .checkbox input { 
          width: 12px; 
          height: 12px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        
        <!-- Header -->
        <div class="header">
          <div>
            <h1>PACKING SLIP</h1>
            <div style="font-size: 9px; color: #666; margin-top: 2px;">${orderDate}</div>
          </div>
          <div class="order-id">Order #${order._id.slice(-8).toUpperCase()}</div>
        </div>

        <!-- Quick Info Bar -->
        <div class="grid-3 bg-gray" style="padding: 8px; margin-bottom: 10px; border: 1px solid #ddd;">
          <div>
            <div style="font-size: 9px; color: #666;">ITEMS</div>
            <div class="font-bold" style="font-size: 16px;">${totalItems}</div>
          </div>
          <div>
            <div style="font-size: 9px; color: #666;">PRODUCTS</div>
            <div class="font-bold" style="font-size: 16px;">${vendorProducts.length}</div>
          </div>
          <div>
            <div style="font-size: 9px; color: #666;">PAYMENT</div>
            <div class="font-bold" style="font-size: 12px;">${order.paymentMethod?.toUpperCase() || 'COD'}</div>
          </div>
        </div>

        <!-- Shipping & Tracking -->
        <div class="grid-2">
          <div class="section">
            <div class="section-title">Ship To</div>
            ${order.shippingInfo ? `
              <div class="font-bold" style="font-size: 12px; margin-bottom: 3px;">${order.shippingInfo.name || "N/A"}</div>
              <div style="margin-bottom: 2px;">${order.shippingInfo.address || "N/A"}</div>
              <div style="margin-bottom: 2px;">${order.shippingInfo.city || "N/A"} ${order.shippingInfo.zipCode || ""}</div>
              <div class="font-bold" style="margin-top: 4px;">📞 ${order.shippingInfo.phone || "N/A"}</div>
            ` : `<div>No shipping information</div>`}
          </div>
          <div class="section">
            <div class="section-title">Tracking Number</div>
            <div class="tracking-box">
              ${vendorProducts[0]?.trackingNumber || '_______________'}
            </div>
          </div>
        </div>

        ${vendorInfo.businessName ? `
        <div class="section" style="background: #fff8f0; border-color: #f57224;">
          <div class="section-title">Vendor</div>
          <div class="font-bold">${vendorInfo.businessName}</div>
          ${vendorInfo.phone ? `<div style="font-size: 10px; margin-top: 2px;">${vendorInfo.phone}</div>` : ''}
        </div>
        ` : ''}

        <!-- Products Table -->
        <div style="margin: 10px 0;">
          <div class="section-title" style="margin-bottom: 6px;">Items to Pack</div>
          <table>
            <thead>
              <tr>
                <th style="width: 30px;">#</th>
                <th>Product Details</th>
                <th style="width: 50px;" class="text-center">Qty</th>
                <th style="width: 70px;" class="text-center">Status</th>
                <th style="width: 80px;" class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${vendorProducts.map((product, index) => `
                <tr>
                  <td class="text-center font-bold">${index + 1}</td>
                  <td>
                    <div class="font-bold">${product.title || product.name || "Unknown"}</div>
                    ${product.selectedColor ? `<div style="font-size: 9px; color: #666;">Color: ${renderColor(product.selectedColor)}</div>` : ""}
                    ${product.selectedSize ? `<div style="font-size: 9px; color: #666;">Size: ${product.selectedSize}</div>` : ""}
                  </td>
                  <td class="text-center font-bold" style="font-size: 14px;">${product.quantity || 0}</td>
                  <td class="text-center">
                    <span class="status-badge status-${product.itemStatus || 'pending'}">
                      ${(product.itemStatus || 'pending').toUpperCase()}
                    </span>
                  </td>
                  <td class="text-right font-bold">${formatPrice((product.price || 0) * (product.quantity || 0))}</td>
                </tr>
              `).join("")}
              <tr class="bg-gray">
                <td colspan="4" class="text-right font-bold">TOTAL:</td>
                <td class="text-right font-bold text-orange" style="font-size: 13px;">${formatPrice(subtotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Packing Checklist -->
        <div class="section">
          <div class="section-title" style="margin-bottom: 6px;">Packing Checklist</div>
          <div class="checklist">
            <div class="checkbox"><input type="checkbox"> Items verified</div>
            <div class="checkbox"><input type="checkbox"> Properly packaged</div>
            <div class="checkbox"><input type="checkbox"> Label attached</div>
            <div class="checkbox"><input type="checkbox"> Tracking recorded</div>
          </div>
        </div>

        <!-- Signature -->
        <div class="grid-2" style="margin-top: 10px;">
          <div>
            <div style="font-size: 9px; color: #666; margin-bottom: 3px;">PACKED BY</div>
            <div style="border-bottom: 1px solid #999; height: 30px;"></div>
          </div>
          <div>
            <div style="font-size: 9px; color: #666; margin-bottom: 3px;">DATE</div>
            <div style="border-bottom: 1px solid #999; height: 30px;"></div>
          </div>
        </div>

        <!-- Print Button -->
        <div class="no-print" style="text-align: center; margin-top: 15px;">
          <button onclick="window.print()" style="background: #f57224; color: white; border: none; padding: 12px 30px; border-radius: 6px; font-size: 13px; font-weight: bold; cursor: pointer;">
            🖨️ Print Packing Slip
          </button>
        </div>

      </div>
    </body>
    </html>
  `;
};
