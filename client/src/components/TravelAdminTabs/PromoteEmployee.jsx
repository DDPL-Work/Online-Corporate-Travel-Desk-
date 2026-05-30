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
  FiBriefcase,
  FiActivity,
} from "react-icons/fi";
import { FaUserTie, FaUser } from "react-icons/fa";
import {
  LabeledField,
  StatCard,
  selectCls,
  Th,
  CustomDropdown,
} from "./Shared/CommonComponents";
import { Pagination } from "./Shared/Pagination";
import ResponsiveDataTable from "./Shared/ResponsiveDataTable";
import { FiRefreshCw, FiX } from "react-icons/fi";
import { C } from "../Shared/color";
import Swal from "sweetalert2";
import useExcelExporter from "../../hooks/export/useExcelExporter";
import { adminEmployeeDirectoryExportTemplate } from "../../templates/exportTemplates/clientExportTemplates";

// ── Dummy Data ────────────────────────────────────────────────────────────────
const DUMMY_EMPLOYEES = [
  { _id: "emp001", name: { firstName: "Arjun", lastName: "Sharma" }, email: "arjun.sharma@acme.com", department: "Engineering", role: "manager", status: "active", joinedDate: "2021-03-15", avatar: "AS" },
  { _id: "emp002", name: { firstName: "Priya", lastName: "Mehta" }, email: "priya.mehta@acme.com", department: "HR", role: "employee", status: "active", joinedDate: "2022-07-01", avatar: "PM" },
  { _id: "emp003", name: { firstName: "Rohit", lastName: "Verma" }, email: "rohit.verma@acme.com", department: "Finance", role: "employee", status: "inactive", joinedDate: "2020-11-20", avatar: "RV" },
  { _id: "emp004", name: { firstName: "Sneha", lastName: "Iyer" }, email: "sneha.iyer@acme.com", department: "Engineering", role: "manager", status: "active", joinedDate: "2019-06-10", avatar: "SI" },
  { _id: "emp005", name: { firstName: "Karan", lastName: "Patel" }, email: "karan.patel@acme.com", department: "Sales", role: "employee", status: "active", joinedDate: "2023-01-05", avatar: "KP" },
  { _id: "emp006", name: { firstName: "Divya", lastName: "Nair" }, email: "divya.nair@acme.com", department: "Marketing", role: "employee", status: "active", joinedDate: "2022-04-18", avatar: "DN" },
  { _id: "emp007", name: { firstName: "Amit", lastName: "Singh" }, email: "amit.singh@acme.com", department: "Engineering", role: "employee", status: "inactive", joinedDate: "2021-09-30", avatar: "AS" },
  { _id: "emp008", name: { firstName: "Ritika", lastName: "Joshi" }, email: "ritika.joshi@acme.com", department: "Finance", role: "manager", status: "active", joinedDate: "2018-02-14", avatar: "RJ" },
  { _id: "emp009", name: { firstName: "Vikas", lastName: "Gupta" }, email: "vikas.gupta@acme.com", department: "Sales", role: "employee", status: "active", joinedDate: "2023-05-22", avatar: "VG" },
  { _id: "emp010", name: { firstName: "Anjali", lastName: "Rao" }, email: "anjali.rao@acme.com", department: "HR", role: "manager", status: "active", joinedDate: "2020-08-08", avatar: "AR" },
];

const PAGE_SIZE = 10;

