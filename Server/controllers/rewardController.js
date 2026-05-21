const {
  COIN_FEATURE_DISABLED_MESSAGE,
  areCoinRewardsEnabled,
} = require("../utils/platformFeatures");

const getTodayKey = () => new Date().toISOString().slice(0, 10);

const couponToSegment = (coupon) => ({
  id: coupon._id.toString(),
  label: coupon.discountType === "percentage"
    ? `${coupon.discountValue}% OFF`
    : `\u09F3${coupon.discountValue} OFF`,
  value: coupon.code,
  type: "coupon",
  couponCode: coupon.code,
  minOrderAmount: coupon.minOrderAmount || 0,
  expiresAt: coupon.expiresAt,
});

const getActiveSpinCoupons = async (req) => {
  const Coupon = req.app.locals.models.Coupon;
  const coupons = await Coupon.getActiveCoupons();
  return coupons
    .filter((coupon) => coupon.isActive !== false)
    .filter((coupon) => !coupon.usageLimit || (coupon.usedCount || 0) < coupon.usageLimit)
    .map(couponToSegment);
};

const getStatus = async (req, res) => {
  try {
    if (!(await areCoinRewardsEnabled(req.app.locals.db, "spinRewards"))) {
      return res.json({
        success: true,
        data: {
          canSpin: false,
          hasSpunToday: false,
          disabledReason: COIN_FEATURE_DISABLED_MESSAGE,
          segments: [],
          lastSpin: null,
        },
      });
    }

    const userId = req.user.uid;
    const today = getTodayKey();
    const [spin, couponSegments] = await Promise.all([
      req.app.locals.db.collection("rewardSpins").findOne({ userId, dateKey: today }),
      getActiveSpinCoupons(req),
    ]);

    res.json({
      success: true,
      data: {
        canSpin: !spin && couponSegments.length > 0,
        hasSpunToday: !!spin,
        disabledReason: couponSegments.length === 0 ? "No active admin coupons are available for spin rewards." : null,
        segments: couponSegments,
        lastSpin: spin || null,
      },
    });
  } catch (error) {
    console.error("Spin status error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch spin status" });
  }
};

const spin = async (req, res) => {
  try {
    if (!(await areCoinRewardsEnabled(req.app.locals.db, "spinRewards"))) {
      return res.status(403).json({ success: false, error: COIN_FEATURE_DISABLED_MESSAGE });
    }

    const userId = req.user.uid;
    const today = getTodayKey();
    const spins = req.app.locals.db.collection("rewardSpins");
    await spins.createIndex({ userId: 1, dateKey: 1 }, { unique: true });

    const existing = await spins.findOne({ userId, dateKey: today });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: "You already used today's spin.",
        data: existing,
      });
    }

    const couponSegments = await getActiveSpinCoupons(req);
    if (couponSegments.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No active admin coupons are available for spin rewards.",
      });
    }

    const segments = [
      ...couponSegments,
      { id: "no-prize", label: "TRY AGAIN", value: null, type: "none" },
    ];
    const prize = segments[Math.floor(Math.random() * segments.length)];
    const now = new Date();
    const spinRecord = {
      userId,
      dateKey: today,
      prize,
      createdAt: now,
      updatedAt: now,
    };

    await spins.insertOne(spinRecord);

    res.json({
      success: true,
      data: {
        prize,
        segments,
        message: prize.type === "coupon"
          ? `You won ${prize.label}. Use coupon code ${prize.couponCode}.`
          : "No coupon this time.",
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, error: "You already used today's spin." });
    }
    console.error("Spin reward error:", error);
    res.status(500).json({ success: false, error: "Failed to spin reward wheel" });
  }
};

module.exports = {
  getStatus,
  spin,
};
