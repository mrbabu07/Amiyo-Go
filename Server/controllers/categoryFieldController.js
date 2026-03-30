const { ObjectId } = require("mongodb");

/**
 * Get all fields for a category
 */
exports.getCategoryFields = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const CategoryField = req.app.locals.models.CategoryField;

    const fields = await CategoryField.findByCategoryId(categoryId);

    res.json({
      success: true,
      data: fields,
    });
  } catch (error) {
    console.error("Error fetching category fields:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch category fields",
    });
  }
};

/**
 * Create a new field for a category (Admin only)
 */
exports.createCategoryField = async (req, res) => {
  try {
    const CategoryField = req.app.locals.models.CategoryField;
    const fieldData = req.body;

    // Validate required fields
    if (!fieldData.categoryId || !fieldData.fieldKey || !fieldData.fieldLabel || !fieldData.fieldType) {
      return res.status(400).json({
        success: false,
        error: "Category ID, field key, label, and type are required",
      });
    }

    const field = await CategoryField.create(fieldData);

    res.status(201).json({
      success: true,
      message: "Category field created successfully",
      data: field,
    });
  } catch (error) {
    console.error("Error creating category field:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to create category field",
    });
  }
};

/**
 * Update a category field (Admin only)
 */
exports.updateCategoryField = async (req, res) => {
  try {
    const { id } = req.params;
    const CategoryField = req.app.locals.models.CategoryField;

    await CategoryField.update(id, req.body);

    const updatedField = await CategoryField.findById(id);

    res.json({
      success: true,
      message: "Category field updated successfully",
      data: updatedField,
    });
  } catch (error) {
    console.error("Error updating category field:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update category field",
    });
  }
};

/**
 * Delete a category field (Admin only)
 */
exports.deleteCategoryField = async (req, res) => {
  try {
    const { id } = req.params;
    const CategoryField = req.app.locals.models.CategoryField;

    await CategoryField.delete(id);

    res.json({
      success: true,
      message: "Category field deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting category field:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete category field",
    });
  }
};

/**
 * Reorder category fields (Admin only)
 */
exports.reorderCategoryFields = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { fieldOrders } = req.body; // [{ fieldId, order }, ...]
    const CategoryField = req.app.locals.models.CategoryField;

    await CategoryField.reorder(categoryId, fieldOrders);

    res.json({
      success: true,
      message: "Fields reordered successfully",
    });
  } catch (error) {
    console.error("Error reordering fields:", error);
    res.status(500).json({
      success: false,
      error: "Failed to reorder fields",
    });
  }
};

/**
 * Get all categories with their fields (Admin only)
 */
exports.getAllCategoriesWithFields = async (req, res) => {
  try {
    const CategoryField = req.app.locals.models.CategoryField;

    const data = await CategoryField.getAllCategoriesWithFields();

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error fetching categories with fields:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch categories with fields",
    });
  }
};

/**
 * Validate product data against category fields
 */
exports.validateProductData = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const productData = req.body;
    const CategoryField = req.app.locals.models.CategoryField;

    const validation = await CategoryField.validateProductData(categoryId, productData);

    res.json({
      success: true,
      data: validation,
    });
  } catch (error) {
    console.error("Error validating product data:", error);
    res.status(500).json({
      success: false,
      error: "Failed to validate product data",
    });
  }
};
