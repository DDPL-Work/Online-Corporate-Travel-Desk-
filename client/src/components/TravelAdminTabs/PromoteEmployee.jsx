import React, { useState, useMemo, useEffect } from "react";
import {
  FiSearch,
  FiFilter,
  FiUsers,
  FiShield,
  FiUserCheck,
  FiUserX,
  FiToggleLeft,
  FiToggleRight,
  FiChevronLeft,
  FiChevronRight,
  FiMoreVertical,
  FiArrowUp,
  FiArrowDown,
  FiCalendar,
} from "react-icons/fi";
import { FaUserTie, FaUser } from "react-icons/fa";
import {
  LabeledField,
  StatCard,
  selectCls,
  Th,
} from "./Shared/CommonComponents";
import { Pagination } from "./Shared/Pagination";

// ── Dummy Data ────────────────────────────────────────────────────────────────
const DUMMY_EMPLOYEES = [
  {
    _id: "emp001",
    name: { firstName: "Arjun", lastName: "Sharma" },
    email: "arjun.sharma@acme.com",
    department: "Engineering",
    role: "manager",
    status: "active",
    joinedDate: "2021-03-15",
    avatar: "AS",
  },
  {
    _id: "emp002",
    name: { firstName: "Priya", lastName: "Mehta" },
    email: "priya.mehta@acme.com",
    department: "HR",
    role: "employee",
    status: "active",
    joinedDate: "2022-07-01",
    avatar: "PM",
  },
  {
    _id: "emp003",
    name: { firstName: "Rohit", lastName: "Verma" },
    email: "rohit.verma@acme.com",
    department: "Finance",
    role: "employee",
    status: "inactive",
    joinedDate: "2020-11-20",
    avatar: "RV",
  },
  {
    _id: "emp004",
    name: { firstName: "Sneha", lastName: "Iyer" },
    email: "sneha.iyer@acme.com",
    department: "Engineering",
    role: "manager",
    status: "active",
    joinedDate: "2019-06-10",
    avatar: "SI",
  },
  {
    _id: "emp005",
    name: { firstName: "Karan", lastName: "Patel" },
    email: "karan.patel@acme.com",
    department: "Sales",
    role: "employee",
    status: "active",
    joinedDate: "2023-01-05",
    avatar: "KP",
  },
  {
    _id: "emp006",
    name: { firstName: "Divya", lastName: "Nair" },
    email: "divya.nair@acme.com",
    department: "Marketing",
    role: "employee",
    status: "active",
    joinedDate: "2022-04-18",
    avatar: "DN",
  },
  {
    _id: "emp007",
    name: { firstName: "Amit", lastName: "Singh" },
    email: "amit.singh@acme.com",
    department: "Engineering",
    role: "employee",
    status: "inactive",
    joinedDate: "2021-09-30",
    avatar: "AS",
  },
  {
    _id: "emp008",
    name: { firstName: "Ritika", lastName: "Joshi" },
    email: "ritika.joshi@acme.com",
    department: "Finance",
    role: "manager",
    status: "active",
    joinedDate: "2018-02-14",
    avatar: "RJ",
  },
  {
    _id: "emp009",
    name: { firstName: "Vikas", lastName: "Gupta" },
    email: "vikas.gupta@acme.com",
    department: "Sales",
    role: "employee",
    status: "active",
    joinedDate: "2023-05-22",
    avatar: "VG",
  },
  {
    _id: "emp010",
    name: { firstName: "Anjali", lastName: "Rao" },
    email: "anjali.rao@acme.com",
    department: "HR",
    role: "manager",
    status: "active",
    joinedDate: "2020-08-08",
    avatar: "AR",
  },
  {
    _id: "emp011",
    name: { firstName: "Suresh", lastName: "Kumar" },
    email: "suresh.kumar@acme.com",
    department: "Marketing",
    role: "employee",
    status: "inactive",
    joinedDate: "2021-12-01",
    avatar: "SK",
  },
  {
    _id: "emp012",
    name: { firstName: "Meera", lastName: "Pillai" },
    email: "meera.pillai@acme.com",
    department: "Engineering",
    role: "employee",
    status: "active",
    joinedDate: "2022-10-17",
    avatar: "MP",
  },
  {
    _id: "emp013",
    name: { firstName: "Rahul", lastName: "Desai" },
    email: "rahul.desai@acme.com",
    department: "Sales",
    role: "manager",
    status: "active",
    joinedDate: "2019-03-25",
    avatar: "RD",
  },
  {
    _id: "emp014",
    name: { firstName: "Pooja", lastName: "Tiwari" },
    email: "pooja.tiwari@acme.com",
    department: "Finance",
    role: "employee",
    status: "active",
    joinedDate: "2023-08-11",
    avatar: "PT",
  },
  {
    _id: "emp015",
    name: { firstName: "Nikhil", lastName: "Bhat" },
    email: "nikhil.bhat@acme.com",
    department: "HR",
    role: "employee",
    status: "active",
    joinedDate: "2022-02-28",
    avatar: "NB",
  },
  {
    _id: "emp016",
    name: { firstName: "Lakshmi", lastName: "Reddy" },
    email: "lakshmi.reddy@acme.com",
    department: "Engineering",
    role: "employee",
    status: "inactive",
    joinedDate: "2020-05-05",
    avatar: "LR",
  },
  {
    _id: "emp017",
    name: { firstName: "Aditya", lastName: "Bansal" },
    email: "aditya.bansal@acme.com",
    department: "Marketing",
    role: "manager",
    status: "active",
    joinedDate: "2018-11-19",
    avatar: "AB",
  },
  {
    _id: "emp018",
    name: { firstName: "Neha", lastName: "Chawla" },
    email: "neha.chawla@acme.com",
    department: "Sales",
    role: "employee",
    status: "active",
    joinedDate: "2023-03-07",
    avatar: "NC",
  },
  {
    _id: "emp019",
    name: { firstName: "Sanjay", lastName: "Mishra" },
    email: "sanjay.mishra@acme.com",
    department: "Finance",
    role: "employee",
    status: "active",
    joinedDate: "2021-07-14",
    avatar: "SM",
  },
  {
    _id: "emp020",
    name: { firstName: "Kavya", lastName: "Menon" },
    email: "kavya.menon@acme.com",
    department: "Engineering",
    role: "employee",
    status: "inactive",
    joinedDate: "2022-09-03",
    avatar: "KM",
  },
  {
    _id: "emp021",
    name: { firstName: "Deepak", lastName: "Aggarwal" },
    email: "deepak.aggarwal@acme.com",
    department: "HR",
    role: "employee",
    status: "active",
    joinedDate: "2023-06-20",
    avatar: "DA",
  },
  {
    _id: "emp022",
    name: { firstName: "Shruti", lastName: "Kapoor" },
    email: "shruti.kapoor@acme.com",
    department: "Marketing",
    role: "employee",
    status: "active",
    joinedDate: "2021-04-09",
    avatar: "SK",
  },
  {
    _id: "emp023",
    name: { firstName: "Tarun", lastName: "Saxena" },
    email: "tarun.saxena@acme.com",
    department: "Sales",
    role: "manager",
    status: "active",
    joinedDate: "2017-10-30",
    avatar: "TS",
  },
  {
    _id: "emp024",
    name: { firstName: "Ishaan", lastName: "Chopra" },
    email: "ishaan.chopra@acme.com",
    department: "Engineering",
    role: "employee",
    status: "active",
    joinedDate: "2023-11-01",
    avatar: "IC",
  },
];

