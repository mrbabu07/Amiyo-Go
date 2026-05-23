const DeliverySettings = require("../models/DeliverySettings");
const { calculateDeliveryBreakdown } = require("../utils/deliveryCalculator");

const editableFields = [
  "freeDeliveryThreshold",
  "standardDeliveryCharge",
  "expressDeliveryCharge",
  "expressDeliveryEnabled",
  "freeDeliveryEnabled",
  "deliveryAreas",
  "platformBaseLocation",
  "estimatedDeliveryDays",
  "zoneFees",
  "remoteAreaFee",
  "perishableFee",
  "heavyItemThresholdKg",
  "heavyItemFeePerKg",
  "codCharge",
];

const asPlainSettings = (settings = {}) =>
  typeof settings.toObject === "function" ? settings.toObject() : settings;

const loadAdminDeliveryControls = async (db) => {
  if (!db?.collection) return { deliveryFeeRules: [], deliveryZones: [] };

  const [deliveryFeeRules, deliveryZones] = await Promise.all([
    db.collection("delivery_fee_rules")
      .find({ status: { $ne: "inactive" } })
      .sort({ priority: 1, createdAt: -1 })
      .toArray(),
    db.collection("delivery_zones")
      .find({ status: { $ne: "inactive" } })
      .sort({ sortOrder: 1, name: 1 })
      .toArray(),
  ]);

  return { deliveryFeeRules, deliveryZones };
};

// Get delivery settings
exports.getDeliverySettings = async (req, res) => {
  try {
    const settings = await DeliverySettings.getSettings();
    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error("Error fetching delivery settings:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch delivery settings",
    });
  }
};

// Update delivery settings (Admin only)
exports.updateDeliverySettings = async (req, res) => {
  try {
    const settings = await DeliverySettings.getSettings();

    editableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        settings[field] = req.body[field];
      }
    });

    await settings.save();

    res.json({
      success: true,
      message: "Delivery settings updated successfully",
      data: settings,
    });
  } catch (error) {
    console.error("Error updating delivery settings:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update delivery settings",
    });
  }
};

// Calculate delivery charge for an order
exports.calculateDeliveryCharge = async (req, res) => {
  try {
    const { subtotal, area, products = [], shippingInfo = {}, deliveryMethod = "standard", paymentMethod = "" } = req.body;
    const settings = await DeliverySettings.getSettings();

    if (Array.isArray(products) && products.length > 0) {
      const Product = req.app.locals.models?.Product;
      const Vendor = req.app.locals.models?.Vendor;
      const hydratedItems = [];
      const vendorsById = {};

      for (const item of products) {
        const productId = item.productId || item._id;
        const product = Product && productId ? await Product.findById(productId) : null;
        const vendorId = product?.vendorId?.toString?.() || item.vendorId || null;

        if (Vendor && vendorId && !vendorsById[vendorId]) {
          vendorsById[vendorId] = await Vendor.findById(vendorId).catch(() => null);
        }

        hydratedItems.push({
          ...item,
          price: Number(item.price ?? product?.price ?? 0),
          quantity: Number(item.quantity || 1),
          vendorId,
          shopName: item.shopName || product?.shopName,
          weight: Number(product?.weight || item.weight || 0),
          isPerishable: Boolean(product?.isPerishable || item.isPerishable),
          deliveryClass: product?.deliveryClass || item.deliveryClass || "",
        });
      }

      const deliveryControls = await loadAdminDeliveryControls(req.app.locals.db || Product?.collection?.db);
      const delivery = calculateDeliveryBreakdown({
        items: hydratedItems,
        shippingInfo,
        vendorsById,
        settings: {
          ...asPlainSettings(settings),
          ...deliveryControls,
        },
        deliveryMethod,
        paymentMethod,
      });

      return res.json({
        success: true,
        data: {
          deliveryCharge: delivery.totalDeliveryFee,
          totalDeliveryFee: delivery.totalDeliveryFee,
          deliveryBreakdown: delivery.breakdown,
          isFree: delivery.isFree,
        },
      });
    }

    let deliveryCharge = settings.standardDeliveryCharge;

    // Check if free delivery applies
    if (
      settings.freeDeliveryEnabled &&
      subtotal >= settings.freeDeliveryThreshold
    ) {
      deliveryCharge = 0;
    }

    // Check for area-specific charges
    if (area && settings.deliveryAreas.length > 0) {
      const areaSettings = settings.deliveryAreas.find(
        (a) => a.name === area && a.enabled,
      );
      if (areaSettings) {
        deliveryCharge = areaSettings.charge;
      }
    }

    res.json({
      success: true,
      data: {
        deliveryCharge,
        isFree: deliveryCharge === 0,
        amountNeededForFreeDelivery:
          subtotal < settings.freeDeliveryThreshold
            ? settings.freeDeliveryThreshold - subtotal
            : 0,
      },
    });
  } catch (error) {
    console.error("Error calculating delivery charge:", error);
    res.status(500).json({
      success: false,
      error: "Failed to calculate delivery charge",
    });
  }
};
