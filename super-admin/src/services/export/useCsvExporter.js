import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  createDatedExportFilename,
  downloadCsv,
} from "../../utils/export/csvExport";

export default function useCsvExporter() {
  const [exportingKey, setExportingKey] = useState(null);

  const exportCsv = useCallback(
    async ({
      key,
      data,
      columns,
      filenamePrefix,
      emptyMessage = "No data available to export",
      startedMessage = "Export started",
      successMessage = "Export successful",
      errorMessage = "Export failed",
    }) => {
      const rows = Array.isArray(data) ? data : [];
      const exportKey = key || filenamePrefix || "csv_export";

      if (rows.length === 0) {
        toast.info(emptyMessage);
        return false;
      }

      try {
        setExportingKey(exportKey);
        toast.info(startedMessage);
        await downloadCsv({
          data: rows,
          columns,
          filename: createDatedExportFilename(filenamePrefix),
        });
        toast.success(successMessage);
        return true;
      } catch (error) {
        console.error("[csv-export]", error);
        toast.error(errorMessage);
        return false;
      } finally {
        setExportingKey(null);
      }
    },
    [],
  );

  return {
    exportCsv,
    exportingKey,
    isExporting: Boolean(exportingKey),
  };
}
