const Loyalty = require("../models/Loyalty");
const loyaltyService = require("../services/loyaltyService");

// Get user's loyalty account
exports.getMyPoints = async (req, res) => {
  try {
    const userId = req.user?.uid;
    const email = req.user?.email;

    if (!userId || !email) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const loyalty = await loyaltyService.getOrCreateAccount(userId, email);
    const benefits = loyalty.getTierBenefits();

    res.json({
      success: true,
      data: {
        points: loyalty.points,
        tier: loyalty.tier,
        totalEarned: loyalty.totalEarned,
        totalRedeemed: loyalty.totalRedeemed,
        referralCode: loyalty.referralCode,
        benefits,
        transactions: loyalty.transactions.slice(-10), // Last 10 transactions
      },
    });
  } catch (error) {
    console.error("Error getting loyalty points:", error);
    res.status(500).json({
      message: "Error fetching loyalty points",
      error: error.message,
    });
  }
};

// Get points history
exports.getPointsHistory = async (req, res) => {
  try {
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const loyalty = await Loyalty.findOne({ userId });

    if (!loyalty) {
      return res.json({
        success: true,
        data: [],
      });
    }

    res.json({
      success: true,
      data: loyalty.transactions.sort((a, b) => b.date - a.date),
    });
  } catch (error) {
    console.error("Error getting points history:", error);
    res.status(500).json({
      message: "Error fetching points history",
      error: error.message,
    });
  }
};

// Redeem points
exports.redeemPoints = async (req, res) => {
  try {
    const userId = req.user?.uid;
    const { points, orderId } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    if (!points || points < 100) {
      return res.status(400).json({
        message: "Minimum 100 points required to redeem",
      });
    }

    const result = await loyaltyService.redeemPoints(userId, points, orderId);

    res.json({
      success: true,
      message: "Points redeemed successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error redeeming points:", error);
    res.status(500).json({
      message: error.message || "Error redeeming points",
      error: error.message,
    });
  }
};

// Apply referral code
exports.applyReferralCode = async (req, res) => {
  try {
    const userId = req.user?.uid;
    const email = req.user?.email;
    const { referralCode } = req.body;

    if (!userId || !email) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // Check if user already has a loyalty account
    const existingLoyalty = await Loyalty.findOne({ userId });
    if (existingLoyalty && existingLoyalty.referredBy) {
      return res.status(400).json({
        message: "You have already used a referral code",
      });
    }

    // Find referrer by code
    const referrer = await Loyalty.findOne({ referralCode });
    if (!referrer) {
      return res.status(404).json({
        message: "Invalid referral code",
      });
    }

    // Can't refer yourself
    if (referrer.userId === userId) {
      return res.status(400).json({
        message: "You cannot use your own referral code",
      });
    }

    const result = await loyaltyService.awardReferralBonus(
      referrer.userId,
      userId,
      email,
    );

    res.json({
      success: true,
      message: "Referral code applied successfully! You earned 100 points!",
      data: result,
    });
  } catch (error) {
    console.error("Error applying referral code:", error);
    res.status(500).json({
      message: error.message || "Error applying referral code",
      error: error.message,
    });
  }
};

// Get leaderboard
exports.getLeaderboard = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const leaderboard = await loyaltyService.getLeaderboard(limit);

    res.json({
      success: true,
      data: leaderboard,
    });
  } catch (error) {
    console.error("Error getting leaderboard:", error);
    res.status(500).json({
      message: "Error fetching leaderboard",
      error: error.message,
    });
  }
};

// Get loyalty statistics (Admin only)
exports.getStatistics = async (req, res) => {
  try {
    const stats = await loyaltyService.getStatistics();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error getting loyalty statistics:", error);
    res.status(500).json({
      message: "Error fetching statistics",
      error: error.message,
    });
  }
};

// Award birthday bonus (Admin only)
exports.awardBirthdayBonus = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    const result = await loyaltyService.awardBirthdayBonus(userId);

    res.json({
      success: true,
      message: "Birthday bonus awarded successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error awarding birthday bonus:", error);
    res.status(500).json({
      message: error.message || "Error awarding birthday bonus",
      error: error.message,
    });
  }
};
