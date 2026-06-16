import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BadgeDollarSign,
  Bell,
  BellRing,
  PackageCheck,
  RotateCcw,
  ShoppingBag,
  Truck,
  XCircle,
} from "lucide-react";
import { useNotifications } from "../context/NotificationContext";
import { useClickOutside } from "../hooks/useClickOutside";

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
  } = useNotifications();

  useClickOutside(dropdownRef, () => setIsOpen(false));

  const getNotificationIcon = (type) => {
    switch (type) {
      case "order":
        return ShoppingBag;
      case "return":
        return RotateCcw;
      case "refund":
        return BadgeDollarSign;
      case "cancel":
        return XCircle;
      case "product":
        return PackageCheck;
      case "delivery":
        return Truck;
      default:
        return BellRing;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case "order":
        return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200";
      case "return":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200";
      case "refund":
        return "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200";
      case "cancel":
        return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200";
      case "product":
        return "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200";
      case "delivery":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
          isOpen
            ? "border-[#1e7098]/35 bg-[#1e7098] text-white shadow-sm"
            : "border-gray-200 bg-white text-gray-700 hover:border-[#1e7098]/30 hover:bg-gray-50 hover:text-[#1e7098] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
        }`}
        title="Notifications"
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black leading-none text-white ring-2 ring-white dark:ring-gray-900">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed left-3 right-3 top-[4.25rem] z-[260] flex max-h-[calc((var(--vh,1vh)*100)-5rem)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-slate-900/20 dark:border-gray-700 dark:bg-gray-900 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 sm:max-h-[600px]">
          <div className="border-b border-gray-200 bg-white/95 p-4 backdrop-blur dark:border-gray-700 dark:bg-gray-900/95">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white">
                  Notifications
                </h3>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  {unreadCount > 0
                    ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}`
                    : "All caught up"}
                </p>
              </div>
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="shrink-0 text-sm font-bold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
                  <Bell className="h-8 w-8 text-gray-400 dark:text-gray-500" aria-hidden="true" />
                </div>
                <p className="font-semibold text-gray-500 dark:text-gray-400">
                  No notifications yet
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-800">
                {notifications.map((notification) => {
                  const Icon = getNotificationIcon(notification.type);

                  return (
                    <div
                      key={notification.id}
                      role={notification.link ? "button" : undefined}
                      tabIndex={notification.link ? 0 : undefined}
                      onClick={() => {
                        if (!notification.link) return;
                        markAsRead(notification.id);
                        setIsOpen(false);
                        navigate(notification.link);
                      }}
                      onKeyDown={(event) => {
                        if (!notification.link || !["Enter", " "].includes(event.key)) return;
                        event.preventDefault();
                        markAsRead(notification.id);
                        setIsOpen(false);
                        navigate(notification.link);
                      }}
                      className={`p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
                        !notification.read ? "bg-blue-50 dark:bg-blue-950/30" : ""
                      } ${notification.link ? "cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500" : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${getNotificationColor(
                            notification.type,
                          )}`}
                        >
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 text-sm font-bold text-gray-900 dark:text-white">
                            {notification.title}
                          </p>
                          <p className="mt-1 line-clamp-2 text-sm leading-5 text-gray-600 dark:text-gray-300">
                            {notification.message}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                              {formatTime(notification.timestamp)}
                            </span>
                            {!notification.read && (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  markAsRead(notification.id);
                                }}
                                className="text-xs font-bold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                              >
                                Mark as read
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                clearNotification(notification.id);
                              }}
                              className="text-xs font-bold text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            >
                              Remove
                            </button>
                          </div>
                          {notification.link && (
                            <Link
                              to={notification.link}
                              onClick={(event) => {
                                event.stopPropagation();
                                markAsRead(notification.id);
                                setIsOpen(false);
                              }}
                              className="mt-2 inline-block text-sm font-bold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                            >
                              View details
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 bg-white/95 p-3 backdrop-blur dark:border-gray-700 dark:bg-gray-900/95">
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="block rounded-xl bg-primary-50 px-3 py-2.5 text-center text-sm font-black text-primary-700 transition hover:bg-primary-100 dark:bg-primary-950/40 dark:text-primary-300 dark:hover:bg-primary-950/60"
            >
              Open notification center
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
