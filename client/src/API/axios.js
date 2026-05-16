import axios from "axios";
import { toast } from "react-toastify";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000",
});

// ── Request interceptor: attach auth token ──
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor: enterprise-grade error surfacing ──
// Rules:
//  4xx → warning / error toast with the server's human-readable message
//  5xx → critical error toast
//  success 2xx → pass through (individual thunks handle success toasts)
//
// IMPORTANT: we still call Promise.reject() so each thunk's rejectWithValue
//            can store the error in Redux state. The toast here is a global
//            safety net for cases where the caller does NOT show its own toast.
api.interceptors.response.use(
  (response) => response, // ✅ 2xx — pass through unchanged
  (error) => {
    const status = error?.response?.status;
    const serverMessage =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "An unexpected error occurred";

    // Do NOT toast on 401 — auth layer handles redirect/logout
    if (status === 401) {
      return Promise.reject(error);
    }

    // Do NOT toast on cancelled / aborted requests
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    // ── Build user-friendly message ──
    const userMessage = buildUserFriendlyMessage(status, serverMessage);

    if (status >= 500) {
      // Critical server errors
      toast.error(`⚠️ ${userMessage}`, {
        toastId: `api-error-${status}`,
        autoClose: 7000,
      });
    } else if (status >= 400) {
      // Client errors (bad request, conflict, not found, etc.)
      toast.warning(`⚠️ ${userMessage}`, {
        toastId: `api-warn-${status}-${serverMessage?.slice(0, 20)}`,
        autoClose: 5000,
      });
    } else if (!status) {
      // Network errors (no response received)
      toast.error("⚠️ Network error — please check your connection and try again.", {
        toastId: "api-network-error",
        autoClose: 7000,
      });
    }

    return Promise.reject(error);
  },
);

/**
 * Converts raw server messages into user-friendly UX copy.
 * Filters out internal/technical messages that should never reach users.
 */
function buildUserFriendlyMessage(status, rawMessage) {
  if (!rawMessage) {
    return status >= 500
      ? "A server error occurred. Please try again later."
      : "Something went wrong. Please try again.";
  }

  const safe = String(rawMessage);

  // Filter out technical/internal strings that aren't user-facing
  const isTechnical =
    /xml|stacktrace|stack trace|MongoError|CastError|ValidationError|axios timeout|ECONNREFUSED|internal server error/i.test(
      safe,
    );

  if (isTechnical) {
    return status >= 500
      ? "A server error occurred. Please try again later."
      : "Something went wrong. Please try again.";
  }

  // Known business-rule messages: return as-is (they're already user-friendly)
  return safe;
}

export default api;
