import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FiEdit2,
  FiCheckCircle,
  FiToggleLeft,
  FiEye,
  FiSearch,
  FiUsers,
  FiClock,
} from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";

import EditCorporateModal from "../../Modal/EditCorporateModal";
import {
  fetchCorporates,
  updateCorporate,
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

export default function PendingCorporates() {
  const tableScrollRef = useRef(null);
  const dispatch = useDispatch();

  const { corporates = [], loading } = useSelector(
    (state) => state.corporateList,
  );

  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewCorporate, setViewCorporate] = useState(null);
  const [openEdit, setOpenEdit] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [openFinancialApprove, setOpenFinancialApprove] = useState(false);
  const [corporateFilter, setCorporateFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    dispatch(fetchCorporates())
      .unwrap()
      .catch((err) => toast.error(err));
  }, [dispatch]);

  const baseCorporates = useMemo(
    () => corporates.filter((c) => c.status === "pending"),
    [corporates],
  );

  const corporatesList = useMemo(
    () => ["All", ...new Set(baseCorporates.map((x) => x.corporateName))],
    [baseCorporates],
  );

  const filtered = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return baseCorporates.filter((corporate) => {
      const corpMatch =
        corporateFilter === "All" ||
        corporate.corporateName === corporateFilter;
      const searchMatch =
        !normalizedSearch ||
        corporate.corporateName?.toLowerCase().includes(normalizedSearch) ||
        corporate.primaryContact?.name
          ?.toLowerCase()
          .includes(normalizedSearch) ||
        corporate.primaryContact?.email
          ?.toLowerCase()
          .includes(normalizedSearch);

      return corpMatch && searchMatch;
    });
  }, [baseCorporates, corporateFilter, searchTerm]);

  const totalCorporates = filtered.length;
  const pendingCount = filtered.filter((c) => c.status === "pending").length;
  const totalCredit = filtered.reduce(
    (sum, c) => sum + (c.classification === "postpaid" ? c.creditLimit : 0),
    0,
  );
  const totalWallet = filtered.reduce(
    (sum, c) => sum + (c.classification === "prepaid" ? c.walletBalance : 0),
    0,
  );

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

  const handleReject = (corporate) => {
    ToastConfirm({
      message: `Reject onboarding request for ${corporate.corporateName}?`,
      confirmText: "Reject",
      onConfirm: async () => {
        try {
          await dispatch(
            updateCorporate({
              id: corporate._id,
              payload: {
                status: "inactive",
                isActive: false,
              },
            }),
          ).unwrap();
          toast.info("Corporate request rejected");
        } catch (err) {
          toast.error(err);
        }
      },
    });
  };

  const handleExport = () => {
    if (loading) return;

    if (filtered.length === 0) {
      toast.info("No pending corporates available to download");
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
      corporate.status || "pending",
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
    link.download = `pending-corporates-${stamp}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Pending corporate list downloaded");
  };

  return (
    <div
      className="min-h-screen p-6 font-sans"
      style={{ backgroundColor: colors.light }}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-linear-to-br from-[#0A4D68] to-[#088395] flex items-center justify-center shadow-lg text-white">
            <FiUsers size={24} />
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">
              Pending Corporates
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-widest">
              Manage pending corporate profiles for approval
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            label="Total Corporates"
            value={totalCorporates}
            icon={<FiUsers size={18} className="text-[#0A4D68]" />}
            borderCls="border-[#0A4D68]"
            iconBgCls="bg-[#0A4D68]/10"
          />
          <StatCard
            label="Pending Review"
            value={pendingCount}
            icon={<FiClock size={18} className="text-amber-600" />}
            borderCls="border-amber-500"
            iconBgCls="bg-amber-50"
          />
        </div>

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
                {corporatesList.map((corporate) => (
                  <option key={corporate} value={corporate}>
                    {corporate}
                  </option>
                ))}
              </select>
            </LabeledInput>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="font-black text-slate-700 uppercase tracking-tighter text-lg">
              Corporate List
            </h2>
            <TableActionBar
              scrollRef={tableScrollRef}
              exportLabel="Export"
              onExport={handleExport}
              exportClassName="bg-[#7C3AED] hover:bg-[#6D28D9] shadow-[#7C3AED]/20"
              arrowClassName="border-violet-100 bg-violet-50 text-[#7C3AED] hover:bg-violet-100 hover:border-violet-200 hover:text-[#5B21B6] disabled:hover:bg-violet-50"
            />
          </div>

          <div ref={tableScrollRef} className="overflow-x-auto">
            <table className="min-w-[1180px] w-full table-fixed text-left border-collapse">
              <colgroup>
                <col style={{ width: "18%" }} />
                <col style={{ width: "22%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "16%" }} />
              </colgroup>
              <thead>
                <tr
                  style={{ backgroundColor: colors.primary }}
                  className="text-white"
                >
                  <th className="h-[72px] px-6 py-3 text-[11px] font-bold uppercase tracking-widest align-middle">
                    <span className="block whitespace-nowrap leading-tight">
                      Corporate
                    </span>
                  </th>
                  <th className="h-[72px] px-6 py-3 text-[11px] font-bold uppercase tracking-widest align-middle">
                    <span className="block whitespace-nowrap leading-tight">
                      Primary Contact
                    </span>
                  </th>
                  <th className="h-[72px] px-6 py-3 text-[11px] font-bold uppercase tracking-widest align-middle">
                    <span className="block whitespace-nowrap leading-tight">
                      Classification
                    </span>
                  </th>
                  <th className="h-[72px] px-6 py-3 text-[11px] font-bold uppercase tracking-widest align-middle">
                    <span className="block whitespace-nowrap leading-tight">
                      Wallet / Credit
                    </span>
                  </th>
                  <th className="h-[72px] px-6 py-3 text-[11px] font-bold uppercase tracking-widest align-middle">
                    <span className="block whitespace-nowrap leading-tight">
                      Status
                    </span>
                  </th>
                  <th className="h-[72px] px-6 py-3 text-[11px] font-bold uppercase tracking-widest align-middle text-center">
                    <span className="block whitespace-nowrap leading-tight">
                      Actions
                    </span>
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
                  filtered.map((corporate) => (
                    <tr
                      key={corporate._id}
                      className="hover:bg-slate-50 transition-all"
                    >
                      <td className="px-6 py-2 align-middle">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 text-[13px] whitespace-nowrap">
                            {corporate.corporateName}
                          </span>
                          {corporate.ssoConfig?.domain && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              {corporate.ssoConfig.domain}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-2 align-middle">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-700 text-[13px] whitespace-nowrap">
                            {corporate.primaryContact?.name || "—"}
                          </span>
                          <span className="text-[11px] text-teal-600 font-mono">
                            {corporate.primaryContact?.email || "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-2 align-middle capitalize text-slate-600">
                        {corporate.classification}
                      </td>
                      <td className="px-6 py-2 align-middle font-mono text-slate-700 font-medium whitespace-nowrap">
                        {corporate.classification === "postpaid"
                          ? `₹${corporate.currentCredit?.toLocaleString()} / ₹${corporate.creditLimit?.toLocaleString()}`
                          : `₹${corporate.walletBalance?.toLocaleString()}`}
                      </td>
                      <td className="px-6 py-2 align-middle">
                        <StatusBadge status={corporate.status} />
                      </td>
                      <td className="px-6 py-2 align-middle">
                        <div className="flex gap-3 items-center justify-center">
                          <ActionButton
                            icon={<FiEye size={16} />}
                            onClick={() => handleView(corporate._id)}
                            tooltip="View Corporate"
                            color="text-slate-600"
                            hoverBg="bg-slate-100"
                          />
                          <ActionButton
                            icon={<FiEdit2 size={16} />}
                            onClick={() => {
                              setSelectedRow(corporate);
                              setOpenEdit(true);
                            }}
                            tooltip="Edit Corporate"
                            color="text-blue-600"
                            hoverBg="bg-blue-50"
                          />
                          <ActionButton
                            icon={<FiCheckCircle size={16} />}
                            onClick={() => handleApprove(corporate)}
                            tooltip="Approve Corporate"
                            color="text-green-600"
                            hoverBg="bg-green-50"
                          />
                          <ActionButton
                            icon={<FiToggleLeft size={20} />}
                            onClick={() => handleReject(corporate)}
                            tooltip="Reject Corporate"
                            color="text-red-600"
                            hoverBg="bg-slate-100"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}

                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-500">
                      No pending corporates found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <span>Showing {filtered.length} corporate(s)</span>
            <span>
              Total Credit Limit: ₹{totalCredit.toLocaleString()} | Total
              Wallet: ₹{totalWallet.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

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
      label: "Rejected",
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
