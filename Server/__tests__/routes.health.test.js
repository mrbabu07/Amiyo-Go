const express = require("express");
const request = require("supertest");
const { router: healthRouter } = require("../routes/healthRoutes");

const originalEnv = { ...process.env };

function buildHealthApp({ mongoOk = true, jobsOk = true } = {}) {
  const app = express();
  app.locals.boot = { startedAt: "2026-05-18T00:00:00.000Z" };
  app.locals.db = {
    databaseName: "BazarBD",
    command: jest.fn(async () => {
      if (!mongoOk) throw new Error("mongo down");
      return { ok: 1 };
    }),
  };
  app.locals.mongoose = {
    connection: {
      readyState: mongoOk ? 1 : 0,
    },
  };
  app.locals.jobs = jobsOk
    ? { campaignScheduler: true, analyticsSummary: true, newsletterBroadcasts: true }
    : { campaignScheduler: false, analyticsSummary: true, newsletterBroadcasts: true };
  app.use(healthRouter);
  return app;
}

describe("health readiness routes", () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      MONGO_URI: "mongodb://localhost:27017/amiyo",
      FIREBASE_PROJECT_ID: "amiyo-prod",
      FIREBASE_CLIENT_EMAIL: "firebase@example.com",
      FIREBASE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----",
      REDIS_ENABLED: "false",
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test("GET /health returns liveness without dependency checks", async () => {
    const response = await request(buildHealthApp({ mongoOk: false })).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      status: "live",
      service: "amiyo-go-api",
    });
  });

  test("GET /ready returns ready when critical dependencies are connected", async () => {
    const response = await request(buildHealthApp()).get("/ready");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      status: "ready",
    });
    expect(response.body.checks.mongo.status).toBe("connected");
  });

  test("GET /ops reports degraded state when critical dependencies fail", async () => {
    const response = await request(buildHealthApp({ mongoOk: false })).get("/ops");

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      ok: false,
      status: "degraded",
    });
    expect(response.body.services.mongo.status).toBe("error");
  });
});
