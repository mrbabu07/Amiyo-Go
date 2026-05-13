import { useEffect, useMemo, useState } from "react";
import useAuth from "../hooks/useAuth";
import { useCurrency } from "../hooks/useCurrency";
import { useToast } from "../context/ToastContext";
import { getCurrentUserToken } from "../utils/auth";
import Loading from "../components/Loading";

const tierThresholds = {
  bronze: { min: 0, next: "silver", nextThreshold: 1000, badge: "BR" },
  silver: { min: 1000, next: "gold", nextThreshold: 5000, badge: "SV" },
  gold: { min: 5000, next: "platinum", nextThreshold: 10000, badge: "GD" },
  platinum: { min: 10000, next: null, nextThreshold: null, badge: "PL" },
};

const tierGradient = {
  bronze: "from-orange-400 to-orange-600",
  silver: "from-slate-300 to-slate-500",
  gold: "from-yellow-400 to-yellow-600",
  platinum: "from-slate-500 to-slate-700",
};

const benefitItems = [
  { key: "freeShipping", label: "Free Shipping", activeText: "On all eligible orders" },
  { key: "expressShipping", label: "Express Shipping", activeText: "Faster delivery when available" },
  { key: "earlyAccess", label: "Early Access", activeText: "See selected deals before others" },
  { key: "exclusiveDeals", label: "Exclusive Deals", activeText: "Members-only promotional offers" },
];

const quickRedeemOptions = [100, 500, 1000];

