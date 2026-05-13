jest.mock("../../models/Offer", () => ({
  findOne: jest.fn(),
}));

const Offer = require("../../models/Offer");
const { validateCoupon } = require("../../controllers/couponController");

const createRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe("couponController.validateCoupon vendor voucher flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns approved vendor voucher data when coupon validation fails but store voucher matches", async () => {
    const Coupon = {
      validateCoupon: jest.fn().mockResolvedValue({ valid: false }),
    };
    const findOne = jest.fn().mockResolvedValue({
      _id: "voucher-1",
      code: "SHOP10",
      title: "Store Voucher",
      description: "Save on this seller",
      discountType: "percentage",
      discountValue: 10,
      vendorId: "vendor-1",
      vendorName: "Village Store",
      minOrderAmount: 100,
      status: "approved",
      startDate: new Date(Date.now() - 1000),
      endDate: new Date(Date.now() + 60_000),
    });

    const req = {
      body: {
        code: "shop10",
        orderTotal: 300,
        items: [
          { vendorId: "vendor-1", price: 200, quantity: 1 },
          { vendorId: "vendor-2", price: 100, quantity: 1 },
        ],
      },
      user: { uid: "user-1" },
      app: {
        locals: {
          db: { collection: jest.fn(() => ({ findOne })) },
          models: { Coupon },
        },
      },
    };
    const res = createRes();

    await validateCoupon(req, res);

    expect(Coupon.validateCoupon).toHaveBeenCalledWith("shop10", 300, "user-1");
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        discountAmount: 20,
        finalTotal: 280,
        scopeVendorId: "vendor-1",
        vendorSubtotal: 200,
        coupon: expect.objectContaining({
          code: "SHOP10",
          type: "vendor_voucher",
          vendorName: "Village Store",
        }),
      }),
    });
  });

  test("returns 400 when store voucher exists but cart has no matching vendor items", async () => {
    const Coupon = {
      validateCoupon: jest.fn().mockResolvedValue({ valid: false }),
    };
    const findOne = jest.fn().mockResolvedValue({
      _id: "voucher-1",
      code: "SHOP10",
      title: "Store Voucher",
      description: "Save on this seller",
      discountType: "fixed",
      discountValue: 50,
      vendorId: "vendor-1",
      vendorName: "Village Store",
      status: "approved",
      startDate: new Date(Date.now() - 1000),
      endDate: new Date(Date.now() + 60_000),
    });

    const req = {
      body: {
        code: "SHOP10",
        orderTotal: 300,
        items: [{ vendorId: "vendor-2", price: 300, quantity: 1 }],
      },
      app: {
        locals: {
          db: { collection: jest.fn(() => ({ findOne })) },
          models: { Coupon },
        },
      },
    };
    const res = createRes();

    await validateCoupon(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "This voucher only works for products from the selected store.",
    });
    expect(Offer.findOne).not.toHaveBeenCalled();
  });
});
