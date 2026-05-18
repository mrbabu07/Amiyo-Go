const express = require("express");
const request = require("supertest");
const { idempotencyMiddleware, stableStringify } = require("../../middleware/idempotency");

class FakeCollection {
  constructor() {
    this.docs = [];
  }

  async createIndex() {}

  async findOne(query) {
    return this.docs.find((doc) =>
      doc.scope === query.scope &&
      doc.actorId === query.actorId &&
      doc.key === query.key
    ) || null;
  }

  async insertOne(doc) {
    const existing = await this.findOne(doc);
    if (existing) {
      const error = new Error("duplicate key");
      error.code = 11000;
      throw error;
    }
    this.docs.push({ ...doc, _id: `idem-${this.docs.length + 1}` });
    return { insertedId: this.docs[this.docs.length - 1]._id };
  }

  async updateOne(query, update) {
    const doc = await this.findOne(query);
    if (doc) Object.assign(doc, update.$set || {});
    return { matchedCount: doc ? 1 : 0 };
  }

  async deleteOne(query) {
    const before = this.docs.length;
    this.docs = this.docs.filter((doc) =>
      !(doc.scope === query.scope && doc.actorId === query.actorId && doc.key === query.key)
    );
    return { deletedCount: before - this.docs.length };
  }
}

const flushAsyncFinishHandlers = () => new Promise((resolve) => setImmediate(resolve));

function buildApp() {
  const collection = new FakeCollection();
  const app = express();
  let created = 0;

  app.use(express.json());
  app.locals.db = {
    collection: () => collection,
  };
  app.post(
    "/critical",
    (req, res, next) => {
      req.user = { uid: "user-1" };
      next();
    },
    idempotencyMiddleware({ scope: "critical", required: true }),
    (req, res) => {
      created += 1;
      res.status(201).json({ success: true, created, body: req.body });
    },
  );

  return { app, collection, getCreated: () => created };
}

describe("idempotency middleware", () => {
  test("stableStringify normalizes object key order for request fingerprints", () => {
    expect(stableStringify({ b: 2, a: 1 })).toBe(stableStringify({ a: 1, b: 2 }));
  });

  test("replays the original response for a repeated key and identical request", async () => {
    const { app, getCreated } = buildApp();

    const first = await request(app)
      .post("/critical")
      .set("Idempotency-Key", "order-key-123")
      .send({ amount: 100, items: ["p1"] });
    await flushAsyncFinishHandlers();

    const second = await request(app)
      .post("/critical")
      .set("Idempotency-Key", "order-key-123")
      .send({ items: ["p1"], amount: 100 });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.headers["idempotency-replayed"]).toBe("true");
    expect(second.body).toEqual(first.body);
    expect(getCreated()).toBe(1);
  });

  test("rejects a reused key when the request payload changes", async () => {
    const { app } = buildApp();

    await request(app)
      .post("/critical")
      .set("Idempotency-Key", "refund-key-123")
      .send({ amount: 100 });
    await flushAsyncFinishHandlers();

    const response = await request(app)
      .post("/critical")
      .set("Idempotency-Key", "refund-key-123")
      .send({ amount: 200 });

    expect(response.status).toBe(409);
    expect(response.body.error).toContain("different request");
  });

  test("requires a key outside Jest's route-compatibility mode", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    const { app } = buildApp();

    const response = await request(app).post("/critical").send({ amount: 100 });

    process.env.NODE_ENV = originalNodeEnv;
    expect(response.status).toBe(400);
    expect(response.body.error).toContain("Idempotency-Key");
  });
});
