import React, { useState } from "react";
import { travelDocuments } from "../../data/dummyData";
import {
  FiUpload,
  FiTrash2,
  FiCalendar,
  FiFileText,
  FiAlertTriangle,
  FiCheckCircle,
} from "react-icons/fi";

const colors = {
  primary: "#0A4D68",
  secondary: "#088395",
  accent: "#05BFDB",
  danger: "#EF4444",
  success: "#10B981",
  warning: "#F59E0B",
  light: "#F8FAFC",
  dark: "#1E293B",
};

export default function TravelDocuments() {
  const [docs, setDocs] = useState(travelDocuments);

  const getStatusType = (expiry) => {
    const today = new Date();
    const exp = new Date(expiry);
    const diff = (exp - today) / (1000 * 60 * 60 * 24); // days difference

    if (diff < 0) return "Expired";
    if (diff <= 30) return "Expiring Soon";
    return "Valid";
  };

  const handleUpload = (id) => {
    alert("Upload/Replace functionality coming soon!");
  };

  const deleteDoc = (id) => {
    if (window.confirm("Delete this document?")) {
      setDocs((prev) => prev.filter((d) => d.id !== id));
    }
  };

  return (
    <div className="p-6" style={{ backgroundColor: colors.light }}>
      <h1 className="text-2xl font-bold mb-6" style={{ color: colors.dark }}>
        Travel Documents
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {docs.map((doc) => {
          const status = getStatusType(doc.expiry);

          return (
            <div
              key={doc.id}
              className="bg-white shadow rounded-lg p-5 border-l-4"
              style={{
                borderColor:
                  status === "Valid"
                    ? colors.success
                    : status === "Expiring Soon"
                    ? colors.warning
                    : colors.danger,
              }}
            >
              {/* Document Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FiFileText size={22} className="text-[#0A4D68]" />
                  <h2 className="text-lg font-semibold">{doc.name}</h2>
                </div>

                <span
                  className={`px-3 py-1 text-xs rounded-full font-medium
                  ${
                    status === "Valid"
                      ? "bg-green-100 text-green-700"
                      : status === "Expiring Soon"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {status}
                </span>
              </div>

              {/* Document Info */}
              <div className="text-gray-700">
                <p className="flex items-center gap-2">
                  <FiCalendar className="text-gray-500" />
                  <span>Expiry: {doc.expiry}</span>
                </p>

                <p className="text-sm mt-1">
                  Document Number:{" "}
                  <span className="font-semibold">{doc.number}</span>
                </p>
              </div>

              {/* File Info */}
              <p className="text-sm text-gray-600 mt-3">
                File:{" "}
                <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                  {doc.fileName}
                </span>
              </p>

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => handleUpload(doc.id)}
                  className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 flex items-center gap-2 text-sm"
                >
                  <FiUpload /> Replace
                </button>

                <button
                  onClick={() => deleteDoc(doc.id)}
                  className="px-3 py-2 rounded bg-red-50 hover:bg-red-100 text-red-600 flex items-center gap-2 text-sm"
                >
                  <FiTrash2 /> Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
