import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { formatDateForFilename } from "./csvExport";

export const createDatedExcelFilename = (prefix, date = new Date()) => {
  const safePrefix = String(prefix || "table_export")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return `${safePrefix || "table_export"}_${formatDateForFilename(date)}.xlsx`;
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
  if (typeof value === "object" && !(value instanceof Date)) return JSON.stringify(value);
  return value;
};

export const generateExcel = async ({
  pageHeader = "Data Export",
  statCards = [],
  appliedFilters = [],
  data = [],
  columns = [],
}) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Export Data");

  // Keep track of the current row index
  let currentRow = 1;

  // 1. Page Header
  const headerRow = worksheet.getRow(currentRow);
  headerRow.getCell(1).value = pageHeader;
  headerRow.getCell(1).font = { size: 16, bold: true };
  currentRow += 2; // Add an empty row after header

  // 2. Stat Cards
  if (statCards && statCards.length > 0) {
    const statTitleRow = worksheet.getRow(currentRow);
    statTitleRow.getCell(1).value = "Summary Statistics";
    statTitleRow.getCell(1).font = { size: 12, bold: true, italic: true };
    currentRow += 1;

    statCards.forEach((stat) => {
      const row = worksheet.getRow(currentRow);
      row.getCell(1).value = stat.label;
      row.getCell(1).font = { bold: true };
      row.getCell(2).value = stat.value;
      currentRow += 1;
    });
    currentRow += 1; // Empty row
  }

  // 3. Applied Filters
  if (appliedFilters && appliedFilters.length > 0) {
    const filterTitleRow = worksheet.getRow(currentRow);
    filterTitleRow.getCell(1).value = "Applied Filters";
    filterTitleRow.getCell(1).font = { size: 12, bold: true, italic: true };
    currentRow += 1;

    appliedFilters.forEach((filter) => {
      const row = worksheet.getRow(currentRow);
      row.getCell(1).value = filter.label;
      row.getCell(1).font = { bold: true };
      row.getCell(2).value = filter.value;
      currentRow += 1;
    });
    currentRow += 1; // Empty row
  }

  // 4. Table Headers
  const tableHeaderRow = worksheet.getRow(currentRow);
  columns.forEach((col, index) => {
    const cell = tableHeaderRow.getCell(index + 1);
    cell.value = col.header;
    cell.font = { bold: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });
  currentRow += 1;

  // 5. Table Data
  data.forEach((rowData, rowIndex) => {
    const row = worksheet.getRow(currentRow);
    columns.forEach((col, colIndex) => {
      const value = resolveCellValue(col, rowData, rowIndex);
      row.getCell(colIndex + 1).value = stringifyCell(value);
    });
    currentRow += 1;
  });

  // Auto-fit columns
  worksheet.columns.forEach((column) => {
    let maxLength = 0;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const columnLength = cell.value ? cell.value.toString().length : 10;
      if (columnLength > maxLength) {
        maxLength = columnLength;
      }
    });
    column.width = maxLength < 10 ? 10 : maxLength + 2;
  });

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

export const downloadExcel = async ({
  pageHeader,
  statCards,
  appliedFilters,
  data,
  columns,
  filename,
}) => {
  const buffer = await generateExcel({
    pageHeader,
    statCards,
    appliedFilters,
    data,
    columns,
  });

  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, filename);
};
