const DynamicCategory = require("../models/DynamicCategory");

// Create a new category with attributes
exports.createCategory = async (req, res) => {
  try {
    const { name, slug, description, image, attributes } = req.body;

    // Check if category already exists
    const existingCategory = await DynamicCategory.findOne({
      $or: [{ name }, { slug }],
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Category with this name or slug already exists",
      });
    }

    const category = new DynamicCategory({
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
      description,
      image,
      attributes: attributes || [],
      createdBy: req.user?._id,
    });

    await category.save();

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating category",
      error: error.message,
    });
  }
};

// Get all categories
exports.getAllCategories = async (req, res) => {
  try {
    const { isActive } = req.query;
    const filter = {};

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    const categories = await DynamicCategory.find(filter)
      .select("-createdBy -updatedBy")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: categories,
      count: categories.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching categories",
      error: error.message,
    });
  }
};

// Get category by ID with attributes
exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await DynamicCategory.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching category",
      error: error.message,
    });
  }
};

// Get category by slug
exports.getCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const category = await DynamicCategory.findOne({ slug });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching category",
      error: error.message,
    });
  }
};

// Update category
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, description, image, attributes, isActive } = req.body;

    const category = await DynamicCategory.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Check for duplicate name/slug if changed
    if (name && name !== category.name) {
      const duplicate = await DynamicCategory.findOne({ name });
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: "Category name already exists",
        });
      }
    }

    category.name = name || category.name;
    category.slug = slug || category.slug;
    category.description = description || category.description;
    category.image = image || category.image;
    category.isActive = isActive !== undefined ? isActive : category.isActive;

    if (attributes) {
      category.attributes = attributes;
    }

    category.updatedBy = req.user?._id;
    await category.save();

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating category",
      error: error.message,
    });
  }
};

// Add attribute to category
exports.addAttribute = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, options, required } = req.body;

    const category = await DynamicCategory.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Check if attribute already exists
    const attributeExists = category.attributes.some(
      (attr) => attr.name.toLowerCase() === name.toLowerCase()
    );

    if (attributeExists) {
      return res.status(400).json({
        success: false,
        message: "Attribute already exists in this category",
      });
    }

    const newAttribute = {
      name,
      type,
      options: options || [],
      required: required || false,
      order: category.attributes.length,
    };

    category.attributes.push(newAttribute);
    category.updatedBy = req.user?._id;
    await category.save();

    res.status(200).json({
      success: true,
      message: "Attribute added successfully",
      data: category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error adding attribute",
      error: error.message,
    });
  }
};

// Update attribute in category
exports.updateAttribute = async (req, res) => {
  try {
    const { id, attributeId } = req.params;
    const { name, type, options, required } = req.body;

    const category = await DynamicCategory.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const attribute = category.attributes.id(attributeId);

    if (!attribute) {
      return res.status(404).json({
        success: false,
        message: "Attribute not found",
      });
    }

    attribute.name = name || attribute.name;
    attribute.type = type || attribute.type;
    attribute.options = options !== undefined ? options : attribute.options;
    attribute.required = required !== undefined ? required : attribute.required;

    category.updatedBy = req.user?._id;
    await category.save();

    res.status(200).json({
      success: true,
      message: "Attribute updated successfully",
      data: category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating attribute",
      error: error.message,
    });
  }
};

// Delete attribute from category
exports.deleteAttribute = async (req, res) => {
  try {
    const { id, attributeId } = req.params;

    const category = await DynamicCategory.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    category.attributes.id(attributeId).deleteOne();
    category.updatedBy = req.user?._id;
    await category.save();

    res.status(200).json({
      success: true,
      message: "Attribute deleted successfully",
      data: category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting attribute",
      error: error.message,
    });
  }
};

// Delete category
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await DynamicCategory.findByIdAndDelete(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting category",
      error: error.message,
    });
  }
};
