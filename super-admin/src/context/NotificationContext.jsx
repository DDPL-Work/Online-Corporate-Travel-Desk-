import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";

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
      const response = await axios.get(`${API_URL}/notifications/my-notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.status === "success") {
        setNotifications(response.data.data.notifications);
        setUnreadCount(response.data.unreadCount);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
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
    // Show toast if new notifications arrived
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

