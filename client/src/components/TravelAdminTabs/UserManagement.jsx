import React, { useEffect, useState } from "react";
import { FiSearch, FiEdit2, FiTrash2, FiUser, FiMail, FiBriefcase, FiUsers, FiRefreshCw, FiPlus, FiArrowRight } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchEmployees,
  deleteEmployee,
} from "../../Redux/Slice/employeeActionSlice";
import EditUserModal from "../../Modal/EditUserModal";
import { C } from "../Shared/color";
import { LabeledField, CustomDropdown, SearchBar } from "./Shared/CommonComponents";
import ResponsiveDataTable from "./Shared/ResponsiveDataTable";
import Swal from "sweetalert2";

export default function UserManagement() {
  const dispatch = useDispatch();
  const [openEdit, setOpenEdit] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");

  const { employees, loading } = useSelector((state) => state.employeeAction);

  useEffect(() => { dispatch(fetchEmployees()); }, [dispatch]);

  const handleDelete = (id) => {
    Swal.fire({
      title: "Terminate Personnel?",
      text: "This protocol will permanently remove the record.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: C.navy,
      cancelButtonColor: "#64748B",
      confirmButtonText: "Terminate",
      background: C.white,
      color: C.navy,
    }).then((result) => {
      if (result.isConfirmed) dispatch(deleteEmployee(id));
    });
  };

  const departments = ["All", ...new Set(employees.map(e => e.department).filter(Boolean))];

  const filtered = employees.filter(e => {
    const name = typeof e.name === "string" ? e.name : `${e.name?.firstName || ""} ${e.name?.lastName || ""}`;
    return (name.toLowerCase().includes(search.toLowerCase()) || e.email?.toLowerCase().includes(search.toLowerCase())) &&
           (departmentFilter === "All" || e.department === departmentFilter);
  });

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
              <h1 className="text-3xl font-black tracking-tight" style={{ color: C.navy }}>Access Control</h1>
              <p className="text-xs mt-1 font-bold uppercase tracking-widest" style={{ color: C.muted }}>Strategic Management of Corporate Personnel Permissions</p>
            </div>
          </div>
          <button onClick={() => dispatch(fetchEmployees())} className="px-6 py-3 rounded-xl font-bold text-xs flex items-center gap-2 border transition-all shadow-sm" style={{ background: C.white, borderColor: C.border, color: C.navy }}>
            <FiRefreshCw className={loading ? "animate-spin" : ""} /> Sync Records
          </button>
        </div>

        {/* Filters Area */}
        <div className="bg-white rounded-2xl p-6 border shadow-sm" style={{ borderColor: C.border }}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <LabeledField label={<><FiSearch size={10} /> Personnel Search</>}>
                <SearchBar value={search} onChange={setSearch} placeholder="Search by name, email or department..." />
              </LabeledField>
            </div>
            <LabeledField label="Personnel Unit">
              <CustomDropdown value={departmentFilter} onChange={setDepartmentFilter} options={departments} />
            </LabeledField>
          </div>
        </div>

        {/* Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.length === 0 ? (
             <div className="col-span-full py-24 text-center bg-white rounded-3xl border border-dashed" style={{ borderColor: C.border }}>
                <FiUsers size={48} className="mx-auto mb-4 opacity-10" style={{ color: C.navy }} />
                <p className="font-black uppercase tracking-[0.2em] text-slate-300">No Personnel Found</p>
             </div>
          ) : (
            filtered.map((e) => {
              const fullName = typeof e.name === "string" ? e.name : `${e.name?.firstName || ""} ${e.name?.lastName || ""}`;
              const initials = typeof e.name === "string" ? e.name.charAt(0) : `${e.name?.firstName?.charAt(0) || ""}${e.name?.lastName?.charAt(0) || ""}`;
              return (
                <div key={e._id} className="bg-white rounded-3xl border shadow-sm hover:shadow-md transition-all p-8 group relative overflow-hidden" style={{ borderColor: C.border }}>
                   <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-full -mr-8 -mt-8 transition-all group-hover:bg-gold/5" />
                   <div className="flex items-start justify-between mb-8 relative z-10">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner transition-transform group-hover:scale-110" style={{ background: `${C.navy}08`, color: C.navy, border: `1px solid ${C.navy}10` }}>{initials || "P"}</div>
                      <div className="flex gap-1">
                        <button onClick={() => { setSelectedUser(e); setOpenEdit(true); }} className="p-3 rounded-xl transition-all hover:bg-slate-50 text-slate-400 hover:text-navy"><FiEdit2 size={18} /></button>
                        <button onClick={() => handleDelete(e._id)} className="p-3 rounded-xl transition-all hover:bg-rose-50 text-slate-400 hover:text-rose-500"><FiTrash2 size={18} /></button>
                      </div>
                   </div>
                   <div className="space-y-6 relative z-10">
                      <div>
                        <h3 className="text-xl font-black truncate tracking-tight" style={{ color: C.navy }}>{fullName}</h3>
                        <div className="flex items-center gap-2 mt-1.5 font-bold text-[11px] text-slate-400 uppercase tracking-tighter"><FiMail size={12} className="text-gold" /> {e.email}</div>
                      </div>
                      <div className="pt-6 border-t flex items-center justify-between" style={{ borderColor: C.offWhite }}>
                         <div className="flex items-center gap-2">
                            <FiBriefcase size={12} className="text-gold" />
                            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">{e.department || "Corporate"}</span>
                         </div>
                         <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest" style={{ background: `${C.navy}08`, color: C.navy }}>{e.role || "PERSONNEL"}</span>
                      </div>
                   </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      {openEdit && selectedUser && <EditUserModal user={selectedUser} onClose={() => setOpenEdit(false)} />}
    </div>
  );
}
