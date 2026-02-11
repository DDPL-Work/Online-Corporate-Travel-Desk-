import React, { useState } from "react";
import {
  FiKey,
  FiFilter,
  FiEdit2,
  FiPlusCircle,
  FiToggleLeft,
  FiToggleRight,
  FiLink,
} from "react-icons/fi";
import { apiConfigurationsData } from "../../data/dummyData";
import AddApiConfigModal from "../../Modal/AddApiConfigModal";
import EditApiConfigModal from "../../Modal/EditApiConfigModal";
import { useDispatch, useSelector } from "react-redux";
import { fetchTboBalance } from "../../Redux/Slice/tboBalanceSlice";

const colors = {
  primary: "#0A4D68",
  secondary: "#088395",
  accent: "#05BFDB",
  light: "#F8FAFC",
  dark: "#1E293B",
  success: "#10B981",
  danger: "#EF4444",
};

export default function ApiConfigurations() {
  const [records, setRecords] = useState(apiConfigurationsData);

  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [selected, setSelected] = useState(null);

  const [type, setType] = useState("All");
  const [status, setStatus] = useState("All");

  const dispatch = useDispatch();

  const {
    balance,
    creditLimit,
    currency,
    loading: balanceLoading,
    error: balanceError,
    lastUpdated,
  } = useSelector((state) => state.tboBalance);

  const types = ["All", "Flight", "Hotel", "Finance"];
  const statuses = ["All", "Active", "Inactive"];

  // FILTERED LIST
  const filtered = records.filter((r) => {
    const typeMatch = type === "All" || r.type === type;
    const statusMatch = status === "All" || r.status === status;
    return typeMatch && statusMatch;
  });

  const total = records.length;
  const active = records.filter((r) => r.status === "Active").length;
  const inactive = total - active;

  // ADD CONFIG
  function addConfig(data) {
    setRecords((prev) => [...prev, { ...data, id: Date.now() }]);
    setOpenAdd(false);
  }

  // EDIT CONFIG
  function updateConfig(updated) {
    setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setOpenEdit(false);
  }

  // TOGGLE STATUS
  function toggleStatus(id) {
    setRecords((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: r.status === "Active" ? "Inactive" : "Active" }
          : r
      )
    );
  }

  React.useEffect(() => {
    dispatch(fetchTboBalance());
  }, [dispatch]);

  return (
    <div className="p-6" style={{ backgroundColor: colors.light }}>
      <div className="max-w-6xl mx-auto">
        {/* ================= TBO API BALANCE ================= */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            className="bg-white shadow rounded-lg p-6 border-l-4"
            style={{ borderColor: colors.accent }}
          >
            <p className="text-sm text-gray-600">TBO API Balance</p>

            <h2
              className="text-3xl font-bold mt-2"
              style={{ color: colors.primary }}
            >
              {balanceLoading
                ? "Loading..."
                : `${currency} ${(Number(balance) || 0).toLocaleString()}`}
            </h2>

            <p className="text-xs text-gray-500 mt-1">Available balance</p>
          </div>

          <div
            className="bg-white shadow rounded-lg p-6 border-l-4"
            style={{ borderColor: colors.secondary }}
          >
            <p className="text-sm text-gray-600">Credit Limit</p>

            <h2
              className="text-3xl font-bold mt-2"
              style={{ color: colors.secondary }}
            >
              {currency} {(Number(creditLimit) || 0).toLocaleString()}
            </h2>

            <p className="text-xs text-gray-500 mt-1">Maximum allowed credit</p>
          </div>

          <div
            className="bg-white shadow rounded-lg p-6 border-l-4"
            style={{ borderColor: colors.primary }}
          >
            <p className="text-sm text-gray-600">Balance Status</p>

            {Number(balance) < Number(creditLimit) * 0.2 ? (
              <p className="mt-3 text-sm font-semibold text-red-600">
                Low balance – top-up required
              </p>
            ) : (
              <p className="mt-3 text-sm font-semibold text-green-600">
                Sufficient balance
              </p>
            )}

            {lastUpdated && (
              <p className="text-xs text-gray-400 mt-2">
                Last updated: {new Date(lastUpdated).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>

        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold" style={{ color: colors.dark }}>
            API Configurations
          </h1>

          <button
            onClick={() => setOpenAdd(true)}
            className="flex items-center gap-2 px-4 py-2 rounded text-white shadow"
            style={{ backgroundColor: colors.primary }}
          >
            <FiPlusCircle /> Add API Configuration
          </button>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <SummaryCard
            title="Total APIs"
            value={total}
            color={colors.primary}
          />
          <SummaryCard
            title="Active APIs"
            value={active}
            color={colors.success}
          />
          <SummaryCard
            title="Inactive APIs"
            value={inactive}
            color={colors.danger}
          />
        </div>

        {/* FILTERS */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <FiFilter className="text-[#0A4D68]" size={20} />
            <h2 className="text-lg font-semibold">Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Type */}
            <div>
              <label className="text-sm font-medium">API Type</label>
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

            {/* Status */}
            <div>
              <label className="text-sm font-medium">Status</label>
              <select
                className="border p-2 rounded w-full mt-1"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {statuses.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">API Configuration List</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead style={{ backgroundColor: colors.primary }}>
                <tr>
                  {["API Name", "Type", "Key", "Status", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-sm text-white font-medium"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-gray-500">
                      No API configurations found
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm font-medium">
                        {row.name}
                      </td>
                      <td className="px-6 py-4 text-sm">{row.type}</td>

                      <td className="px-6 py-4 text-sm">
                        <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                          {row.apiKey.substring(0, 12)}****
                        </span>
                      </td>

                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium 
                            ${
                              row.status === "Active"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }
                          `}
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
                            <FiToggleRight
                              size={26}
                              className="text-green-600"
                            />
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
        {openAdd && (
          <AddApiConfigModal
            onClose={() => setOpenAdd(false)}
            onSave={addConfig}
          />
        )}

        {openEdit && selected && (
          <EditApiConfigModal
            data={selected}
            onClose={() => setOpenEdit(false)}
            onSave={updateConfig}
          />
        )}
      </div>
    </div>
  );
}

// SUMMARY CARD COMPONENT
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
      <FiLink className="text-gray-400" size={24} />
    </div>
  );
}
