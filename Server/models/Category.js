const { ObjectId } = require("mongodb");

class Category {
  constructor(db) {
    this.collection = db.collection("categories");
    this.createIndexes();
  }

  async createIndexes() {
    try {
      await this.collection.createIndex({ slug: 1 }, { unique: true });
      await this.collection.createIndex({ parentId: 1 });
      await this.collection.createIndex({ isActive: 1 });
      await this.collection.createIndex({ commissionRate: 1 });
      await this.collection.createIndex({ minimumCommissionRate: 1 });
      await this.collection.createIndex({ displayOrder: 1 });
    } catch (error) {
      console.error("Error creating Category indexes:", error);
    }
  }

  async findAll(filter = {}) {
    const query = {};
    if (filter.isActive !== undefined) {
      query.isActive = filter.isActive;
    }
    if (filter.parentId !== undefined) {
      query.parentId = filter.parentId === null ? null : new ObjectId(filter.parentId);
    }
    const categories = await this.collection.find(query).sort({ displayOrder: 1, name: 1 }).toArray();
    return this.attachEffectiveCommissionRates(categories);
  }

  async findActive() {
    const categories = await this.collection.find({ isActive: true }).sort({ displayOrder: 1, name: 1 }).toArray();
    return this.attachEffectiveCommissionRates(categories);
  }

  async findById(id) {
    const category = await this.collection.findOne({ _id: new ObjectId(id) });
    if (category) {
      const categories = await this.collection.find({}).toArray();
      const enriched = this.attachEffectiveCommissionRates(categories);
      return enriched.find((cat) => cat._id.toString() === category._id.toString()) || {
        ...category,
        attributes: category.attributes || [],
        minimumCommissionRate: category.minimumCommissionRate || 0,
        effectiveCommissionRate: Math.max(category.commissionRate || 0, category.minimumCommissionRate || 0),
      };
    }
    return category;
  }

  async findByIds(ids) {
    return await this.collection.find({ 
      _id: { $in: ids.map(id => new ObjectId(id)) } 
    }).toArray();
  }

  async findBySlug(slug) {
    return await this.collection.findOne({ slug });
  }

  async findChildren(parentId) {
    return await this.collection.find({ 
      parentId: new ObjectId(parentId),
      isActive: true 
    }).toArray();
  }

  async getDescendantIds(parentId) {
    const descendants = [];
    const queue = [new ObjectId(parentId)];

    while (queue.length > 0) {
      const currentId = queue.shift();
      const children = await this.collection
        .find({ parentId: currentId, isActive: true })
        .project({ _id: 1 })
        .toArray();

      for (const child of children) {
        descendants.push(child._id);
        queue.push(child._id);
      }
    }

    return descendants;
  }

  async create(categoryData) {
    const commissionRate = this.normalizeRate(categoryData.commissionRate, "Commission rate");
    const minimumCommissionRate = this.normalizeRate(
      categoryData.minimumCommissionRate,
      "Minimum commission rate",
    );

    const category = {
      ...categoryData,
      parentId: categoryData.parentId ? new ObjectId(categoryData.parentId) : null,
      isActive: categoryData.isActive !== undefined ? categoryData.isActive : true,
      commissionRate,
      minimumCommissionRate,
      attributes: categoryData.attributes || [], // Add attributes support
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await this.collection.insertOne(category);
    return { ...category, _id: result.insertedId };
  }

  async update(id, categoryData) {
    const { _id, __v, createdAt, ...safeData } = categoryData;
    
    // Validate commissionRate if provided
    if (safeData.commissionRate !== undefined) {
      safeData.commissionRate = this.normalizeRate(safeData.commissionRate, "Commission rate");
    }

    if (safeData.minimumCommissionRate !== undefined) {
      safeData.minimumCommissionRate = this.normalizeRate(
        safeData.minimumCommissionRate,
        "Minimum commission rate",
      );
    }
    
    if (safeData.parentId !== undefined) {
      safeData.parentId = safeData.parentId ? new ObjectId(safeData.parentId) : null;
    }

    return await this.collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...safeData, updatedAt: new Date() } },
    );
  }

  async softDelete(id) {
    return await this.collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { isActive: false, updatedAt: new Date() } }
    );
  }

  async delete(id) {
    return await this.collection.deleteOne({ _id: new ObjectId(id) });
  }

  async getCategoryTree() {
    const categories = await this.findAll({ isActive: true });
    return this.buildTree(categories);
  }

  buildTree(categories, parentId = null) {
    const tree = [];
    
    for (const category of categories) {
      const catParentId = category.parentId ? category.parentId.toString() : null;
      const compareParentId = parentId ? parentId.toString() : null;
      
      if (catParentId === compareParentId) {
        const children = this.buildTree(categories, category._id);
        tree.push({
          ...category,
          children: children.length > 0 ? children : undefined,
        });
      }
    }
    
    return tree;
  }

  /**
   * Bulk update commission rates for multiple categories
   */
  async bulkUpdateCommission(updates) {
    const bulkOps = updates.map((update) => ({
      updateOne: {
        filter: { _id: new ObjectId(update.categoryId) },
        update: {
          $set: {
            commissionRate: this.normalizeRate(update.commissionRate, "Commission rate"),
            ...(update.minimumCommissionRate !== undefined
              ? {
                  minimumCommissionRate: this.normalizeRate(
                    update.minimumCommissionRate,
                    "Minimum commission rate",
                  ),
                }
              : {}),
            updatedAt: new Date(),
          },
        },
      },
    }));

    return await this.collection.bulkWrite(bulkOps);
  }

  /**
   * Get categories with their commission rates
   */
  async getCategoriesWithCommission() {
    const categories = await this.collection
      .find({ isActive: true })
      .project({
        _id: 1,
        name: 1,
        slug: 1,
        parentId: 1,
        commissionRate: 1,
        minimumCommissionRate: 1,
        attributes: 1,
        icon: 1,
      })
      .sort({ name: 1 })
      .toArray();

    return this.attachEffectiveCommissionRates(categories);
  }

  normalizeRate(rate, label) {
    const value = rate !== undefined && rate !== null && rate !== "" ? Number(rate) : 0;

    if (!Number.isFinite(value) || value < 0 || value > 100) {
      throw new Error(`${label} must be a number between 0 and 100`);
    }

    return Math.round(value * 100) / 100;
  }

  attachEffectiveCommissionRates(categories) {
    const byId = new Map(categories.map((category) => [category._id.toString(), category]));

    const getEffectiveRate = (category) => {
      let effectiveRate = Math.max(
        Number(category.commissionRate || 0),
        Number(category.minimumCommissionRate || 0),
      );
      let parentId = category.parentId ? category.parentId.toString() : null;
      const seen = new Set();

      while (parentId && byId.has(parentId) && !seen.has(parentId)) {
        seen.add(parentId);
        const parent = byId.get(parentId);
        effectiveRate = Math.max(effectiveRate, Number(parent.minimumCommissionRate || 0));
        parentId = parent.parentId ? parent.parentId.toString() : null;
      }

      return Math.round(effectiveRate * 100) / 100;
    };

    return categories.map((cat) => ({
      ...cat,
      attributes: cat.attributes || [],
      minimumCommissionRate: cat.minimumCommissionRate || 0,
      effectiveCommissionRate: getEffectiveRate(cat),
    }));
  }
}

module.exports = Category;
