const { ObjectId } = require("mongodb");

/**
 * StoreLocation Model
 * Manages physical store locations for vendors
 * Supports distance-based delivery calculations
 */
class StoreLocation {
  constructor(db) {
    this.collection = db.collection("storeLocations");
    this.createIndexes();
  }

  async createIndexes() {
    try {
      await this.collection.createIndex({ vendorId: 1 });
      await this.collection.createIndex({ location: "2dsphere" }); // Geospatial index
      await this.collection.createIndex({ isActive: 1 });
      await this.collection.createIndex({ storeType: 1 });
    } catch (error) {
      console.error("Error creating StoreLocation indexes:", error);
    }
  }

  /**
   * Create a new store location
   */
  async create(locationData) {
    const location = {
      vendorId: new ObjectId(locationData.vendorId),
      storeName: locationData.storeName,
      storeType: locationData.storeType, // retail, warehouse, showroom, service_center
      address: {
        street: locationData.address.street,
        city: locationData.address.city,
        state: locationData.address.state,
        zipCode: locationData.address.zipCode,
        country: locationData.address.country || "Bangladesh",
      },
      location: {
        type: "Point",
        coordinates: [
          parseFloat(locationData.longitude), // [longitude, latitude]
          parseFloat(locationData.latitude),
        ],
      },
      contactPhone: locationData.contactPhone,
      contactEmail: locationData.contactEmail,
      operatingHours: locationData.operatingHours || {
        monday: { open: "09:00", close: "21:00", closed: false },
        tuesday: { open: "09:00", close: "21:00", closed: false },
        wednesday: { open: "09:00", close: "21:00", closed: false },
        thursday: { open: "09:00", close: "21:00", closed: false },
        friday: { open: "09:00", close: "21:00", closed: false },
        saturday: { open: "09:00", close: "21:00", closed: false },
        sunday: { open: "10:00", close: "20:00", closed: false },
      },
      deliveryRadius: locationData.deliveryRadius || 10, // km
      fastDeliveryRadius: locationData.fastDeliveryRadius || 3, // km for same-day delivery
      isPrimary: locationData.isPrimary || false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await this.collection.insertOne(location);
    return { ...location, _id: result.insertedId };
  }

  /**
   * Find locations by vendor ID
   */
  async findByVendorId(vendorId) {
    return await this.collection
      .find({ 
        vendorId: new ObjectId(vendorId),
        isActive: true 
      })
      .toArray();
  }

  /**
   * Find location by ID
   */
  async findById(id) {
    return await this.collection.findOne({ _id: new ObjectId(id) });
  }

  /**
   * Find stores near a location
   * @param {number} longitude
   * @param {number} latitude
   * @param {number} maxDistance - in kilometers
   */
  async findNearby(longitude, latitude, maxDistance = 50) {
    return await this.collection
      .find({
        location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [parseFloat(longitude), parseFloat(latitude)],
            },
            $maxDistance: maxDistance * 1000, // Convert km to meters
          },
        },
        isActive: true,
      })
      .toArray();
  }

  /**
   * Calculate distance between two points (Haversine formula)
   * @returns distance in kilometers
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get delivery estimate based on distance
   */
  getDeliveryEstimate(distance, storeLocation) {
    if (distance <= storeLocation.fastDeliveryRadius) {
      return {
        type: "express",
        label: "Same Day Delivery",
        estimatedDays: 0,
        estimatedHours: "2-4 hours",
        fee: 50,
      };
    } else if (distance <= storeLocation.deliveryRadius) {
      return {
        type: "standard",
        label: "Standard Delivery",
        estimatedDays: 1,
        estimatedHours: "24 hours",
        fee: 100,
      };
    } else if (distance <= 50) {
      return {
        type: "extended",
        label: "Extended Delivery",
        estimatedDays: 2,
        estimatedHours: "2-3 days",
        fee: 150,
      };
    } else {
      return {
        type: "long_distance",
        label: "Long Distance Delivery",
        estimatedDays: 5,
        estimatedHours: "5-7 days",
        fee: 200,
      };
    }
  }

  /**
   * Update location
   */
  async update(id, updateData) {
    const { _id, createdAt, vendorId, ...safeData } = updateData;
    
    if (safeData.latitude && safeData.longitude) {
      safeData.location = {
        type: "Point",
        coordinates: [
          parseFloat(safeData.longitude),
          parseFloat(safeData.latitude),
        ],
      };
      delete safeData.latitude;
      delete safeData.longitude;
    }

    return await this.collection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          ...safeData, 
          updatedAt: new Date() 
        } 
      }
    );
  }

  /**
   * Set primary location
   */
  async setPrimary(vendorId, locationId) {
    // Remove primary flag from all locations
    await this.collection.updateMany(
      { vendorId: new ObjectId(vendorId) },
      { $set: { isPrimary: false, updatedAt: new Date() } }
    );

    // Set new primary
    return await this.collection.updateOne(
      { _id: new ObjectId(locationId) },
      { $set: { isPrimary: true, updatedAt: new Date() } }
    );
  }

  /**
   * Delete location
   */
  async delete(id) {
    return await this.collection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          isActive: false, 
          updatedAt: new Date() 
        } 
      }
    );
  }

  /**
   * Get vendor's primary location
   */
  async getPrimaryLocation(vendorId) {
    return await this.collection.findOne({
      vendorId: new ObjectId(vendorId),
      isPrimary: true,
      isActive: true,
    });
  }

  /**
   * Find stores by type
   */
  async findByType(storeType, limit = 50) {
    return await this.collection
      .find({ 
        storeType,
        isActive: true 
      })
      .limit(limit)
      .toArray();
  }
}

module.exports = StoreLocation;
