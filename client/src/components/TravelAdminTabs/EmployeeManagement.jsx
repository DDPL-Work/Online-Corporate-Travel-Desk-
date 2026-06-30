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
  FiDollarSign,
  FiTrendingUp,
  FiCalendar,
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
import CustomDatePicker from "../Shared/CustomDatePicker";
import {
  getAllEmployeesAdmin,
  toggleEmployeeStatusAdmin,
  demoteEmployeeAdmin,
  promoteEmployeeAdmin,
  promoteEmployeeToFinanceAdmin,
  getEmployeeExpensesAdmin,
} from "../../Redux/Actions/travelAdmin.thunks";
import { ToastWithTimer } from "../../utils/ToastConfirm";
import { C } from "../Shared/color";
import useExcelExporter from "../../hooks/export/useExcelExporter";

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

export default function EmployeeManagement() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { allEmployees, loadingEmployees, employeeExpenses, loadingEmployeeExpenses } = useSelector((state) => state.adminBooking);

  const [localOverrides, setLocalOverrides] = useState({});
  const [statusLoading, setStatusLoading] = useState({});
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [deptFilter, setDeptFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("employees");

  const [expenseStartDate, setExpenseStartDate] = useState("");
  const [expenseEndDate, setExpenseEndDate] = useState("");

  useEffect(() => { 
    dispatch(getAllEmployeesAdmin()); 
  }, [dispatch]);

  useEffect(() => {
    if (activeTab === "expenses") {
      dispatch(getEmployeeExpensesAdmin({ startDate: expenseStartDate, endDate: expenseEndDate }));
    }
  }, [dispatch, activeTab, expenseStartDate, expenseEndDate]);

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

  const expenseStats = useMemo(() => {
    let totalSpend = 0;
    let spendersCount = 0;
    let topSpenderAmt = 0;
    let topSpenderName = "N/A";

    filtered.forEach(e => {
      const amt = employeeExpenses?.[e._id] || 0;
      if (amt > 0) {
        totalSpend += amt;
        spendersCount += 1;
        if (amt > topSpenderAmt) {
          topSpenderAmt = amt;
          topSpenderName = `${e.name?.firstName || ""} ${e.name?.lastName || ""}`.trim();
        }
      }
    });

    const timeline = expenseStartDate && expenseEndDate 
      ? `${new Date(expenseStartDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} - ${new Date(expenseEndDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`
      : (expenseStartDate ? `From ${new Date(expenseStartDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}` : (expenseEndDate ? `Until ${new Date(expenseEndDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}` : "All Time"));

    return { 
      totalSpend: `₹${totalSpend.toLocaleString("en-IN")}`, 
      spendersCount, 
      topSpenderName, 
      topSpenderAmt: `₹${topSpenderAmt.toLocaleString("en-IN")}`, 
      timeline 
    };
  }, [filtered, employeeExpenses, expenseStartDate, expenseEndDate]);

  const { exportExcel, isExporting } = useExcelExporter();

  const handleStatusChange = async (employee) => {
    const id = employee._id;
    const isActivating = !employee.isActive;
    const name = `${employee.name?.firstName || ""} ${employee.name?.lastName || ""}`.trim();

    const result = await Swal.fire({
      title: isActivating ? "Activate Employee?" : "Deactivate Employee?",
      text: isActivating 
        ? `${name}'s access will be restored.`
        : `${name}'s access will be suspended.`,
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
      ToastWithTimer({ message: `Employee ${isActivating ? "activated" : "deactivated"} successfully`, type: "success" });
    } catch (err) {
      setLocalOverrides(prev => ({ ...prev, [id]: { ...prev[id], isActive: !isActivating } }));
      ToastWithTimer({ message: err || "Action Failed", type: "error" });
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
      ToastWithTimer({ message: `${name} demoted to employee successfully`, type: "success" });
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
      ToastWithTimer({ message: `${name} promoted to manager successfully`, type: "success" });
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
      ToastWithTimer({ message: `${name} assigned to Finance Team successfully`, type: "success" });
    } catch (err) {
      ToastWithTimer({ message: err || "Failed to assign Finance Team role", type: "error" });
    } finally {
      setStatusLoading(prev => ({ ...prev, [id]: false }));
    }
  };



  const handleRefresh = () => dispatch(getAllEmployeesAdmin());

  return (
    <div className="min-h-screen font-sans pb-20 -mt-6 -mx-4 md:-mx-6" style={{ background: C.offWhite }}>
      {/* Navy Header Section */}
      <div className="w-full bg-linear-to-br from-[#003399] to-[#000d26] text-white pt-8 pb-20 px-6 md:px-10">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
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

             <div className="flex items-center md:items-center gap-4 md:gap-5">
               <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl flex shrink-0 items-center justify-center shadow-xl text-white border border-white/10 bg-white/10" >
                 <FiUsers size={24} className="md:w-7 md:h-7" />
               </div>
               <div>
                 <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-none">Employee Directory</h1>
                 <p className="text-[9px] md:text-[10px] mt-2 md:mt-3 font-bold uppercase tracking-[2px] opacity-60">
                   Manage employees, roles, and access
                 </p>
               </div>
             </div>
          </div>


        </div>
      </div>

      <div className="w-full px-4 md:px-10 -mt-10 space-y-10">
        
        {/* Top-Level Tab Switcher */}
        <div className="flex gap-2 p-1.5 bg-white border border-slate-200/60 shadow-xl rounded-2xl w-fit max-w-full overflow-x-auto">
          <button
            onClick={() => setActiveTab("employees")}
            className={`px-6 md:px-8 py-3.5 rounded-xl text-[10px] md:text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all whitespace-nowrap ${activeTab === "employees" ? "bg-[#000D26] text-white shadow-lg scale-[1.02]" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}
          >
            <FiUsers className="w-3 h-3 md:w-3.5 md:h-3.5" /> Employees
          </button>
          <button
            onClick={() => setActiveTab("expenses")}
            className={`px-6 md:px-8 py-3.5 rounded-xl text-[10px] md:text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all whitespace-nowrap ${activeTab === "expenses" ? "bg-[#000D26] text-white shadow-lg scale-[1.02]" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}
          >
            <MdBadge className="w-3 h-3 md:w-3.5 md:h-3.5" /> Expenses
          </button>
        </div>

        {/* Stats */}
        {activeTab === "employees" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard label="Total Employees" value={stats.total} Icon={FiUsers} borderCls="border-[#000D26]" iconBgCls="bg-slate-100" iconColorCls="text-[#000D26]" />
            <StatCard label="Managers" value={stats.managers} Icon={FiShield} borderCls="border-violet-500" iconBgCls="bg-violet-50" iconColorCls="text-violet-600" />
            <StatCard label="Active" value={stats.active} Icon={FiUserCheck} borderCls="border-emerald-500" iconBgCls="bg-emerald-50" iconColorCls="text-emerald-600" />
            <StatCard label="Deactivated" value={stats.suspended} Icon={FiUserX} borderCls="border-red-500" iconBgCls="bg-red-50" iconColorCls="text-red-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard label="Total Spend" value={expenseStats.totalSpend} Icon={FiDollarSign} borderCls="border-[#000D26]" iconBgCls="bg-slate-100" iconColorCls="text-[#000D26]" />
            <StatCard label="Top Spender" value={expenseStats.topSpenderName} Icon={FiTrendingUp} borderCls="border-amber-500" iconBgCls="bg-amber-50" iconColorCls="text-amber-600" />
            <StatCard label="Total Spenders" value={expenseStats.spendersCount} Icon={FiUsers} borderCls="border-emerald-500" iconBgCls="bg-emerald-50" iconColorCls="text-emerald-600" />
            <StatCard label="Timeline" value={expenseStats.timeline} Icon={FiCalendar} borderCls="border-blue-500" iconBgCls="bg-blue-50" iconColorCls="text-blue-600" />
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl p-6 border shadow-sm" style={{ borderColor: C.border }}>
          <div className="flex flex-wrap items-end gap-4">
            <LabeledField label={<><FiSearch size={10} /> Search</>} className="flex-grow min-w-[200px]">
              <SearchBar value={search} onChange={(val) => { setSearch(val); setCurrentPage(1); }} placeholder="Search name, email, department..." />
            </LabeledField>
            
            <LabeledField label="Role" className="w-full sm:w-auto flex-1 min-w-[140px]">
              <CustomDropdown value={roleFilter} onChange={(val) => { setRoleFilter(val); setCurrentPage(1); }} options={["All", "Manager", "Employee", "Finance Team"]} />
            </LabeledField>
            
            <LabeledField label="Department" className="w-full sm:w-auto flex-1 min-w-[140px]">
              <CustomDropdown value={deptFilter} onChange={(val) => { setDeptFilter(val); setCurrentPage(1); }} options={departments} />
            </LabeledField>
            
            <LabeledField label="Status" className="w-full sm:w-auto flex-1 min-w-[140px]">
              <CustomDropdown value={statusFilter} onChange={(val) => { setStatusFilter(val); setCurrentPage(1); }} options={["All", "Active", "Inactive"]} />
            </LabeledField>

            {activeTab === "expenses" && (
              <>
                <LabeledField label="Start Date" className="w-full sm:w-auto flex-1 min-w-[130px]">
                  <input
                    type="date"
                    value={expenseStartDate}
                    onChange={(e) => setExpenseStartDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-[13px] bg-white outline-none transition-colors"
                    style={{ borderColor: C.border, color: C.nearBlack }}
                  />
                </LabeledField>
                <LabeledField label="End Date" className="w-full sm:w-auto flex-1 min-w-[130px]">
                  <input
                    type="date"
                    value={expenseEndDate}
                    onChange={(e) => setExpenseEndDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-[13px] bg-white outline-none transition-colors"
                    style={{ borderColor: C.border, color: C.nearBlack }}
                  />
                </LabeledField>
              </>
            )}

            <div className="w-full lg:w-auto min-w-[140px] flex-shrink-0">
               <button onClick={() => { setSearch(""); setRoleFilter("All"); setDeptFilter("All"); setStatusFilter("All"); setExpenseStartDate(""); setExpenseEndDate(""); setCurrentPage(1); }} className="w-full py-2.5 px-4 rounded-xl font-black text-[11px] flex items-center justify-center gap-2 border shadow-sm transition-all hover:bg-slate-50 uppercase tracking-widest" style={{ background: C.white, borderColor: C.border, color: C.muted }}><FiX /> Reset Filters</button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <ResponsiveDataTable 
          title="Employee Records" 
          subtitle={`${filtered.length} employees`} 
          wrapperClass="!border-none !shadow-none"
          exportLabel="Export Excel"
          exportLoading={isExporting}
          exportDisabled={isExporting}
          onExport={() => exportExcel({
            pageHeader: "Employee Records",
            statCards: activeTab === "employees" ? [
              { label: "Total Employees", value: stats.total },
              { label: "Managers", value: stats.managers },
              { label: "Active", value: stats.active },
              { label: "Deactivated", value: stats.suspended }
            ] : [
              { label: "Total Spend", value: expenseStats.totalSpend },
              { label: "Top Spender", value: expenseStats.topSpenderName },
              { label: "Total Spenders", value: expenseStats.spendersCount },
              { label: "Timeline", value: expenseStats.timeline }
            ],
            appliedFilters: [
              { label: "Search", value: search || "None" },
              { label: "Role", value: roleFilter },
              { label: "Department", value: deptFilter },
              { label: "Status", value: statusFilter },
              ...(activeTab === "expenses" ? [
                { label: "Expense Timeline", value: expenseStats.timeline }
              ] : [])
            ],
            data: filtered,
            columns: [
              { header: "Name", value: (row) => `${row.name?.firstName || ""} ${row.name?.lastName || ""}`.trim() },
              { header: "Email", key: "email" },
              { header: "Phone", key: "phone" },
              { header: "Department", key: "department" },
              { header: "Role", key: "role" },
              ...(activeTab === "expenses" 
                ? [{ header: "Total Spend Amount", value: (row) => employeeExpenses?.[row._id] || 0 }]
                : [{ header: "Status", value: (row) => row.isActive ? "Active" : "Inactive" }]),
              { header: "Joining Date", value: (row) => new Date(row.createdAt || Date.now()).toLocaleDateString("en-IN") },
            ],
            filenamePrefix: "employee_management"
          })}
          pagination={<Pagination currentPage={currentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />}
        >
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-linear-to-r from-[#003399] to-[#000d26] text-white">
                <Th className="!px-6 !py-5">Employee</Th>
                <Th className="!px-6 !py-5">Contact & Department</Th>
                <Th className="!px-6 !py-5">Role</Th>
                <Th className="!px-6 !py-5">{activeTab === "expenses" ? "Total Spend Amount" : "Status"}</Th>
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

                         {activeTab === "employees" && emp.role?.toLowerCase() === "manager" && (
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

                         {activeTab === "employees" && emp.role?.toLowerCase() === "finance_team" && (
                           <button 
                             onClick={() => handleDemote(emp)}
                             disabled={statusLoading[emp._id]}
                             className="px-2 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg border border-amber-200 bg-amber-50 text-amber-700 shadow-sm transition-all hover:scale-105 hover:bg-amber-100 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                           >
                             <FiArrowDown size={10} /> Demote
                           </button>
                         )}

                         {activeTab === "employees" && (!emp.role || emp.role?.toLowerCase() === "employee") && (
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
                      {activeTab === "expenses" ? (
                        <p className="text-[12px] font-black text-slate-700">
                          {loadingEmployeeExpenses ? (
                            <FiRefreshCw className="animate-spin text-slate-400" />
                          ) : (
                            `₹${(employeeExpenses && employeeExpenses[emp._id]) ? employeeExpenses[emp._id].toLocaleString("en-IN") : 0}`
                          )}
                        </p>
                      ) : (
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
                      )}
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
                      <p className="text-sm font-bold text-slate-400">No employees found matching your search.</p>
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
