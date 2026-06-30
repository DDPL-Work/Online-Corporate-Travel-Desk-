/**
 * Universal CSV Export Utility
 * 
 * @param {Object} options
 * @param {Array} options.data - The array of row data to export.
 * @param {Array} options.columns - Array of column definitions: { header: string, key?: string, accessor?: function }
 * @param {string} options.filename - The desired output filename (e.g. 'report_2026-05-25.csv')
 */
export const exportToCSV = ({ data, columns, filename }) => {
  if (!data || data.length === 0) {
    console.warn("No data available to export.");
    return;
  }

  // Helper to safely format values for CSV
  const formatCell = (value) => {
    if (value === null || value === undefined) return "";
    
    // Convert to string
    let stringValue = typeof value === "object" ? JSON.stringify(value) : String(value);

    // Escape quotes
    if (stringValue.includes('"')) {
      stringValue = stringValue.replace(/"/g, '""');
    }

    // Wrap in quotes if it contains comma, newline, or quotes
    if (stringValue.includes(",") || stringValue.includes("\n") || stringValue.includes('"')) {
      return `"${stringValue}"`;
    }

    return stringValue;
  };

  // 1. Generate Headers
  const headers = columns.map(col => formatCell(col.header)).join(",");

  // 2. Generate Rows
  const rows = data.map(row => {
    return columns.map(col => {
      let cellValue = "";
      if (typeof col.accessor === "function") {
        try {
          cellValue = col.accessor(row);
        } catch (err) {
          console.warn(`Error applying accessor for column ${col.header}`, err);
        }
      } else if (col.key) {
        // Handle nested keys safely, e.g., "name.firstName"
        cellValue = col.key.split('.').reduce((acc, curr) => (acc ? acc[curr] : undefined), row);
      }
      return formatCell(cellValue);
    }).join(",");
  });

  // 3. Combine into CSV string (with UTF-8 BOM for Excel compatibility)
  const csvContent = "\uFEFF" + [headers, ...rows].join("\n");

  // 4. Trigger Download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename || "export.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
