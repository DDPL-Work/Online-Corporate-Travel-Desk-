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
        toastOptions={{
          unstyled: true, 
          classNames: {
            toast: "sonner-toast",
            success: "success",
            error: "error",
            info: "info",
            warning: "warning",
          },
        }}
      />
    </>
  );
}

export default App;
