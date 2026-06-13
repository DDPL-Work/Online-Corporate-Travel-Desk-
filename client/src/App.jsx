import "./App.css";
import AppRoutes from "./routes";
import { Toaster } from "sonner";

function App() {
  return (
    <>
      <AppRoutes />

      {/* ✅ Sonner Toaster with custom CSS */}
      <Toaster
        position="top-right"
        expand
        closeButton
        duration={5000}
        toastOptions={{
          unstyled: true,
          classNames: {
            toast: "sonner-toast",
            success: "success",
            error: "error",
            info: "info",
            warning: "warning",
            closeButton: "sonner-close-button",
          },
        }}
      />
    </>
  );
}

export default App;
