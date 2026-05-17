import { createContext, useContext, useState, useEffect } from "react";
import { auth } from "../firebase/firebase.config";

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within NotificationProvider",
    );
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const normalizeNotification = (notification) => ({
    id: notification._id || notification.id,
    title: notification.title || "Notification",
    message: notification.message || notification.body || "",
    type: notification.type || "system",
    link: notification.link || notification.data?.url || "",
    timestamp: notification.createdAt || notification.timestamp || new Date().toISOString(),
    read: notification.isRead ?? notification.read ?? false,
  });

  const loadServerNotifications = async (user) => {
    if (!user) return false;
    try {
      const token = await user.getIdToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/notifications?limit=30`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return false;
      const data = await response.json();
      const nextNotifications = (data.data || []).map(normalizeNotification);
      setNotifications(nextNotifications);
      setUnreadCount(data.unreadCount ?? nextNotifications.filter((n) => !n.read).length);
      saveNotifications(nextNotifications, user);
      return true;
    } catch {
      return false;
    }
  };

  // Load notifications from localStorage
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const loadedFromServer = await loadServerNotifications(user);
        if (!loadedFromServer) {
          const savedNotifications = localStorage.getItem(
            `notifications_${user.uid}`,
          );
          if (savedNotifications) {
            const parsed = JSON.parse(savedNotifications);
            setNotifications(parsed);
            setUnreadCount(parsed.filter((n) => !n.read).length);
          }
        }
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
    });
    return unsubscribe;
  }, []);

  // Save notifications to localStorage
  const saveNotifications = (newNotifications, explicitUser = null) => {
    const user = explicitUser || auth.currentUser;
    if (user) {
      localStorage.setItem(
        `notifications_${user.uid}`,
        JSON.stringify(newNotifications),
      );
    }
  };

  const addNotification = (notification) => {
    const newNotification = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      read: false,
      ...notification,
    };
    const updated = [newNotification, ...notifications];
    setNotifications(updated);
    setUnreadCount((prev) => prev + 1);
    saveNotifications(updated);
  };

  const markAsRead = (id) => {
    const updated = notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n,
    );
    setNotifications(updated);
    setUnreadCount(updated.filter((n) => !n.read).length);
    saveNotifications(updated);
    const user = auth.currentUser;
    if (user && typeof id === "string" && id.length === 24) {
      user.getIdToken().then((token) => {
        fetch(`${import.meta.env.VITE_API_URL}/notifications/${id}/read`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      });
    }
  };

  const markAllAsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    setUnreadCount(0);
    saveNotifications(updated);
    const user = auth.currentUser;
    if (user) {
      user.getIdToken().then((token) => {
        fetch(`${import.meta.env.VITE_API_URL}/notifications/read-all`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      });
    }
  };

  const clearNotification = (id) => {
    const updated = notifications.filter((n) => n.id !== id);
    setNotifications(updated);
    setUnreadCount(updated.filter((n) => !n.read).length);
    saveNotifications(updated);
    const user = auth.currentUser;
    if (user && typeof id === "string" && id.length === 24) {
      user.getIdToken().then((token) => {
        fetch(`${import.meta.env.VITE_API_URL}/notifications/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      });
    }
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
    const user = auth.currentUser;
    if (user) {
      localStorage.removeItem(`notifications_${user.uid}`);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAllNotifications,
        refreshNotifications: () => loadServerNotifications(auth.currentUser),
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
