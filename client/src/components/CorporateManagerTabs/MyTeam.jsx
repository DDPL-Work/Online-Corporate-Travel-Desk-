import React, { useState, useMemo, useEffect } from "react";
import {
  FiSearch,
  FiFilter,
  FiUsers,
  FiUserCheck,
  FiUserX,
  FiMoreVertical,
  FiCalendar,
  FiShield,
  FiX,
  FiBriefcase,
  FiHash,
  FiChevronDown,
  FiChevronUp,
  FiSliders,
} from "react-icons/fi";
import { FaBuilding } from "react-icons/fa";
import { Pagination } from "./Shared/Pagination";
import { useDispatch, useSelector } from "react-redux";
import { getMyEmployees } from "../../Redux/Actions/manager.thunk";

// ── Shared helpers ────────────────────────────────────────────────────────────
const selectCls =
  "w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] text-slate-800 bg-white outline-none focus:border-[#0A4D68] transition-colors appearance-none cursor-pointer";

function LabeledField({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}

function StatCard({
  label,
  value,
  Icon,
  borderCls,
  iconBgCls,
  iconColorCls,
  sub,
}) {
  return (
    <div
      className={`bg-white rounded-xl shadow-sm p-3 sm:p-4 border-t-2 ${borderCls}`}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <div
          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBgCls}`}
        >
          <Icon size={15} className={iconColorCls} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">
            {label}
          </p>
          <p className="text-[18px] sm:text-[22px] font-black text-slate-900 leading-tight">
            {value}
          </p>
          {sub && (
            <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
              {sub}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

const PAGE_SIZE = 10;

const AVATAR_COLORS = [
  "bg-[#0A4D68] text-white",
  "bg-[#088395] text-white",
  "bg-violet-600 text-white",
  "bg-emerald-600 text-white",
  "bg-orange-500 text-white",
  "bg-pink-600 text-white",
];

const DEPT_COLORS = {
  Engineering: "bg-blue-100 text-blue-700",
  HR: "bg-pink-100 text-pink-700",
  Finance: "bg-emerald-100 text-emerald-700",
  Sales: "bg-orange-100 text-orange-700",
  Marketing: "bg-violet-100 text-violet-700",
};

const RELATION_CONFIG = {
  approver: {
    label: "Approver",
    cls: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
    Icon: FiShield,
  },
  manager: {
    label: "Manager",
    cls: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
    Icon: FiUserCheck,
  },
  both: {
    label: "Both",
    cls: "bg-amber-50 text-amber-700 ring-1 ring-amber-300",
    Icon: FiUsers,
  },
};

function getAvatarColor(id) {
  const key = String(id ?? "0");
  const numeric = key.replace(/\D/g, "");
  const idx =
    (numeric ? parseInt(numeric, 10) : key.charCodeAt(0) || 0) %
    AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────
function ConfirmModal({ action, employee, onConfirm, onCancel }) {
  if (!action || !employee) return null;
  const name = `${employee.name.firstName} ${employee.name.lastName}`;
  const config = {
    activate: {
      title: "Activate Employee",
      desc: `${name}'s account will be reactivated and they will regain full system access.`,
      confirmLabel: "Activate",
      confirmCls: "bg-emerald-600 hover:bg-emerald-700 text-white",
      iconBg: "bg-emerald-50",
      icon: <FiUserCheck size={20} className="text-emerald-600" />,
    },
    deactivate: {
      title: "Deactivate Employee",
      desc: `${name}'s account will be suspended. They will lose all system access immediately.`,
      confirmLabel: "Deactivate",
      confirmCls: "bg-red-600 hover:bg-red-700 text-white",
      iconBg: "bg-red-50",
      icon: <FiUserX size={20} className="text-red-500" />,
    },
  };
  const c = config[action];
  if (!c) return null;
  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${c.iconBg}`}
          >
            {c.icon}
          </div>
          <h3 className="text-base sm:text-lg font-black text-slate-900">
            {c.title}
          </h3>
        </div>
        <p className="text-[13px] text-slate-600 leading-relaxed mb-5">
          {c.desc}
        </p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-[13px] font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-[13px] font-semibold rounded-lg transition-colors ${c.confirmCls}`}
          >
            {c.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Action Menu ───────────────────────────────────────────────────────────────
function ActionMenu({ employee, onAction }) {
  const [open, setOpen] = useState(false);
  const isActive = employee.status === "active";
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
      >
        <FiMoreVertical size={15} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 bg-white border border-slate-200 rounded-xl shadow-xl w-48 py-1.5 overflow-hidden">
            <button
              onClick={() => {
                setOpen(false);
                onAction("view", employee);
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-[#0A4D68] hover:bg-sky-50 transition-colors"
            >
              <FiUsers size={13} /> View Profile
            </button>
            <div className="my-1 border-t border-slate-100" />
            {isActive ? (
              <button
                onClick={() => {
                  setOpen(false);
                  onAction("deactivate", employee);
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-red-600 hover:bg-red-50 transition-colors"
              >
                <FiUserX size={13} /> Deactivate
              </button>
            ) : (
              <button
                onClick={() => {
                  setOpen(false);
                  onAction("activate", employee);
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-emerald-700 hover:bg-emerald-50 transition-colors"
              >
                <FiUserCheck size={13} /> Activate
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Active Filter Badges ──────────────────────────────────────────────────────
function FilterBadges({ filters, onClear, onClearAll }) {
  const badges = [];

  if (filters.project !== "All")
    badges.push({ key: "project", label: `Project: ${filters.project}` });
  if (filters.joinedFrom)
    badges.push({ key: "joinedFrom", label: `From: ${filters.joinedFrom}` });
  if (filters.joinedTo)
    badges.push({ key: "joinedTo", label: `To: ${filters.joinedTo}` });
  if (badges.length === 0) return null;
  return (
    <div className="flex items-center gap-2 flex-wrap mt-3 pt-3 border-t border-slate-100">
      <span className="text-[11px] text-slate-400 font-medium">
        Active filters:
      </span>
      {badges.map((b) => (
        <span
          key={b.key}
          className="inline-flex items-center gap-1.5 bg-sky-50 text-sky-700 border border-sky-200 text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
        >
          {b.label}
          <button onClick={() => onClear(b.key)} className="hover:text-sky-900">
            <FiX size={10} />
          </button>
        </span>
      ))}
      <button
        onClick={onClearAll}
        className="text-[11px] text-slate-400 underline hover:text-slate-600 ml-1"
      >
        Clear all
      </button>
    </div>
  );
}

// ── Mobile Employee Card ──────────────────────────────────────────────────────
function MobileCard({ emp, onAction, onToggleStatus }) {
  const [expanded, setExpanded] = useState(false);
  const isActive = emp.status === "active";
  const rel = RELATION_CONFIG[emp.relation];
  const fullName = `${emp.name.firstName} ${emp.name.lastName}`;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Card Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-black shrink-0 ${getAvatarColor(emp._id)}`}
            >
              {emp.avatar}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-[14px] text-slate-800 truncate">
                {fullName}
              </p>
              <p className="text-[11px] text-slate-400 truncate">{emp.email}</p>
              <p className="text-[11px] text-slate-400">#{emp._id}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => onToggleStatus(emp)}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold transition-colors ${
                isActive
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                  : "bg-red-50 text-red-600 ring-1 ring-red-200"
              }`}
            >
              {isActive ? <FiUserCheck size={10} /> : <FiUserX size={10} />}
              {isActive ? "Active" : "Inactive"}
            </button>
            <ActionMenu employee={emp} onAction={onAction} />
          </div>
        </div>

        {/* Badges row */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span
            className={`px-2 py-0.5 text-[11px] rounded-full font-semibold ${DEPT_COLORS[emp.department] || "bg-slate-100 text-slate-600"}`}
          >
            {emp.department}
          </span>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${rel.cls}`}
          >
            <rel.Icon size={9} />
            {rel.label}
          </span>
          <span className="text-[11px] text-slate-400">
            Joined:{" "}
            {new Date(emp.joinedDate).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* Project Section — always visible but collapsible detail */}
      <div className="border-t border-slate-100">
        <button
          onClick={() => setExpanded((p) => !p)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <FiBriefcase size={12} className="text-[#0A4D68]" />
            {emp.project.name}
            <span className="font-mono text-[11px] text-violet-600 bg-violet-50 px-1.5 rounded">
              {emp.project.code}
            </span>
          </span>
          {expanded ? (
            <FiChevronUp size={13} className="text-slate-400" />
          ) : (
            <FiChevronDown size={13} className="text-slate-400" />
          )}
        </button>

        {expanded && (
          <div className="px-4 pb-4 grid grid-cols-1 gap-3 bg-sky-50/50 border-t border-sky-100">
            <div className="pt-3 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#0A4D68]/10 flex items-center justify-center shrink-0">
                <FiBriefcase size={12} className="text-[#0A4D68]" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">
                  Project Name
                </p>
                <p className="text-[13px] font-semibold text-slate-800">
                  {emp.project.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                <FiHash size={12} className="text-violet-600" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">
                  Project Code ID
                </p>
                <span className="font-mono text-[12px] font-semibold text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded">
                  {emp.project.code}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                <FaBuilding size={11} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">
                  Client Name
                </p>
                <p className="text-[13px] font-semibold text-slate-800">
                  {emp.project.client}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Desktop Table Row ─────────────────────────────────────────────────────────
function TableRow({
  emp,
  index,
  isExpanded,
  onToggleExpand,
  onToggleStatus,
  onAction,
}) {
  const fullName = `${emp.name.firstName} ${emp.name.lastName}`;
  const isActive = emp.status === "active";
  const rel = RELATION_CONFIG[emp.relation];

  return (
    <React.Fragment>
      <tr
        className={`transition-colors hover:bg-sky-50/60 ${index % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}
      >
        {/* Expand toggle */}
        <td className="px-3 py-3">
          <button
            onClick={() => onToggleExpand(emp._id)}
            title="Show project details"
            className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors"
          >
            {isExpanded ? (
              <FiChevronUp size={13} />
            ) : (
              <FiChevronDown size={13} />
            )}
          </button>
        </td>
        {/* Employee */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${getAvatarColor(emp._id)}`}
            >
              {emp.avatar}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-[13px] text-slate-800 truncate">
                {fullName}
              </span>
              <span className="text-[11px] text-slate-400">#{emp._id}</span>
            </div>
          </div>
        </td>
        {/* Email */}
        <td className="px-4 py-3">
          <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded tracking-wide whitespace-nowrap">
            {emp.email}
          </span>
        </td>
        {/* Department */}
        <td className="px-4 py-3">
          <span
            className={`px-2.5 py-0.5 text-xs rounded-full font-semibold whitespace-nowrap ${DEPT_COLORS[emp.department] || "bg-slate-100 text-slate-600"}`}
          >
            {emp.department}
          </span>
        </td>

        {/* Relation */}
        <td className="px-4 py-3">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${rel.cls}`}
          >
            <rel.Icon size={10} />
            {rel.label}
          </span>
        </td>

        {/* Joined Date */}
        <td className="px-4 py-3 text-[13px] text-slate-500 whitespace-nowrap">
          {new Date(emp.joinedDate).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </td>
        {/* Actions */}
        <td className="px-4 py-3">
          <ActionMenu employee={emp} onAction={onAction} />
        </td>
      </tr>
      {/* Expanded project sub-row */}
      {isExpanded && (
        <tr className="bg-sky-50/60 border-b border-sky-100">
          <td colSpan={11} className="px-8 py-3">
            <div className="flex items-center gap-8 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#0A4D68]/10 flex items-center justify-center shrink-0">
                  <FiBriefcase size={12} className="text-[#0A4D68]" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">
                    Project Name
                  </p>
                  <p className="text-[13px] font-semibold text-slate-800">
                    {emp.project.name}
                  </p>
                </div>
              </div>
              <div className="w-px h-8 bg-slate-200 shrink-0" />
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                  <FiHash size={12} className="text-violet-600" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">
                    Project Code ID
                  </p>
                  <span className="font-mono text-[12px] font-semibold text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded">
                    {emp.project.code}
                  </span>
                </div>
              </div>
              <div className="w-px h-8 bg-slate-200 shrink-0" />
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                  <FaBuilding size={11} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">
                    Client Name
                  </p>
                  <p className="text-[13px] font-semibold text-slate-800">
                    {emp.project.client}
                  </p>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function MyTeam() {
  const dispatch = useDispatch();
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("All");
  const [joinedFrom, setJoinedFrom] = useState("");
  const [joinedTo, setJoinedTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmAction, setConfirmAction] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});
  const [showFilters, setShowFilters] = useState(false); // mobile filter toggle

  const { myEmployees, loadingEmployees, errorEmployees } = useSelector(
    (state) => state.manager,
  );

  useEffect(() => {
    dispatch(getMyEmployees());
  }, [dispatch]);

  const employees = useMemo(() => {
    return (myEmployees || []).map((e, index) => {
      const [firstName = "", lastName = ""] = (e.name || "").split(" ");

      return {
        _id: e.employeeId || index,

        name: {
          firstName,
          lastName,
        },

        email: e.email,
        department: e.department || "N/A",

        relation: "manager", // since this API is manager-based
        status: "active", // default (adjust if backend provides)

        joinedDate: new Date().toISOString().split("T")[0], // fallback

        avatar: (firstName?.[0] || "") + (lastName?.[0] || ""),

        project: {
          name: e.projectName,
          code: e.projectCodeId,
          client: e.projectClient,
        },
      };
    });
  }, [myEmployees]);

  const projectNames = [
    "All",
    ...new Set((employees || []).map((e) => e.project.name)),
  ];

  function toggleExpand(id) {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return employees.filter((e) => {
      const name = `${e.name.firstName} ${e.name.lastName}`.toLowerCase();
      const searchOk =
        !q ||
        name.includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e._id.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q) ||
        e.project.name.toLowerCase().includes(q) ||
        e.project.code.toLowerCase().includes(q) ||
        e.project.client.toLowerCase().includes(q);
      const projectOk =
        projectFilter === "All" || e.project.name === projectFilter;
      const joined = e.joinedDate;
      const joinedOk =
        (!joinedFrom || joined >= joinedFrom) &&
        (!joinedTo || joined <= joinedTo);
      return searchOk && projectOk && joinedOk;
    });
  }, [employees, search, projectFilter, joinedFrom, joinedTo]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, projectFilter, joinedFrom, joinedTo]);

  const paginated = useMemo(
    () =>
      filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage],
  );

  const total = employees.length;
  const managers = employees.length;
  const bothCount = 0;
  const activeCount = employees.length;

  function handleAction(action, employee) {
    if (action === "view") return;
    setConfirmAction({ action, employee });
  }

  function handleConfirm() {
    // ❗ For now just close modal (no backend API yet)
    setConfirmAction(null);
  }

  function handleToggleStatus(employee) {
    setConfirmAction({
      action: employee.status === "active" ? "deactivate" : "activate",
      employee,
    });
  }

  const activeFilters = {
    project: projectFilter,
    joinedFrom,
    joinedTo,
  };

  function clearFilter(key) {
    ({
      project: () => setProjectFilter("All"),
      joinedFrom: () => setJoinedFrom(""),
      joinedTo: () => setJoinedTo(""),
    })[key]?.();
  }

  function clearAll() {
    setSearch("");
    setProjectFilter("All");
    setJoinedFrom("");
    setJoinedTo("");
  }

  const activeFilterCount = [
    projectFilter !== "All",
    !!joinedFrom,
    !!joinedTo,
  ].filter(Boolean).length;

  if (loadingEmployees) {
    return <div className="p-6 text-sm">Loading employees...</div>;
  }

  if (errorEmployees) {
    return <div className="p-6 text-red-500">{errorEmployees}</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ── Page Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-linear-to-br from-[#0A4D68] to-[#088395] flex items-center justify-center shrink-0">
          <FiUsers size={16} className="text-white" />
        </div>
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            My Reportees
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
            Employees who selected you as their{" "}
            <strong className="text-slate-500">approver or manager</strong>
          </p>
        </div>
      </div>

      {/* ── Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <StatCard
          label="Total Reports"
          value={total}
          Icon={FiUsers}
          borderCls="border-[#0A4D68]"
          iconBgCls="bg-[#0A4D68]/10"
          iconColorCls="text-[#0A4D68]"
        />
        <StatCard
          label="As Manager"
          value={managers}
          Icon={FiUserCheck}
          borderCls="border-violet-500"
          iconBgCls="bg-violet-50"
          iconColorCls="text-violet-600"
        />
        <StatCard
          label="Active"
          value={activeCount}
          Icon={FiUsers}
          borderCls="border-emerald-500"
          iconBgCls="bg-emerald-50"
          iconColorCls="text-emerald-600"
          sub={`${total - activeCount} inactive`}
        />
      </div>

      {/* ── Filters Panel */}
      <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4">
        {/* Search + mobile filter toggle */}
        <div
          className={`${showFilters ? "hidden" : "block"} lg:hidden mt-3 flex`}
        >
          <div className="relative flex-1">
            <FiSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              size={14}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, project, client…"
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-[13px] text-slate-800 bg-white outline-none focus:border-[#0A4D68] transition-colors placeholder:text-slate-400"
            />
          </div>
          {/* Mobile: toggle filter panel */}
          <button
            onClick={() => setShowFilters((p) => !p)}
            className={`lg:hidden flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[13px] font-semibold transition-colors shrink-0 ${
              showFilters || activeFilterCount > 0
                ? "border-[#0A4D68] bg-[#0A4D68] text-white"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <FiSliders size={14} />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span
                className={`text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center ${showFilters ? "bg-white text-[#0A4D68]" : "bg-red-500 text-white"}`}
              >
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Filter grid — always visible on lg+, toggleable on mobile */}
        <div className={`${showFilters ? "block" : "hidden"} lg:block mt-3`}>
          <div className="flex flex-wrap justify-between items-end gap-3 ">
            <div className="relative flex-1">
              <FiSearch
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                size={14}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, project, client…"
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-[13px] text-slate-800 bg-white outline-none focus:border-[#0A4D68] transition-colors placeholder:text-slate-400"
              />
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <LabeledField
                label={
                  <>
                    <FiBriefcase size={10} /> Project
                  </>
                }
              >
                <select
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
                  className={selectCls}
                >
                  {projectNames.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </LabeledField>
              <LabeledField
                label={
                  <>
                    <FiCalendar size={10} /> Joined From
                  </>
                }
              >
                <input
                  type="date"
                  value={joinedFrom}
                  onChange={(e) => setJoinedFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] text-slate-800 bg-white outline-none focus:border-[#0A4D68] transition-colors"
                />
              </LabeledField>
              <LabeledField
                label={
                  <>
                    <FiCalendar size={10} /> Joined To
                  </>
                }
              >
                <input
                  type="date"
                  value={joinedTo}
                  onChange={(e) => setJoinedTo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] text-slate-800 bg-white outline-none focus:border-[#0A4D68] transition-colors"
                />
              </LabeledField>
            </div>
          </div>
        </div>

        <FilterBadges
          filters={activeFilters}
          onClear={clearFilter}
          onClearAll={clearAll}
        />
      </div>

      {/* ── Mobile Card View (< lg) */}
      <div className="lg:hidden space-y-3">
        {paginated.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center text-slate-400 shadow-sm">
            <FiUsers size={28} className="mx-auto mb-3 opacity-20" />
            <p className="font-semibold text-sm">No reportees found</p>
            <p className="text-xs mt-1">
              Try adjusting your filters or search query
            </p>
          </div>
        ) : (
          paginated.map((emp) => (
            <MobileCard
              key={emp._id}
              emp={emp}
              onAction={handleAction}
              onToggleStatus={handleToggleStatus}
            />
          ))
        )}
        {/* Mobile footer */}
        <div className="flex justify-between items-center text-xs text-slate-400 px-1">
          <span>
            Showing{" "}
            <strong className="text-slate-600">
              {filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, filtered.length)}
            </strong>{" "}
            of <strong className="text-slate-600">{filtered.length}</strong>
          </span>
          <span>
            As: <strong className="text-[#0A4D68]">Rajesh Kumar</strong>
          </span>
        </div>
        <Pagination
          currentPage={currentPage}
          totalItems={filtered.length}
          pageSize={PAGE_SIZE}
          onPageChange={(page) => {
            if (page < 1) return;
            if (page > Math.ceil(filtered.length / PAGE_SIZE)) return;
            setCurrentPage(page);
          }}
        />
      </div>

      {/* ── Desktop Table View (lg+) */}
      <div className="hidden lg:block bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table
            className="w-full border-collapse"
            style={{ minWidth: "1100px" }}
          >
            <thead>
              <tr className="bg-[#0A4D68] text-[#bfdbfe]">
                <th className="px-3 py-3 w-9"></th>
                <th className="px-4 py-3 text-left text-[12px] font-semibold">
                  Employee
                </th>
                <th className="px-4 py-3 text-left text-[12px] font-semibold">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-[12px] font-semibold">
                  Department
                </th>
                <th className="px-4 py-3 text-left text-[12px] font-semibold">
                  Relation
                </th>
                <th className="px-4 py-3 text-left text-[12px] font-semibold">
                  Joined Date
                </th>
                <th className="px-4 py-3 text-left text-[12px] font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-slate-400">
                    <FiUsers size={32} className="mx-auto mb-3 opacity-20" />
                    <p className="font-semibold text-sm">No reportees found</p>
                    <p className="text-xs mt-1">
                      Try adjusting your filters or search query
                    </p>
                  </td>
                </tr>
              ) : (
                paginated.map((emp, i) => (
                  <TableRow
                    key={emp._id}
                    emp={emp}
                    index={i}
                    isExpanded={!!expandedRows[emp._id]}
                    onToggleExpand={toggleExpand}
                    onToggleStatus={handleToggleStatus}
                    onAction={handleAction}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 flex justify-between text-xs text-slate-400">
          <span>
            Showing{" "}
            <strong className="text-slate-600">
              {filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, filtered.length)}
            </strong>{" "}
            of <strong className="text-slate-600">{filtered.length}</strong>{" "}
            reportees
          </span>
        </div>

        <Pagination
          currentPage={currentPage}
          totalItems={filtered.length}
          pageSize={PAGE_SIZE}
          onPageChange={(page) => {
            if (page < 1) return;
            if (page > Math.ceil(filtered.length / PAGE_SIZE)) return;
            setCurrentPage(page);
          }}
        />
      </div>

      {/* ── Confirm Modal */}
      {confirmAction && (
        <ConfirmModal
          action={confirmAction.action}
          employee={confirmAction.employee}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
