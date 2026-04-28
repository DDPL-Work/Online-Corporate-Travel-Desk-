import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FiEdit2,
  FiToggleLeft,
  FiToggleRight,
  FiCheckCircle,
  FiXCircle,
  FiEye,
  FiSearch,
  FiUsers,
  FiActivity,
} from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";

import EditCorporateModal from "../../Modal/EditCorporateModal";
import {
  fetchCorporates,
  toggleCorporateStatus,
  fetchCorporateById,
} from "../../Redux/Slice/corporateListSlice";
import ViewCorporateModal from "../../Modal/ViewCorporateModal";
import { ToastConfirm } from "../../utils/ToastConfirm";
import FinancialApprovalModal from "../../Modal/FinancialApprovalModal";
import TableActionBar from "../Shared/TableActionBar";

const colors = {
  primary: "#0A4D68",
  secondary: "#088395",
  accent: "#05BFDB",
  light: "#F8FAFC",
  dark: "#1E293B",
};

const formatExportCurrency = (value) =>
  `INR ${Number(value || 0).toLocaleString("en-IN")}`;

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export default function CorporateAccessControl() {
  const tableScrollRef = useRef(null);
  const dispatch = useDispatch();

  const {
    corporates = [],
    loading,
  } = useSelector((state) => state.corporateList);

  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewCorporate, setViewCorporate] = useState(null);
  const [openEdit, setOpenEdit] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [openFinancialApprove, setOpenFinancialApprove] = useState(false);

  // Filter states
  const [corporateFilter, setCorporateFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  /* ---------------- FETCH ---------------- */
  useEffect(() => {
    dispatch(fetchCorporates())
      .unwrap()
      .catch((err) => toast.error(err));
  }, [dispatch]);

  /* ---------------- FILTER LOGIC ---------------- */
  const baseCorporates = useMemo(
    () => corporates.filter((c) => c.status !== "pending"),
    [corporates],
  );

  const corporatesList = useMemo(
    () => ["All", ...new Set(baseCorporates.map((x) => x.corporateName))],
    [baseCorporates],
  );
  const statuses = ["All", "active", "inactive"];

  const filtered = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return baseCorporates.filter((c) => {
      const corpMatch =
        corporateFilter === "All" || c.corporateName === corporateFilter;
      const statusMatch = statusFilter === "All" || c.status === statusFilter;
      const searchMatch =
        !normalizedSearch ||
        c.corporateName?.toLowerCase().includes(normalizedSearch) ||
        c.primaryContact?.name?.toLowerCase().includes(normalizedSearch) ||
        c.primaryContact?.email?.toLowerCase().includes(normalizedSearch);

      return corpMatch && statusMatch && searchMatch;
    });
  }, [baseCorporates, corporateFilter, statusFilter, searchTerm]);

  // Stats
  const totalCorporates = filtered.length;
  const activeCount = filtered.filter((c) => c.status === "active").length;
  const inactiveCount = filtered.filter((c) => c.status === "inactive").length;
  const totalCredit = filtered.reduce(
    (sum, c) => sum + (c.classification === "postpaid" ? c.creditLimit : 0),
    0
  );
  const totalWallet = filtered.reduce(
    (sum, c) => sum + (c.classification === "prepaid" ? c.walletBalance : 0),
    0
  );

  /* ---------------- ACTIONS ---------------- */
  const handleView = async (id) => {
    try {
      const res = await dispatch(fetchCorporateById(id)).unwrap();
      setViewCorporate(res);
      setIsViewOpen(true);
    } catch (err) {
      toast.error(err);
    }
  };

  const handleApprove = (corporate) => {
    setSelectedRow(corporate);
    setOpenFinancialApprove(true);
  };

  const handleToggleStatus = (id) => {
    ToastConfirm({
      message: "Change corporate status?",
      confirmText: "Change",
      onConfirm: async () => {
        try {
          await dispatch(toggleCorporateStatus(id)).unwrap();
          toast.info("Corporate status updated");
        } catch (err) {
          toast.error(err);
        }
      },
    });
  };

  const handleExport = () => {
    if (loading) return;

    if (filtered.length === 0) {
      toast.info("No corporates available to export");
      return;
    }

    const headers = [
      "Corporate Name",
      "Primary Contact",
      "Primary Email",
      "Classification",
      "Wallet Balance",
      "Current Credit",
      "Credit Limit",
      "SSO Domain",
      "Status",
    ];

    const rows = filtered.map((corporate) => [
      corporate.corporateName || "N/A",
      corporate.primaryContact?.name || "N/A",
      corporate.primaryContact?.email || "N/A",
      corporate.classification || "N/A",
      formatExportCurrency(corporate.walletBalance),
      formatExportCurrency(corporate.currentCredit),
      formatExportCurrency(corporate.creditLimit),
      corporate.ssoConfig?.domain || "N/A",
      corporate.status || "inactive",
    ]);

    const tableRows = rows
      .map(
        (row) =>
          `<tr>${row
            .map(
              (cell) =>
                `<td style="border:1px solid #dbe4f0;padding:10px;vertical-align:top;">${escapeHtml(cell)}</td>`,
            )
            .join("")}</tr>`,
      )
      .join("");

    const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
  </head>
  <body>
    <table>
      <thead>
        <tr>
          ${headers
            .map(
              (header) =>
                `<th style="border:1px solid #cbd5e1;padding:10px;background:#0A4D68;color:#ffffff;font-weight:700;text-align:left;">${escapeHtml(header)}</th>`,
            )
            .join("")}
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  </body>
</html>`;

    const stamp = new Date().toISOString().slice(0, 10);
    const blob = new Blob(["\ufeff", html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `corporate-access-control-${stamp}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Corporate list exported");
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen p-6 font-sans" style={{ backgroundColor: colors.light }}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* PAGE HEADER */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-linear-to-br from-[#0A4D68] to-[#088395] flex items-center justify-center shadow-lg text-white">
            <FiUsers size={24} />
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">
              Corporate Access Control
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-widest">
              Manage corporate profiles & permissions
            </p>
          </div>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Corporates"
            value={totalCorporates}
            icon={<FiUsers size={18} className="text-[#0A4D68]" />}
            borderCls="border-[#0A4D68]"
            iconBgCls="bg-[#0A4D68]/10"
          />
          <StatCard
            label="Active"
            value={activeCount}
            icon={<FiActivity size={18} className="text-emerald-600" />}
            borderCls="border-emerald-500"
            iconBgCls="bg-emerald-50"
          />
          <StatCard
            label="Inactive"
            value={inactiveCount}
            icon={<FiXCircle size={18} className="text-rose-600" />}
            borderCls="border-rose-500"
            iconBgCls="bg-rose-50"
          />
        </div>

        {/* FILTERS SECTION */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <LabeledInput label="Search">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Corporate / Contact / Email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none bg-slate-50"
                />
              </div>
            </LabeledInput>

            <LabeledInput label="Corporate">
              <select
                value={corporateFilter}
                onChange={(e) => setCorporateFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-slate-50 cursor-pointer focus:border-[#0A4D68]"
              >
                {corporatesList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </LabeledInput>
            <LabeledInput label="Status">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full uppercase px-3 py-2 border rounded-lg text-sm outline-none bg-slate-50 cursor-pointer focus:border-[#0A4D68]"
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
              Corporate List
            </h2>
            <TableActionBar
              scrollRef={tableScrollRef}
              exportLabel="Export"
              onExport={handleExport}
              exportClassName="bg-[#0A4D68] hover:bg-[#088395] shadow-[#0A4D68]/20"
              arrowClassName="border-teal-100 bg-teal-50 text-[#0A4D68] hover:bg-teal-100 hover:border-teal-200 hover:text-[#08384d] disabled:hover:bg-teal-50"
            />
          </div>

          <div ref={tableScrollRef} className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr style={{ backgroundColor: colors.primary }} className="text-white">
                  <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-widest">
                    Corporate
                  </th>
                  <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-widest">
                    Primary Contact
                  </th>
                  <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-widest">
                    Classification
                  </th>
                  <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-widest">
                    Wallet / Credit
                  </th>
                  <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-widest">
                    Status
                  </th>
                  <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-widest">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading && (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-500">
                      Loading corporates...
                    </td>
                  </tr>
                )}
                {!loading &&
                  filtered.map((c) => (
                    <tr key={c._id} className="hover:bg-slate-50 transition-all">
                      <td className="px-6 py-3 align-middle">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 text-[13px] whitespace-nowrap">
                            {c.corporateName}
                          </span>
                          {c.ssoConfig?.domain && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              {c.ssoConfig.domain}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3 align-middle">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-700 text-[13px] whitespace-nowrap">
                            {c.primaryContact?.name || "—"}
                          </span>
                          <span className="text-[11px] text-teal-600 font-mono">
                            {c.primaryContact?.email || "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3 align-middle capitalize text-slate-600">
                        {c.classification}
                      </td>
                      <td className="px-6 py-3 align-middle font-mono text-slate-700 font-medium whitespace-nowrap">
                        {c.classification === "postpaid"
                          ? `₹${c.currentCredit?.toLocaleString()} / ₹${c.creditLimit?.toLocaleString()}`
                          : `₹${c.walletBalance?.toLocaleString()}`}
                      </td>
                      <td className="px-6 py-3 align-middle">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="px-6 py-3 align-middle">
                        <div className="flex gap-3 items-center">
                          <ActionButton
                            icon={<FiEye size={16} />}
                            onClick={() => handleView(c._id)}
                            tooltip="View"
                            color="text-slate-600"
                            hoverBg="bg-slate-100"
                          />
                          <ActionButton
                            icon={<FiEdit2 size={16} />}
                            onClick={() => {
                              setSelectedRow(c);
                              setOpenEdit(true);
                            }}
                            tooltip="Edit"
                            color="text-blue-600"
                            hoverBg="bg-blue-50"
                          />
                          {c.status === "pending" && (
                            <ActionButton
                              icon={<FiCheckCircle size={16} />}
                              onClick={() => handleApprove(c)}
                              tooltip="Approve"
                              color="text-green-600"
                              hoverBg="bg-green-50"
                            />
                          )}
                          <ActionButton
                            icon={
                              c.status === "active" ? (
                                <FiToggleRight size={20} />
                              ) : (
                                <FiToggleLeft size={20} />
                              )
                            }
                            onClick={() => handleToggleStatus(c._id)}
                            tooltip="Toggle Status"
                            color={c.status === "active" ? "text-green-600" : "text-red-600"}
                            hoverBg="bg-slate-100"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-500">
                      No corporates match the filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <span>Showing {filtered.length} corporate(s)</span>
            <span>
              Total Credit Limit: ₹{totalCredit.toLocaleString()} | Total Wallet: ₹{totalWallet.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* MODALS */}
      {isViewOpen && viewCorporate && (
        <ViewCorporateModal
          corporate={viewCorporate}
          onClose={() => {
            setIsViewOpen(false);
            setViewCorporate(null);
          }}
        />
      )}
      {openEdit && selectedRow && (
        <EditCorporateModal
          corporate={selectedRow}
          onClose={() => setOpenEdit(false)}
        />
      )}
      {openFinancialApprove && selectedRow && (
        <FinancialApprovalModal
          corporate={selectedRow}
          onClose={() => {
            setOpenFinancialApprove(false);
            setSelectedRow(null);
          }}
        />
      )}
    </div>
  );
}

/* ------------------- HELPER COMPONENTS ------------------- */
function StatCard({ label, value, borderCls, iconBgCls, icon }) {
  return (
    <div
      className={`bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm border-l-4 ${borderCls}`}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBgCls}`}
      >
        {icon}
      </div>
      <div className="text-left">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
          {label}
        </p>
        <p className="text-xl font-black text-slate-900 leading-none">
          {value}
        </p>
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
  const config = {
    active: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-100",
      label: "Active",
    },
    pending: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-100",
      label: "Pending",
    },
    inactive: {
      bg: "bg-rose-50",
      text: "text-rose-700",
      border: "border-rose-100",
      label: "Inactive",
    },
  };
  const style = config[status] || config.inactive;
  return (
    <span
      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${style.bg} ${style.text} ${style.border}`}
    >
      {style.label}
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
