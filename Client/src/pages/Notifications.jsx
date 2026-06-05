import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  Heart,
  MessageSquare,
  Package,
  RefreshCw,
  RotateCcw,
  Tag,
  Trash2,
} from "lucide-react";
import { useNotifications } from "../context/NotificationContext";
import {
  filterNotifications,
  formatRelativeNotificationTime,
  getNotificationMeta,
  getNotificationStats,
  groupNotificationsByDate,
  notificationFilters,
} from "../utils/customerNotifications";

const iconMap = {
  bell: Bell,
  heart: Heart,
  message: MessageSquare,
  package: Package,
  rotate: RotateCcw,
  tag: Tag,
};

function NotificationIcon({ type }) {
  const meta = getNotificationMeta(type);
  const Icon = iconMap[meta.icon] || Bell;

  return (
    <span
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border ${meta.tone}`}
    >
      <Icon className="h-5 w-5" />
    </span>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

export default function Notifications() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
    refreshNotifications,
  } = useNotifications();
  const [activeFilter, setActiveFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const stats = useMemo(() => getNotificationStats(notifications), [notifications]);
  const visibleNotifications = useMemo(
    () => filterNotifications(notifications, activeFilter),
    [activeFilter, notifications],
  );
  const groups = useMemo(
    () => groupNotificationsByDate(visibleNotifications),
    [visibleNotifications],
  );

  const refresh = async () => {
    setRefreshing(true);
    try {
      await refreshNotifications();
    } finally {
      setRefreshing(false);
    }
  };

  const clearAll = () => {
    if (!notifications.length) return;
    if (!window.confirm("Clear all notifications from this device?")) return;
    clearAllNotifications();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-primary-600 dark:text-primary-300">
                Customer notification center
              </p>
              <h1 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
                Notifications
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Track order updates, return progress, support replies, voucher reminders,
                and wishlist alerts from one place.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={refresh}
                disabled={refreshing}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-primary-300 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-primary-500 dark:hover:text-primary-200"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <button
                type="button"
                onClick={markAllAsRead}
                disabled={!unreadCount}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-bold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700 dark:disabled:text-slate-300"
              >
                <CheckCheck className="h-4 w-4" />
                Mark all read
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            <StatCard label="Total" value={stats.total} />
            <StatCard label="Unread" value={stats.unread} />
            <StatCard label="Orders" value={stats.orders} />
            <StatCard label="Returns" value={stats.returns} />
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {notificationFilters.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setActiveFilter(filter.id)}
                  className={`inline-flex min-h-10 shrink-0 items-center rounded-lg border px-3 text-sm font-bold transition ${
                    activeFilter === filter.id
                      ? "border-primary-600 bg-primary-600 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-primary-300 hover:text-primary-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-primary-500 dark:hover:text-primary-200"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                to="/my-alerts"
                className="inline-flex min-h-10 items-center rounded-lg border border-pink-200 bg-pink-50 px-3 text-sm font-bold text-pink-700 transition hover:bg-pink-100 dark:border-pink-500/30 dark:bg-pink-500/10 dark:text-pink-200 dark:hover:bg-pink-500/20"
              >
                Product alerts
              </Link>
              <button
                type="button"
                onClick={clearAll}
                disabled={!notifications.length}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 text-sm font-bold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/20"
              >
                <Trash2 className="h-4 w-4" />
                Clear all
              </button>
            </div>
          </div>

          {groups.length === 0 ? (
            <div className="p-10 text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                <Bell className="h-8 w-8" />
              </span>
              <h2 className="mt-4 text-xl font-black text-slate-950 dark:text-white">
                No notifications here
              </h2>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300">
                Order, return, support, voucher, and wishlist updates will appear here
                as soon as there is something new.
              </p>
              <Link
                to="/products"
                className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-primary-600 px-4 text-sm font-bold text-white hover:bg-primary-700"
              >
                Browse products
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {groups.map((group) => (
                <section key={group.id} className="p-4">
                  <h2 className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {group.label}
                  </h2>
                  <div className="space-y-3">
                    {group.items.map((notification) => {
                      const meta = getNotificationMeta(notification.type);
                      const content = (
                        <div
                          className={`flex gap-3 rounded-lg border p-4 text-left transition hover:border-primary-200 hover:bg-primary-50/40 dark:hover:border-primary-500/40 dark:hover:bg-primary-500/10 ${
                            notification.read
                              ? "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                              : "border-primary-200 bg-primary-50 dark:border-primary-500/30 dark:bg-primary-500/10"
                          }`}
                        >
                          <NotificationIcon type={notification.type} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-black text-slate-950 dark:text-white">
                                {notification.title}
                              </p>
                              <span
                                className={`inline-flex min-h-6 items-center rounded-full border px-2 text-[11px] font-black uppercase ${meta.tone}`}
                              >
                                {meta.label}
                              </span>
                              {!notification.read && (
                                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-primary-600" />
                              )}
                            </div>
                            {notification.message && (
                              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                                {notification.message}
                              </p>
                            )}
                            <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                              {formatRelativeNotificationTime(notification.timestamp)}
                            </p>
                          </div>
                        </div>
                      );

                      return (
                        <div key={notification.id} className="group relative">
                          {notification.link ? (
                            <Link
                              to={notification.link}
                              onClick={() => markAsRead(notification.id)}
                              className="block"
                            >
                              {content}
                            </Link>
                          ) : (
                            <button
                              type="button"
                              onClick={() => markAsRead(notification.id)}
                              className="block w-full"
                            >
                              {content}
                            </button>
                          )}

                          <div className="mt-2 flex flex-wrap justify-end gap-2">
                            {!notification.read && (
                              <button
                                type="button"
                                onClick={() => markAsRead(notification.id)}
                                className="rounded-lg px-3 py-1.5 text-xs font-bold text-primary-700 transition hover:bg-primary-50 dark:text-primary-300 dark:hover:bg-primary-500/10"
                              >
                                Mark as read
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => clearNotification(notification.id)}
                              className="rounded-lg px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
