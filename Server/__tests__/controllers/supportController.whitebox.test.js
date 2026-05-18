const { __test__ } = require("../../controllers/supportController");

describe("supportController white-box FAQ and bot helpers", () => {
  test("keeps the help center corpus organized by expected marketplace topics", () => {
    const topics = [...new Set(__test__.FAQ_ARTICLES.map((article) => article.topic))];

    expect(topics).toEqual([
      "Orders",
      "Returns",
      "Payments",
      "Account",
      "Wishlist",
    ]);
    expect(__test__.FAQ_ARTICLES.every((article) => article.id && article.title && article.answer)).toBe(true);
  });

  test("falls back from phrase search to matching individual useful words", () => {
    const results = __test__.searchFaqArticles({
      query: "money timeline",
      topic: "Payments",
    });

    expect(results).toEqual([
      expect.objectContaining({
        id: "refund-timing",
        keywords: expect.arrayContaining(["money"]),
      }),
    ]);
  });

  test("branches support bot answers by intent and escalation risk", () => {
    expect(__test__.answerFaqBot("Where is my courier tracking link?")).toEqual(
      expect.objectContaining({
        suggestedCategory: "order",
        escalate: false,
      }),
    );

    expect(__test__.answerFaqBot("My bKash payment failed twice")).toEqual(
      expect.objectContaining({
        suggestedCategory: "payment",
        escalate: true,
      }),
    );

    expect(__test__.answerFaqBot("")).toEqual(
      expect.objectContaining({
        suggestedCategory: "general",
        escalate: false,
      }),
    );
  });

  test("normalizes support display names from profile fragments and fallback values", () => {
    expect(
      __test__.normalizeName(
        {
          profile: {
            firstName: "Asha",
            lastName: "Karim",
          },
        },
        "Fallback Name",
      ),
    ).toBe("Asha Karim");

    expect(__test__.normalizeName({ profile: {} }, "Fallback Name")).toBe("Fallback Name");
  });
});
