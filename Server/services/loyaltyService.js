const Loyalty = require("../models/Loyalty");

const DEFAULT_LOYALTY_RULES = {
  earnRate: 1,
  redemptionValue: 0.01,
  minRedeemPoints: 100,
  pointsExpiryDays: 365,
  tierMultipliers: {
    bronze: 1,
    silver: 1.5,
    gold: 2,
    platinum: 3,
  },
};

const TIER_DEFINITIONS = [
  {
    tier: "bronze",
    label: "Bronze",
    threshold: 0,
    nextTier: "silver",
    nextThreshold: 1000,
    benefits: {
      pointsMultiplier: 1,
      returnWindowDays: 7,
      birthdayBonus: 500,
      exclusiveDeals: false,
      prioritySupport: false,
      earlyAccess: false,
    },
  },
  {
    tier: "silver",
    label: "Silver",
    threshold: 1000,
    nextTier: "gold",
    nextThreshold: 5000,
    benefits: {
      pointsMultiplier: 1.5,
      returnWindowDays: 10,
      birthdayBonus: 1000,
      exclusiveDeals: false,
      prioritySupport: false,
      earlyAccess: true,
      freeShipping: true,
    },
  },
  {
    tier: "gold",
    label: "Gold",
    threshold: 5000,
    nextTier: "platinum",
    nextThreshold: 10000,
    benefits: {
      pointsMultiplier: 2,
      returnWindowDays: 14,
      birthdayBonus: 2000,
      exclusiveDeals: true,
      prioritySupport: true,
      earlyAccess: true,
      freeShipping: true,
    },
  },
  {
    tier: "platinum",
    label: "Platinum",
    threshold: 10000,
    nextTier: null,
    nextThreshold: null,
    benefits: {
      pointsMultiplier: 3,
      returnWindowDays: 21,
      birthdayBonus: 5000,
      exclusiveDeals: true,
      prioritySupport: true,
      earlyAccess: true,
      freeShipping: true,
      personalShopper: true,
    },
  },
];

const getExpiryDate = (days, now = new Date()) =>
  new Date(now.getTime() + Number(days || DEFAULT_LOYALTY_RULES.pointsExpiryDays) * 24 * 60 * 60 * 1000);

class LoyaltyService {
  async getRules() {
    try {
      const db = Loyalty.db?.db;
      if (!db?.collection) return DEFAULT_LOYALTY_RULES;
      const saved = await db.collection("promotion_settings").findOne({ _id: "loyalty_rules" });
      return { ...DEFAULT_LOYALTY_RULES, ...(saved || {}) };
    } catch {
      return DEFAULT_LOYALTY_RULES;
    }
  }

  // Calculate points from order amount
  calculatePointsFromOrder(orderAmount, rules = DEFAULT_LOYALTY_RULES) {
    return Math.floor(Number(orderAmount || 0) * Number(rules.earnRate || DEFAULT_LOYALTY_RULES.earnRate));
  }

  getTierTable() {
    return TIER_DEFINITIONS;
  }

  getTierProgress(loyalty = {}) {
    const totalEarned = Number(loyalty.totalEarned || 0);
    const current =
      TIER_DEFINITIONS.find((tier) => tier.tier === loyalty.tier) ||
      TIER_DEFINITIONS[0];

    if (!current.nextTier) {
      return {
        currentTier: current.tier,
        currentThreshold: current.threshold,
        nextTier: null,
        nextThreshold: null,
        pointsToNext: 0,
        progress: 100,
        message: "You have reached the highest tier.",
      };
    }

    const range = current.nextThreshold - current.threshold;
    const earnedInsideTier = Math.max(totalEarned - current.threshold, 0);
    const progress = Math.min(Math.round((earnedInsideTier / range) * 100), 100);

    return {
      currentTier: current.tier,
      currentThreshold: current.threshold,
      nextTier: current.nextTier,
      nextThreshold: current.nextThreshold,
      pointsToNext: Math.max(current.nextThreshold - totalEarned, 0),
      progress,
      message: `${Math.max(current.nextThreshold - totalEarned, 0)} more points to reach ${current.nextTier}.`,
    };
  }

