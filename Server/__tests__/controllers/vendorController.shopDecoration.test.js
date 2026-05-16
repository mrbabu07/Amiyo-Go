const { ObjectId } = require("mongodb");
const {
  getMyVendorProfile,
  getVendorPublicInfo,
  getVendorPublicInfoBySlug,
  updateVendorProfile,
} = require("../../controllers/vendorController");

const createRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const buildPublicModels = ({ vendor, vendorShop }) => ({
  Vendor: {
    findById: jest.fn().mockResolvedValue(vendor),
    findBySlug: jest.fn().mockResolvedValue(vendor),
  },
  VendorShop: {
    findByVendorId: jest.fn().mockResolvedValue(vendorShop),
  },
  Product: {
    collection: {
      countDocuments: jest.fn().mockResolvedValue(2),
      find: jest.fn(() => ({
        project: jest.fn(() => ({
          toArray: jest.fn().mockResolvedValue([]),
        })),
      })),
    },
  },
  Review: {
    collection: {
      aggregate: jest.fn(() => ({
        toArray: jest.fn().mockResolvedValue([]),
      })),
    },
  },
  VendorOrder: {
    collection: {
      aggregate: jest.fn(() => ({
        toArray: jest.fn().mockResolvedValue([{ totalSales: 4 }]),
      })),
    },
  },
});

describe("vendorController shop decoration", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("getMyVendorProfile merges persisted VendorShop decoration fields", async () => {
    const vendorId = new ObjectId();
    const vendor = {
      _id: vendorId,
      ownerUserId: new ObjectId(),
      shopName: "Base Shop",
      slug: "base-shop",
    };
    const vendorShop = {
      _id: new ObjectId(),
      shopName: "Decorated Shop",
      slug: "decorated-shop",
      tagline: "Fresh every day",
      shippingNotes: "Inside Dhaka in 24 hours",
      shopDecoration: {
        categoryTabs: [{ id: "sale", label: "Sale", productIds: ["p1"] }],
      },
    };

    const req = {
      user: { _id: vendor.ownerUserId.toString() },
      app: {
        locals: {
          models: {
            Vendor: { findByUserId: jest.fn().mockResolvedValue(vendor) },
            VendorShop: { findByVendorId: jest.fn().mockResolvedValue(vendorShop) },
          },
        },
      },
    };
    const res = createRes();

    await getMyVendorProfile(req, res);

    expect(res.json).toHaveBeenCalledWith({
      vendor: expect.objectContaining({
        shopName: "Decorated Shop",
        slug: "decorated-shop",
        tagline: "Fresh every day",
        shippingNotes: "Inside Dhaka in 24 hours",
        shopDecoration: expect.objectContaining({
          categoryTabs: [expect.objectContaining({ label: "Sale" })],
        }),
      }),
    });
  });

  test("updateVendorProfile normalizes shop slug and persists decoration to VendorShop", async () => {
    const vendorId = new ObjectId();
    const ownerUserId = new ObjectId();
    const vendor = {
      _id: vendorId,
      ownerUserId,
      shopName: "Base Shop",
      slug: "base-shop",
    };
    const update = jest.fn().mockResolvedValue({ modifiedCount: 1 });
    const upsertForVendor = jest.fn().mockResolvedValue({});
    const req = {
      user: { _id: ownerUserId.toString() },
      body: {
        slug: " My Brand! ",
        tagline: "Made in Bangladesh",
        shippingNotes: "Ships by courier",
        shopDecoration: {
          featuredCarousel: { productIds: ["p1", "p2"] },
          couponBanner: { enabled: true, voucherId: "v1" },
        },
      },
      app: {
        locals: {
          models: {
            Vendor: {
              findByUserId: jest.fn().mockResolvedValue(vendor),
              findBySlug: jest.fn().mockResolvedValue(null),
              update,
              findById: jest.fn().mockResolvedValue({ ...vendor, slug: "my-brand" }),
            },
            VendorShop: {
              collection: { findOne: jest.fn().mockResolvedValue(null) },
              upsertForVendor,
            },
          },
        },
      },
    };
    const res = createRes();

    await updateVendorProfile(req, res);

    expect(update).toHaveBeenCalledWith(
      vendorId,
      expect.objectContaining({
        slug: "my-brand",
        tagline: "Made in Bangladesh",
        shippingNotes: "Ships by courier",
        shopDecoration: expect.objectContaining({
          couponBanner: expect.objectContaining({ enabled: true }),
        }),
      }),
    );
    expect(upsertForVendor).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "my-brand" }),
      expect.objectContaining({ slug: "my-brand" }),
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: "Vendor profile updated successfully",
    }));
  });

  test("public vendor info exposes decoration and can be resolved by shop slug", async () => {
    const vendorId = new ObjectId();
    const vendor = {
      _id: vendorId,
      status: "approved",
      shopName: "Base Shop",
      slug: "base-shop",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    };
    const vendorShop = {
      _id: new ObjectId(),
      shopName: "Decorated Shop",
      slug: "decorated-shop",
      tagline: "Local marketplace seller",
      returnPolicy: "Returns within 3 days",
      processingTime: "24 hours",
      shippingNotes: "Courier across Bangladesh",
      shopDecoration: {
        campaignMode: { enabled: true, title: "Eid Sale" },
      },
    };
    const models = buildPublicModels({ vendor, vendorShop });

    const req = {
      params: { id: vendorId.toString() },
      app: { locals: { models } },
    };
    const res = createRes();
    await getVendorPublicInfo(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        shopName: "Decorated Shop",
        slug: "decorated-shop",
        tagline: "Local marketplace seller",
        returnPolicy: "Returns within 3 days",
        processingTime: "24 hours",
        shippingNotes: "Courier across Bangladesh",
        shopDecoration: expect.objectContaining({
          campaignMode: expect.objectContaining({ title: "Eid Sale" }),
        }),
      }),
    });

    const slugReq = {
      params: { slug: " Decorated Shop " },
      app: { locals: { models } },
    };
    const slugRes = createRes();
    await getVendorPublicInfoBySlug(slugReq, slugRes);

    expect(models.Vendor.findBySlug).toHaveBeenCalledWith("decorated-shop");
    expect(slugRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
