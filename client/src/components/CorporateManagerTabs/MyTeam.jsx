import React, { useState, useMemo, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  FiSearch,
  FiUsers,
  FiShield,
  FiUserCheck,
  FiUserX,
  FiRefreshCw,
  FiX,
  FiArrowRight,
  FiDownload,
  FiBriefcase,
} from "react-icons/fi";
import { MdBadge } from "react-icons/md";
import {
  StatCard,
  Th,
} from "./Shared/CommonComponents";
import {
  CustomDropdown,
  LabeledField,
  SearchBar,
} from "../TravelAdminTabs/Shared/CommonComponents";
import ResponsiveDataTable from "../TravelAdminTabs/Shared/ResponsiveDataTable";
import { Pagination } from "../TravelAdminTabs/Shared/Pagination";
import { getMyEmployees } from "../../Redux/Actions/manager.thunk";
import { C } from "../Shared/color";

const PAGE_SIZE = 10;

const Avatar = ({ name = "", size = "md" }) => {
  const nameStr = typeof name === "string" ? name : String(name || "");
  const initials = nameStr
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const colors = [
    "from-[#003399] to-[#000d26]",
    "from-violet-600 to-indigo-500",
    "from-rose-500 to-pink-400",
    "from-amber-500 to-orange-400",
    "from-teal-600 to-emerald-500",
  ];

  const seed = nameStr.length > 0 ? nameStr.charCodeAt(0) : 0;
  const color = colors[seed % colors.length];
  const sz = size === "lg" ? "w-10 h-10 text-[11px]" : "w-9 h-9 text-[10px]";

  return (
    <div
      className={`${sz} rounded-xl bg-linear-to-br ${color} flex items-center justify-center font-black text-white shrink-0 shadow-sm border border-white/20`}
    >
      {initials || "?"}
    </div>
  );
};

