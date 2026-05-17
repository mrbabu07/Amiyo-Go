const {
  buildAccountProfile,
  getDeletionDeadline,
  mergeNotificationPreferences,
  normalizePaymentMethods,
  sanitizeAppPreferences,
  sanitizePaymentMethod,
  sanitizePrivacySettings,
  sanitizeProfileInput,
} = require("../../utils/accountProfile");

describe("accountProfile utilities", () => {
  test("sanitizes profile input into profile fields", () => {
    const profile = sanitizeProfileInput({
      displayName: "  Rahim   Uddin  ",
      phone: "+880 1700-000000",
      photoURL: "https://example.com/avatar.png",
    });

    expect(profile).toEqual({
      displayName: "Rahim Uddin",
      firstName: "Rahim",
      lastName: "Uddin",
      phone: "+8801700000000",
      avatar: "https://example.com/avatar.png",
    });
  });

  test("masks saved payment methods without storing card numbers", () => {
    const bkash = sanitizePaymentMethod({
      type: "bkash",
      accountNumber: "01700000000",
    });
    const card = sanitizePaymentMethod({
      type: "card",
      last4: "4242",
    });

    expect(bkash.maskedAccount).toBe("*******0000");
    expect(bkash.accountNumber).toBe("01700000000");
    expect(card.accountNumber).toBe("");
    expect(card.maskedAccount).toBe("**** 4242");
  });

  test("normalizes payment methods and assigns one default", () => {
    const methods = normalizePaymentMethods([
      { type: "nagad", accountNumber: "01800000000" },
      { type: "card", last4: "1111" },
    ]);

    expect(methods).toHaveLength(2);
    expect(methods[0].isDefault).toBe(true);
    expect(methods[1].isDefault).toBe(false);
  });

  test("merges notification preferences and sanitizes privacy/app settings", () => {
    expect(
      mergeNotificationPreferences({
        orderUpdates: { sms: true },
        unknown: { email: true },
      }).orderUpdates,
    ).toEqual({ email: true, sms: true, push: true });

    expect(
      sanitizePrivacySettings({
        wishlistVisibility: "everyone",
        reviewHistoryVisibility: "followers",
        personalization: false,
      }),
    ).toEqual({
      wishlistVisibility: "private",
      reviewHistoryVisibility: "followers",
      personalization: false,
    });

    expect(sanitizeAppPreferences({ language: "bn", currency: "USD" })).toEqual({
      language: "bn",
      currency: "BDT",
    });
  });

  test("builds an account profile with badges, security, and preferences", () => {
    const account = buildAccountProfile(
      {
        _id: { toString: () => "user-1" },
        firebaseUid: "firebase-1",
        email: "buyer@example.com",
        role: "customer",
        profile: { firstName: "Nila", phone: "01700000000" },
        verification: { phoneVerified: true },
        account: {
          appPreferences: { language: "bn", currency: "BDT" },
          savedPaymentMethods: [{ type: "bkash", accountNumber: "01700000000" }],
        },
        security: { twoFactor: { enabled: true, provider: "speakeasy" } },
      },
      { email_verified: true },
    );

    expect(account.profile.displayName).toBe("Nila");
    expect(account.verificationBadges).toEqual({
      emailVerified: true,
      phoneVerified: true,
    });
    expect(account.security.twoFactorEnabled).toBe(true);
    expect(account.appPreferences.language).toBe("bn");
    expect(account.savedPaymentMethods[0]).toEqual(
      expect.objectContaining({
        type: "bkash",
        maskedAccount: "*******0000",
      }),
    );
  });

  test("sets account deletion deadline to 30 days", () => {
    const now = new Date("2026-05-17T00:00:00.000Z");
    expect(getDeletionDeadline(now).toISOString()).toBe("2026-06-16T00:00:00.000Z");
  });
});
