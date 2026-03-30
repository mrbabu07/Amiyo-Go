const { ObjectId } = require("mongodb");

/**
 * Create a new store location (Vendor only)
 */
exports.createStoreLocation = async (req, res) => {
  try {
    const StoreLocation = req.app.locals.models.StoreLocation;
    const vendorId = req.user.vendorId;

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        error: "Vendor access required",
      });
    }

    const locationData = {
      ...req.body,
      vendorId,
    };

    const location = await StoreLocation.create(locationData);

    res.status(201).json({
      success: true,
      message: "Store location created successfully",
      data: location,
    });
  } catch (error) {
    console.error("Error creating store location:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create store location",
    });
  }
};

/**
 * Get all locations for current vendor
 */
exports.getMyStoreLocations = async (req, res) => {
  try {
    const StoreLocation = req.app.locals.models.StoreLocation;
    const vendorId = req.user.vendorId;

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        error: "Vendor access required",
      });
    }

    const locations = await StoreLocation.findByVendorId(vendorId);

    res.json({
      success: true,
      data: locations,
    });
  } catch (error) {
    console.error("Error fetching store locations:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch store locations",
    });
  }
};

/**
 * Get locations for a specific vendor (Public)
 */
exports.getVendorLocations = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const StoreLocation = req.app.locals.models.StoreLocation;

    const locations = await StoreLocation.findByVendorId(vendorId);

    res.json({
      success: true,
      data: locations,
    });
  } catch (error) {
    console.error("Error fetching vendor locations:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch vendor locations",
    });
  }
};

/**
 * Find stores near a location (Public)
 */
exports.findNearbyStores = async (req, res) => {
  try {
    const { longitude, latitude, maxDistance = 50 } = req.query;
    const StoreLocation = req.app.locals.models.StoreLocation;

    if (!longitude || !latitude) {
      return res.status(400).json({
        success: false,
        error: "Longitude and latitude are required",
      });
    }

    const stores = await StoreLocation.findNearby(
      parseFloat(longitude),
      parseFloat(latitude),
      parseFloat(maxDistance)
    );

    // Calculate distance and delivery estimate for each store
    const storesWithDetails = stores.map(store => {
      const distance = StoreLocation.calculateDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        store.location.coordinates[1],
        store.location.coordinates[0]
      );

      const deliveryEstimate = StoreLocation.getDeliveryEstimate(distance, store);

      return {
        ...store,
        distance: Math.round(distance * 10) / 10, // Round to 1 decimal
        deliveryEstimate,
      };
    });

    // Sort by distance
    storesWithDetails.sort((a, b) => a.distance - b.distance);

    res.json({
      success: true,
      data: storesWithDetails,
      count: storesWithDetails.length,
    });
  } catch (error) {
    console.error("Error finding nearby stores:", error);
    res.status(500).json({
      success: false,
      error: "Failed to find nearby stores",
    });
  }
};

/**
 * Calculate delivery estimate
 */
exports.calculateDeliveryEstimate = async (req, res) => {
  try {
    const { storeId, latitude, longitude } = req.query;
    const StoreLocation = req.app.locals.models.StoreLocation;

    if (!storeId || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: "Store ID, latitude, and longitude are required",
      });
    }

    const store = await StoreLocation.findById(storeId);

    if (!store) {
      return res.status(404).json({
        success: false,
        error: "Store not found",
      });
    }

    const distance = StoreLocation.calculateDistance(
      parseFloat(latitude),
      parseFloat(longitude),
      store.location.coordinates[1],
      store.location.coordinates[0]
    );

    const deliveryEstimate = StoreLocation.getDeliveryEstimate(distance, store);

    res.json({
      success: true,
      data: {
        distance: Math.round(distance * 10) / 10,
        deliveryEstimate,
        store: {
          _id: store._id,
          storeName: store.storeName,
          storeType: store.storeType,
          address: store.address,
        },
      },
    });
  } catch (error) {
    console.error("Error calculating delivery estimate:", error);
    res.status(500).json({
      success: false,
      error: "Failed to calculate delivery estimate",
    });
  }
};

/**
 * Update store location (Vendor only)
 */
exports.updateStoreLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const StoreLocation = req.app.locals.models.StoreLocation;
    const vendorId = req.user.vendorId;

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        error: "Vendor access required",
      });
    }

    // Verify ownership
    const location = await StoreLocation.findById(id);
    if (!location || location.vendorId.toString() !== vendorId) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    await StoreLocation.update(id, req.body);

    const updatedLocation = await StoreLocation.findById(id);

    res.json({
      success: true,
      message: "Store location updated successfully",
      data: updatedLocation,
    });
  } catch (error) {
    console.error("Error updating store location:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update store location",
    });
  }
};

/**
 * Set primary location (Vendor only)
 */
exports.setPrimaryLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const StoreLocation = req.app.locals.models.StoreLocation;
    const vendorId = req.user.vendorId;

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        error: "Vendor access required",
      });
    }

    // Verify ownership
    const location = await StoreLocation.findById(id);
    if (!location || location.vendorId.toString() !== vendorId) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    await StoreLocation.setPrimary(vendorId, id);

    res.json({
      success: true,
      message: "Primary location set successfully",
    });
  } catch (error) {
    console.error("Error setting primary location:", error);
    res.status(500).json({
      success: false,
      error: "Failed to set primary location",
    });
  }
};

/**
 * Delete store location (Vendor only)
 */
exports.deleteStoreLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const StoreLocation = req.app.locals.models.StoreLocation;
    const vendorId = req.user.vendorId;

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        error: "Vendor access required",
      });
    }

    // Verify ownership
    const location = await StoreLocation.findById(id);
    if (!location || location.vendorId.toString() !== vendorId) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    await StoreLocation.delete(id);

    res.json({
      success: true,
      message: "Store location deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting store location:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete store location",
    });
  }
};

/**
 * Get stores by type (Public)
 */
exports.getStoresByType = async (req, res) => {
  try {
    const { type } = req.params;
    const { limit = 50 } = req.query;
    const StoreLocation = req.app.locals.models.StoreLocation;

    const stores = await StoreLocation.findByType(type, parseInt(limit));

    res.json({
      success: true,
      data: stores,
      count: stores.length,
    });
  } catch (error) {
    console.error("Error fetching stores by type:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch stores",
    });
  }
};
