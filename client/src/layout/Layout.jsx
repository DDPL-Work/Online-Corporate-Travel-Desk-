import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import Sidebar from "./Sidebar";
import Header from "./Header";
import { loginUser } from "../Redux/Slice/authSlice"; // update if using different logout

const Layout = () => {
  const dispatch = useDispatch();
  const location = useLocation();

  const { token, role, isAuthenticated } = useSelector((state) => state.auth);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Pages WITHOUT sidebar/header
  const authPages = ["/login", "/register", "/forgot-password"];

  const isAuthPage = authPages.includes(location.pathname);

  // Logout handler
  const handleLogout = () => {
    dispatch(loginUser());
  };

  // Fix sidebar issue on resize
  useEffect(() => {
    const handler = () => {
      if (window.innerWidth >= 1024) setIsSidebarOpen(false);
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // ------------------------------
  // AUTH PAGES (NO SIDEBAR/HEADER)
  // ------------------------------
  if (isAuthPage) {
    return (
      <div className="min-h-screen w-full">
        <Outlet />
      </div>
    );
  }

  // ------------------------------
  // NOT LOGGED IN? REDIRECT
  // ------------------------------
  if (!isAuthenticated || !token) {
    return <Navigate to="/login" replace />;
  }

  // ------------------------------
  // ROLE-BASED REDIRECTS
  // ------------------------------
  if (location.pathname === "/") {
    if (role === "super-admin") return <Navigate to="/total-bookings" replace />;
    if (role === "corporate-admin") return <Navigate to="/corporate-dashboard" replace />;
    if (role === "employee") return <Navigate to="/my-bookings" replace />;
  }

  // ------------------------------
  // DASHBOARD LAYOUT
  // ------------------------------
  return (
    <div className="flex h-screen w-full bg-[#F8FAFC]">

      {/* Sidebar */}
      <Sidebar
        role={role}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <Header
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          sidebarOpen={isSidebarOpen}
          handleLogout={handleLogout}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;
