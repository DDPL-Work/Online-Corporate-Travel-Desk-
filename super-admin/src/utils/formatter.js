export const formatDate = (value) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatDateWithYear = formatDate;

export const formatTime = (value) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export const formatDuration = (minutes = 0) => {
  const safeMinutes = Number(minutes || 0);
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  return hours ? `${hours}h ${mins}m` : `${mins}m`;
};

export const getCabinClassLabel = (value) => value || "Economy";

/**
 * Returns the CDN URL for an airline logo by IATA code.
 * Uses kiwi.com's public airline image CDN (64×64 PNG).
 * @param {string} code  - IATA airline code (e.g. "EY", "AI")
 * @returns {string} logo URL
 */
export const airlineLogo = (code) =>
  code
    ? `https://images.kiwi.com/airlines/64x64/${code}.png`
    : "https://via.placeholder.com/32";

export const FLIGHT_STATUS_MAP = {
  ticketed: "Ticketed",
  completed: "Completed",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  cancel_requested: "Cancel Requested",
  pending: "Pending",
};
