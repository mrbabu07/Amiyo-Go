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

const deriveVendorStatus = (products) => {
  const statuses = products.map((product) => product.itemStatus || "pending");
  if (statuses.length === 0) return "pending";
  if (statuses.every((status) => status === "delivered")) return "delivered";
  if (statuses.every((status) => status === "cancelled")) return "cancelled";
  if (statuses.some((status) => status === "delivered")) return "partially_delivered";
  if (statuses.some((status) => status === "shipped")) return "shipped";
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
              subtotal: Math.round(subtotal * 100) / 100,
              totalAmount: Math.round(subtotal * 100) / 100,
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
