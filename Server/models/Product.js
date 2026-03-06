const { ObjectId } = require("mongodb");

class Product {
  constructor(db) {
    this.collection = db.collection("products");
    this.createIndexes();
  }

  async createIndexes() {
    try {
      await this.collection.createIndex({ approvalStatus: 1, isActive: 1, createdAt: -1 });
      await this.collection.createIndex({ vendorId: 1, createdAt: -1 });
      await this.collection.createIndex({ categoryId: 1 });
    } catch (error) {
      console.error("Error creating Product indexes:", error);
    }
  }

  async findAll(filter = {}) {
    return await this.collection.find(filter).toArray();
  }

  async findWithFilters(filters = {}) {
    const {
      category,
      minPrice,
      maxPrice,
      minRating,
      sizes,
      colors,
      inStock,
      search,
      sortBy = "createdAt",
      sortOrder = -1,
      limit = 20,
      skip = 0,
      vendorId, // Add vendorId filter
    } = filters;

    // Build MongoDB query
    const query = {};

    // Only show active, approved products on public listing
    query.isActive = { $ne: false };
    query.$or = [
      { approvalStatus: { $exists: false } },  // admin-created products (no moderation)
      { approvalStatus: null },                 // legacy products
      { approvalStatus: "approved" },           // approved vendor products
    ];

    // Vendor filter
    if (vendorId) {
      query.vendorId = new ObjectId(vendorId);
    }

    // Category filter
    if (category) {
      query.categoryId = category;
    }

    // Price range filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    // Stock filter
    if (inStock) {
      query.stock = { $gt: 0 };
    }

    // Size filter
    if (sizes && sizes.length > 0) {
      query.sizes = { $in: sizes };
    }

    // Color filter
    if (colors && colors.length > 0) {
      query["colors.name"] = { $in: colors };
    }

    // Search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Rating filter (requires aggregation with reviews)
    let pipeline = [{ $match: query }];

    // Lookup category name
    pipeline.push({
      $lookup: {
        from: "categories",
        localField: "categoryId",
        foreignField: "_id",
        as: "categoryInfo"
      }
    });

    pipeline.push({
      $addFields: {
        categoryName: { $arrayElemAt: ["$categoryInfo.name", 0] }
      }
    });

    pipeline.push({
      $project: {
        categoryInfo: 0
      }
    });

    // Add rating filter if specified
    if (minRating) {
      pipeline.push(
        {
          $lookup: {
            from: "reviews",
            localField: "_id",
            foreignField: "productId",
            as: "reviews",
          },
        },
        {
          $addFields: {
            averageRating: {
              $cond: {
                if: { $gt: [{ $size: "$reviews" }, 0] },
                then: { $avg: "$reviews.rating" },
                else: 0,
              },
            },
          },
        },
        {
          $match: {
            averageRating: { $gte: parseFloat(minRating) },
          },
        },
        {
          $project: {
            reviews: 0, // Remove reviews from output
          },
        },
      );
    }

    // Add sorting
    const sortObj = {};
    sortObj[sortBy] = parseInt(sortOrder);
    pipeline.push({ $sort: sortObj });

    // Add pagination
    if (skip > 0) {
      pipeline.push({ $skip: skip });
    }
    if (limit > 0) {
      pipeline.push({ $limit: limit });
    }

    return await this.collection.aggregate(pipeline).toArray();
  }

  async getFilterOptions() {
    const pipeline = [
      {
        $group: {
          _id: null,
          minPrice: { $min: "$price" },
          maxPrice: { $max: "$price" },
          allSizes: { $addToSet: "$sizes" },
          allColors: { $addToSet: "$colors" },
          categories: { $addToSet: "$categoryId" },
        },
      },
    ];

    const result = await this.collection.aggregate(pipeline).toArray();

    if (result.length === 0) {
      return {
        priceRange: { min: 0, max: 0 },
        sizes: [],
        colors: [],
        categories: [],
      };
    }

    const data = result[0];

    // Flatten and deduplicate sizes and colors
    const sizes = [...new Set(data.allSizes.flat())].filter(Boolean);
    const colors = [
      ...new Set(data.allColors.flat().map((c) => c?.name)),
    ].filter(Boolean);

    return {
      priceRange: {
        min: data.minPrice || 0,
        max: data.maxPrice || 0,
      },
      sizes,
      colors,
      categories: data.categories.filter(Boolean),
    };
  }

  async getLowStockProducts(threshold = 10) {
    return await this.collection
      .find({
        stock: { $lte: threshold, $gt: 0 },
      })
      .toArray();
  }

  async getOutOfStockProducts() {
    return await this.collection
      .find({
        stock: { $lte: 0 },
      })
      .toArray();
  }

  async updateStockBulk(updates) {
    const bulkOps = updates.map((update) => ({
      updateOne: {
        filter: { _id: new ObjectId(update.productId) },
        update: { $set: { stock: update.stock, updatedAt: new Date() } },
      },
    }));

    return await this.collection.bulkWrite(bulkOps);
  }

