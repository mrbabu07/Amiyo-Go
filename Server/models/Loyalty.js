const mongoose = require("mongoose");

const loyaltyTransactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["earned", "redeemed", "expired"],
    required: true,
  },
  points: {
    type: Number,
    required: true,
  },
  reason: {
    type: String,
    required: true,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

const loyaltySchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
    },
    points: {
      type: Number,
      default: 0,
      min: 0,
    },
    tier: {
      type: String,
      enum: ["bronze", "silver", "gold", "platinum"],
      default: "bronze",
    },
    totalEarned: {
      type: Number,
      default: 0,
    },
    totalRedeemed: {
      type: Number,
      default: 0,
    },
    referralCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    referredBy: {
      type: String,
    },
    transactions: [loyaltyTransactionSchema],
    lastTierUpdate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// Calculate tier based on total earned points
loyaltySchema.methods.updateTier = function () {
  const oldTier = this.tier;

  if (this.totalEarned >= 10000) {
    this.tier = "platinum";
  } else if (this.totalEarned >= 5000) {
    this.tier = "gold";
  } else if (this.totalEarned >= 1000) {
    this.tier = "silver";
  } else {
    this.tier = "bronze";
  }

  if (oldTier !== this.tier) {
    this.lastTierUpdate = new Date();
  }

  return this.tier;
};

// Get tier multiplier for earning points
loyaltySchema.methods.getTierMultiplier = function () {
  switch (this.tier) {
    case "platinum":
      return 3;
    case "gold":
      return 2;
    case "silver":
      return 1.5;
    case "bronze":
    default:
      return 1;
  }
};

// Get tier benefits
loyaltySchema.methods.getTierBenefits = function () {
  switch (this.tier) {
    case "platinum":
      return {
        pointsMultiplier: 3,
        freeShipping: true,
        expressShipping: true,
        birthdayBonus: 5000,
        exclusiveDeals: true,
        personalShopper: true,
        earlyAccess: true,
      };
    case "gold":
      return {
        pointsMultiplier: 2,
        freeShipping: true,
        expressShipping: false,
        birthdayBonus: 2000,
        exclusiveDeals: true,
        personalShopper: false,
        earlyAccess: true,
      };
    case "silver":
      return {
        pointsMultiplier: 1.5,
        freeShipping: true,
        expressShipping: false,
        birthdayBonus: 1000,
        exclusiveDeals: false,
        personalShopper: false,
        earlyAccess: true,
      };
    case "bronze":
    default:
      return {
        pointsMultiplier: 1,
        freeShipping: false,
        expressShipping: false,
        birthdayBonus: 500,
        exclusiveDeals: false,
        personalShopper: false,
        earlyAccess: false,
      };
  }
};

// Add points
loyaltySchema.methods.addPoints = function (points, reason, orderId = null) {
  const multiplier = this.getTierMultiplier();
  const earnedPoints = Math.floor(points * multiplier);

  this.points += earnedPoints;
  this.totalEarned += earnedPoints;

  this.transactions.push({
    type: "earned",
    points: earnedPoints,
    reason,
    orderId,
  });

  this.updateTier();
  return earnedPoints;
};

// Redeem points
loyaltySchema.methods.redeemPoints = function (points, reason, orderId = null) {
  if (this.points < points) {
    throw new Error("Insufficient points");
  }

  this.points -= points;
  this.totalRedeemed += points;

  this.transactions.push({
    type: "redeemed",
    points,
    reason,
    orderId,
  });

  return points;
};

// Generate unique referral code
loyaltySchema.statics.generateReferralCode = async function (userId) {
  const code = `REF${userId.substring(0, 8).toUpperCase()}`;
  return code;
};

module.exports = mongoose.model("Loyalty", loyaltySchema);
