const DEFAULT_CHUNK_SIZE = 1000;

const yieldToBrowser = () =>
  new Promise((resolve) => {
    const scheduler = typeof window !== "undefined" ? window.setTimeout : setTimeout;
    scheduler(resolve, 0);
  });

export const formatDateForFilename = (date = new Date()) => {
  const parsed = date instanceof Date ? date : new Date(date);
  const safeDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const year = safeDate.getFullYear();
  const month = String(safeDate.getMonth() + 1).padStart(2, "0");
  const day = String(safeDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const createDatedExportFilename = (prefix, date = new Date()) => {
  const safePrefix = String(prefix || "table_export")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return `${safePrefix || "table_export"}_${formatDateForFilename(date)}.csv`;
};

export const valueOrNA = (value) => {
  if (value === null || value === undefined || value === "") return "N/A";
  return value;
};

export const formatExportBoolean = (value) => {
  if (value === null || value === undefined || value === "") return "N/A";
  return value ? "Yes" : "No";
};

export const formatExportCurrency = (value, currency = "INR") => {
  const amount = Number(value || 0);
  return `${currency} ${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

export const formatExportDate = (value) => {
  if (!value) return "N/A";
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return "N/A";

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatExportDateTime = (value) => {
  if (!value) return "N/A";
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return "N/A";

  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getByPath = (row, path) =>
  String(path)
    .split(".")
    .reduce((value, key) => (value === null || value === undefined ? undefined : value[key]), row);

const resolveCellValue = (column, row, rowIndex) => {
  if (typeof column.value === "function") return column.value(row, rowIndex);
  if (column.key) return getByPath(row, column.key);
  return "";
};

const stringifyCell = (value) => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return formatExportDateTime(value);
  if (typeof value === "boolean") return formatExportBoolean(value);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const escapeCsvCell = (value) => {
  let cell = stringifyCell(value).replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  if (/^[=+\-@]/.test(cell.trimStart())) {
    cell = `\t${cell}`;
  }

  if (/[",\n]/.test(cell)) {
    return `"${cell.replace(/"/g, '""')}"`;
  }

  return cell;
};

export const generateCsv = async ({ data, columns, chunkSize = DEFAULT_CHUNK_SIZE }) => {
  const rows = Array.isArray(data) ? data : [];
  const safeColumns = Array.isArray(columns) ? columns : [];
  const lines = [safeColumns.map((column) => escapeCsvCell(column.header)).join(",")];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    lines.push(
      safeColumns
        .map((column) => escapeCsvCell(resolveCellValue(column, row, index)))
        .join(","),
    );

    if ((index + 1) % chunkSize === 0) {
      await yieldToBrowser();
    }
  }

  return `\ufeff${lines.join("\r\n")}`;
};

export const downloadCsv = async ({ data, columns, filename }) => {
  const csv = await generateCsv({ data, columns });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
