import React, { useState, useMemo, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  FiSearch,
  FiUsers,
  FiShield,
  FiUserCheck,
  FiUserX,
  FiToggleLeft,
  FiToggleRight,
  FiRefreshCw,
  FiX,
  FiArrowRight,
  FiDownload,
  FiArrowDown,
} from "react-icons/fi";
import { MdBadge } from "react-icons/md";
import Swal from "sweetalert2";
import {
  LabeledField,
  StatCard,
  Th,
  CustomDropdown,
  SearchBar,
} from "./Shared/CommonComponents";
import ResponsiveDataTable from "./Shared/ResponsiveDataTable";
import { Pagination } from "./Shared/Pagination";
import {
  getAllEmployeesAdmin,
  toggleEmployeeStatusAdmin,
  demoteEmployeeAdmin,
  promoteEmployeeAdmin,
  promoteEmployeeToFinanceAdmin,
} from "../../Redux/Actions/travelAdmin.thunks";
import { ToastWithTimer } from "../../utils/ToastConfirm";
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
      className={`${sz} rounded-xl bg-gradient-to-br ${color} flex items-center justify-center font-black text-white shrink-0 shadow-sm border border-white/20`}
    >
      {initials || "?"}
    </div>
  );
};

export default function EmployeeManagement() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { allEmployees, loadingEmployees } = useSelector((state) => state.adminBooking);

  const [localOverrides, setLocalOverrides] = useState({});
  const [statusLoading, setStatusLoading] = useState({});
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [deptFilter, setDeptFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => { 
    dispatch(getAllEmployeesAdmin()); 
  }, [dispatch]);

  const employees = useMemo(() => 
    allEmployees.map(emp => ({ ...emp, ...(localOverrides[emp._id] || {}) })), 
    [allEmployees, localOverrides]
  );

  const departments = useMemo(() => {
    const depts = [...new Set(employees.map(e => e.department).filter(Boolean))].sort();
    return ["All", ...depts];
  }, [employees]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return employees.filter(e => {
      const name = `${e.name?.firstName || ""} ${e.name?.lastName || ""}`.toLowerCase();
      const dept = (e.department || "").toLowerCase();
      return (!q || name.includes(q) || e.email?.toLowerCase().includes(q) || dept.includes(q)) &&
             (roleFilter === "All" || e.role?.toLowerCase() === roleFilter.toLowerCase().replace(" ", "_")) &&
             (deptFilter === "All" || dept === deptFilter.toLowerCase()) &&
             (statusFilter === "All" || (statusFilter === "Active" ? e.isActive : !e.isActive));
    });
  }, [employees, search, roleFilter, deptFilter, statusFilter]);

  const paginated = useMemo(() => 
    filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), 
    [filtered, currentPage]
  );

  const stats = useMemo(() => ({
    total: employees.length,
    managers: employees.filter(e => e.role === "manager").length,
    active: employees.filter(e => e.isActive).length,
    suspended: employees.filter(e => !e.isActive).length
  }), [employees]);

  const handleStatusChange = async (employee) => {
    const id = employee._id;
    const isActivating = !employee.isActive;
    const name = `${employee.name?.firstName || ""} ${employee.name?.lastName || ""}`.trim();

    const result = await Swal.fire({
      title: isActivating ? "Activate Personnel?" : "Deactivate Personnel?",
      text: isActivating 
        ? `${name}'s access will be restored and system permissions granted.`
        : `${name}'s access will be suspended and all active sessions terminated.`,
      icon: isActivating ? "question" : "warning",
      showCancelButton: true,
      confirmButtonColor: isActivating ? "#10B981" : "#ef4444",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: isActivating ? "Yes, Activate" : "Yes, Deactivate",
      customClass: {
        popup: 'rounded-2xl',
        confirmButton: 'rounded-xl font-bold px-6 py-2.5',
        cancelButton: 'rounded-xl font-bold px-6 py-2.5'
      }
    });

    if (!result.isConfirmed) return;

    setLocalOverrides(prev => ({ ...prev, [id]: { ...prev[id], isActive: isActivating } }));
    setStatusLoading(prev => ({ ...prev, [id]: true }));
    
    try {
      await dispatch(toggleEmployeeStatusAdmin(id)).unwrap();
      ToastWithTimer({ message: `Personnel ${isActivating ? "activated" : "deactivated"} successfully`, type: "success" });
    } catch (err) {
      setLocalOverrides(prev => ({ ...prev, [id]: { ...prev[id], isActive: !isActivating } }));
      ToastWithTimer({ message: err || "Protocol Failure", type: "error" });
    } finally {
      setStatusLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleDemote = async (employee) => {
    const id = employee._id;
    const name = `${employee.name?.firstName || ""} ${employee.name?.lastName || ""}`.trim();
    const isFinance = employee.role === "finance_team";

    const result = await Swal.fire({
      title: isFinance ? "Reset Finance Team Role?" : "Demote Manager to Employee?",
      text: isFinance 
        ? `Are you sure you want to remove the Finance Team role from ${name}? This will immediately revoke their access to corporate wallets and ledgers.`
        : `Are you sure you want to remove manager privileges from ${name}? This will immediately revoke their designated approval authority.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#D97706",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: isFinance ? "Yes, Reset Role" : "Yes, Demote",
      customClass: {
        popup: 'rounded-2xl',
        confirmButton: 'rounded-xl font-bold px-6 py-2.5',
        cancelButton: 'rounded-xl font-bold px-6 py-2.5'
      }
    });

    if (!result.isConfirmed) return;

    setStatusLoading(prev => ({ ...prev, [id]: true }));
    
    try {
      await dispatch(demoteEmployeeAdmin(id)).unwrap();
      setLocalOverrides(prev => ({ ...prev, [id]: { ...prev[id], role: "employee" } }));
      ToastWithTimer({ message: `Personnel ${name} role demoted to employee successfully`, type: "success" });
    } catch (err) {
      ToastWithTimer({ message: err || "Failed to modify role", type: "error" });
    } finally {
      setStatusLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handlePromote = async (employee) => {
    const id = employee._id;
    const name = `${employee.name?.firstName || ""} ${employee.name?.lastName || ""}`.trim();

    const result = await Swal.fire({
      title: "Promote to Manager?",
      text: `Are you sure you want to promote ${name} to Manager? This will grant them team approval authority.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#7C3AED",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: "Yes, Promote",
      customClass: {
        popup: 'rounded-2xl',
        confirmButton: 'rounded-xl font-bold px-6 py-2.5',
        cancelButton: 'rounded-xl font-bold px-6 py-2.5'
      }
    });

    if (!result.isConfirmed) return;

    setStatusLoading(prev => ({ ...prev, [id]: true }));
    
    try {
      await dispatch(promoteEmployeeAdmin(id)).unwrap();
      setLocalOverrides(prev => ({ ...prev, [id]: { ...prev[id], role: "manager" } }));
      ToastWithTimer({ message: `Personnel ${name} promoted to manager successfully`, type: "success" });
    } catch (err) {
      ToastWithTimer({ message: err || "Failed to promote employee", type: "error" });
    } finally {
      setStatusLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handlePromoteToFinance = async (employee) => {
    const id = employee._id;
    const name = `${employee.name?.firstName || ""} ${employee.name?.lastName || ""}`.trim();

    const result = await Swal.fire({
      title: "Assign to Finance Team?",
      text: `Are you sure you want to assign the Finance Team role to ${name}? This will grant them access to corporate credit ledgers, wallet resources, and organizational profiles.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#D97706",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: "Yes, Assign Role",
      customClass: {
        popup: 'rounded-2xl',
        confirmButton: 'rounded-xl font-bold px-6 py-2.5',
        cancelButton: 'rounded-xl font-bold px-6 py-2.5'
      }
    });

    if (!result.isConfirmed) return;

    setStatusLoading(prev => ({ ...prev, [id]: true }));
    
    try {
      await dispatch(promoteEmployeeToFinanceAdmin(id)).unwrap();
      setLocalOverrides(prev => ({ ...prev, [id]: { ...prev[id], role: "finance_team" } }));
      ToastWithTimer({ message: `Personnel ${name} assigned to Finance Team successfully`, type: "success" });
    } catch (err) {
      ToastWithTimer({ message: err || "Failed to assign Finance Team role", type: "error" });
    } finally {
      setStatusLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleExport = () => {
    if (!filtered.length) return;
    const headers = ["Personnel", "Email", "Role", "Status", "Joined"];
    const rows = filtered.map(e => [`${e.name?.firstName} ${e.name?.lastName}`, e.email, e.role, e.isActive ? "Active" : "Inactive", new Date(e.createdAt).toLocaleDateString()]);
    const tableHtml = rows.map(r => `<tr>${r.map(c => `<td style="border:1px solid #dbe4f0;padding:8px;">${c}</td>`).join("")}</tr>`).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head><body><table><thead><tr>${headers.map(h => `<th style="border:1px solid #cbd5e1;padding:10px;background:#000D26;color:#fff;">${h}</th>`).join("")}</tr></thead><tbody>${tableHtml}</tbody></table></body></html>`;
    const blob = new Blob(["\ufeff", html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `personnel-directory.xls`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const handleRefresh = () => dispatch(getAllEmployeesAdmin());

  return (
    <div className="min-h-screen font-sans pb-20 -mt-6 -mx-4 md:-mx-6" style={{ background: C.offWhite }}>
      {/* Navy Header Section */}
      <div className="w-full bg-gradient-to-br from-[#003399] to-[#000d26] text-white pt-8 pb-20 px-6 md:px-10">
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
             
             <div className="h-12 w-[1px] bg-white/10 mx-2 hidden md:block" />

             <div className="flex items-center gap-5">
               <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl text-white border border-white/10 bg-white/10" >
                 <FiUsers size={28} />
               </div>
               <div>
                 <h1 className="text-3xl font-black tracking-tight leading-none">Employee Directory</h1>
                 <p className="text-[10px] mt-2 font-bold uppercase tracking-[2px] opacity-60">
                   Manage organizational personnel, departmental roles, and system access permissions
                 </p>
               </div>
             </div>
          </div>

          <button 
            onClick={handleExport}
            className="px-6 py-3 rounded-xl bg-white text-[#003399] font-black text-xs flex items-center gap-2 shadow-xl hover:scale-105 transition-all active:scale-95"
          >
            <FiDownload size={16} /> EXPORT DATA
          </button>
        </div>
      </div>

      <div className="w-full px-4 md:px-10 -mt-10 space-y-10">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard label="Total Employees" value={stats.total} Icon={FiUsers} borderCls="border-[#000D26]" iconBgCls="bg-slate-100" iconColorCls="text-[#000D26]" />
          <StatCard label="Unit Managers" value={stats.managers} Icon={FiShield} borderCls="border-violet-500" iconBgCls="bg-violet-50" iconColorCls="text-violet-600" />
          <StatCard label="Active Status" value={stats.active} Icon={FiUserCheck} borderCls="border-emerald-500" iconBgCls="bg-emerald-50" iconColorCls="text-emerald-600" />
          <StatCard label="Deactivated" value={stats.suspended} Icon={FiUserX} borderCls="border-red-500" iconBgCls="bg-red-50" iconColorCls="text-red-600" />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-6 border shadow-sm" style={{ borderColor: C.border }}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
            <LabeledField label={<><FiSearch size={10} /> Search Directory</>} className="lg:col-span-6">
              <SearchBar value={search} onChange={(val) => { setSearch(val); setCurrentPage(1); }} placeholder="Search name, email, department..." />
            </LabeledField>
            <LabeledField label="Organizational Role" className="lg:col-span-2">
              <CustomDropdown value={roleFilter} onChange={(val) => { setRoleFilter(val); setCurrentPage(1); }} options={["All", "Manager", "Employee", "Finance Team"]} />
            </LabeledField>
            <LabeledField label="Department" className="lg:col-span-2">
              <CustomDropdown value={deptFilter} onChange={(val) => { setDeptFilter(val); setCurrentPage(1); }} options={departments} />
            </LabeledField>
            <LabeledField label="System Access" className="lg:col-span-2">
              <CustomDropdown value={statusFilter} onChange={(val) => { setStatusFilter(val); setCurrentPage(1); }} options={["All", "Active", "Inactive"]} />
            </LabeledField>
            <div className="flex items-end lg:col-span-12 xl:col-span-12 2xl:col-span-2">
               <button onClick={() => { setSearch(""); setRoleFilter("All"); setDeptFilter("All"); setStatusFilter("All"); setCurrentPage(1); }} className="w-full py-2.5 rounded-xl font-black text-[11px] flex items-center justify-center gap-2 border shadow-sm transition-all hover:bg-slate-50 uppercase tracking-widest" style={{ background: C.white, borderColor: C.border, color: C.muted }}><FiX /> Reset Filters</button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <ResponsiveDataTable 
          title="Employee Records" 
          subtitle={`${filtered.length} registered personnel`} 
          wrapperClass="!border-none !shadow-none"
          pagination={<Pagination currentPage={currentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />}
        >
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-[#003399] to-[#000d26] text-white">
                <Th className="!px-6 !py-5">Employee</Th>
                <Th className="!px-6 !py-5">Credentials & Department</Th>
                <Th className="!px-6 !py-5">Designated Role</Th>
                <Th className="!px-6 !py-5">Access Status</Th>
                <Th className="!px-6 !py-5">Joining Date</Th>
              </tr>
            </thead>
            <tbody>
              {paginated.length > 0 ? paginated.map((emp, i) => {
                const name = `${emp.name?.firstName || ""} ${emp.name?.lastName || ""}`.trim();
                const isManager = emp.role?.toLowerCase() === "manager";
                
                return (
                  <tr key={emp._id} className="hover:bg-slate-50 transition-colors" style={{ background: i % 2 === 0 ? C.white : C.lightGray }}>
                    <td className="!px-6 !py-5">
                       <div className="flex items-center gap-4">
                          <Avatar name={name} />
                          <div className="min-w-0">
                            <p className="text-xs font-black uppercase tracking-tight" style={{ color: C.navy }}>{name}</p>
                            <p className="text-[10px] font-bold text-slate-400">ID: {emp.employeeCode || "N/A"}</p>
                          </div>
                       </div>
                    </td>
                    <td className="!px-6 !py-5 text-left">
                       <p className="text-[11px] font-bold text-slate-500 font-mono">{emp.email}</p>
                       <p className="text-[9px] font-black uppercase tracking-widest text-gold mt-1">{emp.department || "Not Assigned"}</p>
                    </td>
                    <td className="!px-6 !py-5 text-left">
                       <div className="flex items-center gap-3">
                         {emp.role?.toLowerCase() === "manager" ? (
                           <div className="px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm flex items-center gap-1.5 bg-[#F5F3FF] text-[#7C3AED] border-[#DDD6FE]">
                             <FiShield size={10} /> Manager
                           </div>
                         ) : emp.role?.toLowerCase() === "finance_team" ? (
                           <div className="px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm flex items-center gap-1.5 bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]">
                             <FiShield size={10} /> Finance Team
                           </div>
                         ) : (
                           <div className="px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm flex items-center gap-1.5 bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]">
                             <MdBadge size={10} /> {emp.role || "Employee"}
                           </div>
                         )}

                         {emp.role?.toLowerCase() === "manager" && (
                           <div className="flex items-center gap-2">
                             <button 
                               onClick={() => handleDemote(emp)}
                               disabled={statusLoading[emp._id]}
                               className="px-2 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg border border-amber-200 bg-amber-50 text-amber-700 shadow-sm transition-all hover:scale-105 hover:bg-amber-100 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                             >
                               <FiArrowDown size={10} /> Demote
                             </button>
                             <button 
                               onClick={() => handlePromoteToFinance(emp)}
                               disabled={statusLoading[emp._id]}
                               className="px-2 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-700 shadow-sm transition-all hover:scale-105 hover:bg-yellow-100 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                             >
                               Assign Finance
                             </button>
                           </div>
                         )}

                         {emp.role?.toLowerCase() === "finance_team" && (
                           <button 
                             onClick={() => handleDemote(emp)}
                             disabled={statusLoading[emp._id]}
                             className="px-2 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg border border-amber-200 bg-amber-50 text-amber-700 shadow-sm transition-all hover:scale-105 hover:bg-amber-100 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                           >
                             <FiArrowDown size={10} /> Demote
                           </button>
                         )}

                         {(!emp.role || emp.role?.toLowerCase() === "employee") && (
                           <div className="flex items-center gap-2">
                             <button 
                               onClick={() => handlePromote(emp)}
                               disabled={statusLoading[emp._id]}
                               className="hidden px-2 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg border border-violet-200 bg-violet-50 text-violet-700 shadow-sm transition-all hover:scale-105 hover:bg-violet-100 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                             >
                               Promote Manager
                             </button>
                             <button 
                               onClick={() => handlePromoteToFinance(emp)}
                               disabled={statusLoading[emp._id]}
                               className="px-2 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-700 shadow-sm transition-all hover:scale-105 hover:bg-yellow-100 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                             >
                               Assign Finance
                             </button>
                           </div>
                         )}
                       </div>
                    </td>
                    <td className="!px-6 !py-5 text-left">
                      <div className="flex justify-start">
                        <button 
                          onClick={() => handleStatusChange(emp)} 
                          disabled={statusLoading[emp._id]} 
                          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all shadow-sm group hover:scale-105 active:scale-95 disabled:opacity-50" 
                          style={{ 
                            background: emp.isActive ? "#ECFDF5" : "#FEF2F2", 
                            color: emp.isActive ? "#059669" : "#DC2626", 
                            borderColor: emp.isActive ? "#A7F3D0" : "#FECACA" 
                          }}
                        >
                          {statusLoading[emp._id] ? (
                            <FiRefreshCw className="animate-spin" />
                          ) : emp.isActive ? (
                            <FiToggleRight size={16} className="text-emerald-500" />
                          ) : (
                            <FiToggleLeft size={16} className="text-red-500" />
                          )} 
                          {emp.isActive ? "Active" : "Inactive"}
                        </button>
                      </div>
                    </td>
                    <td className="!px-6 !py-5 text-left">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                         {new Date(emp.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                       </p>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={5} className="!px-6 !py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                        <FiUsers size={32} />
                      </div>
                      <p className="text-sm font-bold text-slate-400">No personnel records found matching the criteria.</p>
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
