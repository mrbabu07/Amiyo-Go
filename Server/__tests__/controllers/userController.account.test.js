jest.mock("../../services/emailService", () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
  sendWelcomeEmail: jest.fn().mockResolvedValue(true),
}));
jest.mock("archiver", () => ({
  ZipArchive: jest.fn(() => ({
    on: jest.fn(),
    pipe: jest.fn(),
    append: jest.fn(),
    finalize: jest.fn().mockResolvedValue(undefined),
  })),
}));

const speakeasy = require("speakeasy");
const emailService = require("../../services/emailService");
const userController = require("../../controllers/userController");

const setPath = (target, path, value) => {
  const keys = path.split(".");
  let current = target;
  keys.slice(0, -1).forEach((key) => {
    if (!current[key] || typeof current[key] !== "object") {
      current[key] = {};
    }
    current = current[key];
  });
  current[keys[keys.length - 1]] = value;
};

const unsetPath = (target, path) => {
  const keys = path.split(".");
  let current = target;
  keys.slice(0, -1).forEach((key) => {
    current = current?.[key];
  });
  if (current) delete current[keys[keys.length - 1]];
};

const applyUpdate = (target, update = {}) => {
  Object.entries(update.$set || {}).forEach(([path, value]) => setPath(target, path, value));
  Object.keys(update.$unset || {}).forEach((path) => unsetPath(target, path));
  Object.entries(update.$push || {}).forEach(([path, instruction]) => {
    const existing = path.split(".").reduce((value, key) => value?.[key], target) || [];
    const nextItems = instruction.$each || [instruction];
    const next = instruction.$position === 0
      ? [...nextItems, ...existing]
      : [...existing, ...nextItems];
    setPath(target, path, next.slice(0, instruction.$slice || next.length));
  });
};

const buildResponse = () => {
  const res = {
    status: jest.fn(() => res),
    json: jest.fn(() => res),
    setHeader: jest.fn(() => res),
  };
  return res;
};

const buildUserModel = (initialUser) => {
  let storedUser = JSON.parse(JSON.stringify(initialUser));
  const User = {
    findByFirebaseUid: jest.fn(async (uid) =>
      storedUser.firebaseUid === uid ? storedUser : null,
    ),
    findByEmail: jest.fn(async (email) => (storedUser.email === email ? storedUser : null)),
    create: jest.fn(async (userData) => {
      storedUser = {
        ...userData,
        status: "active",
        profile: {
          firstName: userData.firstName || "",
          lastName: userData.lastName || "",
          phone: "",
          avatar: "",
        },
        account: {},
        security: {},
        loginActivity: [],
      };
      return storedUser;
    }),
    updateRole: jest.fn(async (uid, role) => {
      if (storedUser.firebaseUid === uid) storedUser.role = role;
      return { modifiedCount: 1 };
    }),
    collection: {
      updateOne: jest.fn(async (filter, update) => {
        if (
          filter.firebaseUid === storedUser.firebaseUid ||
          filter.email === storedUser.email
        ) {
          applyUpdate(storedUser, update);
          return { matchedCount: 1, modifiedCount: 1 };
        }
        return { matchedCount: 0, modifiedCount: 0 };
      }),
    },
    get storedUser() {
      return storedUser;
    },
  };

  return User;
};

const buildRequest = ({ User, body = {}, params = {} }) => ({
  body,
  params,
  headers: { "user-agent": "Jest Browser" },
  ip: "127.0.0.1",
  user: {
    uid: "firebase-1",
    email: "buyer@example.com",
    name: "Buyer User",
    email_verified: true,
  },
  app: {
    locals: {
      models: {
        User,
        Address: { findByUserId: jest.fn().mockResolvedValue([]) },
      },
    },
  },
});

describe("userController account profile endpoints", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const makeUser = () => ({
    firebaseUid: "firebase-1",
    email: "buyer@example.com",
    role: "customer",
    status: "active",
    profile: {
      firstName: "Buyer",
      lastName: "User",
      phone: "",
      avatar: "",
    },
    account: {},
    security: {},
    loginActivity: [],
    verification: { emailVerified: true },
  });

  test("getAccountProfile returns normalized account data", async () => {
    const User = buildUserModel(makeUser());
    const req = buildRequest({ User });
    const res = buildResponse();

    await userController.getAccountProfile(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          profile: expect.objectContaining({
            displayName: "Buyer User",
            email: "buyer@example.com",
          }),
          verificationBadges: expect.objectContaining({
            emailVerified: true,
          }),
        }),
      }),
    );
  });

  test("updateAccountProfile stores sanitized profile fields", async () => {
    const User = buildUserModel(makeUser());
    const req = buildRequest({
      User,
      body: {
        displayName: "  Nila   Akter ",
        phone: "01700-000000",
        avatar: "https://example.com/nila.jpg",
      },
    });
    const res = buildResponse();

    await userController.updateAccountProfile(req, res);

    expect(User.storedUser.profile).toEqual(
      expect.objectContaining({
        displayName: "Nila Akter",
        firstName: "Nila",
        lastName: "Akter",
        phone: "01700000000",
        avatar: "https://example.com/nila.jpg",
      }),
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test("addSavedPaymentMethod masks and defaults a mobile wallet", async () => {
    const User = buildUserModel(makeUser());
    const req = buildRequest({
      User,
      body: { type: "bkash", accountNumber: "01700000000", isDefault: true },
    });
    const res = buildResponse();

    await userController.addSavedPaymentMethod(req, res);

    expect(User.storedUser.account.savedPaymentMethods[0]).toEqual(
      expect.objectContaining({
        type: "bkash",
        accountNumber: "01700000000",
        maskedAccount: "*******0000",
        isDefault: true,
      }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test("setup and verify account 2FA with speakeasy", async () => {
    const User = buildUserModel(makeUser());
    const setupReq = buildRequest({ User });
    const setupRes = buildResponse();

    await userController.setupAccountTwoFactor(setupReq, setupRes);

    const secret = User.storedUser.security.twoFactor.pendingSecret;
    const code = speakeasy.totp({ secret, encoding: "base32" });
    const verifyReq = buildRequest({ User, body: { code } });
    const verifyRes = buildResponse();

    await userController.verifyAccountTwoFactor(verifyReq, verifyRes);

    expect(User.storedUser.security.twoFactor.enabled).toBe(true);
    expect(User.storedUser.security.twoFactor.secret).toBe(secret);
    expect(User.storedUser.security.twoFactor.pendingSecret).toBeUndefined();
    expect(verifyRes.json).toHaveBeenCalledWith({
      success: true,
      data: { enabled: true, provider: "speakeasy" },
    });
  });

  test("requestAccountDeletion stores grace period and sends email", async () => {
    const User = buildUserModel(makeUser());
    const req = buildRequest({ User, body: { reason: "Leaving" } });
    const res = buildResponse();

    await userController.requestAccountDeletion(req, res);

    expect(User.storedUser.status).toBe("deletion_pending");
    expect(User.storedUser.deletion).toEqual(
      expect.objectContaining({
        reason: "Leaving",
        graceDays: 30,
      }),
    );
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      "buyer@example.com",
      "Account deletion requested",
      expect.stringContaining("scheduled for deletion"),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ status: "deletion_pending" }),
      }),
    );
  });
});
