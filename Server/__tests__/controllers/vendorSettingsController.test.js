const crypto = require("crypto");
const { ObjectId } = require("mongodb");
const {
  disableVendorTwoFactor,
  setVacationMode,
  setupVendorTwoFactor,
  updateVendorProfile,
  verifyVendorTwoFactor,
} = require("../../controllers/vendorController");

const createRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

const base32Decode = (secret) => {
  const cleanSecret = String(secret || "")
    .replace(/=+$/g, "")
    .replace(/\s+/g, "")
    .toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes = [];

  for (const char of cleanSecret) {
    const index = base32Alphabet.indexOf(char);
    if (index === -1) continue;

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
};

const generateTotp = (secret, timestamp = Date.now()) => {
  const counter = Math.floor(timestamp / 1000 / 30);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const hmac = crypto.createHmac("sha1", base32Decode(secret)).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 15;
  const binary =
    ((hmac[offset] & 127) << 24) |
    ((hmac[offset + 1] & 255) << 16) |
    ((hmac[offset + 2] & 255) << 8) |
    (hmac[offset + 3] & 255);

  return String(binary % 1000000).padStart(6, "0");
};

describe("vendor settings controller", () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  test("updateVendorProfile persists payout, address, and notification settings", async () => {
    const vendorId = new ObjectId();
    const ownerUserId = new ObjectId();
    const vendor = {
      _id: vendorId,
      ownerUserId,
      shopName: "Dhaka Mart",
    };
    const update = jest.fn().mockResolvedValue({ modifiedCount: 1 });
    const updatedVendor = { ...vendor, payoutMethod: "mobile_banking" };
    const req = {
      user: { _id: ownerUserId.toString() },
      body: {
        payoutAccounts: [
          {
            type: "bkash",
            label: "Owner bKash",
            accountName: "A Rahman",
            accountNumber: "01700000000",
            isDefault: true,
          },
          {
            type: "bank",
            label: "Company bank",
            accountName: "Dhaka Mart Ltd",
            accountNumber: "123456789",
            bankName: "BRAC Bank",
            branchName: "Gulshan",
          },
        ],
        pickupAddresses: [
          {
            label: "Main warehouse",
            contactName: "Ops",
            phone: "01800000000",
            street: "House 10, Road 1",
            city: "Dhaka",
            district: "Dhaka",
            isDefault: true,
          },
        ],
        returnAddress: {
          contactName: "Returns",
          phone: "01900000000",
          street: "Return desk",
          city: "Dhaka",
          district: "Dhaka",
        },
        deliverySettings: {
          sameDistrictFee: "90",
          outsideDistrictFee: "140",
          pickupEnabled: false,
          preparationTime: "24 hours",
          defaultCourier: "Pathao",
        },
        notificationPreferences: {
          new_order: { email: true, sms: true, push: true },
        },
      },
      app: {
        locals: {
          models: {
            Vendor: {
              findByUserId: jest.fn().mockResolvedValue(vendor),
              update,
              findById: jest.fn().mockResolvedValue(updatedVendor),
            },
            VendorShop: {
              upsertForVendor: jest.fn().mockResolvedValue({}),
            },
          },
        },
      },
    };
    const res = createRes();

    await updateVendorProfile(req, res);

    expect(update).toHaveBeenCalledWith(
      vendorId,
      expect.objectContaining({
        payoutMethod: "mobile_banking",
        mobileBankingProvider: "bkash",
        mobileBankingNumber: "01700000000",
        payoutAccounts: [
          expect.objectContaining({
            type: "bkash",
            accountName: "A Rahman",
            accountNumber: "01700000000",
            isDefault: true,
          }),
          expect.objectContaining({
            type: "bank",
            bankName: "BRAC Bank",
            branchName: "Gulshan",
            isDefault: false,
          }),
        ],
        pickupAddresses: [
          expect.objectContaining({
            label: "Main warehouse",
            phone: "01800000000",
            country: "Bangladesh",
            isDefault: true,
          }),
        ],
        returnAddress: expect.objectContaining({
          contactName: "Returns",
          phone: "01900000000",
          country: "Bangladesh",
        }),
        deliverySettings: expect.objectContaining({
          sameDistrictFee: 90,
          outsideDistrictFee: 140,
          pickupEnabled: false,
          preparationTime: "24 hours",
          defaultCourier: "Pathao",
        }),
        notificationPreferences: {
          new_order: { email: true, sms: true, push: true },
        },
      }),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Vendor profile updated successfully",
        vendor: updatedVendor,
      }),
    );
  });

  test("setVacationMode stores buyer-facing vacation message and closes active shops", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-06-01T08:00:00.000Z"));
    const vendorId = new ObjectId();
    const updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });
    const req = {
      user: { vendorId },
      body: {
        vacationStart: "2026-06-01T00:00:00.000Z",
        vacationEnd: "2026-06-10T00:00:00.000Z",
        vacationReason: "Eid holiday",
        buyerMessage: "Back on June 10",
      },
      app: {
        locals: {
          models: {
            Vendor: {
              collection: { updateOne },
            },
          },
        },
      },
    };
    const res = createRes();

    await setVacationMode(req, res);

    expect(updateOne).toHaveBeenCalledWith(
      { _id: new ObjectId(vendorId) },
      expect.objectContaining({
        $set: expect.objectContaining({
          isShopOpen: false,
          vacationMode: expect.objectContaining({
            enabled: true,
            reason: "Eid holiday",
            buyerMessage: "Back on June 10",
            message: "Back on June 10",
          }),
        }),
      }),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        vacationMode: expect.objectContaining({
          buyerMessage: "Back on June 10",
          isCurrentlyActive: true,
        }),
      }),
    );
  });

  test("2FA setup, verification, and disable persist TOTP security fields", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-06-01T08:00:00.000Z"));
    const vendorId = new ObjectId();
    const baseVendor = {
      _id: vendorId,
      shopName: "Secure Shop",
      email: "owner@example.com",
    };
    const updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });
    const Vendor = {
      findById: jest.fn().mockResolvedValue(baseVendor),
      collection: { updateOne },
    };

    const setupReq = {
      user: { vendorId },
      app: { locals: { models: { Vendor } } },
    };
    const setupRes = createRes();

    await setupVendorTwoFactor(setupReq, setupRes);

    const setupResponse = setupRes.json.mock.calls[0][0];
    const secret = setupResponse.data.secret;
    expect(secret).toMatch(/^[A-Z2-7]+$/);
    expect(setupResponse.data.otpauthUrl).toContain("otpauth://totp/");
    expect(updateOne).toHaveBeenCalledWith(
      { _id: new ObjectId(vendorId) },
      expect.objectContaining({
        $set: expect.objectContaining({
          "security.twoFactor.pendingSecret": secret,
        }),
      }),
    );

    Vendor.findById.mockResolvedValueOnce({
      ...baseVendor,
      security: { twoFactor: { pendingSecret: secret } },
    });
    const verifyReq = {
      user: { vendorId },
      body: { code: generateTotp(secret) },
      app: { locals: { models: { Vendor } } },
    };
    const verifyRes = createRes();

    await verifyVendorTwoFactor(verifyReq, verifyRes);

    expect(updateOne).toHaveBeenLastCalledWith(
      { _id: new ObjectId(vendorId) },
      expect.objectContaining({
        $set: expect.objectContaining({
          "security.twoFactor.enabled": true,
          "security.twoFactor.secret": secret,
        }),
        $unset: expect.objectContaining({
          "security.twoFactor.pendingSecret": "",
        }),
      }),
    );
    expect(verifyRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: { enabled: true },
      }),
    );

    Vendor.findById.mockResolvedValueOnce({
      ...baseVendor,
      security: { twoFactor: { enabled: true, secret } },
    });
    const disableReq = {
      user: { vendorId },
      body: { code: generateTotp(secret) },
      app: { locals: { models: { Vendor } } },
    };
    const disableRes = createRes();

    await disableVendorTwoFactor(disableReq, disableRes);

    expect(updateOne).toHaveBeenLastCalledWith(
      { _id: new ObjectId(vendorId) },
      expect.objectContaining({
        $set: expect.objectContaining({
          "security.twoFactor.enabled": false,
        }),
        $unset: expect.objectContaining({
          "security.twoFactor.secret": "",
        }),
      }),
    );
    expect(disableRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: { enabled: false },
      }),
    );
  });
});
