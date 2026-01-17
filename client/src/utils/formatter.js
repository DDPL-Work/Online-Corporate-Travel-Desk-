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

export const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });

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

