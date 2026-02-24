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

export const getStopsLabel = (segments = []) => {
  const stops = segments.length - 1;
  if (stops <= 0) return "Non-stop";
  return `${stops} Stop${stops > 1 ? "s" : ""}`;
};

export const formatDuration = (mins = 0) =>
  `${Math.floor(mins / 60)}h ${mins % 60}m`;

export const getTotalDuration = (segments = []) =>
  segments.reduce((sum, s) => sum + (s.Duration || 0), 0);

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
  1: "all",
  2: "economy",
  3: "premium_economy",
  4: "business",
  5: "premium_business",
  6: "first",
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

export const groupSegmentsByJourney = (segments = []) => {
  const grouped = {
    onward: [],
    return: [],
    multi: [],
  };

  segments.forEach((seg, index) => {
    if (seg.journeyType === "onward") {
      grouped.onward.push(seg);
    } else if (seg.journeyType === "return") {
      grouped.return.push(seg);
    } else {
      grouped.multi.push({ ...seg, routeIndex: index + 1 });
    }
  });

  return grouped;
};

export const airlineThemes = {
  // 🇮🇳 INDIA

  AI: { primary: "#8B0000", secondary: "#B22222", accent: "#D4AF37" }, // Air India
  IX: { primary: "#C8102E", secondary: "#E03C31", accent: "#FFFFFF" }, // Air India Express
  "6E": { primary: "#002D72", secondary: "#0057B8", accent: "#FFFFFF" }, // IndiGo
  UK: { primary: "#4B0082", secondary: "#6A0DAD", accent: "#C5A253" }, // Vistara
  SG: { primary: "#D71920", secondary: "#F44336", accent: "#FFFFFF" }, // SpiceJet
  G8: { primary: "#7CFC00", secondary: "#32CD32", accent: "#000000" }, // Go First
  I5: { primary: "#FF6F00", secondary: "#FF8F00", accent: "#FFFFFF" }, // AirAsia India
  S5: { primary: "#003DA5", secondary: "#005EB8", accent: "#FFFFFF" }, // Star Air
  QP: { primary: "#2C2C2C", secondary: "#555555", accent: "#F7C948" }, // Akasa Air
  "9I": { primary: "#1E90FF", secondary: "#00BFFF", accent: "#FFFFFF" }, // Alliance Air

  // 🌏 MIDDLE EAST

  EK: { primary: "#C8102E", secondary: "#8B0000", accent: "#D4AF37" }, // Emirates
  EY: { primary: "#B38B59", secondary: "#7A5C2E", accent: "#FFFFFF" }, // Etihad
  QR: { primary: "#5C0E3E", secondary: "#8A1538", accent: "#FFFFFF" }, // Qatar Airways
  GF: { primary: "#A40000", secondary: "#D32F2F", accent: "#FFFFFF" }, // Gulf Air
  KU: { primary: "#002F6C", secondary: "#005EB8", accent: "#FFFFFF" }, // Kuwait Airways
  SV: { primary: "#006C35", secondary: "#0A8754", accent: "#FFFFFF" }, // Saudia
  WY: { primary: "#B22222", secondary: "#8B0000", accent: "#FFFFFF" }, // Oman Air

  // 🌍 EUROPE

  BA: { primary: "#00247D", secondary: "#CF142B", accent: "#FFFFFF" }, // British Airways
  LH: { primary: "#05164D", secondary: "#002D62", accent: "#F9BA00" }, // Lufthansa
  AF: { primary: "#002157", secondary: "#0055A4", accent: "#EF4135" }, // Air France
  KL: { primary: "#00A1DE", secondary: "#005EB8", accent: "#FFFFFF" }, // KLM
  TK: { primary: "#C8102E", secondary: "#8B0000", accent: "#FFFFFF" }, // Turkish Airlines
  AZ: { primary: "#006341", secondary: "#009639", accent: "#FFFFFF" }, // ITA Airways
  IB: { primary: "#D71920", secondary: "#AA151B", accent: "#F1BF00" }, // Iberia

  // 🌎 AMERICAS

  AA: { primary: "#002F6C", secondary: "#B31942", accent: "#FFFFFF" }, // American Airlines
  DL: { primary: "#C8102E", secondary: "#003A70", accent: "#FFFFFF" }, // Delta
  UA: { primary: "#005DAA", secondary: "#002244", accent: "#FFFFFF" }, // United
  AC: { primary: "#D80621", secondary: "#000000", accent: "#FFFFFF" }, // Air Canada
  B6: { primary: "#003876", secondary: "#0076CE", accent: "#FFFFFF" }, // JetBlue

  // 🌏 ASIA PACIFIC

  SQ: { primary: "#072B61", secondary: "#F1B434", accent: "#FFFFFF" }, // Singapore Airlines
  CX: { primary: "#006564", secondary: "#009688", accent: "#FFFFFF" }, // Cathay Pacific
  NH: { primary: "#005BAC", secondary: "#002D62", accent: "#FFFFFF" }, // ANA
  JL: { primary: "#C8102E", secondary: "#8B0000", accent: "#FFFFFF" }, // Japan Airlines
  OZ: { primary: "#E60012", secondary: "#B00020", accent: "#FFFFFF" }, // Asiana
  TG: { primary: "#4B0082", secondary: "#8A2BE2", accent: "#FFD700" }, // Thai Airways
};
