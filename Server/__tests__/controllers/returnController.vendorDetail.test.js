const { ObjectId } = require("mongodb");
const {
  confirmVendorReturnReceived,
  getVendorReturnById,
} = require("../../controllers/returnController");

const createMockResponse = () => {
  const res = {
    statusCode: 200,
    body: undefined,
    status: jest.fn(function status(code) {
      this.statusCode = code;
      return this;
    }),
    json: jest.fn(function json(payload) {
      this.body = payload;
      return this;
    }),
  };

  return res;
};

const createRequest = ({ returnId, vendorId, returnRequest, order = null }) => {
  const findOne = jest.fn().mockResolvedValue(order);

  return {
    req: {
      params: { id: returnId },
      user: { vendorId: vendorId.toString() },
      app: {
        locals: {
          models: {
            Return: {
              findById: jest.fn().mockResolvedValue(returnRequest),
            },
          },
          db: {
            collection: jest.fn(() => ({ findOne })),
          },
        },
      },
    },
    findOne,
  };
};

const createReceiptRequest = ({ returnId, vendorId, body = {}, confirmResult, confirmError }) => ({
  params: { id: returnId },
  body,
  user: { vendorId: vendorId?.toString() },
  app: {
    locals: {
      models: {
        Return: {
          confirmVendorReceipt: confirmError
            ? jest.fn().mockRejectedValue(confirmError)
            : jest.fn().mockResolvedValue(confirmResult || {
                confirmed: true,
                status: "processing",
                itemReceivedAt: new Date("2026-05-04T08:00:00.000Z"),
              }),
        },
      },
    },
  },
});

describe("returnController vendor detail contract", () => {
  test("returns a vendor-owned return with order context and tracker", async () => {
    const vendorId = new ObjectId();
    const returnId = new ObjectId().toString();
    const orderId = new ObjectId();
    const res = createMockResponse();
    const { req, findOne } = createRequest({
      returnId,
      vendorId,
      returnRequest: {
        _id: new ObjectId(returnId),
        vendorId,
        orderId: orderId.toString(),
        productId: new ObjectId().toString(),
        productTitle: "Premium rice",
        status: "pending",
        refundAmount: 850,
        createdAt: new Date("2026-05-01T08:00:00.000Z"),
        timeline: [
          {
            status: "submitted",
            at: new Date("2026-05-01T08:00:00.000Z"),
          },
        ],
      },
      order: {
        _id: orderId,
        orderNumber: "AMG-1001",
        status: "delivered",
        paymentMethod: "cod",
        paymentStatus: "paid",
      },
    });

    await getVendorReturnById(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(findOne).toHaveBeenCalledWith(
      { _id: orderId },
      expect.objectContaining({ projection: expect.any(Object) }),
    );
    expect(res.body).toMatchObject({
      success: true,
      data: {
        productTitle: "Premium rice",
        orderSummary: {
          orderNumber: "AMG-1001",
          status: "delivered",
        },
        vendorTracker: {
          status: "pending",
          refund: {
            amount: 850,
          },
        },
      },
    });
  });

  test("rejects a return that belongs to another vendor", async () => {
    const vendorId = new ObjectId();
    const res = createMockResponse();
    const { req } = createRequest({
      returnId: new ObjectId().toString(),
      vendorId,
      returnRequest: {
        _id: new ObjectId(),
        vendorId: new ObjectId(),
        orderId: new ObjectId().toString(),
      },
    });

    await getVendorReturnById(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.body).toEqual({
      success: false,
      error: "This return does not belong to your products",
    });
  });

  test("rejects invalid return IDs before querying the model", async () => {
    const vendorId = new ObjectId();
    const res = createMockResponse();
    const { req } = createRequest({
      returnId: "not-a-return-id",
      vendorId,
      returnRequest: null,
    });

    await getVendorReturnById(req, res);

    expect(req.app.locals.models.Return.findById).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body).toEqual({
      success: false,
      error: "Invalid return ID",
    });
  });

  test("confirms vendor return receipt with condition and quantity", async () => {
    const vendorId = new ObjectId();
    const returnId = new ObjectId().toString();
    const res = createMockResponse();
    const req = createReceiptRequest({
      returnId,
      vendorId,
      body: {
        condition: "good",
        notes: "Received sealed package",
        receivedQuantity: 2,
      },
    });

    await confirmVendorReturnReceived(req, res);

    expect(req.app.locals.models.Return.confirmVendorReceipt).toHaveBeenCalledWith(
      returnId,
      vendorId.toString(),
      {
        condition: "good",
        notes: "Received sealed package",
        receivedQuantity: 2,
      },
    );
    expect(res.body).toMatchObject({
      success: true,
      message: "Returned product receipt confirmed",
      data: {
        confirmed: true,
        status: "processing",
      },
    });
  });

  test("rejects invalid receipt quantity before updating the model", async () => {
    const res = createMockResponse();
    const req = createReceiptRequest({
      returnId: new ObjectId().toString(),
      vendorId: new ObjectId(),
      body: { receivedQuantity: 0 },
    });

    await confirmVendorReturnReceived(req, res);

    expect(req.app.locals.models.Return.confirmVendorReceipt).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body).toEqual({
      success: false,
      error: "Received quantity must be a positive number",
    });
  });
});
