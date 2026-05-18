const Order = require("../../models/Order");

const buildOrderModel = () => {
  const cursor = {
    sort: jest.fn(() => cursor),
    skip: jest.fn(() => cursor),
    limit: jest.fn(() => cursor),
    toArray: jest.fn().mockResolvedValue([]),
  };
  const collection = {
    createIndex: jest.fn().mockResolvedValue(undefined),
    find: jest.fn(() => cursor),
    countDocuments: jest.fn().mockResolvedValue(0),
  };
  const db = { collection: jest.fn(() => collection) };

  return { order: new Order(db), collection };
};

describe("Order admin search", () => {
  test("normalizes hash-style short order codes into order and object-id searches", async () => {
    const { order, collection } = buildOrderModel();

    await order.findAllPaginated({ search: "#DD3556FE", page: 1, limit: 20 });

    const query = collection.find.mock.calls[0][0];
    const branches = query.$and[0].$or;
    const orderNumberBranch = branches.find((branch) => branch.orderNumber);
    const objectIdBranch = branches.find((branch) => branch.$expr);

    expect(orderNumberBranch.orderNumber.test("DD3556FE")).toBe(true);
    expect(objectIdBranch.$expr.$regexMatch).toEqual({
      input: { $toString: "$_id" },
      regex: "DD3556FE",
      options: "i",
    });
  });

  test("escapes regex characters so admin order lookup does not become a broad regex", async () => {
    const { order, collection } = buildOrderModel();

    await order.findAllPaginated({ search: "order ORD.123", page: 1, limit: 20 });

    const query = collection.find.mock.calls[0][0];
    const branches = query.$and[0].$or;
    const orderNumberBranch = branches.find((branch) => branch.orderNumber);

    expect(orderNumberBranch.orderNumber.test("ORD.123")).toBe(true);
    expect(orderNumberBranch.orderNumber.test("ORDX123")).toBe(false);
  });
});
