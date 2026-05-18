const { ObjectId } = require("mongodb");
const Return = require("../../models/Return");

const chainFind = (items = []) => ({
  sort: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  toArray: jest.fn().mockResolvedValue(items),
});

const buildReturnModel = ({ existingReturn = null, findItems = [] } = {}) => {
  const findChain = chainFind(findItems);
  const collection = {
    find: jest.fn(() => findChain),
    findOne: jest.fn().mockResolvedValue(existingReturn),
    countDocuments: jest.fn().mockResolvedValue(findItems.length),
    updateOne: jest.fn().mockResolvedValue({ matchedCount: 1, modifiedCount: 1 }),
  };
  return {
    model: new Return({ collection: jest.fn(() => collection) }),
    collection,
    findChain,
  };
};

describe("Return model vendor responses", () => {
  test("findByVendorId matches string and ObjectId vendor IDs", async () => {
    const vendorId = "64f000000000000000000021";
    const { model, collection } = buildReturnModel();

    await model.findByVendorId(vendorId, { limit: 10 });

    expect(collection.find).toHaveBeenCalledWith({
      vendorId: { $in: [vendorId, new ObjectId(vendorId)] },
    });
  });

  test("vendorRespond can reject a pending return with evidence notes", async () => {
    const vendorId = "64f000000000000000000022";
    const returnId = "64f000000000000000000023";
    const { model, collection } = buildReturnModel({
      existingReturn: {
        _id: new ObjectId(returnId),
        vendorId: new ObjectId(vendorId),
        status: "pending",
        vendorResponse: null,
      },
    });

    await model.vendorRespond(returnId, vendorId, {
      action: "rejected",
      disputeReason: "Wrong item was returned",
      notes: "Seal photo attached",
      evidenceImages: ["https://example.com/evidence.jpg"],
    });

    expect(collection.updateOne).toHaveBeenCalledWith(
      { _id: new ObjectId(returnId) },
      expect.objectContaining({
        $set: expect.objectContaining({
          vendorResponse: "rejected",
          status: "rejected",
          disputeReason: "Wrong item was returned",
          vendorResponseNotes: "Seal photo attached",
          vendorEvidenceImages: ["https://example.com/evidence.jpg"],
        }),
        $push: expect.objectContaining({
          timeline: expect.objectContaining({
            status: "rejected",
            label: "Vendor rejected return",
            actorRole: "vendor",
          }),
        }),
      }),
    );
  });

  test("vendorRespond derives deduction when vendor approves a return", async () => {
    const vendorId = "64f000000000000000000031";
    const returnId = "64f000000000000000000032";
    const { model, collection } = buildReturnModel({
      existingReturn: {
        _id: new ObjectId(returnId),
        vendorId: new ObjectId(vendorId),
        status: "pending",
        vendorResponse: null,
        refundAmount: 10000,
        adminCommissionAmount: 0,
        vendorEarningAmount: 0,
        vendorDeduction: 0,
      },
    });

    await model.vendorRespond(returnId, vendorId, {
      action: "approved",
      notes: "Accepted customer return",
    });

    expect(collection.updateOne).toHaveBeenCalledWith(
      { _id: new ObjectId(returnId) },
      expect.objectContaining({
        $set: expect.objectContaining({
          vendorResponse: "approved",
          status: "approved",
          adminRefund: 10000,
          vendorDeduction: 10000,
        }),
      }),
    );
  });

  test("updateStatus derives vendor deduction when completed returns have no stored earning", async () => {
    const returnId = "64f000000000000000000024";
    const { model, collection } = buildReturnModel({
      existingReturn: {
        _id: new ObjectId(returnId),
        vendorId: "64f000000000000000000025",
        status: "approved",
        refundAmount: 10000,
        adminCommissionAmount: 1000,
        vendorEarningAmount: 0,
        vendorDeduction: 0,
      },
    });

    await model.updateStatus(returnId, "completed");

    expect(collection.updateOne).toHaveBeenCalledWith(
      { _id: new ObjectId(returnId) },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: "completed",
          adminRefund: 10000,
          vendorDeduction: 9000,
          completedAt: expect.any(Date),
        }),
      }),
    );
  });

  test("processRefund stores vendor deduction during refund completion", async () => {
    const returnId = "64f000000000000000000026";
    const { model, collection } = buildReturnModel({
      existingReturn: {
        _id: new ObjectId(returnId),
        vendorId: "64f000000000000000000027",
        status: "approved",
        refundAmount: 0,
        adminCommissionAmount: 150,
        vendorEarningAmount: 850,
        vendorDeduction: 0,
      },
    });

    await model.processRefund(returnId, 1000, "bkash");

    expect(collection.updateOne).toHaveBeenCalledWith(
      { _id: new ObjectId(returnId) },
      expect.objectContaining({
        $set: expect.objectContaining({
          refundAmount: 1000,
          refundMethod: "bkash",
          adminRefund: 1000,
          vendorDeduction: 850,
          status: "completed",
          completedAt: expect.any(Date),
          refundProcessedAt: expect.any(Date),
        }),
      }),
    );
  });

  test("getVendorDeductions includes fallback deduction for old completed returns", async () => {
    const vendorId = "64f000000000000000000028";
    const orderId = "64f000000000000000000029";
    const returnId = new ObjectId("64f000000000000000000030");
    const { model, collection } = buildReturnModel({
      findItems: [
        {
          _id: returnId,
          vendorId,
          orderId,
          status: "completed",
          productTitle: "HP laptop",
          refundAmount: 10000,
          adminCommissionAmount: 0,
          vendorDeduction: 0,
          completedAt: new Date("2026-05-18T10:00:00.000Z"),
        },
      ],
    });

    const result = await model.getVendorDeductions(vendorId);

    expect(collection.find).toHaveBeenCalledWith({
      vendorId: { $in: [vendorId, new ObjectId(vendorId)] },
      status: { $in: ["approved", "completed", "refunded"] },
    });
    expect(result.totalDeduction).toBe(10000);
    expect(result.returns).toEqual([
      expect.objectContaining({
        returnId,
        orderId,
        productTitle: "HP laptop",
        deduction: 10000,
        vendorDeduction: 10000,
        refundAmount: 10000,
        status: "completed",
      }),
    ]);
  });
});
