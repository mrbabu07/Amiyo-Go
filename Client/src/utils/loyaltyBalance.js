export const LOYALTY_BALANCE_EVENT = "amiyo:loyalty-balance-changed";

export const getLoyaltyPointsFromPayload = (payload) => {
  const data = payload?.data?.data ?? payload?.data ?? payload;
  const candidates = [
    data?.points,
    data?.balance,
    data?.totalPoints,
    data?.remainingPoints,
    data?.loyalty?.points,
  ];
  const value = candidates.find((candidate) => candidate !== undefined && candidate !== null && candidate !== "");
  const points = Number(value);

  return Number.isFinite(points) ? Math.max(0, Math.round(points)) : null;
};

export const notifyLoyaltyBalanceChanged = (detail = {}) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(LOYALTY_BALANCE_EVENT, { detail }));
};