  async findById(id) {
    try {
      // Validate ObjectId format
      if (!id || typeof id !== "string" || id.length !== 24) {
        return null;
      }
      return await this.collection.findOne({ _id: new ObjectId(id) });
    } catch (error) {
      // Handle invalid ObjectId format
      console.error("Invalid ObjectId format:", id, error.message);
      return null;
    }
  }

  async updateVariants(productId, variants) {
    try {
      if (
        !productId ||
        typeof productId !== "string" ||
        productId.length !== 24
      ) {
        throw new Error(`Invalid ObjectId format: ${productId}`);
      }

      const result = await this.collection.updateOne(
        { _id: new ObjectId(productId) },
        {
          $set: {
            variants: variants,
            updatedAt: new Date(),
          },
        },
      );

      return result;
    } catch (error) {
      console.error("Error updating variants:", error);
      throw error;
    }
  }

  async updateVariantStock(productId, variantId, quantity) {
    try {
      if (
        !productId ||
        typeof productId !== "string" ||
        productId.length !== 24
      ) {
        throw new Error(`Invalid ObjectId format: ${productId}`);
      }

      const result = await this.collection.updateOne(
        {
          _id: new ObjectId(productId),
          "variants._id": variantId,
        },
        {
          $inc: { "variants.$.stock": -quantity },
          $set: { updatedAt: new Date() },
        },
      );

      return result;
    } catch (error) {
      console.error("Error updating variant stock:", error);
      throw error;
    }
  }

  async findByCategory(categoryId) {
    return await this.collection.find({ categoryId }).toArray();
  }

  async findByVendor(vendorId) {
    return await this.collection.find({ 
      vendorId: new ObjectId(vendorId) 
    }).toArray();
  }

  async create(productData) {
    const now = new Date();
    const product = {
      // Moderation defaults — always set, never trust frontend for these
      approvalStatus: "pending",
      isActive: true,
      approvedBy: null,
      approvedAt: null,
      rejectionReason: null,
      lastSubmittedAt: now,
      lastModeratedAt: null,
      ...productData,
      // Override any inbound approvalStatus/isActive from frontend
      approvalStatus: productData.approvalStatus || "pending",
      isActive: productData.isActive !== undefined ? productData.isActive : true,
      createdAt: now,
      updatedAt: now,
    };

    // Convert vendorId and categoryId to ObjectId if present
    if (product.vendorId) {
      product.vendorId = new ObjectId(product.vendorId);
    }
    if (product.categoryId) {
      product.categoryId = new ObjectId(product.categoryId);
    }

    const result = await this.collection.insertOne(product);
    return result.insertedId;
  }

  /**
   * Paginated products for a specific vendor (vendor dashboard use)
   * @param {string} vendorId
   * @param {{ status, page, limit }} options
   */
  async findByVendorPaginated(vendorId, options = {}) {
    const { status, page = 1, limit = 20 } = options;
    const pageNum  = parseInt(page);
    const limitNum = parseInt(limit);
    const skip     = (pageNum - 1) * limitNum;

    const query = { vendorId: new ObjectId(vendorId) };
    if (status && status !== "all") {
      query.approvalStatus = status;
    }

    const [products, total] = await Promise.all([
      this.collection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .toArray(),
      this.collection.countDocuments(query),
    ]);

    return {
      products,
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
    };
  }

  async update(id, productData) {
    try {
      // Enhanced logging for debugging
      console.log("🔧 Product Model Update:");
      console.log("- ID:", id);
      console.log("- Data Keys:", Object.keys(productData));

      // Validate ObjectId
      if (!id || typeof id !== "string" || id.length !== 24) {
        throw new Error(`Invalid ObjectId format: ${id}`);
      }

      // Create ObjectId
      const objectId = new ObjectId(id);
      console.log("- ObjectId created:", objectId);

      // Prepare update data - exclude immutable fields
      const { _id, __v, createdAt, ...safeData } = productData;
      const updateData = {
        ...safeData,
        updatedAt: new Date(),
      };

      console.log("- Update operation starting...");

      const result = await this.collection.updateOne(
        { _id: objectId },
        { $set: updateData },
      );

      console.log("- Update result:", result);
      return result;
    } catch (error) {
      console.error("💥 Product Model Update Error:", error);
      throw error;
    }
  }

  async delete(id) {
    return await this.collection.deleteOne({ _id: new ObjectId(id) });
  }

  async incrementViews(id) {
    try {
      // Validate ObjectId format
      if (!id || typeof id !== "string" || id.length !== 24) {
        return null;
      }

      const result = await this.collection.updateOne(
        { _id: new ObjectId(id) },
        {
          $inc: { views: 1 },
          $set: { updatedAt: new Date() },
        },
      );

      return result;
    } catch (error) {
      console.error("Error incrementing views:", error);
      return null;
    }
  }

  async updateStock(id, quantity) {
    return await this.collection.updateOne(
      { _id: new ObjectId(id) },
      { $inc: { stock: -quantity } },
    );
  }
}

module.exports = Product;
