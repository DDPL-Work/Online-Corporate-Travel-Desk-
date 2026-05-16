import { Outlet } from "react-router-dom";
import PageTitleHandler from "../utils/PageTitleHandler";
import Sidebar from "./Sidebar";
import { useSelector, useDispatch } from "react-redux";
import { closeSidebar } from "../Redux/Slice/layoutSlice";

export default function RootLayout() {
  const dispatch = useDispatch();
  const { isSidebarOpen } = useSelector((state) => state.layout);
  const { role, isAuthenticated } = useSelector((state) => state.auth);

  return (
    <>
      <PageTitleHandler />
      
      {/* GLOBAL SIDEBAR (Accessible from anywhere if logged in) */}
      {isAuthenticated && (
        <>
          <Sidebar
            role={role}
            isOpen={isSidebarOpen}
            onClose={() => dispatch(closeSidebar())}
          />

          {/* BACKDROP */}
          {isSidebarOpen && (
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90]"
              onClick={() => dispatch(closeSidebar())}
            />
          )}
        </>
      )}

      <Outlet />
    </>
  );
}