const PAGE_SIZE = 10;

const DEPT_COLORS = {
  Engineering: "bg-blue-100 text-blue-700",
  HR: "bg-pink-100 text-pink-700",
  Finance: "bg-emerald-100 text-emerald-700",
  Sales: "bg-orange-100 text-orange-700",
  Marketing: "bg-violet-100 text-violet-700",
};

const AVATAR_COLORS = [
  "bg-[#0A4D68] text-white",
  "bg-[#088395] text-white",
  "bg-violet-600 text-white",
  "bg-emerald-600 text-white",
  "bg-orange-500 text-white",
  "bg-pink-600 text-white",
];

function getAvatarColor(id) {
  const idx = parseInt(id.replace(/\D/g, ""), 10) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────
function ConfirmModal({ action, employee, onConfirm, onCancel }) {
  if (!action || !employee) return null;
  const name = `${employee.name.firstName} ${employee.name.lastName}`;

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

// ── Action Menu ───────────────────────────────────────────────────────────────
function ActionMenu({ employee, onAction }) {
  const [open, setOpen] = useState(false);
  const isManager = employee.role === "manager";
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
          <div className="absolute right-0 top-8 z-20 bg-white border border-slate-200 rounded-xl shadow-xl w-52 py-1.5 overflow-hidden">
            {isManager ? (
              <button
                onClick={() => {
                  setOpen(false);
                  onAction("demote", employee);
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-amber-700 hover:bg-amber-50 transition-colors"
              >
                <FiArrowDown size={14} /> Demote to Employee
              </button>
            ) : (
              <button
                onClick={() => {
                  setOpen(false);
                  onAction("promote", employee);
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-[#0A4D68] hover:bg-sky-50 transition-colors"
              >
                <FiArrowUp size={14} /> Promote to Manager
              </button>
            )}
            <div className="my-1 border-t border-slate-100" />
            {isActive ? (
              <button
                onClick={() => {
                  setOpen(false);
                  onAction("deactivate", employee);
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-red-600 hover:bg-red-50 transition-colors"
              >
                <FiUserX size={14} /> Deactivate
              </button>
            ) : (
              <button
                onClick={() => {
                  setOpen(false);
                  onAction("activate", employee);
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-emerald-700 hover:bg-emerald-50 transition-colors"
              >
                <FiUserCheck size={14} /> Activate
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function PromoteEmployee() {
  const [employees, setEmployees] = useState(DUMMY_EMPLOYEES);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [deptFilter, setDeptFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmAction, setConfirmAction] = useState(null); // { action, employee }
  const [joinedFrom, setJoinedFrom] = useState("");
  const [joinedTo, setJoinedTo] = useState("");

  const departments = [
    "All",
    ...new Set(DUMMY_EMPLOYEES.map((e) => e.department)),
  ];

  // ── Filtered list
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return employees.filter((e) => {
      const name = `${e.name.firstName} ${e.name.lastName}`.toLowerCase();
      const searchOk =
        !q ||
        name.includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e._id.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q);
      const roleOk =
        roleFilter === "All" || e.role === roleFilter.toLowerCase();
      const statusOk =
        statusFilter === "All" || e.status === statusFilter.toLowerCase();
      const deptOk = deptFilter === "All" || e.department === deptFilter;

      // Joined date range
      const joined = e.joinedDate; // already "YYYY-MM-DD" so string compare works
      const joinedOk =
        (!joinedFrom || joined >= joinedFrom) &&
        (!joinedTo || joined <= joinedTo);

      return searchOk && roleOk && statusOk && deptOk && joinedOk;
    });
  }, [
    employees,
    search,
    roleFilter,
    statusFilter,
    deptFilter,
    joinedFrom,
    joinedTo,
  ]);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter, statusFilter, deptFilter, joinedFrom, joinedTo]);

  const paginated = useMemo(
    () =>
      filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage],
  );

  // ── Stats
  const totalEmployees = employees.length;
  const totalManagers = employees.filter((e) => e.role === "manager").length;
  const activeCount = employees.filter((e) => e.status === "active").length;
  const inactiveCount = employees.filter((e) => e.status === "inactive").length;
  const deptCount = new Set(employees.map((e) => e.department)).size;

  // ── Actions
  function handleAction(action, employee) {
    setConfirmAction({ action, employee });
  }

  function handleConfirm() {
    const { action, employee } = confirmAction;
    setEmployees((prev) =>
      prev.map((e) => {
        if (e._id !== employee._id) return e;
        if (action === "promote") return { ...e, role: "manager" };
        if (action === "demote") return { ...e, role: "employee" };
        if (action === "activate") return { ...e, status: "active" };
        if (action === "deactivate") return { ...e, status: "inactive" };
        return e;
      }),
    );
    setConfirmAction(null);
  }

  function handleToggleStatus(employee) {
    const action = employee.status === "active" ? "deactivate" : "activate";
    setConfirmAction({ action, employee });
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-5">
        {/* Page Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-[#0A4D68] to-[#088395] flex items-center justify-center shrink-0">
            <FiUsers size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Employee Management
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage roles and access for{" "}
              <strong className="text-slate-500">acme.com</strong> domain
            </p>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard
            label="Total Employees"
            value={totalEmployees}
            Icon={FiUsers}
            borderCls="border-[#0A4D68]"
            iconBgCls="bg-[#0A4D68]/10"
            iconColorCls="text-[#0A4D68]"
          />
          <StatCard
            label="Managers"
            value={totalManagers}
            Icon={FiShield}
            borderCls="border-violet-500"
            iconBgCls="bg-violet-50"
            iconColorCls="text-violet-600"
            sub={`${totalEmployees - totalManagers} employees`}
          />
          <StatCard
            label="Active"
            value={activeCount}
            Icon={FiUserCheck}
            borderCls="border-emerald-500"
            iconBgCls="bg-emerald-50"
            iconColorCls="text-emerald-600"
          />
          <StatCard
            label="Inactive"
            value={inactiveCount}
            Icon={FiUserX}
            borderCls="border-red-400"
            iconBgCls="bg-red-50"
            iconColorCls="text-red-500"
          />
          {/* <StatCard label="Departments" value={deptCount} Icon={FaUserTie} borderCls="border-amber-500" iconBgCls="bg-amber-50" iconColorCls="text-amber-600" /> */}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
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
                  <FiFilter size={10} /> Role
                </>
              }
            >
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className={selectCls}
              >
                {["All", "Manager", "Employee"].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </LabeledField>
            <LabeledField
              label={
                <>
                  <FiFilter size={10} /> Status
                </>
              }
            >
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={selectCls}
              >
                {["All", "Active", "Inactive"].map((s) => (
                  <option key={s}>{s}</option>
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
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] text-slate-800 bg-white outline-none focus:border-slate-400 transition-colors"
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
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] text-slate-800 bg-white outline-none focus:border-slate-400 transition-colors"
              />
            </LabeledField>

            {/* <LabeledField
              label={
                <>
                  <FiFilter size={10} /> Department
                </>
              }
            >
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className={selectCls}
              >
                {departments.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </LabeledField> */}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-[#0A4D68] text-[#bfdbfe]">
                  <Th>Employee</Th>
                  <Th>Employee Mail ID</Th>
                  {/* <Th>Department</Th> */}
                  <Th>Role</Th>
                  <Th>Status</Th>
                  <Th>Joined Date</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="py-16 text-center text-slate-400"
                    >
                      <div className="flex justify-center mb-3">
                        <FiUsers size={32} className="opacity-20" />
                      </div>
                      <p className="font-semibold text-sm">
                        No employees found
                      </p>
                      <p className="text-xs mt-1">
                        Try adjusting filters or search query
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginated.map((emp, i) => {
                    const fullName = `${emp.name.firstName} ${emp.name.lastName}`;
                    const isManager = emp.role === "manager";
                    const isActive = emp.status === "active";
                    return (
                      <tr
                        key={emp._id}
                        className={`transition-colors hover:bg-sky-50/60 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}
                      >
                        {/* Employee name + email */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${getAvatarColor(emp._id)}`}
                            >
                              {emp.avatar}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-[13px] text-slate-800">
                                {fullName}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                #{emp._id}
                                {emp.email}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Employee ID */}
                        <td className="px-4 py-3">
                          <span className="font-mono text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded tracking-wide">
                            {emp.email}
                          </span>
                        </td>

                        {/* Department */}
                        {/* <td className="px-4 py-3">
                          <span
                            className={`px-2.5 py-0.5 text-xs rounded-full font-semibold ${DEPT_COLORS[emp.department] || "bg-slate-100 text-slate-600"}`}
                          >
                            {emp.department}
                          </span>
                        </td> */}

                        {/* Role badge */}
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

                        {/* Status toggle */}
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleToggleStatus(emp)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors ${
                              isActive
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100"
                                : "bg-red-50 text-red-600 ring-1 ring-red-200 hover:bg-red-100"
                            }`}
                          >
                            {isActive ? (
                              <FiToggleRight size={13} />
                            ) : (
                              <FiToggleLeft size={13} />
                            )}
                            {isActive ? "Active" : "Inactive"}
                          </button>
                        </td>

                        {/* Joined date */}
                        <td className="px-4 py-3 text-[13px] text-slate-500">
                          {new Date(emp.joinedDate).toLocaleDateString(
                            "en-IN",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            },
                          )}
                        </td>

                        {/* Action menu */}
                        <td className="px-4 py-3">
                          <ActionMenu employee={emp} onAction={handleAction} />
                        </td>
                      </tr>
                    );
                  })
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
              employees
            </span>
            <span>
              Domain: <strong className="text-[#0A4D68]">acme.com</strong>
            </span>
          </div>

          <Pagination
            currentPage={currentPage}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
            accentCls="bg-[#0A4D68]"
          />
        </div>
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
