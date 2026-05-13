const rewardController = require("../../controllers/rewardController");

const buildResponse = () => {
  const res = {
    status: jest.fn(() => res),
    json: jest.fn(() => res),
  };
  return res;
};

const activeCoupon = {
  _id: "coupon-1",
  code: "SAVE10",
  discountType: "percentage",
  discountValue: 10,
  minOrderAmount: 500,
  usedCount: 0,
  usageLimit: 25,
  isActive: true,
  expiresAt: new Date("2030-01-01T00:00:00.000Z"),
};

const buildRequest = ({ spin = null, coupons = [activeCoupon] } = {}) => {
  const rewardSpins = {
    createIndex: jest.fn().mockResolvedValue(undefined),
    findOne: jest.fn().mockResolvedValue(spin),
    insertOne: jest.fn().mockResolvedValue({ insertedId: "spin-1" }),
  };

  const Coupon = {
    getActiveCoupons: jest.fn().mockResolvedValue(coupons),
  };

  const req = {
    user: { uid: "firebase-user-1" },
    app: {
      locals: {
        db: {
          collection: jest.fn(() => rewardSpins),
        },
        models: { Coupon },
      },
    },
  };

  return { req, rewardSpins, Coupon };
};

describe("rewardController", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("getStatus allows spin when user has not spun and coupons are available", async () => {
    const { req, Coupon } = buildRequest();
    const res = buildResponse();

    await rewardController.getStatus(req, res);

    expect(Coupon.getActiveCoupons).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        canSpin: true,
        hasSpunToday: false,
        disabledReason: null,
        lastSpin: null,
        segments: [
          expect.objectContaining({
            id: "coupon-1",
            value: "SAVE10",
            type: "coupon",
            couponCode: "SAVE10",
            minOrderAmount: 500,
          }),
        ],
      }),
    });
  });

  test("getStatus disables spin when no active coupons are available", async () => {
    const { req } = buildRequest({ coupons: [] });
    const res = buildResponse();

    await rewardController.getStatus(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        canSpin: false,
        hasSpunToday: false,
        disabledReason: "No active admin coupons are available for spin rewards.",
        segments: [],
      }),
    });
  });

  test("getStatus formats fixed discount coupon labels with BDT symbol", async () => {
    const { req } = buildRequest({
      coupons: [{
        ...activeCoupon,
        _id: "coupon-2",
        code: "TAKA50",
        discountType: "fixed",
        discountValue: 50,
      }],
    });
    const res = buildResponse();

    await rewardController.getStatus(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        segments: [
          expect.objectContaining({
            label: "\u09F350 OFF",
            couponCode: "TAKA50",
          }),
        ],
      }),
    });
  });

  test("spin records a selected coupon prize", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const { req, rewardSpins } = buildRequest();
    const res = buildResponse();

    await rewardController.spin(req, res);

    expect(rewardSpins.createIndex).toHaveBeenCalledWith(
      { userId: 1, dateKey: 1 },
      { unique: true },
    );
    expect(rewardSpins.insertOne).toHaveBeenCalledWith(expect.objectContaining({
      userId: "firebase-user-1",
      prize: expect.objectContaining({
        id: "coupon-1",
        type: "coupon",
        couponCode: "SAVE10",
      }),
    }));
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        prize: expect.objectContaining({ couponCode: "SAVE10" }),
        message: expect.stringContaining("SAVE10"),
      }),
    });
  });

  test("spin rejects a duplicate daily spin", async () => {
    const existingSpin = { userId: "firebase-user-1", prize: { type: "none" } };
    const { req, rewardSpins } = buildRequest({ spin: existingSpin });
    const res = buildResponse();

    await rewardController.spin(req, res);

    expect(rewardSpins.insertOne).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "You already used today's spin.",
      data: existingSpin,
    });
  });
});
