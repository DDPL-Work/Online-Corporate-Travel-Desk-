import React, { useState, useRef, useEffect } from "react";
import { useNotifications } from "../../context/NotificationContext";
import { IoNotificationsOutline } from "react-icons/io5";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import NotificationDrawer from "./NotificationDrawer";

const NotificationBell = ({ onOpen }) => {
  const {
    notifications,
    unreadCount,
    loading,
    drawerOpen,
    markAsRead,
    markAllAsRead,
    fetchNotifications,
    deleteNotification,
    openDrawer,
    closeDrawer,
  } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleCustomClose = () => setIsOpen(false);
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("closeNotificationBell", handleCustomClose);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("closeNotificationBell", handleCustomClose);
    };
  }, []);

  const handleNotificationClick = (notification) => {
    markAsRead(notification._id);
    setIsOpen(false);
    closeDrawer();
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
      if (onOpen) onOpen();
    }
    setIsOpen(!isOpen);
  };

  const handleOpenDrawer = () => {
    setIsOpen(false);
    openDrawer();
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={toggleDropdown}

          className="relative p-2 text-gray-600 bg-gray-100 rounded transition-colors focus:outline-none"
        >
          <IoNotificationsOutline size={24} />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-semibold text-gray-800">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Mark all as read
                </button>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <div
                    key={notification._id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${
                      !notification.isRead ? "bg-blue-50/30" : ""
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4 className={`text-sm ${!notification.isRead ? "font-bold text-gray-900" : "font-medium text-gray-700"}`}>
                        {notification.title}
                      </h4>
                      {!notification.isRead && (
                        <span className="h-2 w-2 rounded-full bg-blue-500 mt-1.5"></span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                      {notification.message}
                    </p>
                    <span className="text-[10px] text-gray-400">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <IoNotificationsOutline className="text-gray-400" size={24} />
                  </div>
                  <p className="text-sm text-gray-500 font-medium">No notifications yet</p>
                  <p className="text-xs text-gray-400 mt-1">We'll notify you when something important happens.</p>
                </div>
              )}
            </div>

            {notifications.length > 0 && (
              <div className="p-3 bg-gray-50 text-center border-top border-gray-100">
                <button
                  onClick={handleOpenDrawer}
                  className="text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors"
                >
                  View all activity
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <NotificationDrawer
        isOpen={drawerOpen}
        notifications={notifications}
        loading={loading}
        unreadCount={unreadCount}
        onClose={closeDrawer}
        onNotificationClick={handleNotificationClick}
        onMarkAllAsRead={markAllAsRead}
        onDeleteNotification={deleteNotification}
      />
    </>
  );
};

export default NotificationBell;
