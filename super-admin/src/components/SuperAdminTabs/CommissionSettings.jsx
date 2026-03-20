import React, { useState } from "react";
import {
  FiSettings,
  FiFilter,
  FiPercent,
  FiEdit2,
  FiPlusCircle,
  FiToggleLeft,
  FiToggleRight,
} from "react-icons/fi";
import { commissionSettingsData } from "../../data/dummyData";
import EditCommissionModal from "../../Modal/EditCommissionModal";
import AddCommissionModal from "../../Modal/AddCommissionModal";

const colors = {
  primary: "#0A4D68",
  secondary: "#088395",
  accent: "#05BFDB",
  light: "#F8FAFC",
  dark: "#1E293B",
  danger: "#EF4444",
  success: "#10B981",
};

export default function CommissionSettings() {
  const [list, setList] = useState(commissionSettingsData);
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [selected, setSelected] = useState(null);

  const [corporate, setCorporate] = useState("All");
  const [type, setType] = useState("All");

  const corporates = ["All", ...new Set(list.map((x) => x.company))];
  const types = ["All", "Flight", "Hotel"];

  // FILTERED DATA
  const filtered = list.filter((x) => {
    const corpMatch = corporate === "All" || x.company === corporate;
    const typeMatch = type === "All" || x.type === type;
    return corpMatch && typeMatch;
  });

  // SUMMARY NUMBERS
  const total = list.length;
  const active = list.filter((x) => x.status === "Active").length;
  const inactive = list.filter((x) => x.status === "Inactive").length;

  // TOGGLE STATUS
  function toggleStatus(id) {
    setList((prev) =>
      prev.map((x) =>
        x.id === id
          ? { ...x, status: x.status === "Active" ? "Inactive" : "Active" }
          : x
      )
    );
  }

  // ADD COMMISSION
  function addCommission(data) {
    setList((prev) => [...prev, { ...data, id: Date.now() }]);
    setOpenAdd(false);
  }

  // UPDATE COMMISSION
  function updateCommission(updated) {
    setList((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    setOpenEdit(false);
  }

  return (
    <div className="p-6" style={{ backgroundColor: colors.light }}>
      <div className="max-w-6xl mx-auto">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold" style={{ color: colors.dark }}>
            Commission Settings
          </h1>

          <button
            onClick={() => setOpenAdd(true)}
            className="flex items-center gap-2 px-4 py-2 rounded text-white shadow"
            style={{ backgroundColor: colors.primary }}
          >
            <FiPlusCircle /> Add Commission
          </button>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <SummaryCard title="Total Commission Rules" value={total} color={colors.primary} />
          <SummaryCard title="Active Rules" value={active} color={colors.success} />
          <SummaryCard title="Inactive Rules" value={inactive} color={colors.danger} />
        </div>

        {/* FILTERS */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <FiFilter size={20} className="text-[#0A4D68]" />
            <h2 className="text-lg font-semibold">Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Corporate */}
            <div>
              <label className="text-sm font-medium">Corporate</label>
              <select
                className="border p-2 rounded w-full mt-1"
                value={corporate}
                onChange={(e) => setCorporate(e.target.value)}
              >
                {corporates.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Type */}
            <div>
              <label className="text-sm font-medium">Type</label>
              <select
                className="border p-2 rounded w-full mt-1"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                {types.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>

          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Commission Rules</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead style={{ backgroundColor: colors.primary }}>
                <tr>
                  {["Corporate", "Type", "Commission", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-6 py-3 text-sm text-white font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">

                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-gray-500">
                      No commission settings found
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50 transition">

                      <td className="px-6 py-4 text-sm">{row.company}</td>
                      <td className="px-6 py-4 text-sm">{row.type}</td>

                      <td className="px-6 py-4 text-sm font-semibold text-[#0A4D68]">
                        {row.commission}%
                      </td>

                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium  
                          ${
                            row.status === "Active"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 flex items-center gap-4">

                        <button
                          className="text-blue-600 hover:text-blue-800"
                          onClick={() => {
                            setSelected(row);
                            setOpenEdit(true);
                          }}
                        >
                          <FiEdit2 size={18} />
                        </button>

                        <button onClick={() => toggleStatus(row.id)}>
                          {row.status === "Active" ? (
                            <FiToggleRight size={26} className="text-green-600" />
                          ) : (
                            <FiToggleLeft size={26} className="text-red-600" />
                          )}
                        </button>

                      </td>

                    </tr>
                  ))
                )}

              </tbody>
            </table>
          </div>
        </div>

        {/* MODALS */}
        {openAdd && <AddCommissionModal onClose={() => setOpenAdd(false)} onSave={addCommission} />}
        {openEdit && selected && (
          <EditCommissionModal
            data={selected}
            onClose={() => setOpenEdit(false)}
            onSave={updateCommission}
          />
        )}

      </div>
    </div>
  );
}


// CARD COMPONENT
function SummaryCard({ title, value, color }) {
  return (
    <div
      className="bg-white shadow rounded-lg p-6 flex items-center justify-between border-l-4"
      style={{ borderColor: color }}
    >
      <div>
        <p className="text-gray-600 text-sm">{title}</p>
        <h3 className="text-3xl font-bold mt-1" style={{ color }}>
          {value}
        </h3>
      </div>
      <FiPercent size={24} className="text-gray-400" />
    </div>
  );
}
