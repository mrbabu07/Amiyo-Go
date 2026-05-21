const DEFAULT_PLATFORM_FEATURE_FLAGS = {
  guestCheckout: true,
  vendorSignups: true,
  shopDirectory: true,
  cod: true,
  reviews: true,
  referrals: true,
  loyaltyCoins: true,
  coinRedemption: true,
  dailyCheckInRewards: true,
  spinRewards: true,
};

const COIN_FEATURE_DISABLED_MESSAGE = "Coin rewards are currently turned off by admin.";

const mergeFeatureFlags = (saved = {}) => ({
  ...DEFAULT_PLATFORM_FEATURE_FLAGS,
  ...(saved || {}),
});

const getPlatformFeatureFlags = async (db) => {
  try {
    if (!db?.collection) return mergeFeatureFlags();
    const saved = await db.collection("platform_settings").findOne({ _id: "platform_control" });
    return mergeFeatureFlags(saved?.featureFlags);
  } catch {
    return mergeFeatureFlags();
  }
};

const isPlatformFeatureEnabled = async (db, key) => {
  const flags = await getPlatformFeatureFlags(db);
  return flags[key] !== false;
};

const areCoinRewardsEnabled = async (db, childFlag = null) => {
  const flags = await getPlatformFeatureFlags(db);
  if (flags.loyaltyCoins === false) return false;
  if (childFlag && flags[childFlag] === false) return false;
  return true;
};

module.exports = {
  COIN_FEATURE_DISABLED_MESSAGE,
  DEFAULT_PLATFORM_FEATURE_FLAGS,
  areCoinRewardsEnabled,
  getPlatformFeatureFlags,
  isPlatformFeatureEnabled,
  mergeFeatureFlags,
};
