// super-admin/src/components/SuperAdminTabs/OpsTeamManagement.jsx

import React, { useEffect, useRef, useState } from "react";
import {
  FiSearch, FiPlus, FiFilter, FiEdit2, FiTrash2,
  FiMoreVertical, FiUserPlus, FiShield, FiCheckCircle, FiXCircle, FiLock
} from "react-icons/fi";
import { toast } from "react-toastify";
import { listOpsMembers, updateOpsStatus, deleteOpsMember } from "../../API/opsAPI";
import OpsMemberModal from "../../Modal/OpsMemberModal";
import { ToastConfirm } from "../../utils/ToastConfirm";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import TableActionBar from "../Shared/TableActionBar";

const colors = {
  primary: "#0A4D68",
  secondary: "#088395",
  accent: "#05BFDB",
  light: "#F8FAFC",
  dark: "#1E293B",
};

export default function OpsTeamManagement() {
  const tableScrollRef = useRef(null);
  const { role } = useSelector((state) => state.auth);
  
  if (role !== "super-admin") {
    return <Navigate to="/unauthorized" replace />;
  }

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  // Filter states
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await listOpsMembers({ 
        search, 
        role: roleFilter, 
        department: deptFilter, 
        status: statusFilter 
      });
      setMembers(res.data || []);
    } catch (err) {
      toast.error("Failed to load OPS members");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchMembers, 300);
    return () => clearTimeout(timer);
  }, [search, roleFilter, deptFilter, statusFilter]);

  const handleToggleStatus = (member) => {
    const newStatus = member.status === "Active" ? "Inactive" : "Active";
    ToastConfirm({
      message: `Change status of ${member.name} to ${newStatus}?`,
      onConfirm: async () => {
        try {
          await updateOpsStatus(member._id, newStatus);
          toast.success(`Member is now ${newStatus}`);
          fetchMembers();
        } catch (err) {
          toast.error("Failed to update status");
        }
      }
    });
  };

  const handleDelete = (member) => {
    ToastConfirm({
      message: `Are you sure you want to delete ${member.name}?`,
      onConfirm: async () => {
        try {
          await deleteOpsMember(member._id);
          toast.success("Member deleted successfully");
          fetchMembers();
        } catch (err) {
          toast.error("Failed to delete member");
        }
      }
    });
  };

  return (
    <div className="min-h-screen p-6 font-sans" style={{ backgroundColor: colors.light }}>
      <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn">
        
        {/* PAGE HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0A4D68] to-[#088395] flex items-center justify-center shadow-lg text-white">
              <FiShield size={28} />
            </div>
            <div className="text-left">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">
                OPS TEAM
              </h1>
              <p className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-widest flex items-center gap-1">
                Access Control & Member Management
              </p>
            </div>
          </div>
          <button
            onClick={() => { setSelectedMember(null); setShowModal(true); }}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-[#0A4D68] text-white rounded-xl font-bold uppercase text-xs tracking-widest shadow-xl hover:shadow-teal-500/20 hover:scale-[1.02] transition-all"
          >
            <FiUserPlus size={18} />
            Add New Member
          </button>
        </div>

        {/* STATS PREVIEW */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatTile label="Total Members" value={members.length} color="border-[#0A4D68]" />
          <StatTile label="Active" value={members.filter(m => m.status === 'Active').length} color="border-emerald-500" />
          <StatTile label="Inactive" value={members.filter(m => m.status === 'Inactive').length} color="border-rose-500" />
        </div>

        {/* FILTERS */}
        <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-100 flex flex-wrap items-end gap-4">
          <FilterItem label="Search">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                type="text"
                placeholder="Name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm w-full md:w-64 focus:ring-2 focus:ring-[#0A4D68]/10"
              />
            </div>
          </FilterItem>

          <FilterItem label="Role">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-[#0A4D68]/10 cursor-pointer"
            >
              <option value="">All Roles</option>
              <option value="Booking Manager">Booking Manager</option>
              <option value="Support Agent">Support Agent</option>
              <option value="Finance OPS">Finance OPS</option>
            </select>
          </FilterItem>

          <FilterItem label="Department">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-[#0A4D68]/10 cursor-pointer"
            >
              <option value="">All Departments</option>
              <option value="Flights">Flights</option>
              <option value="Hotels">Hotels</option>
              <option value="Both">Both</option>
            </select>
          </FilterItem>

          <FilterItem label="Status">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-[#0A4D68]/10 cursor-pointer"
            >
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </FilterItem>
        </div>

        <TableActionBar
          scrollRef={tableScrollRef}
          exportLabel="Export Team"
          onExport={() => {}}
          exportClassName="bg-[#7C2D12] hover:bg-[#9A3412] shadow-[#7C2D12]/20"
          arrowClassName="border-orange-100 bg-orange-50 text-[#9A3412] hover:bg-orange-100 hover:border-orange-200 hover:text-[#7C2D12] disabled:hover:bg-orange-50"
        />

        {/* TABLE */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          <div ref={tableScrollRef} className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#0A4D68] text-white">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Name & Role</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Contact</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Department</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Joined Date</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-20 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 border-4 border-[#0A4D68]/20 border-t-[#0A4D68] rounded-full animate-spin"></div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading members...</span>
                      </div>
                    </td>
                  </tr>
                ) : members.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-20 text-center">
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">No members found</span>
                    </td>
                  </tr>
                ) : (
                  members.map((member) => (
                    <tr key={member._id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 text-sm">{member.name}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{member.role}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-600 font-medium">{member.email}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{member.phone}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded-md bg-teal-50 text-teal-700 text-[10px] font-bold uppercase tracking-wide">
                          {member.department}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <MemberStatusBadge status={member.status} />
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {new Date(member.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <ActionButton 
                            icon={<FiEdit2 size={14} />} 
                            onClick={() => { setSelectedMember(member); setShowModal(true); }}
                            className="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white"
                          />
                          <ActionButton 
                            icon={member.status === 'Active' ? <FiXCircle size={14} /> : <FiCheckCircle size={14} />} 
                            onClick={() => handleToggleStatus(member)}
                            className={member.status === 'Active' ? "bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white"}
                          />
                          <ActionButton 
                            icon={<FiTrash2 size={14} />} 
                            onClick={() => handleDelete(member)}
                            className="bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white"
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <OpsMemberModal 
          member={selectedMember} 
          onClose={() => setShowModal(false)} 
          onSuccess={fetchMembers}
        />
      )}
    </div>
  );
}

const StatTile = ({ label, value, color }) => (
  <div className={`bg-white p-5 rounded-2xl shadow-sm border-b-4 ${color}`}>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
    <p className="text-2xl font-black text-slate-900 leading-none">{value}</p>
  </div>
);

const FilterItem = ({ label, children }) => (
  <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
    {children}
  </div>
);

const MemberStatusBadge = ({ status }) => {
  const isActive = status === 'Active';
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight border ${
      isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'
    }`}>
      {status}
    </span>
  );
};

const ActionButton = ({ icon, onClick, className }) => (
  <button
    onClick={onClick}
    className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 focus:scale-95 ${className}`}
  >
    {icon}
  </button>
);