const speakeasy = require("speakeasy");
const emailService = require("../services/emailService");
const {
  buildAccountProfile,
  buildDataExportPayload,
  buildLoginActivityEntry,
  getDeletionDeadline,
  mergeNotificationPreferences,
  normalizePaymentMethods,
  sanitizeAppPreferences,
  sanitizePaymentMethod,
  sanitizePrivacySettings,
  sanitizeProfileInput,
} = require("../utils/accountProfile");

let zipArchiveCtorPromise;

const getZipArchiveCtor = async () => {
  if (!zipArchiveCtorPromise) {
    zipArchiveCtorPromise = import("archiver").then((module) => module.ZipArchive);
  }
  return zipArchiveCtorPromise;
};

const getAuthNameParts = (req) => {
  const name = req.user?.name || req.user?.displayName || "";
  const parts = name.split(" ").filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" "),
  };
};

const createUserFromAuth = async (User, req) => {
  const isRootAdminEmail = req.user.email === "admin@bazarbd.com";
  const names = getAuthNameParts(req);

  return User.create({
    firebaseUid: req.user.uid,
    firstName: names.firstName,
    lastName: names.lastName,
    email: req.user.email,
    role: isRootAdminEmail ? "admin" : "customer",
  });
};

const ensureUser = async (req) => {
  const User = req.app.locals.models.User;
  let user = await User.findByFirebaseUid(req.user.uid);

  if (!user && req.user.email) {
    const existingUser = await User.findByEmail(req.user.email);
    if (existingUser) {
      await User.collection.updateOne(
        { email: req.user.email },
        { $set: { firebaseUid: req.user.uid, updatedAt: new Date() } },
      );
      user = await User.findByFirebaseUid(req.user.uid);
    }
  }

  if (!user) {
    user = await createUserFromAuth(User, req);
    try {
      await emailService.sendWelcomeEmail({
        userEmail: req.user.email,
        userName: req.user.name || req.user.email?.split("@")[0] || "Customer",
      });
    } catch (error) {
      console.error("Failed to send welcome email:", error.message);
    }
  }

  if (user.email === "admin@bazarbd.com" && user.role !== "admin") {
    await User.updateRole(user.firebaseUid, "admin", "system");
    user = await User.findByFirebaseUid(user.firebaseUid);
  }

  return user;
};

const recordLoginActivity = async (req, user) => {
  try {
    const User = req.app.locals.models.User;
    const activity = buildLoginActivityEntry(req);
    await User.collection.updateOne(
      { firebaseUid: user.firebaseUid },
      {
        $set: { lastLogin: new Date(), updatedAt: new Date() },
        $push: { loginActivity: { $each: [activity], $position: 0, $slice: 10 } },
      },
    );
  } catch (error) {
    console.error("Failed to record login activity:", error.message);
  }
};

