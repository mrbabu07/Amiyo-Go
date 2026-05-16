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
});
