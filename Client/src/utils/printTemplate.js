// Minimized Professional E-commerce Invoice Template (One Page)
// Using Tailwind CSS for styling

export const generateProfessionalInvoice = (order) => {
  const orderDate = new Date(order.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const subtotal = order.subtotal || order.total || 0;
  const deliveryCharge = order.deliveryCharge || 0;
  const tax = order.tax || 0;
  const total = order.total || 0;

  // Fixed to BDT only - no currency conversion
  const BDT_RATE = 110; // 1 USD = 110 BDT
  const BDT_SYMBOL = "৳";

  // Format price in BDT (prices stored in USD in database)
  const formatPrice = (priceInUSD) => {
    if (!priceInUSD && priceInUSD !== 0) return `${BDT_SYMBOL}0`;
    const priceInBDT = priceInUSD * BDT_RATE;
    // Format with comma separators for BDT (no decimals)
    return `${BDT_SYMBOL}${Math.round(priceInBDT).toLocaleString()}`;
  };

  // Utility function to safely render color
  const renderColor = (color) => {
    if (!color) return null;
    if (typeof color === "string") return color;
    if (typeof color === "object" && color.name) return color.name;
    return "Unknown";
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice #${order._id.slice(-8).toUpperCase()}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        @media print {
          body { margin: 0; padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body class="bg-gray-50 p-4">
      <div class="max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
        
        <!-- Header -->
        <div class="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-6">
          <div class="flex justify-between items-start">
            <div>
              <h1 class="text-3xl font-bold mb-1">HnilaBazar</h1>
              <p class="text-blue-100 text-sm">Your Trusted E-commerce Partner</p>
            </div>
            <div class="text-right">
              <div class="text-xs text-blue-200 mb-1">INVOICE</div>
              <div class="text-2xl font-bold">#${order._id.slice(-8).toUpperCase()}</div>
              <div class="text-xs text-blue-100 mt-2">${orderDate}</div>
            </div>
          </div>
        </div>

        <div class="px-8 py-6">
          <!-- Addresses & Status Row -->
          <div class="grid grid-cols-3 gap-4 mb-6">
            <!-- Bill To -->
            <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div class="text-xs font-bold text-gray-600 mb-2 uppercase">Bill To</div>
              ${
                order.shippingInfo
                  ? `
                <div class="text-sm space-y-1">
                  <div class="font-semibold text-gray-900">${order.shippingInfo.name || "N/A"}</div>
                  <div class="text-gray-600">${order.shippingInfo.phone || "N/A"}</div>
                  <div class="text-gray-600 text-xs">${order.shippingInfo.email || "N/A"}</div>
                </div>
              `
                  : `<div class="text-xs text-gray-500">No information</div>`
              }
            </div>

            <!-- Ship To -->
            <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div class="text-xs font-bold text-gray-600 mb-2 uppercase">Ship To</div>
              ${
                order.shippingInfo
                  ? `
                <div class="text-sm space-y-1">
                  <div class="font-semibold text-gray-900">${order.shippingInfo.name || "N/A"}</div>
                  <div class="text-gray-600 text-xs">${order.shippingInfo.address || "N/A"}</div>
                  <div class="text-gray-600 text-xs">${order.shippingInfo.city || "N/A"} ${order.shippingInfo.zipCode || ""}</div>
                </div>
              `
                  : `<div class="text-xs text-gray-500">No information</div>`
              }
            </div>

            <!-- Order Info -->
            <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div class="text-xs font-bold text-gray-600 mb-2 uppercase">Order Info</div>
              <div class="text-sm space-y-1">
                <div class="flex justify-between">
                  <span class="text-gray-600 text-xs">Status:</span>
                  <span class="px-2 py-0.5 rounded text-xs font-semibold ${
                    order.status === "delivered"
                      ? "bg-green-100 text-green-800"
                      : order.status === "shipped"
                        ? "bg-purple-100 text-purple-800"
                        : order.status === "processing"
                          ? "bg-blue-100 text-blue-800"
                          : order.status === "cancelled"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                  }">${order.status.toUpperCase()}</span>
                </div>
                <div class="flex justify-between text-xs">
                  <span class="text-gray-600">Payment:</span>
                  <span class="font-semibold text-gray-900">${order.paymentMethod ? order.paymentMethod.toUpperCase() : "N/A"}</span>
                </div>
                ${
                  order.transactionId
                    ? `
                <div class="flex justify-between text-xs mt-2 pt-2 border-t border-gray-200">
                  <span class="text-gray-600">Transaction ID:</span>
                  <span class="font-mono font-bold text-green-700">${order.transactionId}</span>
                </div>
                `
                    : ""
                }
              </div>
            </div>
          </div>

          <!-- Products Table -->
          <div class="mb-6">
            <div class="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Order Items</div>
            <div class="border border-gray-200 rounded-lg overflow-hidden">
              <table class="w-full text-sm">
                <thead class="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th class="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase">Product</th>
                    <th class="text-center py-2 px-3 text-xs font-semibold text-gray-600 uppercase w-16">Qty</th>
                    <th class="text-right py-2 px-3 text-xs font-semibold text-gray-600 uppercase w-24">Price</th>
                    <th class="text-right py-2 px-3 text-xs font-semibold text-gray-600 uppercase w-24">Total</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  ${
                    order.products && order.products.length > 0
                      ? order.products
                          .map(
                            (item) => `
                    <tr class="hover:bg-gray-50">
                      <td class="py-3 px-3">
                        <div class="flex items-center gap-3">
                          ${
                            item.image
                              ? `<img src="${item.image}" alt="${item.title}" class="w-12 h-12 object-cover rounded border border-gray-200" />`
                              : '<div class="w-12 h-12 bg-gray-100 rounded border border-gray-200 flex items-center justify-center text-xs text-gray-400">No img</div>'
                          }
                          <div class="flex-1">
                            <div class="font-medium text-gray-900 text-sm">${item.title || "Product"}</div>
                            <div class="flex gap-1 mt-1">
                              ${item.selectedSize ? `<span class="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">Size: ${item.selectedSize}</span>` : ""}
                              ${item.selectedColor ? `<span class="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">Color: ${renderColor(item.selectedColor)}</span>` : ""}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td class="py-3 px-3 text-center font-semibold text-gray-900">${item.quantity || 1}</td>
                      <td class="py-3 px-3 text-right text-gray-900">${formatPrice(item.price || 0)}</td>
                      <td class="py-3 px-3 text-right font-semibold text-gray-900">${formatPrice((item.price || 0) * (item.quantity || 1))}</td>
                    </tr>
                  `,
                          )
                          .join("")
                      : `
                    <tr>
                      <td colspan="4" class="py-8 text-center text-gray-500 text-sm">No items in this order</td>
                    </tr>
                  `
                  }
                </tbody>
              </table>
            </div>
          </div>

          <!-- Summary and Additional Info -->
          <div class="grid grid-cols-3 gap-6">
            <!-- Payment Details -->
            <div>
              <div class="text-xs font-bold text-gray-600 mb-2 uppercase">Payment Details</div>
              <div class="text-sm space-y-1.5">
                <div class="flex justify-between text-xs">
                  <span class="text-gray-600">Method:</span>
                  <span class="font-semibold text-gray-900">${order.paymentMethod ? order.paymentMethod.toUpperCase() : "N/A"}</span>
                </div>
                <div class="flex justify-between text-xs">
                  <span class="text-gray-600">Status:</span>
                  <span class="font-semibold text-green-600">PAID</span>
                </div>
                <div class="flex justify-between text-xs">
                  <span class="text-gray-600">Transaction:</span>
                  <span class="font-mono text-xs text-gray-900">${order._id.slice(-8)}</span>
                </div>
              </div>
            </div>

            <!-- Company Info -->
            <div>
              <div class="text-xs font-bold text-gray-600 mb-2 uppercase">Contact Us</div>
              <div class="text-xs text-gray-600 space-y-1">
                <div>📞 +880 1521-721946</div>
                <div>📧 mdjahedulislamjaved@gmail.com</div>
                <div>🌐 www.hnilabazar.com</div>
                <div class="text-gray-500">Dhaka, Bangladesh</div>
              </div>
            </div>

            <!-- Order Summary -->
            <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div class="text-xs font-bold text-gray-600 mb-3 uppercase">Summary</div>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-600">Subtotal:</span>
                  <span class="text-gray-900 font-medium">${formatPrice(subtotal)}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Shipping:</span>
                  <span class="${deliveryCharge === 0 ? "text-green-600 font-semibold" : "text-gray-900 font-medium"}">${deliveryCharge > 0 ? formatPrice(deliveryCharge) : "FREE"}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Tax:</span>
                  <span class="text-gray-900 font-medium">${formatPrice(tax)}</span>
                </div>
                <div class="border-t border-gray-300 pt-2 flex justify-between text-base">
                  <span class="font-bold text-gray-900">Total:</span>
                  <span class="font-bold text-blue-600">${formatPrice(total)}</span>
                </div>
              </div>
            </div>
          </div>

          ${
            order.specialInstructions
              ? `
            <!-- Special Instructions -->
            <div class="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div class="text-xs font-bold text-yellow-800 mb-1 uppercase">Special Instructions</div>
              <div class="text-sm text-yellow-900">${order.specialInstructions}</div>
            </div>
          `
              : ""
          }
        </div>

        <!-- Footer -->
        <div class="bg-gray-50 px-8 py-4 border-t border-gray-200">
          <div class="text-center text-xs text-gray-500">
            <div class="mb-1">This is a computer-generated invoice. No signature required.</div>
            <div>Thank you for shopping with HnilaBazar!</div>
            <div class="mt-2 text-gray-400">Generated: ${new Date().toLocaleString()} | Invoice #${order._id.slice(-8).toUpperCase()}</div>
          </div>
        </div>

      </div>

      <!-- Print Button (No Print) -->
      <div class="max-w-4xl mx-auto mt-4 text-center no-print">
        <button onclick="window.print()" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-semibold transition-colors">
          Print Invoice
        </button>
      </div>
    </body>
    </html>
  `;
};
