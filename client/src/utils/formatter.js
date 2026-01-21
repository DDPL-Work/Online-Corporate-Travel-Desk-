export const getCabinClassLabel = (cabinClassCode) => {
  switch (Number(cabinClassCode)) {
    case 1:
      return "All";
    case 2:
      return "Economy";
    case 3:
      return "Premium Economy";
    case 4:
      return "Business";
    case 5:
      return "Premium Business";
    case 6:
      return "First";
    default:
      return "—";
  }
};

export const formatTime = (d) =>
  new Date(d).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

// with weekday and month in English
export const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });

export const formatDateTime = (date) => {
  if (!date) return "N/A";

  const d = new Date(date);

  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export const formatDateWithYear = (date) => {
  if (!date) return "N/A";
  const d = new Date(date);
  return d.toLocaleDateString("en-GB"); // DD/MM/YYYY
};

export const airlineLogo = (code) =>
  code
    ? `https://images.kiwi.com/airlines/64x64/${code}.png`
    : "https://via.placeholder.com/32";

export const formatStops = (stops) => {
  if (stops === 0) return "Direct";
  if (stops === 1) return "1 Stop";
  return `${stops} Stops`;
};

export const formatDuration = (mins = 0) =>
  `${Math.floor(mins / 60)}h ${mins % 60}m`;

const IST_OFFSET_MINUTES = 330; // +5:30

export const getDateInIST = (input) => {
  if (!input) return null;

  const date = new Date(input);
  if (isNaN(date.getTime())) return null;

  // Convert UTC → IST using offset math
  const utcTime = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utcTime + IST_OFFSET_MINUTES * 60000);
};

export const CABIN_MAP = {
  1: "Economy",
  2: "Premium Economy",
  3: "Business",
  4: "First",
};

// Airline color themes
export const airlineThemes = {
  AI: { gradient: "from-[#8B0000] to-[#B71C1C]" },
  "6E": { gradient: "from-[#3A5FD8] to-[#1E3A8A]" },
  SG: { gradient: "from-[#D32F2F] to-[#B71C1C]" },
  IX: { gradient: "from-[#E53935] to-[#C62828]" },
  UK: { gradient: "from-[#673AB7] to-[#4527A0]" },
  DEFAULT: { gradient: "from-blue-500 to-indigo-600" },
};

export const FLIGHT_STATUS_MAP = {
  Confirmed: {
    label: "Confirmed",
    className: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },
  Scheduled: {
    label: "Scheduled",
    className: "bg-blue-50 text-blue-700 border border-blue-200",
  },
  "Not Scheduled": {
    label: "Not Scheduled",
    className: "bg-amber-50 text-amber-700 border border-amber-200",
  },
  Cancelled: {
    label: "Cancelled",
    className: "bg-red-50 text-red-700 border border-red-200",
  },
};
