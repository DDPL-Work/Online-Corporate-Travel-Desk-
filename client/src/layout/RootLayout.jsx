import { Outlet } from "react-router-dom";
import PageTitleHandler from "../utils/PageTitleHandler";

/**
 * Root Layout Component
 * Wraps the entire application and handles global features
 * like page title updates based on routes
 */
export default function RootLayout() {
  return (
    <>
      <PageTitleHandler />
      <Outlet />
    </>
  );
}
