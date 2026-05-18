const GrowthNotificationService = require("./growthNotificationService");

const normalizeId = (value) => (value?.toString ? value.toString() : String(value || ""));

class AbandonedCartService {
  static async detectCandidates(db, { olderThanMinutes = 60, lookbackDays = 7, now = new Date() } = {}) {
    if (!db?.collection) throw new Error("Database connection is required");
    const cutoff = new Date(now.getTime() - Number(olderThanMinutes || 60) * 60 * 1000);
    const lookback = new Date(now.getTime() - Number(lookbackDays || 7) * 24 * 60 * 60 * 1000);
    const events = await db
      .collection("growth_events")
      .find({
        timestamp: { $gte: lookback, $lte: cutoff },
        eventName: { $in: ["cart.added", "cart.removed", "checkout.started", "order.placed"] },
      })
      .sort({ timestamp: 1 })
      .toArray();

    const sessions = new Map();
    events.forEach((event) => {
      const key = normalizeId(event.userId || event.anonymousSessionId);
      if (!key) return;
      const current = sessions.get(key) || {
        key,
        userId: event.userId || null,
        anonymousSessionId: event.anonymousSessionId || null,
        items: new Map(),
        hasCheckoutOrOrder: false,
        lastCartAt: null,
      };
      if (event.eventName === "cart.added") {
        const productId = normalizeId(event.productId || event.metadata?.productId);
        if (productId) current.items.set(productId, event.metadata || { productId });
        current.lastCartAt = event.timestamp;
      }
      if (event.eventName === "cart.removed") {
        const productId = normalizeId(event.productId || event.metadata?.productId);
        if (productId) current.items.delete(productId);
      }
      if (["checkout.started", "order.placed"].includes(event.eventName)) current.hasCheckoutOrOrder = true;
      sessions.set(key, current);
    });

    return [...sessions.values()]
      .filter((session) => !session.hasCheckoutOrOrder && session.items.size > 0)
      .map((session) => ({
        ...session,
        itemCount: session.items.size,
        items: [...session.items.values()],
      }));
  }

  static async enqueueReminders(db, candidates = [], { channels = ["in_app"], scheduledFor = null } = {}) {
    const results = [];
    for (const candidate of candidates) {
      if (!candidate.userId) {
        results.push({ skipped: true, reason: "guest_without_contact", key: candidate.key });
        continue;
      }
      const queued = await GrowthNotificationService.enqueue(db, {
        eventName: "cart.abandoned",
        recipient: { userId: candidate.userId },
        payload: {
          userId: candidate.userId,
          itemCount: candidate.itemCount,
          items: candidate.items,
          url: "/cart",
        },
        channels,
        scheduledFor,
      });
      results.push({ key: candidate.key, queued });
    }
    return results;
  }
}

module.exports = AbandonedCartService;