  getExpiringPoints(loyalty = {}, days = 7, now = new Date()) {
    const warningUntil = new Date(now.getTime() + Number(days || 7) * 24 * 60 * 60 * 1000);
    const transactions = Array.isArray(loyalty.transactions) ? loyalty.transactions : [];

    const total = transactions.reduce((sum, transaction) => {
      if (transaction.type !== "earned" || !transaction.expiresAt) return sum;
      const expiresAt = new Date(transaction.expiresAt);
      if (Number.isNaN(expiresAt.getTime())) return sum;
      if (expiresAt <= now || expiresAt > warningUntil) return sum;
      return sum + Number(transaction.points || 0);
    }, 0);

    return {
      points: Math.max(total, 0),
      withinDays: Number(days || 7),
      warning: total > 0,
    };
  }

  async getActiveMultiplierEvents(now = new Date()) {
    const fallback = [
      {
        id: "weekend-electronics",
        title: "Weekend electronics boost",
        category: "Electronics",
        multiplier: 3,
        startsAt: null,
        endsAt: null,
        source: "default",
      },
    ];

    try {
      const db = Loyalty.db?.db;
      if (!db?.collection) return fallback;
      const saved = await db.collection("promotion_settings").findOne({ _id: "loyalty_multiplier_events" });
      const events = Array.isArray(saved?.events) ? saved.events : [];
      const activeEvents = events
        .filter((event) => event?.enabled !== false)
        .filter((event) => {
          const start = event.startsAt || event.startDate ? new Date(event.startsAt || event.startDate) : null;
          const end = event.endsAt || event.endDate ? new Date(event.endsAt || event.endDate) : null;
          if (start && !Number.isNaN(start.getTime()) && start > now) return false;
          if (end && !Number.isNaN(end.getTime()) && end < now) return false;
          return true;
        })
        .map((event, index) => ({
          id: event.id || `multiplier-${index}`,
          title: event.title || event.name || "Coin multiplier",
          category: event.category || event.categoryName || "All categories",
          multiplier: Number(event.multiplier || 1),
          startsAt: event.startsAt || event.startDate || null,
          endsAt: event.endsAt || event.endDate || null,
          source: event.source || "admin",
        }));

      return activeEvents.length ? activeEvents : fallback;
    } catch {
      return fallback;
    }
  }

  // Get or create loyalty account
  async getOrCreateAccount(userId, email) {
    let loyalty = await Loyalty.findOne({ userId });

    if (!loyalty) {
      const referralCode = await Loyalty.generateReferralCode(userId);
      loyalty = new Loyalty({
        userId,
        email,
        referralCode,
      });
      await loyalty.save();
    }

    return loyalty;
  }

  // Award points for order
  async awardPointsForOrder(userId, email, orderAmount, orderId) {
    try {
      const loyalty = await this.getOrCreateAccount(userId, email);
      const rules = await this.getRules();
      const basePoints = this.calculatePointsFromOrder(orderAmount, rules);
      const multiplier = Number(rules.tierMultipliers?.[loyalty.tier] || 1);
      const earnedPoints = loyalty.addPoints(
        basePoints,
        `Order #${orderId}`,
        orderId,
        multiplier,
        {
          source: "order_purchase",
          expiresAt: getExpiryDate(rules.pointsExpiryDays),
          metadata: { orderAmount, basePoints, multiplier },
        },
      );

      await loyalty.save();

      return {
        earnedPoints,
        totalPoints: loyalty.points,
        tier: loyalty.tier,
      };
    } catch (error) {
      console.error("Error awarding points:", error);
      throw error;
    }
  }

