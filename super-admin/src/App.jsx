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
        toastOptions={{
          unstyled: true, // 🚀 this disables Sonner’s default styles completely
          classNames: {
            toast: "sonner-toast",
            success: "success",
            error: "error",
            warning: "warning",
            info: "info",
            closeButton: "sonner-close-button",
          },
        }}
      />
    </>
  );
}

export default App;