export default function MyTeam() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { myEmployees, loadingEmployees } = useSelector((state) => state.manager);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [projectFilter, setProjectFilter] = useState("All");
  const [deptFilter, setDeptFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    dispatch(getMyEmployees());
  }, [dispatch]);

  const employees = useMemo(() => {
    return (myEmployees || []).map((e, index) => {
      const name = e.name || "";
      const [firstName = "", lastName = ""] = name.split(" ");
      return {
        _id: e.employeeId || index,
        employeeCode: e.employeeCode || "N/A",
        name: {
          firstName,
          lastName,
        },
        email: e.email,
        department: e.department || "N/A",
        role: e.role || "Employee",
        isActive: e.isActive !== false, // default to active
        createdAt: e.createdAt || new Date().toISOString(),
        project: {
          name: e.projectName || "N/A",
          code: e.projectCodeId || "N/A",
          client: e.projectClient || "N/A",
        },
      };
    });
  }, [myEmployees]);

  const projects = useMemo(() => {
    const codes = [...new Set(employees.map(e => e.project.code).filter(Boolean))].sort();
    return ["All", ...codes];
  }, [employees]);

  const departments = useMemo(() => {
    const depts = [...new Set(employees.map(e => e.department).filter(Boolean))].sort();
    return ["All", ...depts];
  }, [employees]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return employees.filter(e => {
      const name = `${e.name?.firstName || ""} ${e.name?.lastName || ""}`.toLowerCase();
      const dept = (e.department || "").toLowerCase();
      const projectCode = (e.project.code || "").toLowerCase();

      return (!q || name.includes(q) || e.email?.toLowerCase().includes(q) || dept.includes(q) || projectCode.includes(q)) &&
        (roleFilter === "All" || e.role?.toLowerCase() === roleFilter.toLowerCase()) &&
        (projectFilter === "All" || e.project.code?.toLowerCase() === projectFilter.toLowerCase()) &&
        (deptFilter === "All" || dept === deptFilter.toLowerCase()) &&
        (statusFilter === "All" || (statusFilter === "Active" ? e.isActive : !e.isActive));
    });
  }, [employees, search, roleFilter, projectFilter, deptFilter, statusFilter]);

  const paginated = useMemo(() => {
    return filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  }, [filtered, currentPage]);

  const stats = useMemo(() => ({
    total: employees.length,
    managers: employees.filter(e => e.role?.toLowerCase() === "manager").length,
    active: employees.filter(e => e.isActive).length,
    suspended: employees.filter(e => !e.isActive).length
  }), [employees]);



  const handleRefresh = () => dispatch(getMyEmployees());

  return (
    <div className="min-h-screen font-sans pb-20 -mt-6 -mx-4 md:-mx-6" style={{ background: C.offWhite }}>
      {/* Navy Header Section */}
      <div className="w-full bg-linear-to-br from-[#003399] to-[#000d26] text-white pt-8 pb-20 px-6 md:px-10">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10"
              >
                <FiArrowRight className="rotate-180" size={20} />
              </button>
              <button
                onClick={handleRefresh}
                className={`p-3 rounded-xl bg-white/10 transition-all border border-white/10 ${loadingEmployees ? "opacity-50 cursor-not-allowed" : "hover:bg-white/20"}`}
                disabled={loadingEmployees}
              >
                <div className={loadingEmployees ? "animate-spin" : ""}>
                  <FiRefreshCw size={20} />
                </div>
              </button>
            </div>

            <div className="h-12 w-px bg-white/10 mx-2 hidden md:block" />

            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl text-white border border-white/10 bg-white/10" >
                <FiUsers size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight leading-none">My Reportees</h1>
                <p className="text-[10px] mt-2 font-bold uppercase tracking-[2px] opacity-60">
                  Employees who selected you as their designated approver or manager
                </p>
              </div>
            </div>
          </div>

          {/* Export moved to table header */}
        </div>
      </div>

      <div className="w-full px-4 md:px-10 -mt-10 space-y-10">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard label="Total Reportees" value={stats.total} Icon={FiUsers} borderCls="border-[#000D26]" iconBgCls="bg-slate-100" iconColorCls="text-[#000D26]" />
          <StatCard label="Unit Managers" value={stats.managers} Icon={FiShield} borderCls="border-violet-500" iconBgCls="bg-violet-50" iconColorCls="text-violet-600" />
          <StatCard label="Access Active" value={stats.active} Icon={FiUserCheck} borderCls="border-emerald-500" iconBgCls="bg-emerald-50" iconColorCls="text-emerald-600" />
          <StatCard label="Suspended" value={stats.suspended} Icon={FiUserX} borderCls="border-red-500" iconBgCls="bg-red-50" iconColorCls="text-red-600" />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-6 border shadow-sm" style={{ borderColor: C.border }}>
          <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-4 items-end">
            <LabeledField label={<><FiSearch size={10} /> Search Directory</>} className="md:col-span-3 lg:col-span-3">
              <SearchBar value={search} onChange={(val) => { setSearch(val); setCurrentPage(1); }} placeholder="Search name, email, department..." />
            </LabeledField>
            <LabeledField label="Project Code" className="md:col-span-3 lg:col-span-2">
              <CustomDropdown value={projectFilter} onChange={(val) => { setProjectFilter(val); setCurrentPage(1); }} options={projects} />
            </LabeledField>
            <LabeledField label="Department" className="md:col-span-2 lg:col-span-2">
              <CustomDropdown value={deptFilter} onChange={(val) => { setDeptFilter(val); setCurrentPage(1); }} options={departments} />
            </LabeledField>
            <LabeledField label="Organizational Role" className="md:col-span-2 lg:col-span-2">
              <CustomDropdown value={roleFilter} onChange={(val) => { setRoleFilter(val); setCurrentPage(1); }} options={["All", "Manager", "Employee"]} />
            </LabeledField>
            <LabeledField label="System Access" className="md:col-span-2 lg:col-span-2">
              <CustomDropdown value={statusFilter} onChange={(val) => { setStatusFilter(val); setCurrentPage(1); }} options={["All", "Active", "Inactive"]} />
            </LabeledField>
            <div className="flex items-end md:col-span-6 lg:col-span-1">
              <button
                onClick={() => {
                  setSearch("");
                  setProjectFilter("All");
                  setRoleFilter("All");
                  setDeptFilter("All");
                  setStatusFilter("All");
                  setCurrentPage(1);
                }}
                className="w-full py-2.5 rounded-xl font-black text-[11px] flex items-center justify-center gap-1.5 border shadow-sm transition-all hover:bg-slate-50 uppercase tracking-widest h-[38px]"
                style={{ background: C.white, borderColor: C.border, color: C.muted }}
              >
                <FiX /> Reset
              </button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <ResponsiveDataTable
          title="My Team Directory"
          subtitle={`${filtered.length} reportees active`}
          wrapperClass="!border-none !shadow-none"
          exportConfig={{
            data: filtered,
            filename: `my_team_reportees_${new Date().toISOString().split('T')[0]}.csv`,
            columns: [
              { header: "Personnel", accessor: (row) => `${row.name?.firstName || ""} ${row.name?.lastName || ""}`.trim() },
              { header: "Email", key: "email" },
              { header: "Role", key: "role" },
              { header: "Project Code", accessor: (row) => row.project?.code },
              { header: "Status", accessor: (row) => row.isActive ? "Active" : "Inactive" },
              { header: "Joined", accessor: (row) => new Date(row.createdAt).toLocaleDateString() }
            ]
          }}
          pagination={<Pagination currentPage={currentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />}
        >
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-linear-to-r from-[#003399] to-[#000d26] text-white">
                <Th className="px-6! py-5!">Employee</Th>
                <Th className="px-6! py-5!">Credentials & Department</Th>
                <Th className="px-6! py-5!">Assigned Project</Th>
                <Th className="px-6! py-5!">Designated Role</Th>
                <Th className="px-6! py-5!">Access Status</Th>
                <Th className="px-6! py-5!">Joining Date</Th>
              </tr>
            </thead>
            <tbody>
              {paginated.length > 0 ? paginated.map((emp, i) => {
                const name = `${emp.name?.firstName || ""} ${emp.name?.lastName || ""}`.trim();
                const isManager = emp.role?.toLowerCase() === "manager";

                return (
                  <tr key={emp._id} className="hover:bg-slate-50 transition-colors" style={{ background: i % 2 === 0 ? C.white : C.lightGray }}>
                    <td className="px-6! py-5!">
                      <div className="flex items-center gap-4">
                        <Avatar name={name} />
                        <div className="min-w-0">
                          <p className="text-xs font-black uppercase tracking-tight" style={{ color: C.navy }}>{name}</p>
                          <p className="text-[10px] font-bold text-slate-400">ID: {emp.employeeCode || "N/A"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6! py-5! text-left">
                      <p className="text-[11px] font-bold text-slate-500 font-mono">{emp.email}</p>
                      <p className="text-[9px] font-black uppercase tracking-widest text-gold mt-1">{emp.department || "Not Assigned"}</p>
                    </td>
                    <td className="px-6! py-5! text-left">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#003399]">
                          <FiBriefcase size={14} />
                        </div>
                        <div>
                          <p className="text-xs font-black" style={{ color: C.navy }}>{emp.project.name}</p>
                          <p className="text-[9px] font-black uppercase tracking-widest text-gold mt-0.5">Code: {emp.project.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6! py-5! text-left">
                      <div className="flex justify-start">
                        <div className="px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm flex items-center gap-1.5" style={{
                          background: isManager ? "#F5F3FF" : "#F1F5F9",
                          color: isManager ? "#7C3AED" : "#475569",
                          borderColor: isManager ? "#DDD6FE" : "#E2E8F0"
                        }}>
                          {isManager ? <FiShield size={10} /> : <MdBadge size={10} />}
                          {emp.role || "Employee"}
                        </div>
                      </div>
                    </td>
                    <td className="px-6! py-5! text-left">
                      <div className="flex justify-start">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm"
                          style={{
                            background: emp.isActive ? "#ECFDF5" : "#FEF2F2",
                            color: emp.isActive ? "#059669" : "#DC2626",
                            borderColor: emp.isActive ? "#A7F3D0" : "#FECACA"
                          }}
                        >
                          {emp.isActive ? <FiUserCheck size={12} className="text-emerald-500" /> : <FiUserX size={12} className="text-red-500" />}
                          {emp.isActive ? "Active" : "Inactive"}
                        </div>
                      </div>
                    </td>
                    <td className="px-6! py-5! text-left">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {new Date(emp.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={6} className="px-6! py-20! text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                        <FiUsers size={32} />
                      </div>
                      <p className="text-sm font-bold text-slate-400">No reportees found matching the criteria.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </ResponsiveDataTable>
      </div>
    </div>
  );
}
