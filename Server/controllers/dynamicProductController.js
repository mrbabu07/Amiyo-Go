const DynamicProduct = require("../models/DynamicProduct");
const DynamicCategory = require("../models/DynamicCategory");

// Create a new product with dynamic attributes
exports.createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      discountPrice,
      image,
      images,
      category,
      stock,
      sku,
      dynamicAttributes,
    } = req.body;

    // Validate category exists
    const categoryExists = await DynamicCategory.findById(category);
    if (!categoryExists) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Check for duplicate SKU
    if (sku) {
      const skuExists = await DynamicProduct.findOne({ sku });
      if (skuExists) {
        return res.status(400).json({
          success: false,
          message: "Product with this SKU already exists",
        });
      }
    }

    const product = new DynamicProduct({
      name,
      description,
      price,
      discountPrice,
      image,
      images: images || [],
      category,
      stock,
      sku,
      dynamicAttributes: dynamicAttributes || {},
      createdBy: req.user?._id,
    });

    await product.save();
    await product.populate("category");

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating product",
      error: error.message,
    });
  }
};

// Get all products
exports.getAllProducts = async (req, res) => {
  try {
    const { category, isActive, search, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (category) {
      filter.category = category;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const products = await DynamicProduct.find(filter)
      .populate("category", "name slug attributes")
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await DynamicProduct.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: products,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching products",
      error: error.message,
    });
  }
};

// Get product by ID
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await DynamicProduct.findById(id).populate(
      "category",
      "name slug attributes"
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching product",
      error: error.message,
    });
  }
};

// Get product by slug
exports.getProductBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const product = await DynamicProduct.findOne({ slug }).populate(
      "category",
      "name slug attributes"
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching product",
      error: error.message,
    });
  }
};

// Update product
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      price,
      discountPrice,
      image,
      images,
      stock,
      sku,
      dynamicAttributes,
      isActive,
    } = req.body;

    const product = await DynamicProduct.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Check for duplicate SKU if changed
    if (sku && sku !== product.sku) {
      const skuExists = await DynamicProduct.findOne({ sku });
      if (skuExists) {
        return res.status(400).json({
          success: false,
          message: "Product with this SKU already exists",
        });
      }
    }

    product.name = name || product.name;
    product.description = description || product.description;
    product.price = price !== undefined ? price : product.price;
    product.discountPrice =
      discountPrice !== undefined ? discountPrice : product.discountPrice;
    product.image = image || product.image;
    product.images = images || product.images;
    product.stock = stock !== undefined ? stock : product.stock;
    product.sku = sku || product.sku;
    product.isActive = isActive !== undefined ? isActive : product.isActive;

    if (dynamicAttributes) {
      product.dynamicAttributes = dynamicAttributes;
    }

    product.updatedBy = req.user?._id;
    await product.save();
    await product.populate("category", "name slug attributes");

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating product",
      error: error.message,
    });
  }
};

// Delete product
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await DynamicProduct.findByIdAndDelete(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting product",
      error: error.message,
    });
  }
};

// Get products by category with attributes
exports.getProductsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const category = await DynamicCategory.findById(categoryId);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const skip = (page - 1) * limit;

    const products = await DynamicProduct.find({
      category: categoryId,
      isActive: true,
    })
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await DynamicProduct.countDocuments({
      category: categoryId,
      isActive: true,
    });

    res.status(200).json({
      success: true,
      data: products,
      category: {
        id: category._id,
        name: category.name,
        attributes: category.attributes,
      },
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching products",
      error: error.message,
    });
  }
};
