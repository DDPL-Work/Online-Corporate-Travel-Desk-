import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  requestForToken,
  subscribeToForegroundMessages,
} from "../config/firebase";

const NotificationContext = createContext();

const API_URL = import.meta.env.VITE_API_BASE_URL;

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    const token = sessionStorage.getItem("token");
    if (!token) return;

    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/notifications/my-notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.status === "success") {
        setNotifications(response.data.data.notifications);
        setUnreadCount(response.data.unreadCount);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveFcmToken = useCallback(async (fcmToken) => {
    const token = sessionStorage.getItem("token");
    if (!token || !fcmToken) return;

    try {
      await axios.post(
        `${API_URL}/notifications/save-fcm-token`,
        { token: fcmToken },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      console.info("[FCM:super-admin] FCM token saved to backend");
    } catch (error) {
      console.error("Error saving FCM token:", error);
    }
  }, []);

  const markAsRead = async (id) => {
    const token = sessionStorage.getItem("token");
    try {
      const response = await axios.patch(`${API_URL}/notifications/mark-as-read/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.status === "success") {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    const token = sessionStorage.getItem("token");
    try {
      const response = await axios.patch(`${API_URL}/notifications/mark-all-as-read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.status === "success") {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const deleteNotification = async (id) => {
    const token = sessionStorage.getItem("token");
    try {
      await axios.delete(`${API_URL}/notifications/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      fetchNotifications();
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  // Helper ref to track previous unread count to show toast
  const prevUnreadCountRef = useRef(0);
  const suppressUnreadToastRef = useRef(false);

  useEffect(() => {
    const authToken = sessionStorage.getItem("token");
    if (!authToken) return;

    // Initial fetch
    fetchNotifications();

    // Set up AJAX polling every 30 seconds
    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const authToken = sessionStorage.getItem("token");
    if (!authToken) return undefined;

    let unsubscribe = () => {};
    let mounted = true;

    const setupFirebaseNotifications = async () => {
      const fcmToken = await requestForToken();
      if (mounted && fcmToken) {
        await saveFcmToken(fcmToken);
      }

      unsubscribe = await subscribeToForegroundMessages((payload) => {
        console.info("[FCM:super-admin] Foreground notification payload received", payload);
        suppressUnreadToastRef.current = true;
        const title =
          payload?.notification?.title ||
          payload?.data?.title ||
          "New notification";
        const message =
          payload?.notification?.body ||
          payload?.data?.body ||
          "You have a new notification.";

        toast.info(title, {
          description: message,
        });
        fetchNotifications();
      });
    };

    setupFirebaseNotifications();

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [fetchNotifications, saveFcmToken]);

  useEffect(() => {
    // Show toast if new notifications arrived
    if (suppressUnreadToastRef.current) {
      suppressUnreadToastRef.current = false;
      prevUnreadCountRef.current = unreadCount;
      return;
    }

    if (unreadCount > prevUnreadCountRef.current) {
      const newNotificationsCount = unreadCount - prevUnreadCountRef.current;
      toast.info(`You have ${newNotificationsCount} new notification${newNotificationsCount > 1 ? 's' : ''}`);
    }
    prevUnreadCountRef.current = unreadCount;
  }, [unreadCount]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

