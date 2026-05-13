const { ObjectId } = require("mongodb");
const Address = require("../../models/Address");

const buildAddressModel = () => {
  const collection = {
    find: jest.fn(),
    findOne: jest.fn(),
    insertOne: jest.fn(),
    updateMany: jest.fn(),
    updateOne: jest.fn(),
    deleteOne: jest.fn(),
  };
  const db = { collection: jest.fn(() => collection) };
  return { address: new Address(db), collection };
};

const validAddress = {
  userId: "customer-1",
  name: "Customer",
  phone: "01700000001",
  division: "Chattogram",
  district: "Cox's Bazar",
  upazila: "Teknaf",
  union: "Hnila",
  wardNo: "1",
  area: "Station",
  address: "House 12",
};

describe("Address model", () => {
  test("validateAddress accepts complete Bangladesh address data", async () => {
    const { address } = buildAddressModel();

    await expect(address.validateAddress(validAddress)).resolves.toEqual({ valid: true });
  });

  test("validateAddress reports missing required location fields", async () => {
    const { address } = buildAddressModel();

    await expect(address.validateAddress({ ...validAddress, union: "" })).resolves.toEqual({
      valid: false,
      error: "Missing required fields: union",
    });
  });

  test("validateAddress rejects invalid phone numbers", async () => {
    const { address } = buildAddressModel();

    await expect(address.validateAddress({ ...validAddress, phone: "12345" })).resolves.toEqual({
      valid: false,
      error: "Invalid phone number format",
    });
  });

  test("create unsets existing defaults before inserting a default address", async () => {
    const { address, collection } = buildAddressModel();
    collection.updateMany.mockResolvedValue({ modifiedCount: 1 });
    collection.insertOne.mockResolvedValue({ insertedId: "address-1" });

    await expect(address.create({ ...validAddress, isDefault: true })).resolves.toBe("address-1");

    expect(collection.updateMany).toHaveBeenCalledWith(
      { userId: "customer-1" },
      { $set: { isDefault: false } },
    );
    expect(collection.insertOne).toHaveBeenCalledWith(expect.objectContaining({
      userId: "customer-1",
      isDefault: true,
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
    }));
  });

  test("setDefault clears all defaults before setting selected address", async () => {
    const { address, collection } = buildAddressModel();
    collection.updateMany.mockResolvedValue({ modifiedCount: 2 });
    collection.updateOne.mockResolvedValue({ matchedCount: 1 });
    const id = "64f000000000000000000001";

    await expect(address.setDefault(id, "customer-1")).resolves.toEqual({ matchedCount: 1 });

    expect(collection.updateMany).toHaveBeenCalledWith(
      { userId: "customer-1" },
      { $set: { isDefault: false } },
    );
    expect(collection.updateOne).toHaveBeenCalledWith(
      { _id: new ObjectId(id), userId: "customer-1" },
      expect.objectContaining({
        $set: expect.objectContaining({
          isDefault: true,
          updatedAt: expect.any(Date),
        }),
      }),
    );
  });
});
