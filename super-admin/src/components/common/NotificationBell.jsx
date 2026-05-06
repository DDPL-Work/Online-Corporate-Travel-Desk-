import React, { useState, useRef, useEffect } from "react";
import { useNotifications } from "../../context/NotificationContext";
import { IoNotificationsOutline } from "react-icons/io5";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, fetchNotifications } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = (notification) => {
    markAsRead(notification._id);
    setIsOpen(false);
    if (notification.link) {
      if (window.location.pathname === notification.link) {
        window.location.reload();
      } else {
        navigate(notification.link);
      }
    }
  };

  const toggleDropdown = () => {
    if (!isOpen) {
      fetchNotifications();
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}

        className="relative p-2 text-gray-600 bg-gray-100 rounded"
      >
        <IoNotificationsOutline size={22} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-1 ring-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="p-3 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[10px] font-semibold text-blue-600 hover:text-blue-700"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 ${
                    !notification.isRead ? "bg-blue-50/20" : ""
                  }`}
                >
                  <h4 className={`text-xs ${!notification.isRead ? "font-bold text-gray-900" : "font-medium text-gray-600"}`}>
                    {notification.title}
                  </h4>
                  <p className="text-[10px] text-gray-500 line-clamp-2 mt-0.5">
                    {notification.message}
                  </p>
                  <span className="text-[9px] text-gray-400 mt-1 block">
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-gray-400">
                <p className="text-xs">No notifications</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
