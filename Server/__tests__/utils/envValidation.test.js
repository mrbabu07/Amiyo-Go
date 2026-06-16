const {
  buildCorsOptions,
  getAllowedCorsOrigins,
  getServiceConfigStatus,
  validateStartupEnv,
} = require("../../config/env");

describe("environment validation", () => {
  test("fails startup validation when critical production values are missing", () => {
    const result = validateStartupEnv({
      NODE_ENV: "production",
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.key)).toEqual(
      expect.arrayContaining([
        "MONGO_URI",
        "FIREBASE_PROJECT_ID",
        "FIREBASE_CLIENT_EMAIL",
        "FIREBASE_PRIVATE_KEY",
      ]),
    );
  });

  test("classifies optional marketplace services without hiding degraded modes", () => {
    const services = getServiceConfigStatus({
      MONGO_URI: "mongodb://localhost:27017/amiyo",
      FIREBASE_PROJECT_ID: "amiyo-prod",
      FIREBASE_CLIENT_EMAIL: "firebase@example.com",
      FIREBASE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----",
      REDIS_ENABLED: "false",
      SMTP_USER: "mailer@example.com",
      SMTP_PASS: "secret",
      REDX_API_TOKEN: "redx-token",
      STEADFAST_API_KEY: "steadfast-key",
      STEADFAST_SECRET_KEY: "steadfast-secret",
    });

    expect(services.mongodb).toMatchObject({ configured: true, required: true });
    expect(services.redis).toMatchObject({ configured: true, disabled: true });
    expect(services.email).toMatchObject({ configured: true, mode: "smtp" });
    expect(services.supabase).toMatchObject({ configured: false, fallback: "local_uploads" });
    expect(services.push).toMatchObject({ configured: false, mode: "limited" });
    expect(services.courier).toMatchObject({
      configured: true,
      providers: { redx: true, steadfast: true },
    });
  });

  test("builds a strict CORS allowlist with localhost development fallback", () => {
    const origins = getAllowedCorsOrigins({
      CLIENT_URL: "https://amiyo.example/",
      FRONTEND_URL: "https://frontend.amiyo.example",
      CORS_ORIGINS: "https://admin.amiyo.example, https://seller.amiyo.example",
    });

    expect(origins).toEqual(expect.arrayContaining([
      "https://amiyo.example",
      "https://frontend.amiyo.example",
      "https://amiyo-go.vercel.app",
      "https://admin.amiyo.example",
      "https://seller.amiyo.example",
      "http://localhost:5173",
    ]));

    const corsOptions = buildCorsOptions({ CLIENT_URL: "https://amiyo.example/" });
    const allowedCallback = jest.fn();
    corsOptions.origin("https://amiyo.example", allowedCallback);
    expect(allowedCallback).toHaveBeenCalledWith(null, true);

    const callback = jest.fn();
    corsOptions.origin("https://evil.example", callback);
    expect(callback.mock.calls[0][0]).toBeInstanceOf(Error);
  });
});
