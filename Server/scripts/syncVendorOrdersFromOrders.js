require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const { MongoClient, ObjectId, ServerApiVersion } = require("mongodb");

const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME || "BazarBD";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const normalizeId = (id) => (id ? id.toString() : null);
const round2 = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const getVendorFinancials = (order, vendorId, subtotal) => {
  const orderSubtotal = Number(order.subtotal || 0) || (order.products || []).reduce(
    (sum, product) => sum + Number(product.price || 0) * Number(product.quantity || 1),
    0,
  );
  const ratio = orderSubtotal > 0 ? subtotal / orderSubtotal : 0;
  const deliveryEntry = (order.deliveryBreakdown || []).find(
    (entry) => normalizeId(entry.vendorId || "platform") === vendorId,
  );
  const deliveryCharge = Number(
    deliveryEntry?.deliveryFee ?? deliveryEntry?.deliveryCharge ?? deliveryEntry?.shippingFee ?? 0,
  );
  const parentCouponDiscount = Number(order.couponDiscount || order.couponApplied?.discountAmount || 0);
  const couponScopeVendorId = normalizeId(order.couponApplied?.scopeVendorId || order.couponApplied?.vendorId);
  const couponDiscount = couponScopeVendorId
    ? couponScopeVendorId === vendorId ? parentCouponDiscount : 0
    : parentCouponDiscount * ratio;
  const parentTotalDiscount = Number(order.totalDiscount ?? order.discountAmount ?? order.discount ?? 0);
  const otherDiscount = Math.max(0, parentTotalDiscount - parentCouponDiscount) * ratio;
  const totalDiscount = couponDiscount + otherDiscount;

  return {
    deliveryCharge: round2(deliveryCharge),
    couponDiscount: round2(couponDiscount),
    totalDiscount: round2(totalDiscount),
    payableTotal: round2(Math.max(0, subtotal + deliveryCharge - totalDiscount)),
  };
};

const deriveVendorStatus = (products) => {
  const statuses = products.map((product) => product.itemStatus || "pending");
  if (statuses.length === 0) return "pending";
  if (statuses.every((status) => status === "delivered")) return "delivered";
  if (statuses.every((status) => status === "cancelled")) return "cancelled";
  if (statuses.some((status) => status === "delivered")) return "partially_delivered";
  if (statuses.some((status) => status === "shipped")) return "shipped";
  if (statuses.some((status) => status === "ready_to_ship")) return "ready_to_ship";
  if (statuses.some((status) => status === "packed" || status === "processing")) return "processing";
  return "pending";
};

async function syncVendorOrders() {
  if (!uri) throw new Error("MONGO_URI is missing");

  await client.connect();
  try {
    const db = client.db(dbName);
    const orders = await db.collection("orders").find({ products: { $exists: true, $ne: [] } }).toArray();
    let upserted = 0;
    let updated = 0;

    for (const order of orders) {
      const groups = (order.products || []).reduce((map, product) => {
        const vendorId = normalizeId(product.vendorId) || "platform";
        if (!map[vendorId]) map[vendorId] = [];
        map[vendorId].push(product);
        return map;
      }, {});

      for (const [vendorId, products] of Object.entries(groups)) {
        const subtotal = products.reduce(
          (sum, product) => sum + Number(product.price || 0) * Number(product.quantity || 0),
          0,
        );
        const status = deriveVendorStatus(products);
        const financials = getVendorFinancials(order, vendorId, subtotal);
        const deliveredAt = products
          .map((product) => product.deliveredAt)
          .filter(Boolean)
          .sort()
          .at(-1);

        const result = await db.collection("vendorOrders").updateOne(
          {
            parentOrderId: order._id.toString(),
            vendorId: vendorId === "platform" ? null : vendorId,
          },
          {
            $set: {
              products,
              status,
              subtotal: round2(subtotal),
              vendorSubtotal: round2(subtotal),
              couponDiscount: financials.couponDiscount,
              totalDiscount: financials.totalDiscount,
              deliveryCharge: financials.deliveryCharge,
              payableTotal: financials.payableTotal,
              totalAmount: financials.payableTotal,
              shippingInfo: order.shippingInfo || {},
              paymentMethod: order.paymentMethod || "",
              paymentStatus: order.paymentStatus || "",
              updatedAt: new Date(),
              ...(deliveredAt ? { deliveredAt: new Date(deliveredAt) } : {}),
            },
            $setOnInsert: {
              parentOrderId: order._id.toString(),
              vendorId: vendorId === "platform" ? null : vendorId,
              userId: order.userId || null,
              createdAt: order.createdAt || new Date(),
            },
          },
          { upsert: true },
        );

        await db.collection("shipments").updateMany(
          {
            orderId: order._id.toString(),
            vendorId,
            shipmentType: { $ne: "reverse" },
          },
          {
            $set: {
              codAmount: ["cod", "cash_on_delivery", "cash on delivery"].includes(
                String(order.paymentMethod || "").toLowerCase(),
              ) ? financials.payableTotal : 0,
              financialSnapshot: {
                vendorSubtotal: round2(subtotal),
                deliveryCharge: financials.deliveryCharge,
                discount: financials.totalDiscount,
                payableTotal: financials.payableTotal,
              },
              updatedAt: new Date(),
            },
          },
        );

        if (result.upsertedCount) upserted++;
        if (result.modifiedCount) updated++;
      }
    }

    console.log("Vendor order sync complete");
    console.log(`Parent orders scanned: ${orders.length}`);
    console.log(`Vendor orders upserted: ${upserted}`);
    console.log(`Vendor orders updated: ${updated}`);
  } finally {
    await client.close();
  }
}

syncVendorOrders().catch((error) => {
  console.error("Vendor order sync failed:", error);
  process.exitCode = 1;
});
