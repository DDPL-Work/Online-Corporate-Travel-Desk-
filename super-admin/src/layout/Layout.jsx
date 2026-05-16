import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Navigate,
  Outlet,
  useLocation,
  ScrollRestoration,
} from "react-router-dom";

import Sidebar from "./Sidebar";
import Header from "./Header";
import { logoutUser } from "../Redux/Slice/authSlice";
import { fetchUserProfile } from "../Redux/Slice/profileSlice";
import {
  getDefaultDashboardPath,
  normalizePermissions,
} from "../constants/rbac";

export default function Layout() {
  const dispatch = useDispatch();
  const location = useLocation();
  const { token, role, user, isAuthenticated } = useSelector((state) => state.auth);
  const profileUser = useSelector((state) => state.profile.user);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // 🚪 Pages that do NOT need sidebar/header
  const authPages = ["/login", "/register", "/forgot-password"];
  const isAuthPage = authPages.includes(location.pathname);

  // ✅ Logout handler
  const handleLogout = () => {
    dispatch(logoutUser());
  };

  const storedToken = sessionStorage.getItem("token");
  const storedRole = sessionStorage.getItem("role");
  const storedUser = (() => {
    try {
      const raw = sessionStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();
  const effectiveToken = token || storedToken;
  const effectiveRole =
    role ||
    profileUser?.role ||
    user?.role ||
    user?.userRole ||
    storedUser?.role ||
    storedUser?.userRole ||
    storedRole ||
    null;
  const permissions = normalizePermissions(
    profileUser?.permissions || user?.permissions || storedUser?.permissions || [],
  );

  useEffect(() => {
    if (!effectiveToken) return;

    dispatch(fetchUserProfile()).catch(() => {});
  }, [dispatch, effectiveToken]);

  // 📱 Responsive Sidebar Reset on Resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setIsSidebarOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // =============================
  // AUTH PAGES — Minimal Layout
  // =============================
  if (isAuthPage) {
    return (
      <div className="min-h-screen w-full bg-[#F8FAFC] flex items-center justify-center">
        <Outlet />
      </div>
    );
  }

  // =============================
  // REDIRECT IF NOT AUTHENTICATED
  // =============================
  if (!isAuthenticated && !effectiveToken) {
    return <Navigate to="/login" replace />;
  }

  // =============================
  // ROLE-BASED ROOT REDIRECTS
  // =============================
  if (location.pathname === "/") {
    return (
      <Navigate
        to={getDefaultDashboardPath({
          role: effectiveRole,
          permissions,
        })}
        replace
      />
    );
  }

  // =============================
  // MAIN DASHBOARD LAYOUT
  // =============================
  return (
    <>
      <ScrollRestoration />

      <div className="flex h-screen w-full bg-[#F8FAFC] overflow-hidden">
        {/* ===== FIXED SIDEBAR ===== */}
        <div className="fixed top-0 left-0 h-full z-50">
          <Sidebar
            role={effectiveRole}
            permissions={permissions}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          />
        </div>

        {/* ===== MAIN AREA ===== */}
        <div className="flex-1 min-w-0 flex flex-col lg:ml-64">
          {/* ===== STICKY HEADER ===== */}
          <header className="sticky top-0 z-40 bg-white shadow-sm">
            <Header
              toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
              sidebarOpen={isSidebarOpen}
              handleLogout={handleLogout}
            />
          </header>

          {/* ===== SCROLLABLE CONTENT ===== */}
          <main className="flex-1 overflow-y-auto overflow-x-auto px-2 py-2">
            <div className="w-full max-w-screen-2xl mx-auto">
              <Outlet />
            </div>
          </main>
        </div>

        {/* ===== MOBILE BACKDROP ===== */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </div>
    </>
  );
}
