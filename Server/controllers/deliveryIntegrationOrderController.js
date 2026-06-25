const { ObjectId } = require("mongodb");

const READY_STATUS_ALIASES = [
  "ready_to_ship",
  "ready-to-ship",
  "readyToShip",
  "ready for shipping",
  "ready_for_shipping",
  "ready_for_delivery",
  "ready-to-deliver",
  "readyToDeliver",
  "vendor_ready",
  "seller_ready",
  "packed",
  "ready",
];

const normalizeText = (value = "") =>
  value
    .toString()
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const cleanOrderId = (value = "") =>
  value
    .toString()
    .trim()
    .replace(/^#+/, "");

const unique = (values = []) => [...new Set(values.filter(Boolean))];

const statusValuesFromQuery = (query = {}) => {
  const raw =
    query.status ||
    query.orderStatus ||
    query.order_status ||
    query.fulfillmentStatus ||
    query.fulfillment_status ||
    query.shippingStatus ||
    query.shipping_status ||
    query.deliveryStatus ||
    query.delivery_status;

  const values = raw
    ? raw
        .toString()
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : READY_STATUS_ALIASES;

  return unique([...values, ...values.map(normalizeText)]);
};

const safeLimit = (value) => Math.min(Math.max(Number(value || 50), 1), 100);

const asObjectId = (value) => {
  const id = cleanOrderId(value);
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
};

const orderLookupQuery = (orderId = "") => {
  const clean = cleanOrderId(orderId);
  const raw = orderId.toString().trim();
  const candidates = unique([clean, raw, clean ? `#${clean}` : ""]);
  const branches = [
    { orderNumber: { $in: candidates } },
    { invoiceNumber: { $in: candidates } },
    { trackingNumber: { $in: candidates } },
    { deliveryOrderId: { $in: candidates } },
    { deliveryCode: { $in: candidates } },
    { "courierAssignment.trackingNumber": { $in: candidates } },
  ];
  const objectId = asObjectId(clean);
  if (objectId) branches.push({ _id: objectId });

  return { $or: branches };
};

const readyOrderQuery = (query = {}) => {
  const statuses = statusValuesFromQuery(query);
  const branches = [
    { status: { $in: statuses } },
    { orderStatus: { $in: statuses } },
    { fulfillmentStatus: { $in: statuses } },
    { shippingStatus: { $in: statuses } },
    { deliveryStatus: { $in: statuses } },
  ];

  return { $or: branches };
};

const vendorIdsFromOrders = (orders = []) =>
  unique(
    orders.flatMap((order) =>
      (order.products || [])
        .map((product) => product.vendorId?.toString?.() || product.vendorId)
        .filter((id) => id && id !== "platform" && ObjectId.isValid(id)),
    ),
  );

const vendorOrderMap = async (db, orderIds = []) => {
  if (!orderIds.length) return new Map();

  const rows = await db
    .collection("vendorOrders")
    .find({ parentOrderId: { $in: orderIds } })
    .sort({ createdAt: -1 })
    .toArray();

  return rows.reduce((map, row) => {
    const key = row.parentOrderId?.toString?.() || row.parentOrderId;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
    return map;
  }, new Map());
};

const vendorMap = async (db, orders = []) => {
  const ids = vendorIdsFromOrders(orders);
  if (!ids.length) return new Map();

  const vendors = await db
    .collection("vendors")
    .find({ _id: { $in: ids.map((id) => new ObjectId(id)) } })
    .toArray();

  return new Map(vendors.map((vendor) => [vendor._id.toString(), vendor]));
};

const addressFromVendor = (vendor = {}) =>
  vendor.pickupAddress ||
  vendor.address ||
  vendor.businessAddress ||
  vendor.shopAddress ||
  vendor.storeAddress ||
  {};

const vendorName = (vendor = {}, fallback = "") =>
  vendor.shopName || vendor.businessName || vendor.storeName || vendor.name || fallback;

const enrichVendorOrder = (vendorOrder = {}, order = {}, vendors = new Map()) => {
  const vendorId = vendorOrder.vendorId?.toString?.() || vendorOrder.vendorId;
  const vendor = vendorId ? vendors.get(vendorId) || {} : {};
  const pickup = addressFromVendor(vendor);

  return {
    ...vendorOrder,
    vendorId,
    vendorName: vendorName(vendor, vendorOrder.vendorName),
    pickup: {
      name: vendorName(vendor, vendorOrder.vendorName),
      phone: vendor.phone || vendor.contactPhone || vendor.mobile || vendorOrder.vendorPhone,
      address:
        pickup.address ||
        pickup.details ||
        pickup.street ||
        vendorOrder.pickupAddress ||
        vendorOrder.vendorAddress ||
        "Pickup address pending",
      division: pickup.division,
      district: pickup.district || pickup.city,
      upazila: pickup.upazila || pickup.thana || pickup.area,
      union: pickup.union || pickup.area,
    },
    paymentType: order.paymentMethod || order.paymentType,
  };
};

const enrichOrder = (order = {}, vendorOrders = [], vendors = new Map()) => ({
  ...order,
  orderId: order.orderNumber || order._id?.toString?.() || order._id,
  orderNumber: order.orderNumber || order._id?.toString?.() || order._id,
  vendorOrders: vendorOrders.map((vendorOrder) => enrichVendorOrder(vendorOrder, order, vendors)),
});

const serializeOrderResponse = async (db, orders = []) => {
  const ids = orders.map((order) => order._id?.toString?.() || order._id).filter(Boolean);
  const [vendorOrdersByParent, vendors] = await Promise.all([
    vendorOrderMap(db, ids),
    vendorMap(db, orders),
  ]);

  return orders.map((order) => enrichOrder(order, vendorOrdersByParent.get(order._id.toString()) || [], vendors));
};

const listDeliveryIntegrationOrders = async (req, res) => {
  try {
    const Order = req.app.locals.models.Order;
    const db = req.app.locals.db || Order.collection.db;
    const limit = safeLimit(req.query.limit);
    const page = Math.max(Number(req.query.page || 1), 1);
    const skip = (page - 1) * limit;
    const query = readyOrderQuery(req.query);

    const [orders, total] = await Promise.all([
      Order.collection.find(query).sort({ updatedAt: -1, createdAt: -1 }).skip(skip).limit(limit).toArray(),
      Order.collection.countDocuments(query),
    ]);
    const enrichedOrders = await serializeOrderResponse(db, orders);

    res.json({
      success: true,
      provider: "amiyo_go",
      orders: enrichedOrders,
      data: enrichedOrders,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error("Error listing Amiyo Delivery integration orders:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to load delivery integration orders" });
  }
};

const getDeliveryIntegrationOrderById = async (req, res) => {
  try {
    const Order = req.app.locals.models.Order;
    const db = req.app.locals.db || Order.collection.db;
    const order = await Order.collection.findOne(orderLookupQuery(req.params.id));

    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    const [enriched] = await serializeOrderResponse(db, [order]);
    return res.json({
      success: true,
      provider: "amiyo_go",
      order: enriched,
      data: {
        order: enriched,
        vendorOrders: enriched.vendorOrders || [],
      },
    });
  } catch (error) {
    console.error("Error loading Amiyo Delivery integration order:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to load delivery integration order" });
  }
};

module.exports = {
  getDeliveryIntegrationOrderById,
  listDeliveryIntegrationOrders,
};
