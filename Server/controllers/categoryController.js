const getAllCategories = async (req, res) => {
  try {
    const Category = req.app.locals.models.Category;
    const { tree, active } = req.query;

    let categories;
    if (tree === 'true') {
      categories = await Category.getCategoryTree();
    } else if (active === 'true') {
      categories = await Category.findActive();
    } else {
      categories = await Category.findAll();
    }

    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getCategoryById = async (req, res) => {
  try {
    const Category = req.app.locals.models.Category;
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res
        .status(404)
        .json({ success: false, error: "Category not found" });
    }

    res.json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getCategoryChildren = async (req, res) => {
  try {
    const Category = req.app.locals.models.Category;
    const children = await Category.findChildren(req.params.id);
    res.json({ success: true, data: children });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const createCategory = async (req, res) => {
  try {
    const Category = req.app.locals.models.Category;
    const { name, slug, parentId, isActive } = req.body;

    if (!name || !slug) {
      return res
        .status(400)
        .json({ success: false, error: "Name and slug required" });
    }

    // Check if slug already exists
    const existing = await Category.findBySlug(slug);
    if (existing) {
      return res
        .status(400)
        .json({ success: false, error: "Slug already exists" });
    }

    // If parentId provided, verify it exists
    if (parentId) {
      const parent = await Category.findById(parentId);
      if (!parent) {
        return res
          .status(400)
          .json({ success: false, error: "Parent category not found" });
      }
    }

    const category = await Category.create({ 
      name, 
      slug, 
      parentId: parentId || null,
      isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const updateCategory = async (req, res) => {
  try {
    const Category = req.app.locals.models.Category;
    const { slug, parentId } = req.body;

    // If updating slug, check it doesn't exist
    if (slug) {
      const existing = await Category.findBySlug(slug);
      if (existing && existing._id.toString() !== req.params.id) {
        return res
          .status(400)
          .json({ success: false, error: "Slug already exists" });
      }
    }

    // If updating parentId, verify it exists and not creating circular reference
    if (parentId) {
      if (parentId === req.params.id) {
        return res
          .status(400)
          .json({ success: false, error: "Category cannot be its own parent" });
      }
      const parent = await Category.findById(parentId);
      if (!parent) {
        return res
          .status(400)
          .json({ success: false, error: "Parent category not found" });
      }
    }

    const result = await Category.update(req.params.id, req.body);

    if (result.matchedCount === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Category not found" });
    }

    const updated = await Category.findById(req.params.id);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const Category = req.app.locals.models.Category;
    
    // Soft delete by default
    const result = await Category.softDelete(req.params.id);

    if (result.matchedCount === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Category not found" });
    }

    res.json({ success: true, message: "Category deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const updateCommissionRate = async (req, res) => {
  try {
    const Category = req.app.locals.models.Category;
    const { commissionRate } = req.body;

    if (commissionRate === undefined) {
      return res
        .status(400)
        .json({ success: false, error: "Commission rate is required" });
    }

    if (typeof commissionRate !== 'number' || commissionRate < 0 || commissionRate > 100) {
      return res
        .status(400)
        .json({ success: false, error: "Commission rate must be a number between 0 and 100" });
    }

    const result = await Category.update(req.params.id, { commissionRate });

    if (result.matchedCount === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Category not found" });
    }

    const updated = await Category.findById(req.params.id);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllCategories,
  getCategoryById,
  getCategoryChildren,
  createCategory,
  updateCategory,
  deleteCategory,
  updateCommissionRate,
};
