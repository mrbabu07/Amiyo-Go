const Loyalty = require("../models/Loyalty");

class LoyaltyService {
  // Calculate points from order amount (1 point per $1)
  calculatePointsFromOrder(orderAmount) {
    return Math.floor(orderAmount);
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
      const basePoints = this.calculatePointsFromOrder(orderAmount);
      const earnedPoints = loyalty.addPoints(
        basePoints,
        `Order #${orderId}`,
        orderId,
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
      referrerLoyalty.addPoints(500, `Referral bonus for ${newUserEmail}`);
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
      newUserLoyalty.addPoints(100, "Welcome bonus");
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

      loyalty.addPoints(bonusPoints, "Birthday bonus");
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

      // Convert points to discount (100 points = 1 BDT = 1/110 USD)
      // Since prices are stored in USD, we need to convert BDT to USD
      const discountInBDT = points / 100; // 100 points = 1 BDT
      const discountAmount = discountInBDT / 110; // Convert BDT to USD

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

  // Get points value in currency (USD)
  getPointsValue(points) {
    // 100 points = 1 BDT = 1/110 USD
    const bdtValue = points / 100;
    return bdtValue / 110; // Convert BDT to USD for database
  }

  // Get points value in BDT for display
  getPointsValueInBDT(points) {
    return points / 100; // 100 points = 1 BDT
  }
}

module.exports = new LoyaltyService();
