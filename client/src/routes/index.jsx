import { RouterProvider } from "react-router-dom";
import { appRouter } from "./route";

export default function AppRoutes() {
  return <RouterProvider router={appRouter} />;
}
