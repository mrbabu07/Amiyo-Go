const {
  createVendorMarketingItem,
  reviewAdminMarketingItem,
  listPublicVendorMarketingItems,
} = require("../../controllers/vendorMarketingController");

const createRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe("vendorMarketingController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("createVendorMarketingItem rejects duplicate pending/approved voucher codes for the same vendor", async () => {
    const findOne = jest.fn().mockResolvedValue({ _id: "existing-voucher" });
    const req = {
      body: {
        type: "voucher",
        title: "New Voucher",
        description: "Save on store items",
        code: "SAVE10",
        discountType: "percentage",
        discountValue: 10,
        startDate: new Date(Date.now() + 60_000).toISOString(),
        endDate: new Date(Date.now() + 120_000).toISOString(),
      },
      user: { vendorId: "vendor-1", _id: "user-1", email: "seller@example.com" },
      app: {
        locals: {
          db: { collection: jest.fn(() => ({ findOne })) },
        },
      },
    };
    const res = createRes();

    await createVendorMarketingItem(req, res);

    expect(findOne).toHaveBeenCalledWith({
      vendorId: "vendor-1",
      type: "voucher",
      code: "SAVE10",
      status: { $in: ["pending", "approved"] },
    });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "This voucher code is already in use for your store.",
    });
  });

  test("reviewAdminMarketingItem requires rejection notes and approves valid items", async () => {
    const collection = {
      findOne: jest.fn()
        .mockResolvedValueOnce({ _id: "marketing-1", status: "pending" })
        .mockResolvedValueOnce({
          _id: "marketing-1",
          status: "approved",
          vendorId: "vendor-1",
          adminNotes: "Looks good",
        }),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    };

    const rejectReq = {
      params: { id: "507f1f77bcf86cd799439011" },
      body: { status: "rejected", adminNotes: "" },
      app: { locals: { db: { collection: jest.fn(() => collection) } } },
    };
    const rejectRes = createRes();
    await reviewAdminMarketingItem(rejectReq, rejectRes);
    expect(rejectRes.status).toHaveBeenCalledWith(400);

    const approveReq = {
      params: { id: "507f1f77bcf86cd799439011" },
      body: { status: "approved", adminNotes: "Looks good" },
      user: { _id: "admin-1" },
      app: { locals: { db: { collection: jest.fn(() => collection) } } },
    };
    const approveRes = createRes();
    await reviewAdminMarketingItem(approveReq, approveRes);

    expect(collection.updateOne).toHaveBeenCalled();
    expect(approveRes.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        _id: "marketing-1",
        status: "approved",
        vendorId: "vendor-1",
      }),
      message: "Vendor marketing submission approved.",
    });
  });

  test("listPublicVendorMarketingItems returns only approved active vendor items for approved vendors", async () => {
    const toArray = jest.fn().mockResolvedValue([
      { _id: "voucher-1", type: "voucher", vendorId: "507f1f77bcf86cd799439011", status: "approved" },
    ]);
    const sort = jest.fn(() => ({ toArray }));
    const find = jest.fn(() => ({ sort }));

    const req = {
      params: { id: "507f1f77bcf86cd799439011" },
      query: { type: "voucher" },
      app: {
        locals: {
          db: { collection: jest.fn(() => ({ find })) },
          models: {
            Vendor: {
              findById: jest.fn().mockResolvedValue({ _id: "507f1f77bcf86cd799439011", status: "approved" }),
            },
          },
        },
      },
    };
    const res = createRes();

    await listPublicVendorMarketingItems(req, res);

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        vendorId: "507f1f77bcf86cd799439011",
        status: "approved",
        type: "voucher",
      }),
    );
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [expect.objectContaining({ _id: "voucher-1", type: "voucher" })],
    });
  });
});
