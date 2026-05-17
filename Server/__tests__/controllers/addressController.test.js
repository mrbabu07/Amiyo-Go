const addressController = require("../../controllers/addressController");

const buildResponse = () => {
  const res = {
    status: jest.fn(() => res),
    json: jest.fn(() => res),
  };
  return res;
};

const buildRequest = ({ Address, body = {}, params = {} }) => ({
  body,
  params,
  user: { uid: "customer-1" },
  app: { locals: { models: { Address } } },
});

describe("addressController", () => {
  test("createAddress makes the first saved address default", async () => {
    const Address = {
      validateAddress: jest.fn().mockResolvedValue({ valid: true }),
      findByUserId: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue("address-1"),
    };
    const req = buildRequest({
      Address,
      body: {
        name: "Customer",
        phone: "01700000001",
        division: "Chattogram",
        district: "Cox's Bazar",
        upazila: "Teknaf",
        union: "Hnila",
        wardNo: "1",
        area: "Station",
        address: "House 12",
        latitude: "23.8103",
        longitude: "90.4125",
      },
    });
    const res = buildResponse();

    await addressController.createAddress(req, res);

    expect(Address.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: "customer-1",
      isDefault: true,
      city: "Cox's Bazar",
      latitude: 23.8103,
      longitude: 90.4125,
      location: {
        type: "Point",
        coordinates: [90.4125, 23.8103],
        latitude: 23.8103,
        longitude: 90.4125,
      },
    }));
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { id: "address-1" },
      message: "Address created successfully",
    });
  });

  test("createAddress rejects invalid address data", async () => {
    const Address = {
      validateAddress: jest.fn().mockResolvedValue({
        valid: false,
        error: "Missing required fields: district",
      }),
      findByUserId: jest.fn(),
      create: jest.fn(),
    };
    const req = buildRequest({ Address, body: { name: "Customer" } });
    const res = buildResponse();

    await addressController.createAddress(req, res);

    expect(Address.create).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "Missing required fields: district",
    });
  });

  test("updateAddress blocks editing another user's address", async () => {
    const Address = {
      findById: jest.fn().mockResolvedValue({ _id: "address-1", userId: "other-user" }),
      validateAddress: jest.fn(),
      update: jest.fn(),
    };
    const req = buildRequest({
      Address,
      params: { id: "address-1" },
      body: { area: "New Area" },
    });
    const res = buildResponse();

    await addressController.updateAddress(req, res);

    expect(Address.update).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: "Access denied" });
  });

  test("deleteAddress promotes another address when deleting the default", async () => {
    const Address = {
      findById: jest.fn().mockResolvedValue({ _id: "address-1", userId: "customer-1", isDefault: true }),
      delete: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      findByUserId: jest.fn().mockResolvedValue([{ _id: "address-2" }]),
      setDefault: jest.fn().mockResolvedValue({ matchedCount: 1 }),
    };
    const req = buildRequest({ Address, params: { id: "address-1" } });
    const res = buildResponse();

    await addressController.deleteAddress(req, res);

    expect(Address.setDefault).toHaveBeenCalledWith("address-2", "customer-1");
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Address deleted successfully",
    });
  });
});
