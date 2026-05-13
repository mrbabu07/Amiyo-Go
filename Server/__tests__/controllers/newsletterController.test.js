const newsletterController = require("../../controllers/newsletterController");

const buildResponse = () => {
  const res = {
    status: jest.fn(() => res),
    json: jest.fn(() => res),
  };
  return res;
};

describe("newsletterController", () => {
  test("subscribe rejects invalid email", async () => {
    const req = {
      body: { email: "bad-email" },
      app: { locals: { db: { collection: jest.fn() } } },
    };
    const res = buildResponse();

    await newsletterController.subscribe(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "Valid email is required",
    });
  });

  test("subscribe upserts a normalized subscriber", async () => {
    const createIndex = jest.fn();
    const findOneAndUpdate = jest.fn().mockResolvedValue({
      value: {
        email: "buyer@example.com",
        isActive: true,
      },
    });
    const collection = jest.fn(() => ({ createIndex, findOneAndUpdate }));
    const req = {
      body: { email: "  Buyer@Example.COM  ", source: "footer" },
      app: { locals: { db: { collection } } },
    };
    const res = buildResponse();

    await newsletterController.subscribe(req, res);

    expect(collection).toHaveBeenCalledWith("newsletterSubscribers");
    expect(createIndex).toHaveBeenCalledWith({ email: 1 }, { unique: true });
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { email: "buyer@example.com" },
      expect.objectContaining({
        $setOnInsert: expect.objectContaining({
          email: "buyer@example.com",
          source: "footer",
        }),
        $set: expect.objectContaining({ isActive: true }),
      }),
      { upsert: true, returnDocument: "after" },
    );
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Subscribed successfully",
      data: {
        email: "buyer@example.com",
        isActive: true,
      },
    });
  });

  test("listSubscribers returns paginated subscribers for admin view", async () => {
    const subscribers = [{ email: "one@example.com" }, { email: "two@example.com" }];
    const toArray = jest.fn().mockResolvedValue(subscribers);
    const limit = jest.fn(() => ({ toArray }));
    const skip = jest.fn(() => ({ limit }));
    const sort = jest.fn(() => ({ skip }));
    const find = jest.fn(() => ({ sort }));
    const countDocuments = jest.fn().mockResolvedValue(2);
    const collection = jest.fn(() => ({ find, countDocuments }));
    const req = {
      query: { page: "2", limit: "2" },
      app: { locals: { db: { collection } } },
    };
    const res = buildResponse();

    await newsletterController.listSubscribers(req, res);

    expect(skip).toHaveBeenCalledWith(2);
    expect(limit).toHaveBeenCalledWith(2);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: subscribers,
      pagination: { page: 2, total: 2, totalPages: 1 },
    });
  });
});
