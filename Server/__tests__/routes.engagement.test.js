const express = require("express");
const request = require("supertest");

jest.mock("../middleware/auth", () => ({
  verifyToken: (req, res, next) => {
    if (!req.headers.authorization) {
      return res.status(401).json({ error: "No token provided" });
    }
    req.user = {
      uid: "customer-1",
      email: "customer@example.com",
      name: "Customer One",
    };
    return next();
  },
  verifyOptionalToken: (req, res, next) => {
    req.user = req.headers.authorization ? { uid: "customer-1" } : null;
    return next();
  },
  verifyAdmin: (req, res, next) => next(),
}));

const buildSupportApp = () => {
  const insertedTickets = [];
  const supportTicketCollection = {
    createIndex: jest.fn().mockResolvedValue(undefined),
    insertOne: jest.fn(async (doc) => {
      insertedTickets.push(doc);
      return { insertedId: "ticket-1" };
    }),
  };
  const db = {
    collection: jest.fn(() => supportTicketCollection),
  };
  const app = express();
  app.use(express.json());
  app.locals.db = db;
  app.locals.models = {
    User: {
      findByFirebaseUid: jest.fn().mockResolvedValue({
        _id: "user-doc-1",
        profile: { firstName: "Customer", lastName: "One" },
        role: "customer",
      }),
    },
  };
  app.use("/api/support", require("../routes/supportRoutes"));
  return { app, insertedTickets };
};

const buildNotificationApp = (Notification) => {
  const app = express();
  app.use(express.json());
  app.locals.models = { Notification };
  app.use("/api/notifications", require("../routes/notificationRoutes"));
  return app;
};

describe("customer engagement routes black-box behavior", () => {
  test("serves searchable FAQ articles without authentication", async () => {
    const { app } = buildSupportApp();

    const response = await request(app).get("/api/support/faqs?q=refund&topic=Payments");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data[0]).toEqual(expect.objectContaining({
      id: "refund-timing",
      topic: "Payments",
    }));
  });

  test("answers rule-based return questions through the support bot route", async () => {
    const { app } = buildSupportApp();

    const response = await request(app)
      .post("/api/support/bot")
      .send({ message: "Vendor rejected my return dispute" });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(expect.objectContaining({
      suggestedCategory: "return",
      escalate: true,
    }));
  });

  test("creates a return dispute support ticket with evidence and timeline", async () => {
    const { app, insertedTickets } = buildSupportApp();

    const response = await request(app)
      .post("/api/support/tickets")
      .set("Authorization", "Bearer test")
      .send({
        subject: "Return rejected",
        description: "The item arrived broken and vendor rejected my return.",
        category: "return",
        issueType: "return_dispute",
        orderId: "ORD-100",
        returnId: "RET-9",
        escalationReason: "I uploaded photo evidence.",
        attachments: [{ url: "https://example.com/photo.jpg" }],
      });

    expect(response.status).toBe(201);
    expect(response.body.ticket).toEqual(expect.objectContaining({
      issueType: "return_dispute",
      orderId: "ORD-100",
      returnId: "RET-9",
    }));
    expect(response.body.ticket.escalation).toEqual(expect.objectContaining({
      status: "submitted",
    }));
    expect(response.body.ticket.statusTimeline[0]).toMatchObject({
      status: "open",
      label: "Ticket submitted",
    });
    expect(insertedTickets[0].attachments[0]).toEqual(expect.objectContaining({
      url: "https://example.com/photo.jpg",
    }));
  });

  test("deletes an authenticated in-app notification", async () => {
    const Notification = {
      delete: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      getUnreadCount: jest.fn().mockResolvedValue(2),
    };
    const app = buildNotificationApp(Notification);

    const response = await request(app)
      .delete("/api/notifications/64f000000000000000000001")
      .set("Authorization", "Bearer test");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, unreadCount: 2 });
    expect(Notification.delete).toHaveBeenCalledWith(
      "64f000000000000000000001",
      "customer-1",
    );
  });
});