export default function LoyaltyDashboard() {
  const { formatPrice } = useCurrency();
  const { user } = useAuth();
  const { success, error } = useToast();
  const [loyalty, setLoyalty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [pointsHistory, setPointsHistory] = useState([]);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [showReferralInput, setShowReferralInput] = useState(false);
  const [referralCode, setReferralCode] = useState("");

  const pointsToCurrency = (points) => formatPrice((Number(points) || 0) / 100);

  useEffect(() => {
    if (!user) return;
    fetchLoyaltyData();
    fetchLeaderboard();
    fetchPointsHistory();
  }, [user]);

  const fetchLoyaltyData = async () => {
    try {
      const token = await getCurrentUserToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/loyalty/my-points`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch loyalty data");
      }

      const data = await response.json();
      setLoyalty(data.data);
    } catch (err) {
      console.error("Error fetching loyalty data:", err);
      error(err.message || "Failed to fetch loyalty data");
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/loyalty/leaderboard?limit=10`);
      if (!response.ok) return;
      const data = await response.json();
      setLeaderboard(data.data || []);
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
    }
  };

  const fetchPointsHistory = async () => {
    try {
      const token = await getCurrentUserToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/loyalty/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const data = await response.json();
      setPointsHistory(data.data || []);
    } catch (err) {
      console.error("Error fetching points history:", err);
    }
  };

  const handleApplyReferral = async () => {
    if (!referralCode.trim()) {
      error("Please enter a referral code");
      return;
    }

    try {
      const token = await getCurrentUserToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/loyalty/apply-referral`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ referralCode: referralCode.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to apply referral code");
      }

      success(data.message);
      setShowReferralInput(false);
      setReferralCode("");
      fetchLoyaltyData();
      fetchPointsHistory();
    } catch (err) {
      console.error("Error applying referral code:", err);
      error(err.message || "Failed to apply referral code");
    }
  };

  const handleRedeemPoints = async (pointsToRedeem) => {
    if (!pointsToRedeem || pointsToRedeem < 100) {
      error("Minimum 100 points required to redeem");
      return;
    }

    if (pointsToRedeem > (loyalty?.points || 0)) {
      error("Insufficient points");
      return;
    }

    try {
      const token = await getCurrentUserToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/loyalty/redeem`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ points: pointsToRedeem }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to redeem points");
      }

      success(`Successfully redeemed ${pointsToRedeem} points for ${pointsToCurrency(pointsToRedeem)} store credit.`);
      fetchLoyaltyData();
      fetchPointsHistory();
    } catch (err) {
      console.error("Error redeeming points:", err);
      error(err.message || "Failed to redeem points");
    }
  };

  const copyReferralCode = async () => {
    try {
      await navigator.clipboard.writeText(loyalty?.referralCode || "");
      success("Referral code copied to clipboard");
    } catch {
      error("Unable to copy referral code");
    }
  };

  const nextTierInfo = useMemo(() => {
    const currentTier = loyalty?.tier || "bronze";
    const totalEarned = loyalty?.totalEarned || 0;
    const currentConfig = tierThresholds[currentTier] || tierThresholds.bronze;

    if (!currentConfig.next) {
      return { progress: 100, message: "You have reached the highest tier." };
    }

    const progress = Math.min(
      ((totalEarned - currentConfig.min) / (currentConfig.nextThreshold - currentConfig.min)) * 100,
      100,
    );

    return {
      progress: Math.max(0, Math.round(progress)),
      message: `${Math.max(currentConfig.nextThreshold - totalEarned, 0)} more points to reach ${currentConfig.next}.`,
    };
  }, [loyalty?.tier, loyalty?.totalEarned]);

  const visibleHistory = showFullHistory ? pointsHistory : pointsHistory.slice(0, 5);

  if (loading) return <Loading />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Loyalty Rewards</h1>
        <p className="text-gray-600">Earn points on every purchase, redeem them for store credit, and move up the membership tiers.</p>
      </div>

      <div className={`mb-8 rounded-2xl bg-gradient-to-r ${tierGradient[loyalty?.tier] || tierGradient.bronze} p-8 text-white shadow-xl`}>
        <div className="mb-6 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <span className="rounded-full bg-white/20 px-4 py-2 text-2xl font-bold tracking-wide">
                {(tierThresholds[loyalty?.tier] || tierThresholds.bronze).badge}
              </span>
              <div>
                <h2 className="text-3xl font-bold capitalize">{loyalty?.tier} Member</h2>
                <p className="text-white/80">{loyalty?.benefits?.pointsMultiplier || 1}x points on purchases</p>
              </div>
            </div>
            <p className="max-w-2xl text-sm text-white/80">{nextTierInfo.message}</p>
          </div>

          <div className="text-left lg:text-right">
            <div className="text-5xl font-bold">{loyalty?.points || 0}</div>
            <div className="text-white/80">Available points</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-lg bg-white/20 p-3">
            <div className="text-2xl font-bold">{loyalty?.totalEarned || 0}</div>
            <div className="text-sm text-white/80">Total earned</div>
          </div>
          <div className="rounded-lg bg-white/20 p-3">
            <div className="text-2xl font-bold">{loyalty?.totalRedeemed || 0}</div>
            <div className="text-sm text-white/80">Total redeemed</div>
          </div>
          <div className="rounded-lg bg-white/20 p-3">
            <div className="text-2xl font-bold">{pointsToCurrency(loyalty?.points || 0)}</div>
            <div className="text-sm text-white/80">Points value</div>
          </div>
          <div className="rounded-lg bg-white/20 p-3">
            <div className="text-2xl font-bold">{loyalty?.benefits?.birthdayBonus || 0}</div>
            <div className="text-sm text-white/80">Birthday bonus</div>
          </div>
        </div>

        <div className="mt-6 rounded-lg bg-white/20 p-4">
          <div className="mb-2 flex items-center justify-between text-sm text-white/80">
            <span>Progress to next tier</span>
            <span>{nextTierInfo.progress}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/20">
            <div className="h-2 rounded-full bg-white transition-all duration-300" style={{ width: `${nextTierInfo.progress}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl bg-white p-6 shadow-md">
            <h3 className="mb-4 text-xl font-bold text-gray-900">Your Benefits</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {benefitItems.map((benefit) => {
                const enabled = Boolean(loyalty?.benefits?.[benefit.key]);
                return (
                  <div key={benefit.key} className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {enabled ? "Yes" : "No"}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{benefit.label}</div>
                      <div className="text-sm text-gray-600">{enabled ? benefit.activeText : "Not available at your current tier"}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-md">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Recent Activity</h3>
              {pointsHistory.length > 5 && (
                <button
                  onClick={() => setShowFullHistory((prev) => !prev)}
                  className="text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  {showFullHistory ? "Show Less" : "View All"}
                </button>
              )}
            </div>

            {visibleHistory.length > 0 ? (
              <div className="space-y-3">
                {visibleHistory.map((transaction, index) => {
                  const earned = transaction.type === "earned";
                  return (
                    <div key={`${transaction.date}-${index}`} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full font-bold ${earned ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                          {earned ? "+" : "-"}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{transaction.reason}</div>
                          <div className="text-sm text-gray-500">{new Date(transaction.date).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <div className={`font-bold ${earned ? "text-green-600" : "text-red-600"}`}>
                        {earned ? "+" : "-"}
                        {transaction.points}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-8 text-center text-gray-500">No transactions yet. Start shopping to earn points.</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl bg-white p-6 shadow-md">
            <h3 className="mb-4 text-xl font-bold text-gray-900">Refer and Earn</h3>
            <p className="mb-4 text-sm text-gray-600">Share your referral code and earn 500 points when a friend signs up successfully.</p>

            <div className="mb-4 rounded-lg bg-gray-50 p-4">
              <div className="mb-1 text-xs text-gray-500">Your Referral Code</div>
              <div className="flex items-center justify-between gap-3">
                <div className="text-2xl font-bold text-primary-600">{loyalty?.referralCode}</div>
                <button onClick={copyReferralCode} className="rounded-lg p-2 transition hover:bg-gray-200" title="Copy code">
                  <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>

            {!showReferralInput ? (
              <button
                onClick={() => setShowReferralInput(true)}
                className="w-full rounded-lg border border-primary-500 px-4 py-2 text-primary-500 transition hover:bg-primary-50"
              >
                Have a Referral Code?
              </button>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={referralCode}
                  onChange={(event) => setReferralCode(event.target.value)}
                  placeholder="Enter referral code"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-primary-500"
                />
                <div className="flex gap-2">
                  <button onClick={handleApplyReferral} className="flex-1 rounded-lg bg-primary-500 px-4 py-2 text-white transition hover:bg-primary-600">
                    Apply
                  </button>
                  <button
                    onClick={() => {
                      setShowReferralInput(false);
                      setReferralCode("");
                    }}
                    className="rounded-lg border border-gray-300 px-4 py-2 transition hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl bg-white p-6 shadow-md">
            <h3 className="mb-4 text-xl font-bold text-gray-900">Redeem Points</h3>
            <p className="mb-4 text-sm text-gray-600">Convert your points to store credit. 100 points = {pointsToCurrency(100)}.</p>

            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-green-700">Available Points</span>
                <span className="text-2xl font-bold text-green-800">{loyalty?.points || 0}</span>
              </div>
              <div className="text-sm text-green-600">Worth {pointsToCurrency(loyalty?.points || 0)} in discounts</div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {quickRedeemOptions.map((points) => (
                  <button
                    key={points}
                    onClick={() => handleRedeemPoints(points)}
                    disabled={!loyalty?.points || loyalty.points < points}
                    className="rounded-lg border border-gray-300 p-3 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div className="font-semibold">{points} pts</div>
                    <div className="text-sm text-gray-600">{pointsToCurrency(points)}</div>
                  </button>
                ))}
                <button
                  onClick={() => handleRedeemPoints(loyalty?.points || 0)}
                  disabled={!loyalty?.points || loyalty.points < 100}
                  className="rounded-lg border border-primary-500 p-3 text-primary-600 transition hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="font-semibold">All</div>
                  <div className="text-sm">{pointsToCurrency(loyalty?.points || 0)}</div>
                </button>
              </div>
              <div className="text-center text-xs text-gray-500">Redeemed points are added as store credit to your account.</div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-md">
            <h3 className="mb-4 text-xl font-bold text-gray-900">Top Members</h3>
            <div className="space-y-3">
              {leaderboard.map((member, index) => (
                <div key={member._id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-50">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full font-bold ${
                      index === 0
                        ? "bg-yellow-100 text-yellow-600"
                        : index === 1
                          ? "bg-gray-100 text-gray-600"
                          : index === 2
                            ? "bg-orange-100 text-orange-600"
                            : "bg-gray-50 text-gray-500"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-gray-900">{member.email.split("@")[0]}</div>
                    <div className="text-xs capitalize text-gray-500">{member.tier} | {member.totalEarned} pts</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
            <h3 className="mb-3 text-lg font-bold text-blue-900">How to Earn Points</h3>
            <div className="space-y-2 text-sm text-blue-800">
              <p>- 1 point per BDT 1 spent</p>
              <p>- {loyalty?.benefits?.pointsMultiplier || 1}x multiplier for your tier</p>
              <p>- 500 points per referral</p>
              <p>- {loyalty?.benefits?.birthdayBonus || 0} birthday bonus points</p>
              <p className="border-t border-blue-200 pt-2">
                <strong>Redeem:</strong> 100 points = {pointsToCurrency(100)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
