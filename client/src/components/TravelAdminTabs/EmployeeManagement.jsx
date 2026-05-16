import React, { useState, useMemo, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FiSearch,
  FiFilter,
  FiUsers,
  FiShield,
  FiUserCheck,
  FiUserX,
  FiToggleLeft,
  FiToggleRight,
  FiArrowUp,
  FiArrowDown,
  FiCalendar,
  FiRefreshCw,
  FiX,
} from "react-icons/fi";
import { FaUser } from "react-icons/fa";
import {
  LabeledField,
  StatCard,
  selectCls,
  Th,
  CustomDropdown,
} from "./Shared/CommonComponents";
import ResponsiveDataTable from "./Shared/ResponsiveDataTable";
import { Pagination } from "./Shared/Pagination";
import {
  getAllEmployeesAdmin,
  toggleEmployeeStatusAdmin,
} from "../../Redux/Actions/travelAdmin.thunks";
import { ToastWithTimer } from "../../utils/ToastConfirm";

const PAGE_SIZE = 10;

const AVATAR_COLORS = [
  "bg-[#0A4D68] text-white",
  "bg-[#088395] text-white",
  "bg-violet-600 text-white",
  "bg-emerald-600 text-white",
  "bg-orange-500 text-white",
  "bg-pink-600 text-white",
];

function getAvatarColor(id) {
  if (!id) return AVATAR_COLORS[0];
  const numeric = id.replace(/\D/g, "");
  const idx = numeric ? parseInt(numeric, 10) % AVATAR_COLORS.length : 0;
  return AVATAR_COLORS[idx];
}