const getOrCreateUser = async (req, res) => {
  try {
    const User = req.app.locals.models.User;
    let user = await ensureUser(req);
    await recordLoginActivity(req, user);
    user = await User.findByFirebaseUid(req.user.uid);

    res.json({ success: true, data: user });
  } catch (error) {
    console.error("Error in getOrCreateUser:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getUserStatus = async (req, res) => {
  try {
    const User = req.app.locals.models.User;
    const user = await User.findByFirebaseUid(req.user.uid);

    res.json({
      success: true,
      data: {
        firebaseUid: req.user.uid,
        email: req.user.email,
        name: req.user.name,
        dbUser: user,
        isAdmin: user?.role === "admin",
        hasUser: !!user,
      },
    });
  } catch (error) {
    console.error("Error in getUserStatus:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getAccountProfile = async (req, res) => {
  try {
    const user = await ensureUser(req);
    res.json({ success: true, data: buildAccountProfile(user, req.user) });
  } catch (error) {
    console.error("Error loading account profile:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const updateAccountProfile = async (req, res) => {
  try {
    const User = req.app.locals.models.User;
    const user = await ensureUser(req);
    const profile = sanitizeProfileInput(req.body || {});

    await User.collection.updateOne(
      { firebaseUid: user.firebaseUid },
      {
        $set: {
          "profile.displayName": profile.displayName,
          "profile.firstName": profile.firstName,
          "profile.lastName": profile.lastName,
          "profile.phone": profile.phone,
          "profile.avatar": profile.avatar,
          "verification.phoneVerified": Boolean(user.verification?.phoneVerified && profile.phone),
          updatedAt: new Date(),
        },
      },
    );

    const updated = await User.findByFirebaseUid(user.firebaseUid);
    res.json({ success: true, data: buildAccountProfile(updated, req.user) });
  } catch (error) {
    console.error("Error updating account profile:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const updateAccountPreferences = async (req, res) => {
  try {
    const User = req.app.locals.models.User;
    const user = await ensureUser(req);
    const current = buildAccountProfile(user, req.user);
    const notificationPreferences = req.body.notificationPreferences
      ? mergeNotificationPreferences(req.body.notificationPreferences)
      : current.notificationPreferences;
    const privacy = req.body.privacy
      ? sanitizePrivacySettings(req.body.privacy)
      : current.privacy;
    const appPreferences = req.body.appPreferences
      ? sanitizeAppPreferences(req.body.appPreferences)
      : current.appPreferences;

    await User.collection.updateOne(
      { firebaseUid: user.firebaseUid },
      {
        $set: {
          "account.notificationPreferences": notificationPreferences,
          "account.privacy": privacy,
          "account.appPreferences": appPreferences,
          updatedAt: new Date(),
        },
      },
    );

    const updated = await User.findByFirebaseUid(user.firebaseUid);
    res.json({ success: true, data: buildAccountProfile(updated, req.user) });
  } catch (error) {
    console.error("Error updating account preferences:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const recordTermsAcceptance = async (req, res) => {
  try {
    const User = req.app.locals.models.User;
    const user = await ensureUser(req);
    const now = new Date();
    const termsVersion = String(req.body?.termsVersion || req.body?.version || "2026.06").trim();
    const privacyVersion = String(req.body?.privacyVersion || termsVersion).trim();
    const source = String(req.body?.source || "account").trim();

    await User.collection.updateOne(
      { firebaseUid: user.firebaseUid },
      {
        $set: {
          "legalAcceptance.terms": {
            accepted: true,
            version: termsVersion,
            acceptedAt: now,
            source,
          },
          "legalAcceptance.privacy": {
            accepted: true,
            version: privacyVersion,
            acceptedAt: now,
            source,
          },
          termsAcceptanceRequired: false,
          requiredTermsType: null,
          requiredTermsVersion: null,
          updatedAt: now,
        },
      },
    );

    res.json({
      success: true,
      data: {
        termsVersion,
        privacyVersion,
        acceptedAt: now,
      },
    });
  } catch (error) {
    console.error("Error recording terms acceptance:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const addSavedPaymentMethod = async (req, res) => {
  try {
    const User = req.app.locals.models.User;
    const user = await ensureUser(req);
    const existingMethods = normalizePaymentMethods(user.account?.savedPaymentMethods || []);
    const method = sanitizePaymentMethod(req.body || {});
    const nextMethods = normalizePaymentMethods(
      method.isDefault
        ? [method, ...existingMethods.map((item) => ({ ...item, isDefault: false }))]
        : [...existingMethods, method],
    );

    await User.collection.updateOne(
      { firebaseUid: user.firebaseUid },
      {
        $set: {
          "account.savedPaymentMethods": nextMethods,
          updatedAt: new Date(),
        },
      },
    );

    res.status(201).json({ success: true, data: { savedPaymentMethods: nextMethods } });
  } catch (error) {
    console.error("Error saving payment method:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const deleteSavedPaymentMethod = async (req, res) => {
  try {
    const User = req.app.locals.models.User;
    const user = await ensureUser(req);
    const nextMethods = normalizePaymentMethods(
      (user.account?.savedPaymentMethods || []).filter((method) => method.id !== req.params.methodId),
    );

    await User.collection.updateOne(
      { firebaseUid: user.firebaseUid },
      {
        $set: {
          "account.savedPaymentMethods": nextMethods,
          updatedAt: new Date(),
        },
      },
    );

    res.json({ success: true, data: { savedPaymentMethods: nextMethods } });
  } catch (error) {
    console.error("Error deleting payment method:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const setupAccountTwoFactor = async (req, res) => {
  try {
    const User = req.app.locals.models.User;
    const user = await ensureUser(req);
    const accountName = user.email || req.user.email || user.firebaseUid;
    const secret = speakeasy.generateSecret({
      name: `Amiyo-Go:${accountName}`,
      issuer: "Amiyo-Go",
      length: 20,
    });

    await User.collection.updateOne(
      { firebaseUid: user.firebaseUid },
      {
        $set: {
          "security.twoFactor.pendingSecret": secret.base32,
          "security.twoFactor.pendingAt": new Date(),
          "security.twoFactor.provider": "speakeasy",
          updatedAt: new Date(),
        },
      },
    );

    res.json({
      success: true,
      data: {
        provider: "speakeasy",
        secret: secret.base32,
        manualEntryKey: secret.base32,
        otpauthUrl: secret.otpauth_url,
      },
    });
  } catch (error) {
    console.error("Error starting account 2FA:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const verifyAccountTwoFactor = async (req, res) => {
  try {
    const User = req.app.locals.models.User;
    const user = await ensureUser(req);
    const code = String(req.body?.code || "").replace(/\s+/g, "");
    const secret = user.security?.twoFactor?.pendingSecret || user.security?.twoFactor?.secret;

    const verified = secret && speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token: code,
      window: 1,
    });

    if (!verified) {
      return res.status(400).json({ success: false, error: "Invalid authenticator code" });
    }

    await User.collection.updateOne(
      { firebaseUid: user.firebaseUid },
      {
        $set: {
          "security.twoFactor.enabled": true,
          "security.twoFactor.secret": secret,
          "security.twoFactor.provider": "speakeasy",
          "security.twoFactor.verifiedAt": new Date(),
          updatedAt: new Date(),
        },
        $unset: {
          "security.twoFactor.pendingSecret": "",
          "security.twoFactor.pendingAt": "",
        },
      },
    );

    res.json({ success: true, data: { enabled: true, provider: "speakeasy" } });
  } catch (error) {
    console.error("Error verifying account 2FA:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const disableAccountTwoFactor = async (req, res) => {
  try {
    const User = req.app.locals.models.User;
    const user = await ensureUser(req);
    const code = String(req.body?.code || "").replace(/\s+/g, "");
    const twoFactor = user.security?.twoFactor || {};

    if (twoFactor.enabled && twoFactor.secret) {
      const verified = speakeasy.totp.verify({
        secret: twoFactor.secret,
        encoding: "base32",
        token: code,
        window: 1,
      });
      if (!verified) {
        return res.status(400).json({ success: false, error: "Valid authenticator code is required" });
      }
    }

    await User.collection.updateOne(
      { firebaseUid: user.firebaseUid },
      {
        $set: {
          "security.twoFactor.enabled": false,
          "security.twoFactor.disabledAt": new Date(),
          updatedAt: new Date(),
        },
        $unset: {
          "security.twoFactor.secret": "",
          "security.twoFactor.pendingSecret": "",
          "security.twoFactor.pendingAt": "",
        },
      },
    );

    res.json({ success: true, data: { enabled: false } });
  } catch (error) {
    console.error("Error disabling account 2FA:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getLoginActivity = async (req, res) => {
  try {
    const user = await ensureUser(req);
    res.json({ success: true, data: user.loginActivity || [] });
  } catch (error) {
    console.error("Error loading login activity:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const exportAccountData = async (req, res) => {
  try {
    const user = await ensureUser(req);
    const Address = req.app.locals.models.Address;
    const addresses = Address?.findByUserId ? await Address.findByUserId(req.user.uid) : [];
    const payload = buildDataExportPayload({ user, addresses });

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="amiyo-account-${Date.now()}.zip"`);

    const ZipArchive = await getZipArchiveCtor();
    const archive = new ZipArchive({ zlib: { level: 9 } });
    archive.on("error", (error) => {
      throw error;
    });
    archive.pipe(res);
    archive.append(JSON.stringify(payload, null, 2), { name: "personal-data.json" });
    await archive.finalize();
  } catch (error) {
    console.error("Error exporting account data:", error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

const requestAccountDeletion = async (req, res) => {
  try {
    const User = req.app.locals.models.User;
    const user = await ensureUser(req);
    const deadline = getDeletionDeadline();
    const reason = String(req.body?.reason || "").slice(0, 240);

    await User.collection.updateOne(
      { firebaseUid: user.firebaseUid },
      {
        $set: {
          status: "deletion_pending",
          deletion: {
            requestedAt: new Date(),
            scheduledFor: deadline,
            reason,
            graceDays: 30,
          },
          updatedAt: new Date(),
        },
      },
    );

    if (user.email) {
      await emailService.sendEmail(
        user.email,
        "Account deletion requested",
        `<p>Your Amiyo-Go account is scheduled for deletion on ${deadline.toDateString()}.</p><p>You can cancel this request before the grace period ends.</p>`,
      );
    }

    res.json({
      success: true,
      data: {
        status: "deletion_pending",
        scheduledFor: deadline,
        graceDays: 30,
      },
    });
  } catch (error) {
    console.error("Error requesting account deletion:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const cancelAccountDeletion = async (req, res) => {
  try {
    const User = req.app.locals.models.User;
    const user = await ensureUser(req);

    await User.collection.updateOne(
      { firebaseUid: user.firebaseUid },
      {
        $set: {
          status: "active",
          updatedAt: new Date(),
        },
        $unset: { deletion: "" },
      },
    );

    res.json({ success: true, data: { status: "active" } });
  } catch (error) {
    console.error("Error cancelling account deletion:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getOrCreateUser,
  getUserStatus,
  getAccountProfile,
  updateAccountProfile,
  updateAccountPreferences,
  recordTermsAcceptance,
  addSavedPaymentMethod,
  deleteSavedPaymentMethod,
  setupAccountTwoFactor,
  verifyAccountTwoFactor,
  disableAccountTwoFactor,
  getLoginActivity,
  exportAccountData,
  requestAccountDeletion,
  cancelAccountDeletion,
};
