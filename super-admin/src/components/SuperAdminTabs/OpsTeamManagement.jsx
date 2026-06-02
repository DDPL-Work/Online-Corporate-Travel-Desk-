import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiUserPlus,
  FiShield,
  FiCheckCircle,
  FiXCircle,
  FiArrowLeft,
  FiRefreshCw,
  FiUsers,
  FiBriefcase,
  FiFilter,
} from "react-icons/fi";
import { toast } from "sonner";
import { listOpsMembers, updateOpsStatus, deleteOpsMember } from "../../API/opsAPI";
import OpsMemberModal from "../../Modal/OpsMemberModal";
import { useSelector } from "react-redux";
import { Navigate, useNavigate } from "react-router-dom";
import TableActionBar from "../Shared/TableActionBar";
import {
  normalizeOpsMemberRecord,
  OPS_DEPARTMENT_OPTIONS,
  OPS_DESIGNATION_OPTIONS,
} from "../../constants/opsMember";
import useExcelExporter from "../../services/export/useExcelExporter";
import { opsTeamExportTemplate } from "../../templates/exportTemplates/superAdminExportTemplates";

const colors = {
  light: "#F8FAFC",
  navy: "#003399",
  dark: "#000D26",
  border: "#e2e8f0",
  white: "#ffffff",
};

