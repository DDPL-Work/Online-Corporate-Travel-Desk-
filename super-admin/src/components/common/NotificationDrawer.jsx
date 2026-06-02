import React, { useEffect } from "react";
import { IoClose, IoNotificationsOutline, IoTrashOutline } from "react-icons/io5";
import { formatDistanceToNow } from "date-fns";

export default function NotificationDrawer({
  isOpen,
  notifications,
  loading,
  unreadCount,
  onClose,
  onNotificationClick,
  onMarkAllAsRead,
  onDeleteNotification,
}) {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-70">
      <button
        type="button"
        aria-label="Close notifications"
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-[#04112F] shadow-[[-20px_0_80px_rgba(0,0,0,0.5)] border-l border-[#C9A84C]/20 flex flex-col">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#C9A84C]/20 bg-[#04112F]">
          <div>
            <h2 className="text-lg font-bold text-white tracking-widest uppercase flex items-center gap-2">All Notifications</h2>
            <p className="text-[10px] uppercase font-bold tracking-wider text-[#C9A84C] mt-0.5">
              {unreadCount} unread notification{unreadCount === 1 ? "" : "s"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={onMarkAllAsRead}
                className="rounded-lg border border-[#C9A84C]/40 px-3 py-2 text-xs font-semibold text-[#C9A84C] hover:bg-[#C9A84C]/10 transition-colors"
              >
                Mark all as read
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-[#C9A84C]/10 hover:text-white transition-colors"
            >
              <IoClose size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="p-8 text-center text-xs font-bold uppercase tracking-widest text-slate-500">
              Loading notifications...
            </div>
          ) : notifications.length > 0 ? (
            notifications.map((notification) => (
              <div
                key={notification._id}
                className={`group border-b border-[#C9A84C]/10 px-5 py-4 transition-colors hover:bg-[#C9A84C]/5 ${
                  !notification.isRead ? "bg-[#C9A84C]/10" : "bg-transparent"
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => onNotificationClick(notification)}
                    className="flex-1 text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3
                          className={`text-sm ${
                            !notification.isRead
                              ? "font-bold text-white"
                              : "font-medium text-slate-300"
                          }`}
                        >
                          {notification.title}
                        </h3>
                        <p className="mt-1 text-sm text-slate-400 leading-6">
                          {notification.message}
                        </p>
                      </div>
                      {!notification.isRead ? (
                        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#C9A84C] shadow-[0_0_8px_rgba(201,168,76,0.6)]" />
                      ) : null}
                    </div>
                    <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </button>

                  <button
                    type="button"
                    aria-label="Delete notification"
                    onClick={() => onDeleteNotification(notification._id)}
                    className="mt-1 rounded-lg p-2 text-slate-500 opacity-0 transition group-hover:opacity-100 hover:bg-rose-500/10 hover:text-rose-400"
                  >
                    <IoTrashOutline size={18} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-8 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#C9A84C]/10 border border-[#C9A84C]/20">
                <IoNotificationsOutline className="text-[#C9A84C]" size={26} />
              </div>
              <h3 className="text-base font-semibold text-white">
                No notifications yet
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                New wallet, booking, and activity alerts will appear here.
              </p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
