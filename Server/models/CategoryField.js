const { ObjectId } = require("mongodb");

/**
 * CategoryField Model
 * Manages dynamic fields for each category
 * Allows admin to define custom fields for products in specific categories
 */
class CategoryField {
  constructor(db) {
    this.collection = db.collection("categoryFields");
    this.createIndexes();
  }

  async createIndexes() {
    try {
      await this.collection.createIndex({ categoryId: 1 });
      await this.collection.createIndex({ fieldKey: 1, categoryId: 1 }, { unique: true });
      await this.collection.createIndex({ isActive: 1 });
    } catch (error) {
      console.error("Error creating CategoryField indexes:", error);
    }
  }

  /**
   * Get all fields for a category
   */
  async findByCategoryId(categoryId) {
    return await this.collection
      .find({ 
        categoryId: new ObjectId(categoryId),
        isActive: true 
      })
      .sort({ order: 1 })
      .toArray();
  }

  /**
   * Get field by ID
   */
  async findById(id) {
    return await this.collection.findOne({ _id: new ObjectId(id) });
  }

  /**
   * Create a new field for a category
   */
  async create(fieldData) {
    const field = {
      categoryId: new ObjectId(fieldData.categoryId),
      fieldKey: fieldData.fieldKey, // e.g., "ram", "processor", "fabric"
      fieldLabel: fieldData.fieldLabel, // e.g., "RAM", "Processor", "Fabric Type"
      fieldType: fieldData.fieldType, // text, number, select, multiselect, boolean, textarea
      options: fieldData.options || [], // For select/multiselect types
      isRequired: fieldData.isRequired || false,
      isFilterable: fieldData.isFilterable || false, // Can be used in filters
      isSearchable: fieldData.isSearchable || false, // Included in search
      placeholder: fieldData.placeholder || "",
      helpText: fieldData.helpText || "",
      validation: fieldData.validation || {}, // min, max, pattern, etc.
      order: fieldData.order || 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await this.collection.insertOne(field);
    return { ...field, _id: result.insertedId };
  }

  /**
   * Update a field
   */
  async update(id, updateData) {
    const { _id, createdAt, categoryId, ...safeData } = updateData;
    
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
   * Delete a field
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
   * Reorder fields
   */
  async reorder(categoryId, fieldOrders) {
    const bulkOps = fieldOrders.map((item) => ({
      updateOne: {
        filter: { _id: new ObjectId(item.fieldId) },
        update: {
          $set: {
            order: item.order,
            updatedAt: new Date(),
          },
        },
      },
    }));

    return await this.collection.bulkWrite(bulkOps);
  }

  /**
   * Get all categories with their fields
   */
  async getAllCategoriesWithFields() {
    return await this.collection.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: "$categoryId",
          fields: { $push: "$$ROOT" },
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
      {
        $project: {
          categoryId: "$_id",
          categoryName: "$category.name",
          categorySlug: "$category.slug",
          fields: 1,
        },
      },
    ]).toArray();
  }

  /**
   * Validate product data against category fields
   */
  async validateProductData(categoryId, productData) {
    const fields = await this.findByCategoryId(categoryId);
    const errors = [];

    for (const field of fields) {
      const value = productData.customFields?.[field.fieldKey];

      // Check required fields
      if (field.isRequired && (value === undefined || value === null || value === "")) {
        errors.push({
          field: field.fieldKey,
          message: `${field.fieldLabel} is required`,
        });
        continue;
      }

      // Skip validation if field is not provided and not required
      if (value === undefined || value === null) continue;

      // Type validation
      switch (field.fieldType) {
        case "number":
          if (isNaN(value)) {
            errors.push({
              field: field.fieldKey,
              message: `${field.fieldLabel} must be a number`,
            });
          }
          // Min/Max validation
          if (field.validation?.min !== undefined && value < field.validation.min) {
            errors.push({
              field: field.fieldKey,
              message: `${field.fieldLabel} must be at least ${field.validation.min}`,
            });
          }
          if (field.validation?.max !== undefined && value > field.validation.max) {
            errors.push({
              field: field.fieldKey,
              message: `${field.fieldLabel} must be at most ${field.validation.max}`,
            });
          }
          break;

        case "select":
          if (!field.options.includes(value)) {
            errors.push({
              field: field.fieldKey,
              message: `${field.fieldLabel} must be one of: ${field.options.join(", ")}`,
            });
          }
          break;

        case "multiselect":
          if (!Array.isArray(value)) {
            errors.push({
              field: field.fieldKey,
              message: `${field.fieldLabel} must be an array`,
            });
          } else {
            const invalidOptions = value.filter(v => !field.options.includes(v));
            if (invalidOptions.length > 0) {
              errors.push({
                field: field.fieldKey,
                message: `Invalid options for ${field.fieldLabel}: ${invalidOptions.join(", ")}`,
              });
            }
          }
          break;

        case "boolean":
          if (typeof value !== "boolean") {
            errors.push({
              field: field.fieldKey,
              message: `${field.fieldLabel} must be true or false`,
            });
          }
          break;

        case "text":
        case "textarea":
          if (typeof value !== "string") {
            errors.push({
              field: field.fieldKey,
              message: `${field.fieldLabel} must be text`,
            });
          }
          // Pattern validation
          if (field.validation?.pattern && !new RegExp(field.validation.pattern).test(value)) {
            errors.push({
              field: field.fieldKey,
              message: field.validation.patternMessage || `${field.fieldLabel} format is invalid`,
            });
          }
          break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

module.exports = CategoryField;
