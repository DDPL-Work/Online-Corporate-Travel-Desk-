import React, { useEffect, useRef, useState } from "react";
import {
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiUserPlus,
  FiShield,
  FiCheckCircle,
  FiXCircle,
} from "react-icons/fi";
import { toast } from "sonner";
import { listOpsMembers, updateOpsStatus, deleteOpsMember } from "../../API/opsAPI";
import OpsMemberModal from "../../Modal/OpsMemberModal";
import { ToastConfirm } from "../../utils/ToastConfirm";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import TableActionBar from "../Shared/TableActionBar";
import {
  normalizeOpsMemberRecord,
  OPS_DEPARTMENT_OPTIONS,
  OPS_DESIGNATION_OPTIONS,
} from "../../constants/opsMember";
import useCsvExporter from "../../services/export/useCsvExporter";
import { opsTeamExportTemplate } from "../../templates/exportTemplates/superAdminExportTemplates";

const colors = {
  light: "#F8FAFC",
};

export default function OpsTeamManagement() {
  const tableScrollRef = useRef(null);
  const { role } = useSelector((state) => state.auth);
  const isSuperAdmin = role === "super-admin";

  const [members, setMembers] = useState([]);
  const { exportCsv, exportingKey } = useCsvExporter();
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [search, setSearch] = useState("");
  const [designationFilter, setDesignationFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const isExporting = exportingKey === "ops_team";

  const fetchMembers = async () => {
    if (!isSuperAdmin) return;

    setLoading(true);
    try {
      const res = await listOpsMembers({
        search,
        designation: designationFilter,
        department: departmentFilter,
        status: statusFilter,
      });
      setMembers(res.data || []);
    } catch (err) {
      toast.error("Failed to load OPS members");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isSuperAdmin) return undefined;

    const timer = setTimeout(fetchMembers, 300);
    return () => clearTimeout(timer);
  }, [isSuperAdmin, search, designationFilter, departmentFilter, statusFilter]);

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
      },
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
      },
    });
  };

  const handleExport = () => {
    if (loading) return;

    exportCsv({
      key: "ops_team",
      data: members.map((member) => {
        const normalizedMember = normalizeOpsMemberRecord(member);
        return {
          ...member,
          exportDesignation: normalizedMember.designation,
          exportDepartment: normalizedMember.department,
          exportServicingScope: normalizedMember.servicingScope,
        };
      }),
      columns: opsTeamExportTemplate,
      filenamePrefix: "ops_team_export",
      emptyMessage: "No OPS members available to export",
      successMessage: "OPS team exported",
    });
  };

  if (!isSuperAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <div className="min-h-screen p-6 font-sans" style={{ backgroundColor: colors.light }}>
      <div className="mx-auto max-w-7xl space-y-6 animate-fadeIn">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0A4D68] to-[#088395] text-white shadow-lg">
              <FiShield size={28} />
            </div>
            <div className="text-left">
              <h1 className="text-3xl font-black leading-none tracking-tight text-slate-900">
                OPS TEAM
              </h1>
              <p className="mt-1 flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                Access Control and Member Management
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedMember(null);
              setShowModal(true);
            }}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#0A4D68] px-6 py-3 text-xs font-bold uppercase tracking-widest text-white shadow-xl transition-all hover:scale-[1.02] hover:shadow-teal-500/20"
          >
            <FiUserPlus size={18} />
            Add New Member
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile label="Total Members" value={members.length} color="border-[#0A4D68]" />
          <StatTile
            label="Active"
            value={members.filter((member) => member.status === "Active").length}
            color="border-emerald-500"
          />
          <StatTile
            label="Inactive"
            value={members.filter((member) => member.status === "Inactive").length}
            color="border-rose-500"
          />
        </div>

        <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <FilterItem label="Search">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                type="text"
                placeholder="Name, email, department..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border-none bg-slate-50 py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#0A4D68]/10 md:w-64"
              />
            </div>
          </FilterItem>

          <FilterItem label="Designation">
            <select
              value={designationFilter}
              onChange={(e) => setDesignationFilter(e.target.value)}
              className="cursor-pointer rounded-xl border-none bg-slate-50 px-4 py-2 text-sm focus:ring-2 focus:ring-[#0A4D68]/10"
            >
              <option value="">All Designations</option>
              {OPS_DESIGNATION_OPTIONS.map((designation) => (
                <option key={designation} value={designation}>
                  {designation}
                </option>
              ))}
            </select>
          </FilterItem>

          <FilterItem label="Department">
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="cursor-pointer rounded-xl border-none bg-slate-50 px-4 py-2 text-sm focus:ring-2 focus:ring-[#0A4D68]/10"
            >
              <option value="">All Departments</option>
              {OPS_DEPARTMENT_OPTIONS.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </FilterItem>

          <FilterItem label="Status">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="cursor-pointer rounded-xl border-none bg-slate-50 px-4 py-2 text-sm focus:ring-2 focus:ring-[#0A4D68]/10"
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
          onExport={handleExport}
          exportDisabled={loading || isExporting}
          exportLoading={isExporting}
          exportClassName="bg-[#7C2D12] shadow-[#7C2D12]/20 hover:bg-[#9A3412]"
          arrowClassName="border-orange-100 bg-orange-50 text-[#9A3412] hover:border-orange-200 hover:bg-orange-100 hover:text-[#7C2D12] disabled:hover:bg-orange-50"
        />

        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl">
          <div ref={tableScrollRef} className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#0A4D68] text-white">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">
                    Name and Designation
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">
                    Contact
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">
                    Status
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">
                    Joined Date
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="py-20 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0A4D68]/20 border-t-[#0A4D68]"></div>
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                          Loading members...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : members.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-20 text-center">
                      <span className="text-xs font-bold uppercase tracking-widest text-slate-300">
                        No members found
                      </span>
                    </td>
                  </tr>
                ) : (
                  members.map((member) => {
                    const normalizedMember = normalizeOpsMemberRecord(member);

                    return (
                      <tr key={member._id} className="group transition-colors hover:bg-slate-50/50">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-800">{member.name}</span>
                            <span className="text-[10px] font-bold uppercase tracking-tighter text-slate-400">
                              {normalizedMember.designation}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {normalizedMember.department} | {normalizedMember.servicingScope}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-slate-600">{member.email}</span>
                            <span className="font-mono text-[10px] text-slate-400">{member.phone}</span>
                          </div>
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
                              onClick={() => {
                                setSelectedMember(member);
                                setShowModal(true);
                              }}
                              className="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white"
                            />
                            <ActionButton
                              icon={
                                member.status === "Active" ? (
                                  <FiXCircle size={14} />
                                ) : (
                                  <FiCheckCircle size={14} />
                                )
                              }
                              onClick={() => handleToggleStatus(member)}
                              className={
                                member.status === "Active"
                                  ? "bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white"
                                  : "bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white"
                              }
                            />
                            <ActionButton
                              icon={<FiTrash2 size={14} />}
                              onClick={() => handleDelete(member)}
                              className="bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
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
  <div className={`rounded-2xl border-b-4 bg-white p-5 shadow-sm ${color}`}>
    <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
      {label}
    </p>
    <p className="text-2xl font-black leading-none text-slate-900">{value}</p>
  </div>
);

const FilterItem = ({ label, children }) => (
  <div className="flex min-w-[150px] flex-1 flex-col gap-1.5">
    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
      {label}
    </label>
    {children}
  </div>
);

const MemberStatusBadge = ({ status }) => {
  const isActive = status === "Active";
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-tight ${
        isActive
          ? "border-emerald-100 bg-emerald-50 text-emerald-700"
          : "border-rose-100 bg-rose-50 text-rose-700"
      }`}
    >
      {status}
    </span>
  );
};

const ActionButton = ({ icon, onClick, className }) => (
  <button
    onClick={onClick}
    className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 focus:scale-95 ${className}`}
  >
    {icon}
  </button>
);
