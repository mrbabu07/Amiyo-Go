const DAY_MS = 24 * 60 * 60 * 1000;

export const notificationFilters = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "orders", label: "Orders" },
  { id: "returns", label: "Returns" },
  { id: "promotions", label: "Promos" },
];

const typeGroups = {
  order: "orders",
  delivery: "orders",
  shipment: "orders",
  payment: "orders",
  return: "returns",
  refund: "returns",
  support: "support",
  ticket: "support",
  voucher: "promotions",
  promotion: "promotions",
  promo: "promotions",
  offer: "promotions",
  wishlist: "wishlist",
  product: "wishlist",
  price_drop: "wishlist",
  back_in_stock: "wishlist",
};

export const getNotificationGroup = (notification = {}) => {
  const normalized = String(notification.type || "").toLowerCase();
  if (typeGroups[normalized]) return typeGroups[normalized];
  if (normalized.includes("order") || normalized.includes("delivery") || normalized.includes("shipment") || normalized.includes("payment")) return "orders";
  if (normalized.includes("return") || normalized.includes("refund")) return "returns";
  if (normalized.includes("support") || normalized.includes("ticket")) return "support";
  if (normalized.includes("voucher") || normalized.includes("promotion") || normalized.includes("promo") || normalized.includes("offer") || normalized.includes("campaign") || normalized.includes("flash")) return "promotions";
  if (normalized.includes("wishlist") || normalized.includes("price_drop") || normalized.includes("back_in_stock") || normalized.includes("stock_alert")) return "wishlist";
  return "system";
};

export const getNotificationMeta = (type = "system") => {
  const group = getNotificationGroup({ type });

  const meta = {
    orders: {
      label: "Order update",
      icon: "package",
      tone: "border-blue-200 bg-blue-50 text-blue-700",
    },
    returns: {
      label: "Return/refund",
      icon: "rotate",
      tone: "border-orange-200 bg-orange-50 text-orange-700",
    },
    support: {
      label: "Support",
      icon: "message",
      tone: "border-sky-200 bg-sky-50 text-sky-700",
    },
    promotions: {
      label: "Promotion",
      icon: "tag",
      tone: "border-violet-200 bg-violet-50 text-violet-700",
    },
    wishlist: {
      label: "Wishlist alert",
      icon: "heart",
      tone: "border-pink-200 bg-pink-50 text-pink-700",
    },
    system: {
      label: "Notification",
      icon: "bell",
      tone: "border-slate-200 bg-slate-50 text-slate-700",
    },
  };

  return meta[group] || meta.system;
};

const normalizeDate = (value, fallback = new Date()) => {
  const date = new Date(value || fallback);
  return Number.isNaN(date.getTime()) ? fallback : date;
};

const startOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

export const getNotificationTimeGroup = (timestamp, now = new Date()) => {
  const currentDay = startOfDay(now);
  const itemDay = startOfDay(normalizeDate(timestamp, now));
  const diff = currentDay - itemDay;

  if (diff <= 0) return "Today";
  if (diff <= DAY_MS) return "Yesterday";
  return "Earlier";
};

export const sortNotifications = (notifications = []) =>
  [...notifications].sort(
    (a, b) =>
      normalizeDate(b.timestamp || b.createdAt).getTime() -
      normalizeDate(a.timestamp || a.createdAt).getTime(),
  );

export const filterNotifications = (notifications = [], filter = "all") => {
  if (filter === "all") return sortNotifications(notifications);
  if (filter === "unread") {
    return sortNotifications(notifications.filter((notification) => !notification.read));
  }

  return sortNotifications(
    notifications.filter((notification) => getNotificationGroup(notification) === filter),
  );
};

export const groupNotificationsByDate = (notifications = [], now = new Date()) => {
  const groups = [
    { id: "today", label: "Today", items: [] },
    { id: "yesterday", label: "Yesterday", items: [] },
    { id: "earlier", label: "Earlier", items: [] },
  ];
  const byLabel = Object.fromEntries(groups.map((group) => [group.label, group]));

  sortNotifications(notifications).forEach((notification) => {
    const label = getNotificationTimeGroup(
      notification.timestamp || notification.createdAt,
      now,
    );
    byLabel[label].items.push(notification);
  });

  return groups.filter((group) => group.items.length > 0);
};

export const getNotificationStats = (notifications = []) => {
  const stats = {
    total: notifications.length,
    unread: 0,
    orders: 0,
    returns: 0,
    promotions: 0,
  };

  notifications.forEach((notification) => {
    if (!notification.read) stats.unread += 1;
    const group = getNotificationGroup(notification);
    if (stats[group] !== undefined) stats[group] += 1;
  });

  return stats;
};

export const formatRelativeNotificationTime = (
  timestamp,
  now = new Date(),
) => {
  const date = normalizeDate(timestamp, now);
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / DAY_MS);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
};
