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

  // Load notifications from localStorage
  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      const savedNotifications = localStorage.getItem(
        `notifications_${user.uid}`,
      );
      if (savedNotifications) {
        const parsed = JSON.parse(savedNotifications);
        setNotifications(parsed);
        setUnreadCount(parsed.filter((n) => !n.read).length);
      }
    }
  }, []);

  // Save notifications to localStorage
  const saveNotifications = (newNotifications) => {
    const user = auth.currentUser;
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
  };

  const markAllAsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    setUnreadCount(0);
    saveNotifications(updated);
  };

  const clearNotification = (id) => {
    const updated = notifications.filter((n) => n.id !== id);
    setNotifications(updated);
    setUnreadCount(updated.filter((n) => !n.read).length);
    saveNotifications(updated);
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
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