  // Award referral bonus
  async awardReferralBonus(referrerId, newUserId, newUserEmail) {
    try {
      const referrerLoyalty = await Loyalty.findOne({ userId: referrerId });
      if (!referrerLoyalty) {
        throw new Error("Referrer not found");
      }

      // Award 500 points to referrer
      const rules = await this.getRules();
      referrerLoyalty.addPoints(500, `Referral bonus for ${newUserEmail}`, null, 1, {
        source: "referral",
        expiresAt: getExpiryDate(rules.pointsExpiryDays),
      });
      await referrerLoyalty.save();

      // Create account for new user with referral
      const newUserReferralCode = await Loyalty.generateReferralCode(newUserId);
      const newUserLoyalty = new Loyalty({
        userId: newUserId,
        email: newUserEmail,
        referralCode: newUserReferralCode,
        referredBy: referrerId,
      });

      // Award 100 points to new user as welcome bonus
      newUserLoyalty.addPoints(100, "Welcome bonus", null, 1, {
        source: "referral_welcome",
        expiresAt: getExpiryDate(rules.pointsExpiryDays),
      });
      await newUserLoyalty.save();

      return {
        referrerPoints: referrerLoyalty.points,
        newUserPoints: newUserLoyalty.points,
      };
    } catch (error) {
      console.error("Error awarding referral bonus:", error);
      throw error;
    }
  }

  // Award birthday bonus
  async awardBirthdayBonus(userId) {
    try {
      const loyalty = await Loyalty.findOne({ userId });
      if (!loyalty) {
        throw new Error("Loyalty account not found");
      }

      const benefits = loyalty.getTierBenefits();
      const bonusPoints = benefits.birthdayBonus;

      const rules = await this.getRules();
      loyalty.addPoints(bonusPoints, "Birthday bonus", null, 1, {
        source: "birthday_bonus",
        expiresAt: getExpiryDate(rules.pointsExpiryDays),
      });
      await loyalty.save();

      return {
        bonusPoints,
        totalPoints: loyalty.points,
      };
    } catch (error) {
      console.error("Error awarding birthday bonus:", error);
      throw error;
    }
  }

  // Redeem points for discount
  async redeemPoints(userId, points, orderId) {
    try {
      const loyalty = await Loyalty.findOne({ userId });
      if (!loyalty) {
        throw new Error("Loyalty account not found");
      }

      loyalty.redeemPoints(points, `Redeemed for order #${orderId}`, orderId);
      await loyalty.save();

      const rules = await this.getRules();
      const discountAmount = points * Number(rules.redemptionValue || DEFAULT_LOYALTY_RULES.redemptionValue);

      return {
        discountAmount,
        remainingPoints: loyalty.points,
      };
    } catch (error) {
      console.error("Error redeeming points:", error);
      throw error;
    }
  }

  // Get loyalty statistics
  async getStatistics() {
    try {
      const stats = await Loyalty.aggregate([
        {
          $group: {
            _id: "$tier",
            count: { $sum: 1 },
            totalPoints: { $sum: "$points" },
            avgPoints: { $avg: "$points" },
          },
        },
      ]);

      const totalMembers = await Loyalty.countDocuments();
      const totalPointsIssued = await Loyalty.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: "$totalEarned" },
          },
        },
      ]);

      return {
        totalMembers,
        totalPointsIssued: totalPointsIssued[0]?.total || 0,
        tierDistribution: stats,
      };
    } catch (error) {
      console.error("Error getting loyalty statistics:", error);
      throw error;
    }
  }

  // Get leaderboard
  async getLeaderboard(limit = 10) {
    try {
      const leaderboard = await Loyalty.find()
        .sort({ totalEarned: -1 })
        .limit(limit)
        .select("email points tier totalEarned");

      return leaderboard;
    } catch (error) {
      console.error("Error getting leaderboard:", error);
      throw error;
    }
  }

  // Check if user can redeem points
  canRedeemPoints(loyalty, points) {
    return loyalty.points >= points && points >= 100; // Minimum 100 points to redeem
  }

  // Get points value in currency (BDT)
  getPointsValue(points) {
    return points / 100;
  }

  // Get points value in BDT for display
  getPointsValueInBDT(points) {
    return points / 100; // 100 points = 1 BDT
  }
}

const loyaltyService = new LoyaltyService();
loyaltyService.DEFAULT_LOYALTY_RULES = DEFAULT_LOYALTY_RULES;
loyaltyService.TIER_DEFINITIONS = TIER_DEFINITIONS;
loyaltyService.getExpiryDate = getExpiryDate;

module.exports = loyaltyService;