// ── Action Menu ───────────────────────────────────────────────────────────────
function ActionMenu({ employee, onAction }) {
  const [open, setOpen] = useState(false);
  const isManager = employee.role === "manager";
  const isActive = employee.status === "active";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="p-2 rounded-xl hover:bg-slate-100 transition-all text-slate-400 hover:text-navy"
      >
        <FiMoreVertical size={18} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-20 bg-white border rounded-2xl shadow-2xl w-56 py-2 overflow-hidden animate-in fade-in slide-in-from-top-2" style={{ borderColor: C.border }}>
            {isManager ? (
              <button
                onClick={() => { setOpen(false); onAction("demote", employee); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black uppercase tracking-widest text-amber-600 hover:bg-amber-50 transition-colors"
              >
                <FiArrowDown size={14} /> Demote Policy
              </button>
            ) : (
              <button
                onClick={() => { setOpen(false); onAction("promote", employee); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black uppercase tracking-widest text-navy hover:bg-slate-50 transition-colors"
                style={{ color: C.navy }}
              >
                <FiArrowUp size={14} /> Promote Access
              </button>
            )}
            <div className="mx-2 border-t" style={{ borderColor: C.border }} />
            {isActive ? (
              <button
                onClick={() => { setOpen(false); onAction("deactivate", employee); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black uppercase tracking-widest text-red-600 hover:bg-red-50 transition-colors"
              >
                <FiUserX size={14} /> Deactivate Account
              </button>
            ) : (
              <button
                onClick={() => { setOpen(false); onAction("activate", employee); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50 transition-colors"
              >
                <FiUserCheck size={14} /> Reactive Access
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
  const [joinedFrom, setJoinedFrom] = useState("");
  const [joinedTo, setJoinedTo] = useState("");

  const departments = ["All", ...new Set(DUMMY_EMPLOYEES.map((e) => e.department))];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return employees.filter((e) => {
      const name = `${e.name.firstName} ${e.name.lastName}`.toLowerCase();
      const searchOk = !q || name.includes(q) || e.email.toLowerCase().includes(q) || e.department.toLowerCase().includes(q);
      const roleOk = roleFilter === "All" || e.role === roleFilter.toLowerCase();
      const statusOk = statusFilter === "All" || e.status === statusFilter.toLowerCase();
      const deptOk = deptFilter === "All" || e.department === deptFilter;
      const joined = e.joinedDate;
      const joinedOk = (!joinedFrom || joined >= joinedFrom) && (!joinedTo || joined <= joinedTo);
      return searchOk && roleOk && statusOk && deptOk && joinedOk;
    });
  }, [employees, search, roleFilter, statusFilter, deptFilter, joinedFrom, joinedTo]);

  useEffect(() => { setCurrentPage(1); }, [search, roleFilter, statusFilter, deptFilter, joinedFrom, joinedTo]);

  const paginated = useMemo(() => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [filtered, currentPage]);

  const stats = {
    total: employees.length,
    managers: employees.filter((e) => e.role === "manager").length,
    active: employees.filter((e) => e.status === "active").length,
    inactive: employees.filter((e) => e.status === "inactive").length,
  };

  async function handleAction(action, employee) {
    const name = `${employee.name.firstName} ${employee.name.lastName}`;
    const titles = { promote: "Promote to Manager", demote: "Revert to Employee", activate: "Activate Personnel", deactivate: "Suspend Access" };
    const texts = { 
        promote: `Grant manager privileges to ${name}?`, 
        demote: `Remove manager privileges from ${name}?`, 
        activate: `Restore system access for ${name}?`, 
        deactivate: `Immediately suspend all system access for ${name}?` 
    };

    const result = await Swal.fire({
      title: titles[action],
      text: texts[action],
      icon: action === 'deactivate' ? 'warning' : 'info',
      showCancelButton: true,
      confirmButtonColor: (action === 'deactivate' || action === 'demote') ? '#EF4444' : '#000D26',
      confirmButtonText: 'Confirm Protocol'
    });

    if (result.isConfirmed) {
      setEmployees(prev => prev.map(e => {
        if (e._id !== employee._id) return e;
        if (action === "promote") return { ...e, role: "manager" };
        if (action === "demote") return { ...e, role: "employee" };
        if (action === "activate") return { ...e, status: "active" };
        if (action === "deactivate") return { ...e, status: "inactive" };
        return e;
      }));
      Swal.fire('Updated', `${name}'s status has been modified.`, 'success');
    }
  }

  const { exportExcel, isExporting } = useExcelExporter();

  return (
    <div className="min-h-screen font-sans pb-20 px-6 pt-8" style={{ background: C.offWhite }}>
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-2xl border shadow-sm" style={{ borderColor: C.border }}>
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg text-white" style={{ background: `linear-gradient(135deg, ${C.navy}, ${C.gold})` }}>
              <FiUsers size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight" style={{ color: C.navy }}>Personnel Directory</h1>
              <p className="text-xs mt-1 font-bold uppercase tracking-widest" style={{ color: C.muted }}>Manage Global Employee Roles and Access Levels</p>
            </div>
          </div>
          <button onClick={() => window.location.reload()} className="px-6 py-3 rounded-xl font-bold text-xs flex items-center gap-2 border transition-all shadow-sm" style={{ background: C.white, borderColor: C.border, color: C.navy }}>
            <FiRefreshCw /> Sync Directory
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard label="Active Personnel" value={stats.active} Icon={FiUserCheck} borderCls="border-emerald-500" iconBgCls="bg-emerald-50" iconColorCls="text-emerald-600" />
          <StatCard label="Governance Team" value={stats.managers} Icon={FiShield} borderCls="border-violet-500" iconBgCls="bg-violet-50" iconColorCls="text-violet-600" />
          <StatCard label="Suspended Accounts" value={stats.inactive} Icon={FiUserX} borderCls="border-red-400" iconBgCls="bg-red-50" iconColorCls="text-red-500" />
          <StatCard label="Total Headcount" value={stats.total} Icon={FiUsers} borderCls="border-[#000D26]" iconBgCls="bg-[#000D26]10" iconColorCls="text-[#000D26]" />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-6 border shadow-sm" style={{ borderColor: C.border }}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
            <div className="md:col-span-4">
              <LabeledField label={<><FiSearch size={10} /> Directory Search</>}>
                <div className="relative group">
                  <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors" style={{ color: C.muted }} />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email or ID..." className="w-full pl-11 pr-4 py-3 border rounded-xl text-sm font-bold outline-none shadow-sm" style={{ background: C.offWhite, borderColor: C.border, color: C.navy }} />
                </div>
              </LabeledField>
            </div>
            <div className="md:col-span-2">
              <LabeledField label={<><FiFilter size={10} /> Role Type</>}>
                <CustomDropdown value={roleFilter} onChange={setRoleFilter} options={["All", "Manager", "Employee"]} />
              </LabeledField>
            </div>
            <div className="md:col-span-2">
              <LabeledField label={<><FiFilter size={10} /> Status</>}>
                <CustomDropdown value={statusFilter} onChange={setStatusFilter} options={["All", "Active", "Inactive"]} />
              </LabeledField>
            </div>
            <div className="md:col-span-2">
               <LabeledField label={<><FiCalendar size={10} /> Joined Range</>}>
                  <div className="flex items-center gap-1">
                     <input type="date" value={joinedFrom} onChange={(e) => setJoinedFrom(e.target.value)} className="w-full px-2 py-2 border rounded-lg text-[10px] font-bold" style={{ borderColor: C.border }} />
                     <span className="text-slate-300">-</span>
                     <input type="date" value={joinedTo} onChange={(e) => setJoinedTo(e.target.value)} className="w-full px-2 py-2 border rounded-lg text-[10px] font-bold" style={{ borderColor: C.border }} />
                  </div>
               </LabeledField>
            </div>
            <div className="md:col-span-2">
              <button onClick={() => { setSearch(""); setRoleFilter("All"); setStatusFilter("All"); setJoinedFrom(""); setJoinedTo(""); }} className="w-full py-3 rounded-xl font-black text-[11px] flex items-center justify-center gap-2 border shadow-sm transition-all hover:bg-slate-50 uppercase tracking-widest" style={{ background: C.white, borderColor: C.border, color: C.muted }}><FiX /> Clear</button>
            </div>
          </div>
        </div>

        {/* Directory Table */}
        <ResponsiveDataTable 
          title="Member Ledger" 
          subtitle={`${filtered.length} personnel found`} 
          exportLabel="Export Excel"
          exportLoading={isExporting}
          exportDisabled={isExporting}
          onExport={() => exportExcel({
            pageHeader: "Personnel Directory",
            statCards: [
              { label: "Active Personnel", value: stats.active },
              { label: "Governance Team", value: stats.managers },
              { label: "Suspended Accounts", value: stats.inactive },
              { label: "Total Headcount", value: stats.total }
            ],
            appliedFilters: [
              { label: "Search", value: search || "None" },
              { label: "Role Type", value: roleFilter },
              { label: "Status", value: statusFilter },
              { label: "Joined Range", value: `${joinedFrom || "Any"} to ${joinedTo || "Any"}` }
            ],
            data: filtered,
            columns: adminEmployeeDirectoryExportTemplate,
            filenamePrefix: "employee_directory"
          })}
          pagination={<Pagination currentPage={currentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />}
        >
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ background: C.navy, color: C.white }}>
                <Th className="px-6 py-5">Personnel Member</Th>
                <Th className="px-6 py-5">Corporate Email</Th>
                <Th className="px-6 py-5 text-center">Authorization</Th>
                <Th className="px-6 py-5 text-center">Status</Th>
                <Th className="px-6 py-5">Department</Th>
                <Th className="px-6 py-5 text-center">Control</Th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: C.border }}>
              {paginated.map((emp, i) => (
                <tr key={emp._id} className="hover:bg-slate-50 transition-colors" style={{ background: i % 2 === 0 ? C.white : C.offWhite }}>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-black shadow-sm text-white" style={{ background: `linear-gradient(135deg, ${C.navy}, ${C.gold})` }}>{emp.avatar}</div>
                       <div>
                          <p className="text-xs font-black" style={{ color: C.navy }}>{emp.name.firstName} {emp.name.lastName}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">ID: {emp._id.toUpperCase()}</p>
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-5"><span className="text-[11px] font-bold text-slate-500">{emp.email}</span></td>
                  <td className="px-6 py-5 text-center">
                    <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border shadow-sm" style={{ background: emp.role === 'manager' ? `${C.gold}15` : C.offWhite, color: emp.role === 'manager' ? C.gold : C.muted, borderColor: emp.role === 'manager' ? `${C.gold}30` : C.border }}>{emp.role}</span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border" style={{ background: emp.status === 'active' ? "#ECFDF5" : "#FEF2F2", color: emp.status === 'active' ? "#065F46" : "#991B1B", borderColor: emp.status === 'active' ? "#A7F3D0" : "#FECACA" }}>{emp.status}</span>
                  </td>
                  <td className="px-6 py-5">
                     <div className="flex items-center gap-2">
                        <FiBriefcase className="text-slate-300" size={14} />
                        <span className="text-[10px] font-black uppercase tracking-tight text-slate-600">{emp.department}</span>
                     </div>
                  </td>
                  <td className="px-6 py-5 text-center"><ActionMenu employee={emp} onAction={handleAction} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </ResponsiveDataTable>
      </div>
    </div>
  );
}
