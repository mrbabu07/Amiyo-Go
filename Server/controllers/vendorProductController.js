const { ObjectId } = require("mongodb");

// Get vendor's products
exports.getVendorProducts = async (req, res) => {
  try {
    const Product = req.app.locals.models.Product;
    const products = await Product.findByVendor(req.vendor._id);
    res.json({ products });
  } catch (error) {
    console.error("Error fetching vendor products:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
};

// Create product (vendor only)
exports.createProduct = async (req, res) => {
  try {
    const { 
      categoryId, 
      title, 
      description, 
      price, 
      images, 
      stock, 
      variants,
      attributes,
      status 
    } = req.body;

    const Product = req.app.locals.models.Product;
    const Vendor = req.app.locals.models.Vendor;
    const Category = req.app.locals.models.Category;

    // Validation
    if (!categoryId || !title || !price) {
      return res.status(400).json({ 
        error: "Category, title, and price are required" 
      });
    }

    // Check if category is in vendor's allowed categories
    const vendor = await Vendor.findById(req.vendor._id);
    const allowedCategoryIds = vendor.allowedCategoryIds.map(id => id.toString());
    
    if (!allowedCategoryIds.includes(categoryId)) {
      return res.status(403).json({ 
        error: "You are not allowed to add products in this category" 
      });
    }

    // Verify category exists and is active
    const category = await Category.findById(categoryId);
    if (!category || !category.isActive) {
      return res.status(400).json({ 
        error: "Invalid or inactive category" 
      });
    }

    // Create product
    const productData = {
      vendorId: req.vendor._id,
      categoryId,
      title,
      description: description || "",
      price: parseFloat(price),
      images: images || [],
      stock: stock !== undefined ? parseInt(stock) : 0,
      variants: variants || [],
      attributes: attributes || {},
      status: status || "active",
      approvalStatus: "pending",   // Requires admin approval before appearing publicly
    };

    const productId = await Product.create(productData);
    const product = await Product.findById(productId);

    res.status(201).json({
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ error: "Failed to create product" });
  }
};

// Update product (vendor only)
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      categoryId, 
      title, 
      description, 
      price, 
      images, 
      stock, 
      variants,
      attributes,
      status 
    } = req.body;

    const Product = req.app.locals.models.Product;
    const Vendor = req.app.locals.models.Vendor;
    const Category = req.app.locals.models.Category;

    // Check if product exists and belongs to vendor
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (product.vendorId.toString() !== req.vendor._id.toString()) {
      return res.status(403).json({ 
        error: "You don't have permission to update this product" 
      });
    }

    // If changing category, verify it's in allowed categories
    if (categoryId && categoryId !== product.categoryId.toString()) {
      const vendor = await Vendor.findById(req.vendor._id);
      const allowedCategoryIds = vendor.allowedCategoryIds.map(id => id.toString());
      
      if (!allowedCategoryIds.includes(categoryId)) {
        return res.status(403).json({ 
          error: "You are not allowed to move products to this category" 
        });
      }

      const category = await Category.findById(categoryId);
      if (!category || !category.isActive) {
        return res.status(400).json({ 
          error: "Invalid or inactive category" 
        });
      }
    }

    // Update product
    const updateData = {};
    if (categoryId) updateData.categoryId = categoryId;
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (price) updateData.price = parseFloat(price);
    if (images) updateData.images = images;
    if (stock !== undefined) updateData.stock = parseInt(stock);
    if (variants) updateData.variants = variants;
    if (attributes) updateData.attributes = attributes;
    if (status) updateData.status = status;

    await Product.update(id, updateData);
    const updatedProduct = await Product.findById(id);

    res.json({
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: "Failed to update product" });
  }
};

// Delete product (vendor only)
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const Product = req.app.locals.models.Product;

    // Check if product exists and belongs to vendor
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (product.vendorId.toString() !== req.vendor._id.toString()) {
      return res.status(403).json({ 
        error: "You don't have permission to delete this product" 
      });
    }

    await Product.delete(id);

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: "Failed to delete product" });
  }
};

// Get product by ID (vendor only - their own products)
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const Product = req.app.locals.models.Product;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (product.vendorId.toString() !== req.vendor._id.toString()) {
      return res.status(403).json({ 
        error: "You don't have permission to view this product" 
      });
    }

    res.json({ product });
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ error: "Failed to fetch product" });
  }
};
