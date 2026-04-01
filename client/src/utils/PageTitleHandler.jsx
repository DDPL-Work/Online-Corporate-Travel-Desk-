import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { getPageTitle } from "../config/routeTitles";

/**
 * PageTitleHandler Component
 * Updates the browser tab title based on the current route
 * Place this component inside the RouterProvider context
 */
export default function PageTitleHandler() {
  const location = useLocation();

  useEffect(() => {
    const title = getPageTitle(location.pathname);
    document.title = title;

    // Optional: Add some logging for debugging
    // console.log(`📄 Page changed to: ${location.pathname} | Title: ${title}`);
  }, [location.pathname]);

  return null; // This component doesn't render anything
}
