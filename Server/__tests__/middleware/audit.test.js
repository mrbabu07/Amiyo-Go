const express = require("express");
const request = require("supertest");
const { auditSensitiveOperations } = require("../../middleware/audit");

describe("audit middleware", () => {
  test("writes redacted audit records for sensitive finance actions", async () => {
    const appended = [];
    const app = express();

    app.use(express.json());
    app.locals.models = {
      AuditLog: {
        append: jest.fn(async (entry) => {
          appended.push(entry);
        }),
      },
    };
    app.use((req, res, next) => {
      req.user = { uid: "admin-1", email: "admin@example.com", role: "admin" };
      req.dbUser = { _id: "user-1", firebaseUid: "admin-1", email: "admin@example.com", role: "admin" };
      next();
    });
    app.use(auditSensitiveOperations);
    app.patch("/api/admin/payouts/requests/payout-1/approve", (req, res) => {
      res.json({ success: true });
    });

    await request(app)
      .patch("/api/admin/payouts/requests/payout-1/approve")
      .send({
        privateKey: "secret",
        nested: { token: "abc" },
        note: "Approved",
      });
    await new Promise((resolve) => setImmediate(resolve));

    expect(app.locals.models.AuditLog.append).toHaveBeenCalledTimes(1);
    expect(appended[0]).toMatchObject({
      actor: {
        firebaseUid: "admin-1",
        role: "admin",
      },
      target: {
        type: "admin_payouts",
        path: "/api/admin/payouts/requests/payout-1/approve",
      },
      diff: {
        body: {
          privateKey: "[redacted]",
          nested: { token: "[redacted]" },
          note: "Approved",
        },
        statusCode: 200,
      },
    });
  });
});
