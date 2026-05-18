const { ObjectId } = require("mongodb");
const categoryRequestController = require("../../controllers/categoryRequestController");

const createRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const buildReq = ({ body = {}, models, vendorId = new ObjectId() }) => ({
  body,
  user: { vendorId },
  app: { locals: { models } },
});

describe("categoryRequestController", () => {
  test("createCategoryRequest stores selected category group and path metadata", async () => {
    const vendorId = new ObjectId();
    const rootId = new ObjectId();
    const childId = new ObjectId();
    const root = { _id: rootId, name: "Grocery", parentId: null, isActive: true };
    const child = { _id: childId, name: "Vegetables", parentId: rootId, isActive: true };

    const Category = {
      findById: jest.fn(async (id) => {
        const key = id.toString();
        if (key === childId.toString()) return child;
        if (key === rootId.toString()) return root;
        return null;
      }),
    };
    const CategoryRequest = {
      findByVendorId: jest.fn().mockResolvedValue([]),
      create: jest.fn(async (payload) => ({ ...payload, _id: new ObjectId() })),
    };
    const Vendor = {
      findById: jest.fn().mockResolvedValue({
        _id: vendorId,
        shopName: "Daily Seller",
        email: "seller@example.com",
        allowedCategoryIds: [],
      }),
    };

    const req = buildReq({
      vendorId,
      body: {
        categoryId: childId.toString(),
        description: "Fresh daily vegetables",
        reason: "We sell local produce",
      },
      models: { Category, CategoryRequest, Vendor },
    });
    const res = createRes();

    await categoryRequestController.createCategoryRequest(req, res);

    expect(CategoryRequest.create).toHaveBeenCalledWith(expect.objectContaining({
      vendorId,
      vendorName: "Daily Seller",
      vendorEmail: "seller@example.com",
      categoryName: "Vegetables",
      requestedCategoryId: childId,
      categoryPath: "Grocery > Vegetables",
      rootCategoryId: rootId,
      rootCategoryName: "Grocery",
      parentCategoryId: rootId,
      parentCategoryName: "Grocery",
      description: "Fresh daily vegetables",
      reason: "We sell local produce",
    }));
    expect(CategoryRequest.create.mock.calls[0][0].requestedCategoryPath.map((item) => item.name)).toEqual([
      "Grocery",
      "Vegetables",
    ]);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test("approveCategoryRequest grants access by saved category id before falling back to name", async () => {
    const vendorId = new ObjectId();
    const requestId = new ObjectId();
    const categoryId = new ObjectId();
    const category = { _id: categoryId, name: "Vegetables" };

    const Category = {
      findById: jest.fn().mockResolvedValue(category),
      collection: { findOne: jest.fn() },
    };
    const CategoryRequest = {
      findById: jest.fn().mockResolvedValue({
        _id: requestId,
        vendorId,
        categoryName: "Vegetables",
        requestedCategoryId: categoryId,
        status: "pending",
      }),
      updateStatus: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    };
    const Vendor = {
      findById: jest.fn().mockResolvedValue({ _id: vendorId, allowedCategoryIds: [] }),
      collection: { updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }) },
    };

    const req = {
      params: { requestId: requestId.toString() },
      body: { adminNote: "Approved for grocery range" },
      app: { locals: { models: { Category, CategoryRequest, Vendor } } },
    };
    const res = createRes();

    await categoryRequestController.approveCategoryRequest(req, res);

    expect(Category.findById).toHaveBeenCalledWith(categoryId);
    expect(Category.collection.findOne).not.toHaveBeenCalled();
    expect(Vendor.collection.updateOne).toHaveBeenCalledWith(
      { _id: new ObjectId(vendorId) },
      { $addToSet: { allowedCategoryIds: categoryId } },
    );
    expect(CategoryRequest.updateStatus).toHaveBeenCalledWith(
      requestId.toString(),
      "approved",
      "Approved for grocery range",
      categoryId,
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      message: "Category request approved. Vendor can now use this category.",
    }));
  });
});
