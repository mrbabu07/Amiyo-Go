const {
  _testUtils,
  getUnifiedAuditLogs,
} = require("../../controllers/adminAuditController");

const getByPath = (doc, path) =>
  String(path)
    .split(".")
    .reduce((value, key) => (value === undefined || value === null ? undefined : value[key]), doc);

const matchesValue = (actual, expected) => {
  if (expected && typeof expected === "object" && !Array.isArray(expected) && !(expected instanceof Date)) {
    if (expected.$regex !== undefined) {
      const regex = new RegExp(expected.$regex, expected.$options || "");
      return regex.test(String(actual || ""));
    }
    if (expected.$gte !== undefined && !(actual >= expected.$gte)) return false;
    if (expected.$gt !== undefined && !(actual > expected.$gt)) return false;
    if (expected.$lte !== undefined && !(actual <= expected.$lte)) return false;
    if (expected.$lt !== undefined && !(actual < expected.$lt)) return false;
    return true;
  }

  if (expected instanceof Date) return new Date(actual).getTime() === expected.getTime();
  return String(actual || "") === String(expected || "");
};

const matchesQuery = (doc, query = {}) => {
  if (query.$and) return query.$and.every((branch) => matchesQuery(doc, branch));
  if (query.$or) return query.$or.some((branch) => matchesQuery(doc, branch));
  return Object.entries(query).every(([key, expected]) => matchesValue(getByPath(doc, key), expected));
};

class FakeCursor {
  constructor(docs) {
    this.docs = [...docs];
  }

  sort(sortSpec = {}) {
    const entries = Object.entries(sortSpec);
    this.docs.sort((left, right) => {
      for (const [path, direction] of entries) {
        const leftValue = getByPath(left, path);
        const rightValue = getByPath(right, path);
        if (leftValue > rightValue) return direction < 0 ? -1 : 1;
        if (leftValue < rightValue) return direction < 0 ? 1 : -1;
      }
      return 0;
    });
    return this;
  }

  skip(count) {
    this.docs = this.docs.slice(count);
    return this;
  }

  limit(count) {
    this.docs = this.docs.slice(0, count);
    return this;
  }

  async toArray() {
    return this.docs;
  }
}

class FakeCollection {
  constructor(docs = []) {
    this.docs = docs;
  }

  find(query = {}) {
    return new FakeCursor(this.docs.filter((doc) => matchesQuery(doc, query)));
  }

  async countDocuments(query = {}) {
    return this.docs.filter((doc) => matchesQuery(doc, query)).length;
  }
}

const createRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const buildReq = (query, logs) => ({
  query,
  app: {
    locals: {
      db: {
        collection: () => new FakeCollection(logs),
      },
    },
  },
});

describe("adminAuditController black-box behavior", () => {
  test("returns searchable paginated audit logs with operational summary", async () => {
    const logs = [
      {
        _id: "log-1",
        action: "payout.approved",
        actor: { userId: "admin-1", email: "finance@example.com", role: "finance_manager" },
        target: { type: "payout", id: "pay-1" },
        createdAt: new Date("2026-05-18T10:00:00.000Z"),
      },
      {
        _id: "log-2",
        action: "products.rejected",
        actor: { userId: "admin-2", email: "moderator@example.com", role: "moderator" },
        target: { type: "product", id: "product-1" },
        metadata: { severity: "warning" },
        createdAt: new Date("2026-05-18T09:00:00.000Z"),
      },
      {
        _id: "log-3",
        module: "support",
        action: "support.ticket.assigned",
        actor: { userId: "admin-3", email: "support@example.com", role: "support" },
        target: { type: "ticket", id: "ticket-1" },
        createdAt: new Date("2026-05-18T08:00:00.000Z"),
      },
    ];
    const res = createRes();

    await getUnifiedAuditLogs(buildReq({ search: "payout", limit: "10" }, logs), res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({
        logs: [
          expect.objectContaining({
            id: "log-1",
            action: "payout.approved",
            module: "finance",
            target: expect.objectContaining({ type: "payout", id: "pay-1" }),
          }),
        ],
        summary: expect.objectContaining({
          total: 1,
          sensitiveCount: 1,
          byModule: { finance: 1 },
        }),
        pagination: expect.objectContaining({
          page: 1,
          total: 1,
          hasNextPage: false,
        }),
      }),
    }));
  });

  test("filters severity from explicit metadata and derived action risk", async () => {
    const logs = [
      { _id: "1", action: "products.rejected", createdAt: new Date("2026-05-18T10:00:00Z") },
      { _id: "2", action: "platform.config.updated", createdAt: new Date("2026-05-18T09:00:00Z") },
      { _id: "3", action: "orders.webhook.failed", createdAt: new Date("2026-05-18T08:00:00Z") },
    ];
    const res = createRes();

    await getUnifiedAuditLogs(buildReq({ severity: "critical" }, logs), res);

    expect(res.json.mock.calls[0][0].data.logs).toHaveLength(1);
    expect(res.json.mock.calls[0][0].data.logs[0]).toEqual(expect.objectContaining({
      action: "orders.webhook.failed",
      severity: "critical",
    }));
  });
});

describe("adminAuditController white-box helpers", () => {
  test("builds nested query clauses without leaking raw search regex", () => {
    const query = _testUtils.buildAuditQuery({
      search: "pay.1",
      module: "finance",
      targetType: "payout",
      severity: "warning",
      from: "2026-05-01",
      to: "2026-05-18",
    });

    expect(query).toEqual(expect.objectContaining({
      $and: expect.any(Array),
    }));
    expect(JSON.stringify(query)).toContain("pay\\\\.1");
    expect(JSON.stringify(query)).toContain("finance");
    expect(JSON.stringify(query)).toContain("payout");
  });

  test("normalizes mixed audit rows into stable admin-facing shape", () => {
    const row = _testUtils.serializeAuditLog({
      _id: "raw-1",
      action: "vendors.suspended",
      actor: { id: "admin-1", displayName: "Ops Lead" },
      target: { type: "vendor", id: "vendor-1", title: "Shop" },
      path: "/api/admin/vendors/vendor-1/status",
      statusCode: 200,
      createdAt: "2026-05-18T10:00:00Z",
    });

    expect(row).toEqual(expect.objectContaining({
      id: "raw-1",
      module: "vendors",
      severity: "critical",
      actor: expect.objectContaining({ id: "admin-1", name: "Ops Lead" }),
      target: expect.objectContaining({ type: "vendor", id: "vendor-1", name: "Shop" }),
      request: expect.objectContaining({ path: "/api/admin/vendors/vendor-1/status" }),
    }));
  });
});
