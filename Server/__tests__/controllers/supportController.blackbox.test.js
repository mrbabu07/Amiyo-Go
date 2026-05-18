const {
  answerSupportBot,
  getContactOptions,
  getFaqArticles,
} = require("../../controllers/supportController");

const createMockResponse = () => {
  const res = {
    statusCode: 200,
    body: undefined,
    status: jest.fn(function status(code) {
      this.statusCode = code;
      return this;
    }),
    json: jest.fn(function json(payload) {
      this.body = payload;
      return this;
    }),
  };

  return res;
};

describe("supportController black-box public help contracts", () => {
  test("FAQ search returns the public response shape for a topic query", async () => {
    const res = createMockResponse();

    await getFaqArticles(
      {
        query: {
          q: "refund money",
          topic: "Payments",
        },
      },
      res,
    );

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [
        expect.objectContaining({
          id: "refund-timing",
          topic: "Payments",
          title: "Refund timing",
        }),
      ],
      topics: expect.arrayContaining(["Orders", "Payments", "Returns"]),
    });
  });

  test("support bot response exposes category, escalation, and matched article data", async () => {
    const res = createMockResponse();

    await answerSupportBot(
      {
        body: {
          message: "Vendor rejected my return request with evidence photos",
        },
      },
      res,
    );

    expect(res.body).toEqual({
      success: true,
      data: expect.objectContaining({
        suggestedCategory: "return",
        escalate: true,
        matchedArticles: expect.any(Array),
      }),
    });
    expect(res.body.data.answer).toContain("return wizard");
  });

  test("contact options return available support channels without requiring auth", async () => {
    const res = createMockResponse();

    await getContactOptions({}, res);

    expect(res.body).toEqual({
      success: true,
      data: expect.arrayContaining([
        expect.objectContaining({
          channel: "live_chat",
          label: "Live chat",
        }),
        expect.objectContaining({
          channel: "email",
        }),
      ]),
    });
  });
});
