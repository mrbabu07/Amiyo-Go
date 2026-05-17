const loyaltyService = require("../../services/loyaltyService");

describe("loyaltyService engagement helpers", () => {
  test("calculates tier progress toward the next membership level", () => {
    const progress = loyaltyService.getTierProgress({
      tier: "silver",
      totalEarned: 3000,
    });

    expect(progress).toEqual(expect.objectContaining({
      currentTier: "silver",
      nextTier: "gold",
      pointsToNext: 2000,
      progress: 50,
    }));
  });

  test("summarizes coins expiring inside the warning window", () => {
    const now = new Date("2026-05-17T00:00:00.000Z");
    const expiring = loyaltyService.getExpiringPoints(
      {
        transactions: [
          { type: "earned", points: 200, expiresAt: "2026-05-20T00:00:00.000Z" },
          { type: "earned", points: 500, expiresAt: "2026-06-20T00:00:00.000Z" },
          { type: "redeemed", points: 100, expiresAt: "2026-05-19T00:00:00.000Z" },
        ],
      },
      7,
      now,
    );

    expect(expiring).toEqual({
      points: 200,
      withinDays: 7,
      warning: true,
    });
  });

  test("exposes tier benefit rows for the customer benefits page", () => {
    expect(loyaltyService.getTierTable().map((row) => row.tier)).toEqual([
      "bronze",
      "silver",
      "gold",
      "platinum",
    ]);
  });
});
