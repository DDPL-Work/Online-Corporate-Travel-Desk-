import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Navigate,
  Outlet,
  useLocation,
  ScrollRestoration,
} from "react-router-dom";

import Sidebar from "./Sidebar";
import LandingHeader from "./LandingHeader";
import { C } from "../components/Shared/color";

export default function Layout() {
  const dispatch = useDispatch();
  const location = useLocation();
  const { role } = useSelector((state) => state.auth);

  // 🚪 Pages that do NOT need sidebar/header
  const authPages = ["/login", "/register", "/forgot-password"];
  const isAuthPage = authPages.includes(location.pathname);

  // ✅ Logout handler
  const handleLogout = () => {
    dispatch(logoutUser());
  };

  // =============================
  // AUTH PAGES — Minimal Layout
  // =============================
  if (isAuthPage) {
    return (
      <div className="min-h-screen w-full bg-[#F8FAFC] flex items-center justify-center" style={{ background: C.offWhite }}>
        <Outlet />
      </div>
    );
  }

  // =============================
  // ROLE-BASED ROOT REDIRECTS
  // =============================
  if (location.pathname === "/") {
    if (role === "travel-admin")
      return <Navigate to="/pending-requests" replace />;
    if (role === "manager")
      return <Navigate to="/pending-requests" replace />;
    if (role === "employee") return <Navigate to="/my-bookings" replace />;
  }

  // =============================
  // MAIN DASHBOARD LAYOUT
  // =============================
  return (
    <>
      <ScrollRestoration />

      <div className="flex h-screen w-full overflow-hidden" style={{ background: C.offWhite }}>
        {/* SIDEBAR IS NOW GLOBAL IN ROOTLAYOUT */}

        {/* ===== MAIN AREA ===== */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* ===== STICKY HEADER ===== */}
          <header className="sticky top-0 z-40 bg-white shadow-sm">
            <LandingHeader handleLogout={handleLogout} />
          </header>

          {/* ===== SCROLLABLE CONTENT ===== */}
          <main className="flex-1 min-w-0 w-full overflow-y-auto overflow-x-hidden px-4 md:px-6 py-6">
            <div className="w-full min-w-0 mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
