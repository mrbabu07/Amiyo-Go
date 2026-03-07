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
    return await this.collection.find(query).sort({ name: 1 }).toArray();
  }

  async findActive() {
    return await this.collection.find({ isActive: true }).sort({ name: 1 }).toArray();
  }

  async findById(id) {
    return await this.collection.findOne({ _id: new ObjectId(id) });
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

  async create(categoryData) {
    // Validate commissionRate
    let commissionRate = categoryData.commissionRate !== undefined 
      ? categoryData.commissionRate 
      : 0;
    
    if (typeof commissionRate !== 'number' || commissionRate < 0 || commissionRate > 100) {
      throw new Error('Commission rate must be a number between 0 and 100');
    }

    const category = {
      ...categoryData,
      parentId: categoryData.parentId ? new ObjectId(categoryData.parentId) : null,
      isActive: categoryData.isActive !== undefined ? categoryData.isActive : true,
      commissionRate: Math.round(commissionRate * 100) / 100, // Round to 2 decimals
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
      if (typeof safeData.commissionRate !== 'number' || 
          safeData.commissionRate < 0 || 
          safeData.commissionRate > 100) {
        throw new Error('Commission rate must be a number between 0 and 100');
      }
      safeData.commissionRate = Math.round(safeData.commissionRate * 100) / 100;
    }
    
    if (safeData.parentId) {
      safeData.parentId = new ObjectId(safeData.parentId);
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
            commissionRate: Math.round(update.commissionRate * 100) / 100,
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
    return await this.collection
      .find({ isActive: true })
      .project({
        _id: 1,
        name: 1,
        slug: 1,
        parentId: 1,
        commissionRate: 1,
        icon: 1,
      })
      .sort({ name: 1 })
      .toArray();
  }
}

module.exports = Category;