export default function OpsTeamManagement() {
  const navigate = useNavigate();
  const tableScrollRef = useRef(null);
  const { role } = useSelector((state) => state.auth);
  const isSuperAdmin = role === "super-admin";

  const [members, setMembers] = useState([]);
  const { exportExcel, exportingKey } = useExcelExporter();
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [statusToggleMember, setStatusToggleMember] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [deleteMember, setDeleteMember] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [designationFilter, setDesignationFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const isExporting = exportingKey === "ops_team";

  const fetchMembers = useCallback(async () => {
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
    } catch {
      toast.error("Failed to load OPS members");
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, search, designationFilter, departmentFilter, statusFilter]);

  useEffect(() => {
    if (!isSuperAdmin) return undefined;

    const timer = setTimeout(fetchMembers, 300);
    return () => clearTimeout(timer);
  }, [isSuperAdmin, fetchMembers]);

  const handleToggleStatus = (member) => {
    setStatusToggleMember(member);
  };

  const confirmStatusToggle = async () => {
    if (!statusToggleMember) return;

    const newStatus = statusToggleMember.status === "Active" ? "Inactive" : "Active";
    setStatusUpdating(true);
    try {
      await updateOpsStatus(statusToggleMember._id, newStatus);
      toast.success(`Member is now ${newStatus}`);
      setStatusToggleMember(null);
      fetchMembers();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleDelete = (member) => {
    setDeleteMember(member);
  };

  const confirmDeleteMember = async () => {
    if (!deleteMember) return;

    setDeleteLoading(true);
    try {
      await deleteOpsMember(deleteMember._id);
      toast.success("Member deleted successfully");
      setDeleteMember(null);
      fetchMembers();
    } catch {
      toast.error("Failed to delete member");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleExport = () => {
    if (loading) return;

    const statCards = [
      { label: "Total Members", value: members.length },
      { label: "Departments", value: new Set(members.map((member) => normalizeOpsMemberRecord(member).department).filter(Boolean)).size },
      { label: "Active", value: members.filter((member) => member.status === "Active").length },
      { label: "Inactive", value: members.filter((member) => member.status === "Inactive").length },
    ];

    const appliedFilters = [
      { label: "Search", value: search || "None" },
      { label: "Designation", value: designationFilter || "All Designations" },
      { label: "Department", value: departmentFilter || "All Departments" },
      { label: "Status", value: statusFilter || "All Status" },
    ];

    exportExcel({
      key: "ops_team",
      pageHeader: "OPS Team Management",
      statCards,
      appliedFilters,
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

  const handleRefresh = () => fetchMembers();

  if (!isSuperAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <div className="min-h-screen font-sans pb-20 -mt-6 -mx-4 md:-mx-6" style={{ backgroundColor: colors.light }}>
      <div className="w-full bg-linear-to-br from-[#003399] to-[#000d26] text-white pt-8 pb-20 px-6 md:px-10">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 text-white shadow-sm"
              >
                <FiArrowLeft size={20} />
              </button>
              <button
                onClick={handleRefresh}
                className={`p-3 rounded-xl bg-white/10 transition-all border border-white/10 text-white shadow-sm ${loading ? "opacity-50 cursor-not-allowed" : "hover:bg-white/20"}`}
                disabled={loading}
              >
                <FiRefreshCw size={20} className={loading ? "animate-spin" : ""} />
              </button>
            </div>

            <div className="h-12 w-px bg-white/10 mx-2 hidden md:block" />

            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl text-white border border-white/10 bg-white/10">
                <FiShield size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight leading-none">OPS Team</h1>
                <p className="text-[10px] mt-2 font-bold uppercase tracking-[2px] opacity-60">
                  Access control, servicing roles, and member management
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setSelectedMember(null);
              setShowModal(true);
            }}
            className="flex w-fit items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-xs font-black uppercase tracking-widest text-[#003399] shadow-xl transition-all hover:scale-[1.02] active:scale-95"
          >
            <FiUserPlus size={18} />
            Add New Member
          </button>
        </div>
      </div>

      <div className="w-full px-4 md:px-10 -mt-10 space-y-10 animate-fadeIn">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Total Members" value={members.length} color="border-[#000D26]" icon={<FiUsers />} iconBgCls="bg-slate-100" iconColorCls="text-[#000D26]" />
          <StatTile
            label="Departments"
            value={new Set(members.map((member) => normalizeOpsMemberRecord(member).department).filter(Boolean)).size}
            color="border-indigo-500"
            icon={<FiBriefcase />}
            iconBgCls="bg-indigo-50"
            iconColorCls="text-indigo-600"
          />
          <StatTile
            label="Active"
            value={members.filter((member) => member.status === "Active").length}
            color="border-emerald-500"
            icon={<FiCheckCircle />}
            iconBgCls="bg-emerald-50"
            iconColorCls="text-emerald-600"
          />
          <StatTile
            label="Inactive"
            value={members.filter((member) => member.status === "Inactive").length}
            color="border-rose-500"
            icon={<FiXCircle />}
            iconBgCls="bg-rose-50"
            iconColorCls="text-rose-600"
          />
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm" style={{ borderColor: colors.border }}>
          <div className="mb-4 flex items-center gap-2">
            <FiFilter size={14} className="text-slate-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Directory Filters</span>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-12">
          <FilterItem label="Search" className="lg:col-span-5">
            <div className="relative">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Name, email, department..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-[13px] font-medium outline-none transition-all hover:bg-white focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10"
              />
            </div>
          </FilterItem>

          <FilterItem label="Designation" className="lg:col-span-3">
            <select
              value={designationFilter}
              onChange={(e) => setDesignationFilter(e.target.value)}
              className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-[13px] font-medium outline-none transition-all hover:bg-white focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10"
            >
              <option value="">All Designations</option>
              {OPS_DESIGNATION_OPTIONS.map((designation) => (
                <option key={designation} value={designation}>
                  {designation}
                </option>
              ))}
            </select>
          </FilterItem>

          <FilterItem label="Department" className="lg:col-span-2">
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-[13px] font-medium outline-none transition-all hover:bg-white focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10"
            >
              <option value="">All Departments</option>
              {OPS_DEPARTMENT_OPTIONS.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </FilterItem>

          <FilterItem label="Status" className="lg:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-[13px] font-medium outline-none transition-all hover:bg-white focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10"
            >
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </FilterItem>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
          <div className="px-6 py-4 border-b border-slate-50 flex flex-wrap items-center justify-between gap-4 bg-white">
            <div>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter leading-none">
                OPS Member Records
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-2">
                {members.length} member{members.length === 1 ? "" : "s"} in current view
              </p>
            </div>
            <TableActionBar
              scrollRef={tableScrollRef}
              exportLabel="Export Team"
              onExport={handleExport}
              exportDisabled={loading || isExporting}
              exportLoading={isExporting}
              exportClassName="bg-[#003399] hover:bg-[#002266] shadow-[#003399]/20"
              arrowClassName="border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:border-slate-300 hover:text-slate-900 disabled:hover:bg-slate-50"
            />
          </div>
          <div ref={tableScrollRef} className="overflow-x-auto overflow-y-visible">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-linear-to-r from-[#003399] to-[#000d26] text-white">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">
                    Name
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">
                    Designation
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
                    <td colSpan="6" className="py-20 text-center">
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
                    <td colSpan="6" className="py-20 text-center">
                      <span className="text-xs font-bold uppercase tracking-widest text-slate-300">
                        No members found
                      </span>
                    </td>
                  </tr>
                ) : (
                  members.map((member) => {
                    const normalizedMember = normalizeOpsMemberRecord(member);

                    return (
                      <tr key={member._id} className="transition-colors hover:bg-slate-50/50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <Avatar name={member.name} />
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-black uppercase tracking-tight text-[#003399]">{member.name}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-black uppercase tracking-tight text-[#003399]">
                              {normalizedMember.designation}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
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
                              title="Edit Member"
                              message="Update member profile and access details"
                              onClick={() => {
                                setSelectedMember(member);
                                setShowModal(true);
                              }}
                              className="bg-blue-50 text-[#003399] hover:bg-[#003399] hover:text-white"
                            />
                            <ActionButton
                              icon={
                                member.status === "Active" ? (
                                  <FiXCircle size={14} />
                                ) : (
                                  <FiCheckCircle size={14} />
                                )
                              }
                              title={member.status === "Active" ? "Deactivate Member" : "Activate Member"}
                              message={
                                member.status === "Active"
                                  ? "Move this member to inactive status"
                                  : "Restore this member to active status"
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
                              title="Delete Member"
                              message="Remove this OPS member from the team"
                              onClick={() => handleDelete(member)}
                              className="bg-slate-50 text-slate-400 hover:bg-[#000D26] hover:text-white"
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

      {statusToggleMember && (
        <StatusToggleModal
          member={statusToggleMember}
          loading={statusUpdating}
          onCancel={() => {
            if (!statusUpdating) setStatusToggleMember(null);
          }}
          onConfirm={confirmStatusToggle}
        />
      )}

      {deleteMember && (
        <DeleteMemberModal
          member={deleteMember}
          loading={deleteLoading}
          onCancel={() => {
            if (!deleteLoading) setDeleteMember(null);
          }}
          onConfirm={confirmDeleteMember}
        />
      )}
    </div>
  );
}

const StatTile = ({ label, value, color, icon, iconBgCls, iconColorCls }) => (
  <div className={`rounded-2xl border-b-4 bg-white p-6 shadow-sm flex items-center justify-between ${color}`}>
    <div>
      <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="text-3xl font-black leading-none text-slate-800">{value}</p>
    </div>
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBgCls} ${iconColorCls}`}>
      {icon}
    </div>
  </div>
);

const FilterItem = ({ label, children, className = "" }) => (
  <div className={`flex min-w-37.5 flex-col gap-1.5 ${className}`}>
    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
      {label}
    </label>
    {children}
  </div>
);

const Avatar = ({ name = "" }) => {
  const initials = String(name || "")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="w-9 h-9 rounded-xl bg-linear-to-br from-[#003399] to-[#000d26] flex items-center justify-center font-black text-white text-[10px] shrink-0 shadow-sm border border-white/20">
      {initials || "?"}
    </div>
  );
};

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

const ActionButton = ({ icon, title, message, onClick, className }) => {
  const buttonRef = useRef(null);
  const [tooltipPosition, setTooltipPosition] = useState(null);

  const showTooltip = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    setTooltipPosition({
      top: rect.top - 10,
      left: rect.left + rect.width / 2,
    });
  };

  const hideTooltip = () => setTooltipPosition(null);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={title}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        onClick={(event) => {
          hideTooltip();
          onClick?.(event);
        }}
        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 focus:scale-95 ${className}`}
      >
        {icon}
      </button>

      {tooltipPosition && typeof document !== "undefined"
        ? createPortal(
            <div
              className="pointer-events-none fixed z-99999 w-52 -translate-x-1/2 -translate-y-full rounded-xl bg-[#000D26] px-3.5 py-3 text-left text-white opacity-100 shadow-2xl"
              style={{ top: tooltipPosition.top, left: tooltipPosition.left }}
            >
              <span className="block text-[10px] font-black uppercase tracking-widest">
                {title}
              </span>
              <span className="mt-1 block text-[10px] font-semibold normal-case leading-4 tracking-normal text-white/70">
                {message}
              </span>
              <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 bg-[#000D26]" />
            </div>,
            document.body
          )
        : null}
    </>
  );
};

const StatusToggleModal = ({ member, loading, onCancel, onConfirm }) => {
  const nextStatus = member.status === "Active" ? "Inactive" : "Active";
  const isActivating = nextStatus === "Active";

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="bg-linear-to-br from-[#003399] to-[#000D26] px-6 py-5 text-white">
          <div className="flex items-center gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 ${isActivating ? "bg-emerald-400/20" : "bg-rose-400/20"}`}>
              {isActivating ? <FiCheckCircle size={24} /> : <FiXCircle size={24} />}
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight">Change Member Status</h3>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-white/60">
                Confirm access status update
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Team Member</p>
            <div className="mt-3 flex items-center gap-3">
              <Avatar name={member.name} />
              <div>
                <p className="text-sm font-black uppercase tracking-tight text-slate-900">{member.name}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Current status: {member.status}
                </p>
              </div>
            </div>
          </div>

          <p className="text-sm font-medium leading-6 text-slate-600">
            This will update the member status to{" "}
            <span className={isActivating ? "font-black text-emerald-600" : "font-black text-rose-600"}>
              {nextStatus}
            </span>
            .
          </p>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="rounded-xl border border-slate-200 px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`rounded-xl px-5 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                isActivating ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              {loading ? "Updating..." : `Set ${nextStatus}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const DeleteMemberModal = ({ member, loading, onCancel, onConfirm }) => (
  <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
    <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
      <div className="bg-linear-to-br from-rose-600 to-[#000D26] px-6 py-5 text-white">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10">
            <FiTrash2 size={24} />
          </div>
          <div>
            <h3 className="text-lg font-black uppercase tracking-tight">Delete OPS Member</h3>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-white/60">
              Confirm permanent member removal
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5 px-6 py-6">
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-rose-400">Team Member</p>
          <div className="mt-3 flex items-center gap-3">
            <Avatar name={member.name} />
            <div>
              <p className="text-sm font-black uppercase tracking-tight text-slate-900">{member.name}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-rose-400">
                {member.email || "No email available"}
              </p>
            </div>
          </div>
        </div>

        <p className="text-sm font-medium leading-6 text-slate-600">
          This will delete the OPS member from the team. This action cannot be undone.
        </p>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl border border-slate-200 px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="rounded-xl bg-rose-600 px-5 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-rose-600/20 transition-all hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Deleting..." : "Delete Member"}
          </button>
        </div>
      </div>
    </div>
  </div>
);
