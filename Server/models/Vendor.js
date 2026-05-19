const { ObjectId } = require("mongodb");

const normalizeShopSlug = (value = "") =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

class Vendor {
  constructor(db) {
    this.collection = db.collection("vendors");
    this.createIndexes();
  }

  async createIndexes() {
    try {
      await this.collection.createIndex({ ownerUserId: 1 }, { unique: true });
      await this.collection.createIndex({ slug: 1 }, { unique: true, sparse: true });
      await this.collection.createIndex({ status: 1 });
      await this.collection.createIndex({ createdAt: -1 });
    } catch (error) {
      console.error("Error creating Vendor indexes:", error);
    }
  }

  async findByUserId(userId) {
    return await this.collection.findOne({ 
      ownerUserId: new ObjectId(userId) 
    });
  }

  async findById(id) {
    return await this.collection.findOne({ _id: new ObjectId(id) });
  }

  async findBySlug(slug) {
    return await this.collection.findOne({ slug });
  }

  async generateUniqueSlug(shopName, currentVendorId = null) {
    const baseSlug = normalizeShopSlug(shopName) || `shop-${Date.now()}`;
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.findBySlug(slug);
      if (!existing || (currentVendorId && existing._id.toString() === currentVendorId.toString())) {
        return slug;
      }
      slug = `${baseSlug}-${counter}`;
      counter += 1;
    }
  }

  async create(vendorData) {
    const slug = normalizeShopSlug(vendorData.slug) || await this.generateUniqueSlug(vendorData.shopName);
    const vendor = {
      ...vendorData,
      ownerUserId: new ObjectId(vendorData.ownerUserId),
      allowedCategoryIds: vendorData.allowedCategoryIds.map(id => new ObjectId(id)),
      slug,
      status: "pending",
      tagline: vendorData.tagline || "",
      description: vendorData.description || "",
      logo: vendorData.logo || "",
      banner: vendorData.banner || "",
      categories: vendorData.categories || [],
      address: vendorData.address || {
        line1: "",
        area: "",
        city: "",
        district: "",
        country: "Bangladesh",
      },
      location: vendorData.location || {
        lat: null,
        lng: null,
        formattedAddress: "",
      },
      returnPolicy: vendorData.returnPolicy || "",
      shippingPolicy: vendorData.shippingPolicy || vendorData.shippingNotes || "",
      workingHours: vendorData.workingHours || "",
      email: vendorData.email || "",
      website: vendorData.website || "",
      socialLinks: vendorData.socialLinks || {
        facebook: "",
        instagram: "",
        youtube: "",
      },
      isVerified: vendorData.isVerified === true,
      isOfficialStore: vendorData.isOfficialStore === true,
      followerCount: Number(vendorData.followerCount || 0),
      productCount: Number(vendorData.productCount || 0),
      rating: Number(vendorData.rating || 0),
      reviewCount: Number(vendorData.reviewCount || 0),
      joinedAt: vendorData.joinedAt || new Date(),
      shopFollowers: Array.isArray(vendorData.shopFollowers) ? vendorData.shopFollowers : [],
      deliverySettings: vendorData.deliverySettings || {
        selfDeliveryEnabled: true,
        pickupEnabled: true,
        sameUnionFee: 30,
        sameUpazilaFee: 50,
        sameDistrictFee: 80,
        outsideDistrictFee: 120,
        freeDeliveryThreshold: 0,
        perishableFee: 20,
        handlingFee: 0,
        preparationTime: "1-2 days",
      },
      verificationLevel: "basic",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await this.collection.insertOne(vendor);
    return { ...vendor, _id: result.insertedId };
  }

  async update(id, updateData) {
    const { _id, createdAt, ...safeData } = updateData;
    
    if (safeData.allowedCategoryIds) {
      safeData.allowedCategoryIds = safeData.allowedCategoryIds.map(id => 
        typeof id === 'string' ? new ObjectId(id) : id
      );
    }

    if (safeData.slug !== undefined) {
      safeData.slug = normalizeShopSlug(safeData.slug);
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

  async updateStatus(id, status) {
    return await this.collection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          status, 
          updatedAt: new Date() 
        } 
      }
    );
  }

  async findAll(filter = {}) {
    const query = {};
    
    if (filter.status) {
      query.status = filter.status;
    }

    const { page = 1, limit = 20 } = filter;
    const skip = (page - 1) * limit;

    const vendors = await this.collection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await this.collection.countDocuments(query);

    return {
      vendors,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getStats() {
    const total = await this.collection.countDocuments();
    const pending = await this.collection.countDocuments({ status: "pending" });
    const approved = await this.collection.countDocuments({ status: "approved" });
    const suspended = await this.collection.countDocuments({ status: "suspended" });

    return {
      total,
      pending,
      approved,
      suspended,
    };
  }
}

module.exports = Vendor;
