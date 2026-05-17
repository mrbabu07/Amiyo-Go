const { __test__ } = require("../../controllers/supportController");

describe("supportController help center utilities", () => {
  test("searches FAQ articles by topic and query words", () => {
    const results = __test__.searchFaqArticles({
      query: "refund money",
      topic: "Payments",
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      id: "refund-timing",
      topic: "Payments",
    });
  });

  test("rule-based bot suggests return dispute escalation", () => {
    const answer = __test__.answerFaqBot("Vendor rejected my return dispute with photos");

    expect(answer).toEqual(expect.objectContaining({
      suggestedCategory: "return",
      escalate: true,
    }));
    expect(answer.answer).toContain("return wizard");
  });

  test("normalizes customer names without undefined fragments", () => {
    expect(__test__.normalizeName({ profile: { firstName: "Asha" } }, "Fallback")).toBe("Asha");
    expect(__test__.normalizeName({}, "Fallback")).toBe("Fallback");
  });
});
