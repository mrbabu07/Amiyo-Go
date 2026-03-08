// Vendor Packing Slip Template
// Shows only vendor's items for packing and shipping

export const generateVendorPackingSlip = (order, vendorInfo = {}) => {
  const orderDate = new Date(order.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const BDT_SYMBOL = "৳";

  // Format price in BDT (prices are already in BDT)
  const formatPrice = (price) => {
    if (!price && price !== 0) return `${BDT_SYMBOL}0`;
    return `${BDT_SYMBOL}${Math.round(price).toLocaleString()}`;
  };

  // Utility function to safely render color
  const renderColor = (color) => {
    if (!color) return '';
    if (typeof color === "string") return color;
    if (typeof color === "object" && color.name) return color.name;
    return "Unknown";
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
      <title>Packing Slip - Order #${order._id.slice(-8).toUpperCase()}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        @media print {
          body { margin: 0; padding: 0; }
          .no-print { display: none; }
        }
        .barcode-box {
          border: 2px dashed #666;
          padding: 20px;
          text-align: center;
          font-family: 'Courier New', monospace;
          font-size: 24px;
          font-weight: bold;
          letter-spacing: 3px;
        }
      </style>
    </head>
    <body class="bg-white p-4">
      <div class="max-w-4xl mx-auto">
        
        <!-- Header -->
        <div class="border-b-4 border-orange-500 pb-4 mb-6">
          <div class="flex justify-between items-start">
            <div>
              <h1 class="text-3xl font-bold text-gray-800">PACKING SLIP</h1>
              <p class="text-sm text-gray-600 mt-1">For Vendor Fulfillment</p>
            </div>
            <div class="text-right">
              <div class="text-xs text-gray-500 mb-1">ORDER ID</div>
              <div class="text-2xl font-bold text-orange-600">#${order._id.slice(-8).toUpperCase()}</div>
              <div class="text-xs text-gray-600 mt-2">${orderDate}</div>
            </div>
          </div>
        </div>

        <!-- Vendor Info -->
        ${vendorInfo.businessName ? `
        <div class="bg-orange-50 border-l-4 border-orange-500 p-4 mb-6">
          <div class="text-xs font-bold text-gray-600 mb-1">VENDOR</div>
          <div class="font-semibold text-gray-900">${vendorInfo.businessName}</div>
          ${vendorInfo.phone ? `<div class="text-sm text-gray-600">${vendorInfo.phone}</div>` : ''}
        </div>
        ` : ''}

        <!-- Ship To Address -->
        <div class="grid grid-cols-2 gap-6 mb-6">
          <div class="border-2 border-gray-300 p-4 rounded-lg">
            <div class="text-xs font-bold text-gray-600 mb-3 uppercase">Ship To</div>
            ${
              order.shippingInfo
                ? `
              <div class="space-y-2">
                <div class="font-bold text-lg text-gray-900">${order.shippingInfo.name || "N/A"}</div>
                <div class="text-gray-700">${order.shippingInfo.address || "N/A"}</div>
                <div class="text-gray-700">${order.shippingInfo.city || "N/A"} ${order.shippingInfo.zipCode || ""}</div>
                <div class="text-gray-700 font-semibold mt-3">📞 ${order.shippingInfo.phone || "N/A"}</div>
              </div>
            `
                : `<div class="text-sm text-gray-500">No shipping information</div>`
            }
          </div>

          <!-- Tracking Number Box -->
          <div class="border-2 border-gray-300 p-4 rounded-lg">
            <div class="text-xs font-bold text-gray-600 mb-3 uppercase">Tracking Number</div>
            <div class="barcode-box">
              ${vendorProducts[0]?.trackingNumber || '___________________'}
            </div>
            <div class="text-xs text-gray-500 text-center mt-2">
              ${vendorProducts[0]?.trackingNumber ? 'Scan or enter tracking number' : 'Write tracking number above'}
            </div>
          </div>
        </div>

        <!-- Order Summary -->
        <div class="bg-gray-50 border border-gray-300 p-4 rounded-lg mb-6">
          <div class="grid grid-cols-3 gap-4 text-center">
            <div>
              <div class="text-xs text-gray-600 mb-1">TOTAL ITEMS</div>
              <div class="text-2xl font-bold text-gray-900">${totalItems}</div>
            </div>
            <div>
              <div class="text-xs text-gray-600 mb-1">PRODUCTS</div>
              <div class="text-2xl font-bold text-gray-900">${vendorProducts.length}</div>
            </div>
            <div>
              <div class="text-xs text-gray-600 mb-1">PAYMENT</div>
              <div class="text-lg font-semibold text-gray-900">${order.paymentMethod?.toUpperCase() || 'N/A'}</div>
            </div>
          </div>
        </div>

        <!-- Products Table -->
        <div class="mb-6">
          <div class="text-lg font-bold text-gray-800 mb-3 border-b-2 border-gray-300 pb-2">
            Items to Pack
          </div>
          <table class="w-full border-collapse">
            <thead>
              <tr class="bg-gray-200">
                <th class="border border-gray-300 px-3 py-2 text-left text-xs font-bold">#</th>
                <th class="border border-gray-300 px-3 py-2 text-left text-xs font-bold">PRODUCT</th>
                <th class="border border-gray-300 px-3 py-2 text-center text-xs font-bold">QTY</th>
                <th class="border border-gray-300 px-3 py-2 text-center text-xs font-bold">STATUS</th>
                <th class="border border-gray-300 px-3 py-2 text-right text-xs font-bold">PRICE</th>
              </tr>
            </thead>
            <tbody>
              ${vendorProducts
                .map(
                  (product, index) => `
                <tr>
                  <td class="border border-gray-300 px-3 py-3 text-center font-bold">${index + 1}</td>
                  <td class="border border-gray-300 px-3 py-3">
                    <div class="font-semibold text-gray-900">${product.title || product.name || "Unknown Product"}</div>
                    ${product.selectedColor ? `<div class="text-xs text-gray-600">Color: ${renderColor(product.selectedColor)}</div>` : ""}
                    ${product.selectedSize ? `<div class="text-xs text-gray-600">Size: ${product.selectedSize}</div>` : ""}
                    ${product.productId ? `<div class="text-xs text-gray-500 mt-1">SKU: ${product.productId.toString().slice(-8).toUpperCase()}</div>` : ""}
                  </td>
                  <td class="border border-gray-300 px-3 py-3 text-center">
                    <div class="text-2xl font-bold text-orange-600">${product.quantity || 0}</div>
                  </td>
                  <td class="border border-gray-300 px-3 py-3 text-center">
                    <span class="inline-block px-2 py-1 text-xs font-semibold rounded ${
                      product.itemStatus === 'delivered' ? 'bg-green-100 text-green-800' :
                      product.itemStatus === 'shipped' ? 'bg-blue-100 text-blue-800' :
                      product.itemStatus === 'packed' ? 'bg-purple-100 text-purple-800' :
                      product.itemStatus === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }">
                      ${(product.itemStatus || 'pending').toUpperCase()}
                    </span>
                  </td>
                  <td class="border border-gray-300 px-3 py-3 text-right font-semibold">
                    ${formatPrice((product.price || 0) * (product.quantity || 0))}
                  </td>
                </tr>
              `
                )
                .join("")}
              <tr class="bg-gray-100">
                <td colspan="4" class="border border-gray-300 px-3 py-3 text-right font-bold">SUBTOTAL:</td>
                <td class="border border-gray-300 px-3 py-3 text-right font-bold text-lg text-orange-600">
                  ${formatPrice(subtotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Packing Checklist -->
        <div class="border-2 border-gray-300 p-4 rounded-lg mb-6">
          <div class="text-sm font-bold text-gray-800 mb-3">PACKING CHECKLIST</div>
          <div class="space-y-2">
            <div class="flex items-center">
              <input type="checkbox" class="mr-3 w-5 h-5" />
              <span class="text-sm">All items verified and counted</span>
            </div>
            <div class="flex items-center">
              <input type="checkbox" class="mr-3 w-5 h-5" />
              <span class="text-sm">Items properly packaged and protected</span>
            </div>
            <div class="flex items-center">
              <input type="checkbox" class="mr-3 w-5 h-5" />
              <span class="text-sm">Shipping label attached</span>
            </div>
            <div class="flex items-center">
              <input type="checkbox" class="mr-3 w-5 h-5" />
              <span class="text-sm">Tracking number recorded</span>
            </div>
            <div class="flex items-center">
              <input type="checkbox" class="mr-3 w-5 h-5" />
              <span class="text-sm">Packing slip included in package</span>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="border-t-2 border-gray-300 pt-4 mt-6">
          <div class="grid grid-cols-2 gap-6">
            <div>
              <div class="text-xs text-gray-600 mb-2">PACKED BY</div>
              <div class="border-b-2 border-gray-400 pb-1 mb-2" style="min-height: 30px;"></div>
              <div class="text-xs text-gray-500">Signature</div>
            </div>
            <div>
              <div class="text-xs text-gray-600 mb-2">DATE PACKED</div>
              <div class="border-b-2 border-gray-400 pb-1 mb-2" style="min-height: 30px;"></div>
              <div class="text-xs text-gray-500">Date</div>
            </div>
          </div>
        </div>

        <!-- Print Button -->
        <div class="no-print mt-6 text-center">
          <button 
            onclick="window.print()" 
            class="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg"
          >
            🖨️ Print Packing Slip
          </button>
        </div>

      </div>
    </body>
    </html>
  `;
};
