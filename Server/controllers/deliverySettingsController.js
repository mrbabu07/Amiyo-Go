const DeliverySettings = require("../models/DeliverySettings");

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

    // Update fields
    if (req.body.freeDeliveryThreshold !== undefined) {
      settings.freeDeliveryThreshold = req.body.freeDeliveryThreshold;
    }
    if (req.body.standardDeliveryCharge !== undefined) {
      settings.standardDeliveryCharge = req.body.standardDeliveryCharge;
    }
    if (req.body.expressDeliveryCharge !== undefined) {
      settings.expressDeliveryCharge = req.body.expressDeliveryCharge;
    }
    if (req.body.expressDeliveryEnabled !== undefined) {
      settings.expressDeliveryEnabled = req.body.expressDeliveryEnabled;
    }
    if (req.body.freeDeliveryEnabled !== undefined) {
      settings.freeDeliveryEnabled = req.body.freeDeliveryEnabled;
    }
    if (req.body.deliveryAreas !== undefined) {
      settings.deliveryAreas = req.body.deliveryAreas;
    }
    if (req.body.estimatedDeliveryDays !== undefined) {
      settings.estimatedDeliveryDays = req.body.estimatedDeliveryDays;
    }

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
    const { subtotal, area } = req.body;
    const settings = await DeliverySettings.getSettings();

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
