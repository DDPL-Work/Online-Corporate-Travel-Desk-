import React, { useEffect, useState } from "react";
import {
  FiFilter,
  FiEdit2,
  FiPlusCircle,
  FiToggleLeft,
  FiToggleRight,
  FiCheckCircle,
  FiXCircle,
  FiEye,
  FiSearch,
  FiUsers,
  FiActivity,
  FiClock,
  FiUserCheck,
} from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";

import EditCorporateModal from "../../Modal/EditCorporateModal";
import {
  fetchCorporates,
  approveCorporate,
  toggleCorporateStatus,
  fetchCorporateById,
} from "../../Redux/Slice/corporateListSlice";
import ViewCorporateModal from "../../Modal/ViewCorporateModal";
import { ToastConfirm } from "../../utils/ToastConfirm";
import FinancialApprovalModal from "../../Modal/FinancialApprovalModal";

const colors = {
  primary: "#0A4D68",
  secondary: "#088395",
  accent: "#05BFDB",
  light: "#F8FAFC",
  dark: "#1E293B",
};

export default function CorporateAccessControl() {
  const dispatch = useDispatch();

  const {
    corporates = [],
    loading,
    error,
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
  const corporatesList = [
    "All",
    ...new Set(corporates.map((x) => x.corporateName)),
  ];
  const statuses = ["All", "active", "pending", "inactive"];

  const filtered = corporates.filter((c) => {
    const corpMatch =
      corporateFilter === "All" || c.corporateName === corporateFilter;
    const statusMatch = statusFilter === "All" || c.status === statusFilter;
    const searchMatch =
      !searchTerm ||
      c.corporateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.primaryContact?.name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      c.primaryContact?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return corpMatch  && statusMatch && searchMatch;
  });

  // Stats
  const totalCorporates = filtered.length;
  const activeCount = filtered.filter((c) => c.status === "active").length;
  const pendingCount = filtered.filter((c) => c.status === "pending").length;
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
            Icon={FiUsers}
            borderCls="border-[#0A4D68]"
            iconBgCls="bg-[#0A4D68]/10"
            iconColorCls="text-[#0A4D68]"
          />
          <StatCard
            label="Active"
            value={activeCount}
            Icon={FiActivity}
            borderCls="border-emerald-500"
            iconBgCls="bg-emerald-50"
            iconColorCls="text-emerald-600"
          />
          <StatCard
            label="Pending"
            value={pendingCount}
            Icon={FiClock}
            borderCls="border-amber-500"
            iconBgCls="bg-amber-50"
            iconColorCls="text-amber-600"
          />
          <StatCard
            label="Inactive"
            value={inactiveCount}
            Icon={FiXCircle}
            borderCls="border-rose-500"
            iconBgCls="bg-rose-50"
            iconColorCls="text-rose-600"
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
              Corporate List
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
                    Corporate
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">
                    Primary Contact
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">
                    Classification
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">
                    Wallet / Credit
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
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 text-[13px]">
                            {c.corporateName}
                          </span>
                          {c.ssoConfig?.domain && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              {c.ssoConfig.domain}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-700 text-[13px]">
                            {c.primaryContact?.name || "—"}
                          </span>
                          <span className="text-[11px] text-teal-600 font-mono">
                            {c.primaryContact?.email || "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 capitalize text-slate-600">
                        {c.classification}
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-700 font-medium">
                        {c.classification === "postpaid"
                          ? `₹${c.currentCredit?.toLocaleString()} / ₹${c.creditLimit?.toLocaleString()}`
                          : `₹${c.walletBalance?.toLocaleString()}`}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-3">
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
function StatCard({ label, value, borderCls, iconBgCls, iconColorCls, Icon }) {
  return (
    <div
      className={`bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm border-l-4 ${borderCls}`}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBgCls}`}
      >
        <Icon size={18} className={iconColorCls} />
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