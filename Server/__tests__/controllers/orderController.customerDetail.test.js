const { ObjectId } = require("mongodb");

jest.mock("../../services/orderEventService", () => ({
  appendOrderEvent: jest.fn(async () => null),
  getTimelineForOrder: jest.fn(async () => []),
}));

jest.mock("../../services/emailService", () => ({}));
jest.mock("../../services/invoiceService", () => ({}));

const { getUserOrderById } = require("../../controllers/orderController");

const createRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const createOrder = (overrides = {}) => ({
  _id: new ObjectId("6a0b2a08063b3d7fdd3556fe"),
  userId: "customer-1",
  status: "processing",
  paymentMethod: "cod",
  total: 360,
  subtotal: 320,
  deliveryFee: 40,
  createdAt: new Date("2026-05-18T08:00:00.000Z"),
  statusHistory: [
    {
      status: "processing",
      changedAt: new Date("2026-05-18T09:00:00.000Z"),
      changedBy: "internal-user",
      note: "Internal note",
    },
  ],
  notes: [{ text: "Admin-only note" }],
  totalCommission: 32,
  totalVendorEarnings: 288,
  products: [
    {
      productId: "product-1",
      title: "Fresh grocery box",
      price: 320,
      quantity: 1,
      vendorId: "vendor-1",
      vendorName: "Daily Needs Store",
      adminCommissionAmount: 32,
      vendorEarningAmount: 288,
      commissionRateSnapshot: 10,
    },
  ],
  ...overrides,
});

const createReq = ({ order, user = {}, dbUser = null, returns = [] } = {}) => ({
  params: { id: "6a0b2a08063b3d7fdd3556fe" },
  user: { uid: "customer-1", role: "user", ...user },
  dbUser,
  app: {
    locals: {
      models: {
        Order: {
          findById: jest.fn(async () => order),
        },
        Return: {
          findByUserId: jest.fn(async () => returns),
        },
      },
    },
  },
});

describe("orderController.getUserOrderById", () => {
  it("returns a customer-safe order detail for the order owner", async () => {
    const order = createOrder();
    const req = createReq({ order });
    const res = createRes();

    await getUserOrderById(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          _id: order._id,
          userId: "customer-1",
          customerExperience: expect.objectContaining({
            orderId: "6a0b2a08063b3d7fdd3556fe",
          }),
        }),
      }),
    );

    const detail = res.json.mock.calls[0][0].data;
    expect(detail.notes).toBeUndefined();
    expect(detail.totalCommission).toBeUndefined();
    expect(detail.products[0].adminCommissionAmount).toBeUndefined();
    expect(detail.products[0].vendorEarningAmount).toBeUndefined();
    expect(detail.statusHistory[0]).toEqual({
      status: "processing",
      changedAt: order.statusHistory[0].changedAt,
    });
  });

  it("allows staff roles to inspect the customer-safe detail response", async () => {
    const req = createReq({
      order: createOrder(),
      user: { uid: "support-1", role: "support" },
      dbUser: { role: "support" },
    });
    const res = createRes();

    await getUserOrderById(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json.mock.calls[0][0].data.products[0].adminCommissionAmount).toBeUndefined();
  });

  it("blocks another customer from opening the order detail", async () => {
    const req = createReq({
      order: createOrder(),
      user: { uid: "customer-2", role: "user" },
    });
    const res = createRes();

    await getUserOrderById(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "Access denied",
    });
  });

  it("rejects malformed order ids before querying", async () => {
    const req = createReq({ order: createOrder() });
    req.params.id = "not-an-order-id";
    const res = createRes();

    await getUserOrderById(req, res);

    expect(req.app.locals.models.Order.findById).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "Invalid order id",
    });
  });
});
