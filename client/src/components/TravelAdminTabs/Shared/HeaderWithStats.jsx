import React from "react";
import {
  FiDownload,
  FiXCircle,
  FiCalendar,
  FiDollarSign,
} from "react-icons/fi";
import { ToastWithTimer } from "../../../utils/ToastConfirm";

/**
 * Reusable Header + Stats component
 */
const HeaderWithStats = ({
  title,
  subtitle,
  exportFileName = "export.csv",
  exportData = [],
  exportHeaders = [],
  stats = [],
}) => {
  const handleExport = () => {
    if (!exportData.length) {
      ToastWithTimer({ type: "info", message: "No data available to export" });
      return;
    }

    const csvContent = [
      exportHeaders.join(","),
      ...exportData.map((row) =>
        exportHeaders
          .map((key) => `"${String(row[key] ?? "").replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = exportFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 mb-8">
      {/* ===== HEADER BAR ===== */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#0A4D68]">{title}</h1>
          <p className="text-gray-600">{subtitle}</p>
        </div>

        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#0A4D68] text-white font-medium rounded-lg shadow-md hover:bg-[#083a50] transition-all"
        >
          <FiDownload className="text-lg" />
          Export Report
        </button>
      </div>

      {/* ===== STATS GRID ===== */}
      {stats.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats.map((s, i) => (
            <div
              key={i}
              className="bg-white shadow-sm hover:shadow-md border border-gray-100 rounded-xl p-5 flex justify-between items-center transition-all"
              style={{
                borderTop: `4px solid ${s.color}`,
              }}
            >
              <div>
                <p className="text-sm text-gray-500">{s.label}</p>
                <h3
                  className="text-2xl font-bold mt-1"
                  style={{ color: s.color }}
                >
                  {s.value}
                </h3>
              </div>
              <div
                className="p-3 rounded-full flex justify-center items-center"
                style={{ backgroundColor: s.bg }}
              >
                {s.icon}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HeaderWithStats;