function getInitials(employee) {
  const first = employee?.name?.firstName?.[0] || "";
  const last = employee?.name?.lastName?.[0] || "";
  return (first + last).toUpperCase() || "??";
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────
function ConfirmModal({ action, employee, onConfirm, onCancel }) {
  if (!action || !employee) return null;
  const firstName = employee?.name?.firstName || "";
  const lastName = employee?.name?.lastName || "";
  const name = `${firstName} ${lastName}`.trim() || "This employee";

  const config = {
    promote: {
      title: "Promote to Manager",
      desc: `${name} will be granted manager-level access and can approve travel requests.`,
      confirmLabel: "Promote",
      confirmCls: "bg-[#0A4D68] hover:bg-[#083a50] text-white",
      icon: <FiArrowUp size={20} className="text-[#0A4D68]" />,
      iconBg: "bg-[#0A4D68]/10",
    },
    demote: {
      title: "Demote to Employee",
      desc: `${name} will lose manager privileges and revert to standard employee access.`,
      confirmLabel: "Demote",
      confirmCls: "bg-amber-500 hover:bg-amber-600 text-white",
      icon: <FiArrowDown size={20} className="text-amber-500" />,
      iconBg: "bg-amber-50",
    },
    activate: {
      title: "Activate Employee",
      desc: `${name}'s account will be reactivated and they will regain system access.`,
      confirmLabel: "Activate",
      confirmCls: "bg-emerald-600 hover:bg-emerald-700 text-white",
      icon: <FiUserCheck size={20} className="text-emerald-600" />,
      iconBg: "bg-emerald-50",
    },
    deactivate: {
      title: "Deactivate Employee",
      desc: `${name}'s account will be suspended. They will lose all system access immediately.`,
      confirmLabel: "Deactivate",
      confirmCls: "bg-red-600 hover:bg-red-700 text-white",
      icon: <FiUserX size={20} className="text-red-500" />,
      iconBg: "bg-red-50",
    },
  };

  const c = config[action];
  if (!c) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.iconBg}`}
          >
            {c.icon}
          </div>
          <h3 className="text-lg font-black text-slate-900">{c.title}</h3>
        </div>
        <p className="text-[13px] text-slate-600 leading-relaxed mb-6">
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

// ── Loading Skeleton ──────────────────────────────────────────────────────────
function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}>
          {[1, 2, 3, 4, 5].map((col) => (
            <td key={col} className="px-4 py-3">
              <div className="h-4 bg-slate-200 rounded animate-pulse w-full max-w-[120px]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function EmployeeManagement() {
  const dispatch = useDispatch();

  // ── Redux State
  const {
    allEmployees,
    loadingEmployees,
    errorEmployees,
  } = useSelector((state) => state.adminBooking);

  // ── Local state for optimistic UI updates (role/status changes)
  const [localOverrides, setLocalOverrides] = useState({}); // { [_id]: { role?, status? } }
  const [statusLoading, setStatusLoading] = useState({});

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmAction, setConfirmAction] = useState(null);
  const [joinedFrom, setJoinedFrom] = useState("");
  const [joinedTo, setJoinedTo] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("All Employees");

  // ── Fetch on mount
  useEffect(() => {
    dispatch(getAllEmployeesAdmin());
  }, [dispatch]);

  // ── Merge API data with local overrides
  const employees = useMemo(
    () =>
      allEmployees.map((emp) => ({
        ...emp,
        ...(localOverrides[emp._id] || {}),
      })),
    [allEmployees, localOverrides]
  );

  // ── Filtered list
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return employees.filter((e) => {
      const firstName = e?.name?.firstName || "";
      const lastName = e?.name?.lastName || "";
      const fullName = `${firstName} ${lastName}`.toLowerCase();
      const email = e.email?.toLowerCase() || "";
      const id = e._id?.toLowerCase() || "";
      const dept = e.department?.toLowerCase() || "";

      const searchOk =
        !q ||
        fullName.includes(q) ||
        email.includes(q) ||
        id.includes(q) ||
        dept.includes(q);

      const roleOk =
        roleFilter === "All" || e.role === roleFilter.toLowerCase();
      const statusOk =
        statusFilter === "All" ||
        (statusFilter === "Active" && e.isActive === true) ||
        (statusFilter === "Inactive" && e.isActive === false);

      const joined = e.joinedDate || e.createdAt?.slice(0, 10) || "";
      const joinedOk =
        (!joinedFrom || joined >= joinedFrom) &&
        (!joinedTo || joined <= joinedTo);

      const employeeOk =
        selectedEmployee === "All Employees" ||
        `${e?.name?.firstName || ""} ${e?.name?.lastName || ""}`.trim() === selectedEmployee;

      return searchOk && roleOk && statusOk && joinedOk && employeeOk;
    });
  }, [employees, search, roleFilter, statusFilter, joinedFrom, joinedTo, selectedEmployee]);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter, statusFilter, joinedFrom, joinedTo, selectedEmployee]);

  const paginated = useMemo(
    () =>
      filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage]
  );

  // ── Stats
  const totalEmployees = employees.length;
  const totalManagers = employees.filter((e) => e.role === "manager").length;
  const activeCount = employees.filter((e) => e.isActive === true).length;
  const inactiveCount = employees.filter((e) => e.isActive === false).length;

  // ── Apply status change with API + optimistic UI
  async function handleStatusChange(action, employee) {
    if (!employee?._id) return;
    const id = employee._id;
    const optimisticIsActive = action === "activate";

    // optimistic UI
    setLocalOverrides((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), isActive: optimisticIsActive },
    }));
    setStatusLoading((prev) => ({ ...prev, [id]: true }));
    setConfirmAction(null);

    try {
      await dispatch(toggleEmployeeStatusAdmin(id)).unwrap();

      // cleanup override; slice will update store on success
      setLocalOverrides((prev) => {
        const next = { ...prev };
        if (next[id]) {
          delete next[id].isActive;
          if (Object.keys(next[id]).length === 0) delete next[id];
        }
        return next;
      });

      ToastWithTimer({
        message: `Employee ${optimisticIsActive ? "activated" : "deactivated"} successfully`,
        type: "success",
      });
    } catch (err) {
      // revert optimistic change
      setLocalOverrides((prev) => {
        const next = { ...prev };
        if (next[id]) {
          delete next[id].isActive;
          if (Object.keys(next[id]).length === 0) delete next[id];
        }
        return next;
      });

      ToastWithTimer({
        message: err || "Failed to update status",
        type: "error",
      });
    } finally {
      setStatusLoading((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }

  function handleConfirm() {
    const { action, employee } = confirmAction || {};
    if (!action || !employee) return;

    // Status change flows through API
    if (action === "activate" || action === "deactivate") {
      handleStatusChange(action, employee);
      return;
    }

    const id = employee._id;

    // Optimistic local update for role change
    setLocalOverrides((prev) => {
      const current = prev[id] || {};
      let update = {};
      if (action === "promote") update = { role: "manager" };
      if (action === "demote") update = { role: "employee" };
      return { ...prev, [id]: { ...current, ...update } };
    });

    setConfirmAction(null);
  }

  function handleToggleStatus(employee) {
    if (statusLoading[employee._id]) return;
    const action = employee.isActive === true ? "deactivate" : "activate";
    setConfirmAction({ action, employee });
  }

  // ── Export
  const handleExport = () => {
    if (!filtered.length) return;
    const headers = ["Employee", "Email", "Role", "Status", "Joined Date"];
    const rows = filtered.map((emp) => [
      `${emp.name?.firstName || ""} ${emp.name?.lastName || ""}`.trim(),
      emp.email || "—",
      emp.role || "—",
      emp.isActive ? "Active" : "Inactive",
      emp.joinedDate || emp.createdAt?.slice(0, 10) || "—",
    ]);
    const tableRows = rows
      .map(
        (row) =>
          `<tr>${row
            .map(
              (cell) =>
                `<td style="border:1px solid #dbe4f0;padding:8px;">${String(
                  cell ?? "",
                )
                  .replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")}</td>`,
            )
            .join("")}</tr>`,
      )
      .join("");
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head><body><table><thead><tr>${headers.map((h) => `<th style="border:1px solid #cbd5e1;padding:10px;background:#0f172a;color:#fff;font-weight:700;text-align:left;">${h}</th>`).join("")}</tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
    const blob = new Blob(["\ufeff", html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `employee-directory-${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRefresh = () => {
    setLocalOverrides({});
    dispatch(getAllEmployeesAdmin());
  };

  const allEmployeeNames = useMemo(() => {
    const list = allEmployees.map((e) => ({
      label: `${e?.name?.firstName || ""} ${e?.name?.lastName || ""}`.trim(),
      subLabel: e.email || "No email",
      value: `${e?.name?.firstName || ""} ${e?.name?.lastName || ""}`.trim(),
    }));
    
    // Sort and remove duplicates by name
    const unique = [];
    const seen = new Set();
    [...list].sort((a, b) => a.label.localeCompare(b.label)).forEach(item => {
      if (!seen.has(item.label)) {
        seen.add(item.label);
        unique.push(item);
      }
    });

    return [{ label: "All Employees", value: "All Employees" }, ...unique];
  }, [allEmployees]);

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-5">
        {/* HEADER CARD */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#0A4D68] to-[#088395] flex items-center justify-center shadow-lg text-white shrink-0">
              <FiUsers size={24} />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase leading-none truncate">
                Employee Management
              </h1>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 font-bold uppercase tracking-widest truncate">
                Manage roles and access for all employees
              </p>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            disabled={loadingEmployees}
            className="w-full md:w-auto shrink-0 inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-bold transition-all shadow-sm border bg-cyan-50 border-cyan-200 text-[#0A4D68] hover:bg-cyan-100 active:scale-95 disabled:opacity-50"
          >
            <FiRefreshCw
              size={14}
              className={loadingEmployees ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* Error Banner */}
        {errorEmployees && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-[13px] px-4 py-3 rounded-xl flex items-center gap-2">
            <FiUserX size={14} />
            <span>{errorEmployees}</span>
            <button
              onClick={handleRefresh}
              className="ml-auto text-red-600 underline font-semibold"
            >
              Retry
            </button>
          </div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
          <StatCard
            label="Total Employees"
            value={loadingEmployees ? "—" : totalEmployees}
            Icon={FiUsers}
            borderCls="border-[#0A4D68]"
            iconBgCls="bg-[#0A4D68]/10"
            iconColorCls="text-[#0A4D68]"
          />
          <StatCard
            label="Managers"
            value={loadingEmployees ? "—" : totalManagers}
            Icon={FiShield}
            borderCls="border-violet-500"
            iconBgCls="bg-violet-50"
            iconColorCls="text-violet-600"
            sub={
              loadingEmployees
                ? ""
                : `${totalEmployees - totalManagers} employees`
            }
          />
          <StatCard
            label="Active"
            value={loadingEmployees ? "—" : activeCount}
            Icon={FiUserCheck}
            borderCls="border-emerald-500"
            iconBgCls="bg-emerald-50"
            iconColorCls="text-emerald-600"
          />
          <StatCard
            label="Inactive"
            value={loadingEmployees ? "—" : inactiveCount}
            Icon={FiUserX}
            borderCls="border-red-400"
            iconBgCls="bg-red-50"
            iconColorCls="text-red-500"
          />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
            <LabeledField
              label={
                <>
                  <FiSearch size={10} /> Search Employee
                </>
              }
            >
              <div className="relative">
                <FiSearch
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  size={14}
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name, email, ID, department…"
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-[13px] text-slate-800 bg-white outline-none transition-colors focus:border-[#0A4D68] placeholder:text-slate-400"
                />
              </div>
            </LabeledField>

            <LabeledField
              label={
                <>
                  <FiUsers size={10} /> Select Employee
                </>
              }
            >
              <CustomDropdown
                value={selectedEmployee}
                onChange={setSelectedEmployee}
                options={allEmployeeNames}
              />
            </LabeledField>

            <LabeledField
              label={
                <>
                  <FiFilter size={10} /> Role
                </>
              }
            >
              <CustomDropdown
                value={roleFilter}
                onChange={setRoleFilter}
                options={["All", "Manager", "Employee"]}
              />
            </LabeledField>

            <LabeledField
              label={
                <>
                  <FiFilter size={10} /> Status
                </>
              }
            >
              <CustomDropdown
                value={statusFilter}
                onChange={setStatusFilter}
                options={["All", "Active", "Inactive"]}
              />
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
                className="w-full px-2 py-2 border border-slate-200 rounded-lg text-[11px] outline-none transition-colors focus:border-[#0A4D68]"
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
                className="w-full px-2 py-2 border border-slate-200 rounded-lg text-[11px] outline-none transition-colors focus:border-[#0A4D68]"
              />
            </LabeledField>

            <div className="lg:col-span-6 flex justify-end mt-2">
              <button
                onClick={() => {
                  setSearch("");
                  setRoleFilter("All");
                  setStatusFilter("All");
                  setJoinedFrom("");
                  setJoinedTo("");
                  setSelectedEmployee("All Employees");
                }}
                className="inline-flex items-center justify-center gap-2 px-8 py-2 text-xs font-bold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors border border-slate-200 shadow-sm"
              >
                <FiX size={14} /> Reset
              </button>
            </div>
          </div>
        </div>

        <ResponsiveDataTable
          title="Employee Directory"
          subtitle={`${filtered.length} record${filtered.length !== 1 ? "s" : ""} found`}
          tableMinWidth="900px"
          onExport={handleExport}
          exportLabel="Export"
          exportBgClass="bg-[#0A4D68] hover:bg-[#083a50]"
          arrowBgClass="bg-cyan-50 border-cyan-200 text-[#0A4D68] hover:bg-cyan-100"
          footer={
            <div className="px-4 py-2.5 flex justify-between text-xs text-slate-400">
              <span>
                {loadingEmployees ? (
                  "Loading employees…"
                ) : (
                  <>
                    Showing{" "}
                    <strong className="text-slate-600">
                      {filtered.length === 0
                        ? 0
                        : (currentPage - 1) * PAGE_SIZE + 1}
                      –{Math.min(currentPage * PAGE_SIZE, filtered.length)}
                    </strong>{" "}
                    of{" "}
                    <strong className="text-slate-600">
                      {filtered.length}
                    </strong>{" "}
                    employees
                  </>
                )}
              </span>
            </div>
          }
          pagination={
            <Pagination
              currentPage={currentPage}
              totalItems={filtered.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          }
        >
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#0A4D68] text-[#ffffff]">
                <Th>Employee</Th>
                <Th>Employee Mail ID</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                <Th>Joined Date</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingEmployees ? (
                <TableSkeleton />
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-16 text-center text-slate-400">
                    <div className="flex justify-center mb-3">
                      <FiUsers size={32} className="opacity-20" />
                    </div>
                    <p className="font-semibold text-sm">No employees found</p>
                    <p className="text-xs mt-1">
                      {errorEmployees
                        ? "Failed to load employees. Please retry."
                        : "Try adjusting filters or search query"}
                    </p>
                  </td>
                </tr>
              ) : (
                paginated.map((emp, i) => {
                  const firstName = emp?.name?.firstName || "";
                  const lastName = emp?.name?.lastName || "";
                  const fullName =
                    `${firstName} ${lastName}`.trim() || "Unknown";
                  const isManager = emp.role === "manager";
                  const isActive = emp.isActive === true;
                  const joinedRaw =
                    emp.joinedDate || emp.createdAt?.slice(0, 10) || "";
                  const statusBusy = !!statusLoading[emp._id];

                  return (
                    <tr
                      key={emp._id}
                      className={`transition-colors hover:bg-sky-50/60 ${
                        i % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${getAvatarColor(emp._id)}`}
                          >
                            {getInitials(emp)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-[13px] text-slate-800">
                              {fullName}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded tracking-wide">
                          {emp.email || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            isManager
                              ? "bg-violet-50 text-violet-700 ring-1 ring-violet-200"
                              : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                          }`}
                        >
                          {isManager ? (
                            <FiShield size={10} />
                          ) : (
                            <FaUser size={9} />
                          )}
                          {isManager ? "Manager" : "Employee"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleStatus(emp)}
                          disabled={statusBusy}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                            isActive
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100"
                              : "bg-red-50 text-red-600 ring-1 ring-red-200 hover:bg-red-100"
                          }`}
                        >
                          {statusBusy ? (
                            <>
                              <FiRefreshCw size={13} className="animate-spin" />
                              Updating...
                            </>
                          ) : isActive ? (
                            <FiToggleRight size={13} />
                          ) : (
                            <FiToggleLeft size={13} />
                          )}
                          {!statusBusy && (isActive ? "Active" : "Inactive")}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-slate-500">
                        {joinedRaw
                          ? new Date(joinedRaw).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </ResponsiveDataTable>
      </div>

      {/* Confirm Modal */}
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
