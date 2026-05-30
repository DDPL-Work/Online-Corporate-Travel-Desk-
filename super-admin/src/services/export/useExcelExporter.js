import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  createDatedExcelFilename,
  downloadExcel,
} from "../../utils/export/excelExport";

export default function useExcelExporter() {
  const [exportingKey, setExportingKey] = useState(null);

  const exportExcel = useCallback(
    async ({
      key,
      pageHeader,
      statCards,
      appliedFilters,
      data,
      columns,
      filenamePrefix,
      emptyMessage = "No data available to export",
      startedMessage = "Export started",
      successMessage = "Export successful",
      errorMessage = "Export failed",
    }) => {
      const rows = Array.isArray(data) ? data : [];
      const exportKey = key || filenamePrefix || "excel_export";

      if (rows.length === 0) {
        toast.info(emptyMessage);
        return false;
      }

      try {
        setExportingKey(exportKey);
        // toast.info(startedMessage);
        await downloadExcel({
          pageHeader,
          statCards,
          appliedFilters,
          data: rows,
          columns,
          filename: createDatedExcelFilename(filenamePrefix),
        });
        // toast.success(successMessage);
        return true;
      } catch (error) {
        console.error("[excel-export]", error);
        toast.error(errorMessage);
        return false;
      } finally {
        setExportingKey(null);
      }
    },
    [],
  );

  return {
    exportExcel,
    exportingKey,
    isExporting: Boolean(exportingKey),
  };
}
