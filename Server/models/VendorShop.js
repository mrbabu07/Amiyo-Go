const { ObjectId } = require("mongodb");

class VendorShop {
  constructor(db) {
    this.collection = db.collection("vendor_shop");
    this.createIndexes();
  }

  async createIndexes() {
    try {
      await this.collection.createIndex({ vendorId: 1 }, { unique: true });
      await this.collection.createIndex({ ownerUserId: 1 });
      await this.collection.createIndex({ slug: 1 }, { unique: true, sparse: true });
      await this.collection.createIndex({ updatedAt: -1 });
    } catch (error) {
      console.error("Error creating VendorShop indexes:", error);
    }
  }

  async findByVendorId(vendorId) {
    return await this.collection.findOne({ vendorId: new ObjectId(vendorId) });
  }

  async upsertForVendor(vendor, data = {}) {
    const now = new Date();
    const vendorId = vendor._id instanceof ObjectId ? vendor._id : new ObjectId(vendor._id);
    const ownerUserId =
      vendor.ownerUserId instanceof ObjectId ? vendor.ownerUserId : new ObjectId(vendor.ownerUserId);

    await this.collection.updateOne(
      { vendorId },
      {
        $set: {
          vendorId,
          ownerUserId,
          shopName: data.shopName ?? vendor.shopName,
          slug: data.slug ?? vendor.slug,
          tagline: data.tagline ?? vendor.tagline ?? "",
          description: data.description ?? vendor.description ?? "",
          phone: data.phone ?? vendor.phone ?? "",
          whatsapp: data.whatsapp ?? vendor.whatsapp ?? "",
          email: data.email ?? vendor.email ?? "",
          address: data.address ?? vendor.address ?? "",
          location: data.location ?? vendor.location ?? {},
          categories: data.categories ?? vendor.categories ?? [],
          returnPolicy: data.returnPolicy ?? vendor.returnPolicy ?? "",
          shippingPolicy: data.shippingPolicy ?? vendor.shippingPolicy ?? vendor.shippingNotes ?? "",
          workingHours: data.workingHours ?? vendor.workingHours ?? "",
          website: data.website ?? vendor.website ?? "",
          socialLinks: data.socialLinks ?? vendor.socialLinks ?? {},
          processingTime: data.processingTime ?? vendor.processingTime ?? "",
          shippingNotes: data.shippingNotes ?? vendor.shippingNotes ?? "",
          logo: data.logo ?? vendor.logo ?? "",
          banner: data.banner ?? vendor.banner ?? "",
          shopDecoration: data.shopDecoration ?? vendor.shopDecoration ?? {},
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true },
    );

    return await this.findByVendorId(vendorId);
  }
}

module.exports = VendorShop;
