import React, { useState } from "react";
import {
  FiKey,
  FiFilter,
  FiEdit2,
  FiPlusCircle,
  FiToggleLeft,
  FiToggleRight,
  FiLink,
  FiSearch,
  FiDollarSign,
  FiCreditCard,
  FiActivity,
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

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
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

  // Filtered list
  const filtered = records.filter((r) => {
    const typeMatch = type === "All" || r.type === type;
    const statusMatch = status === "All" || r.status === status;
    const searchMatch =
      !searchTerm ||
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.apiKey.toLowerCase().includes(searchTerm.toLowerCase());
    return typeMatch && statusMatch && searchMatch;
  });

  const total = records.length;
  const active = records.filter((r) => r.status === "Active").length;
  const inactive = total - active;

  // Add config
  function addConfig(data) {
    setRecords((prev) => [...prev, { ...data, id: Date.now() }]);
    setOpenAdd(false);
  }

  // Edit config
  function updateConfig(updated) {
    setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setOpenEdit(false);
  }

  // Toggle status
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
    <div className="min-h-screen p-6 font-sans" style={{ backgroundColor: colors.light }}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* PAGE HEADER */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-linear-to-br from-[#0A4D68] to-[#088395] flex items-center justify-center shadow-lg text-white">
            <FiKey size={24} />
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">
              API Configurations
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-widest">
              Manage third-party API integrations
            </p>
          </div>
        </div>

        {/* TBO API BALANCE CARDS (Styled as StatCards) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label="TBO API Balance"
            value={balanceLoading ? "Loading..." : `${currency} ${(Number(balance) || 0).toLocaleString()}`}
            Icon={FiDollarSign}
            borderCls="border-[#05BFDB]"
            iconBgCls="bg-[#05BFDB]/10"
            iconColorCls="text-[#05BFDB]"
          />
          <StatCard
            label="Credit Limit"
            value={`${currency} ${(Number(creditLimit) || 0).toLocaleString()}`}
            Icon={FiCreditCard}
            borderCls="border-[#088395]"
            iconBgCls="bg-[#088395]/10"
            iconColorCls="text-[#088395]"
          />
          <StatCard
            label="Balance Status"
            value={
              Number(balance) < Number(creditLimit) * 0.2 ? (
                <span className="text-red-600 text-sm font-bold">Low balance – top-up required</span>
              ) : (
                <span className="text-green-600 text-sm font-bold">Sufficient balance</span>
              )
            }
            Icon={FiActivity}
            borderCls="border-[#0A4D68]"
            iconBgCls="bg-[#0A4D68]/10"
            iconColorCls="text-[#0A4D68]"
            customValue={true}
            subtitle={lastUpdated && `Last updated: ${new Date(lastUpdated).toLocaleTimeString()}`}
          />
        </div>

        {/* STATS CARDS (API counts) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            label="Total APIs"
            value={total}
            Icon={FiKey}
            borderCls="border-[#0A4D68]"
            iconBgCls="bg-[#0A4D68]/10"
            iconColorCls="text-[#0A4D68]"
          />
          <StatCard
            label="Active APIs"
            value={active}
            Icon={FiToggleRight}
            borderCls="border-emerald-500"
            iconBgCls="bg-emerald-50"
            iconColorCls="text-emerald-600"
          />
          <StatCard
            label="Inactive APIs"
            value={inactive}
            Icon={FiToggleLeft}
            borderCls="border-rose-500"
            iconBgCls="bg-rose-50"
            iconColorCls="text-rose-600"
          />
        </div>

        {/* ADD BUTTON */}
        <div className="flex justify-end">
          <button
            onClick={() => setOpenAdd(true)}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-lg text-xs font-bold transition-all shadow-md uppercase bg-[#0A4D68] hover:bg-[#088395]"
          >
            <FiPlusCircle /> Add API Configuration
          </button>
        </div>

        {/* FILTERS SECTION */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <LabeledInput label="Search">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="API Name / Type / Key..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none bg-slate-50"
                />
              </div>
            </LabeledInput>

            <LabeledInput label="API Type">
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-slate-50 cursor-pointer focus:border-[#0A4D68]"
              >
                {types.map((t) => (
                  <option key={t} value={t}>
                    {t === "All" ? "All Types" : t}
                  </option>
                ))}
              </select>
            </LabeledInput>

            <LabeledInput label="Status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-slate-50 cursor-pointer focus:border-[#0A4D68]"
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s === "All" ? "All Statuses" : s}
                  </option>
                ))}
              </select>
            </LabeledInput>
          </div>
        </div>

        {/* TABLE SECTION */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="font-black text-slate-700 uppercase tracking-tighter text-lg">
              API Configuration List
            </h2>
            <button
              className="flex items-center gap-2 px-4 py-2 text-white rounded-lg text-xs font-bold transition-all shadow-md uppercase bg-[#0A4D68] hover:bg-[#088395]"
              onClick={() => {}} // optional export
            >
              <FiFilter /> Export
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr style={{ backgroundColor: colors.primary }} className="text-white">
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">
                    API Name
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">
                    Type
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">
                    API Key
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">
                    Status
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-500">
                      No API configurations found
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 transition-all">
                      <td className="px-6 py-4 font-bold text-slate-800 text-[13px]">
                        {row.name}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {row.type}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono bg-slate-100 px-2 py-1 rounded text-slate-700 text-xs">
                          {row.apiKey.substring(0, 12)}****
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-3">
                          <ActionButton
                            icon={<FiEdit2 size={16} />}
                            onClick={() => {
                              setSelected(row);
                              setOpenEdit(true);
                            }}
                            tooltip="Edit"
                            color="text-blue-600"
                            hoverBg="bg-blue-50"
                          />
                          <ActionButton
                            icon={
                              row.status === "Active" ? (
                                <FiToggleRight size={20} />
                              ) : (
                                <FiToggleLeft size={20} />
                              )
                            }
                            onClick={() => toggleStatus(row.id)}
                            tooltip="Toggle Status"
                            color={row.status === "Active" ? "text-green-600" : "text-red-600"}
                            hoverBg="bg-slate-100"
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <span>Showing {filtered.length} API(s)</span>
            <span>Active: {active} | Inactive: {inactive}</span>
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

/* ------------------- HELPER COMPONENTS ------------------- */
function StatCard({ label, value, Icon, borderCls, iconBgCls, iconColorCls, customValue, subtitle }) {
  return (
    <div
      className={`bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm border-l-4 ${borderCls}`}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBgCls}`}
      >
        <Icon size={18} className={iconColorCls} />
      </div>
      <div className="text-left flex-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
          {label}
        </p>
        {customValue ? (
          value
        ) : (
          <p className="text-xl font-black text-slate-900 leading-none">
            {value}
          </p>
        )}
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

function LabeledInput({ label, children }) {
  return (
    <div className="flex flex-col gap-1 text-left">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
        {label}
      </label>
      {children}
    </div>
  );
}

function StatusBadge({ status }) {
  const isActive = status === "Active";
  return (
    <span
      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${
        isActive
          ? "bg-emerald-50 text-emerald-700 border-emerald-100"
          : "bg-rose-50 text-rose-700 border-rose-100"
      }`}
    >
      {status}
    </span>
  );
}

function ActionButton({ icon, onClick, tooltip, color, hoverBg }) {
  return (
    <button
      title={tooltip}
      onClick={onClick}
      className={`p-2 rounded-lg transition-all ${color} ${hoverBg} hover:scale-105 focus:outline-none`}
    >
      {icon}
    </button>
  );
}