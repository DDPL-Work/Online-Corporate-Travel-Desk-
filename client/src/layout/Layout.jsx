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
import { loginUser } from "../Redux/Slice/authSlice";

export default function Layout() {
  const dispatch = useDispatch();
  const location = useLocation();
  const { token, role, isAuthenticated } = useSelector((state) => state.auth);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // 🚪 Pages that do NOT need sidebar/header
  const authPages = ["/login", "/register", "/forgot-password"];
  const isAuthPage = authPages.includes(location.pathname);

  // ✅ Logout handler
  const handleLogout = () => {
    dispatch(loginUser());
  };

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
  if (!isAuthenticated || !token) {
    return <Navigate to="/sso-login" replace />;
  }

  // =============================
  // ROLE-BASED ROOT REDIRECTS
  // =============================
  if (location.pathname === "/") {
    if (role === "travel-admin")
      return <Navigate to="/pending-requests" replace />;
    if (role === "employee") return <Navigate to="/my-bookings" replace />;
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
            role={role}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          />
        </div>

        {/* ===== MAIN AREA ===== */}
        <div className="flex-1 flex flex-col lg:ml-64">
          {/* ===== STICKY HEADER ===== */}
          <header className="sticky top-0 z-40 bg-white shadow-sm">
            <Header
              toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
              sidebarOpen={isSidebarOpen}
              handleLogout={handleLogout}
            />
          </header>

          {/* ===== SCROLLABLE CONTENT ===== */}
          <main className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
            <div className="max-w-7xl mx-auto">
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
