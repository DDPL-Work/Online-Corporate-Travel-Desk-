import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { FiPlus, FiEdit2, FiTrash2, FiRefreshCw, FiSearch } from "react-icons/fi";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import { C } from "../Shared/color";
import { fetchOpsMembers, deleteOpsMember, toggleOpsMemberStatus } from "../../Redux/Actions/opsMember.thunks";
import ResponsiveDataTable from "../TravelAdminTabs/Shared/ResponsiveDataTable";
import { SearchBar, StatusBadge, selectCls } from "../TravelAdminTabs/Shared/CommonComponents";
import { Pagination } from "../TravelAdminTabs/Shared/Pagination";

const PAGE_SIZE = 20;

const capacityColor = (current, max) => {
  if (max === 0) return "#DC2626";
  const pct = (current / max) * 100;
  if (pct >= 90) return "#DC2626";
  if (pct >= 70) return "#D97706";
  return "#059669";
};

const availabilityColor = (status) => {
  switch (status) {
    case "AVAILABLE": return "#059669";
    case "BUSY": return "#D97706";
    case "BREAK": return "#65758B";
    case "OFFLINE": return "#DC2626";
    case "ON_LEAVE": return "#65758B";
    default: return "#65758B";
  }
};

const CapacityBar = ({ current, max }) => {
  const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0;
  const color = capacityColor(current, max);
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 rounded-full bg-gray-200 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-medium" style={{ color: C.muted }}>
        {current}/{max}
      </span>
    </div>
  );
};

export default function OpsMemberList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { members, loading } = useSelector((s) => s.opsMember);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  useEffect(() => {
    dispatch(fetchOpsMembers());
  }, [dispatch]);

  const filtered = useMemo(() => {
    if (!search) return members || [];
    const q = search.toLowerCase();
    return (members || []).filter(
      (m) =>
        m.name?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.department?.toLowerCase().includes(q) ||
        m.designation?.toLowerCase().includes(q),
    );
  }, [members, search]);

  const totalPages = Math.max(1, Math.ceil((filtered.length || 0) / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const handleDelete = useCallback(
    async (member) => {
      const result = await Swal.fire({
        title: "Delete OPS Member?",
        text: `${member.name} will be deactivated and hidden.`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#DC2626",
        confirmButtonText: "Delete",
      });
      if (!result.isConfirmed) return;
      try {
        await dispatch(deleteOpsMember(member._id)).unwrap();
        toast.success("OPS member deleted");
      } catch (e) {
        toast.error(e || "Failed to delete");
      }
    },
    [dispatch],
  );

  const handleToggleStatus = useCallback(
    async (member) => {
      const newStatus = member.status === "Active" ? "Inactive" : "Active";
      const result = await Swal.fire({
        title: `${newStatus === "Active" ? "Activate" : "Deactivate"} OPS Member?`,
        text: `${member.name} will be ${newStatus === "Active" ? "activated" : "deactivated"}.`,
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: C.gold,
        confirmButtonText: newStatus === "Active" ? "Activate" : "Deactivate",
      });
      if (!result.isConfirmed) return;
      try {
        await dispatch(toggleOpsMemberStatus({ id: member._id, status: newStatus })).unwrap();
        toast.success(`OPS member ${newStatus === "Active" ? "activated" : "deactivated"}`);
      } catch (e) {
        toast.error(e || "Failed to update status");
      }
    },
    [dispatch],
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: C.navy }}>OPS Members</h1>
          <p className="text-xs mt-1" style={{ color: C.muted }}>Manage workforce, capacity, and permissions</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => dispatch(fetchOpsMembers())}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border transition-colors hover:bg-gray-50"
            style={{ borderColor: C.border, color: C.navy }}
          >
            <FiRefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={() => navigate("/ops-members/create")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-colors"
            style={{ background: C.navy }}
          >
            <FiPlus size={14} /> Add OPS Member
          </button>
        </div>
      </div>

      <div className="mb-4 max-w-xs">
        <FiSearch className="absolute ml-3 mt-2.5" size={14} style={{ color: C.muted }} />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search members..."
          className="w-full pl-9 pr-3 py-2 border rounded-lg text-[13px] outline-none"
          style={{ borderColor: C.border, color: C.nearBlack }}
        />
      </div>

      <ResponsiveDataTable>
        <table className="w-full">
          <thead>
            <tr className="text-[10px] font-bold uppercase tracking-widest" style={{ color: C.muted }}>
              <th className="text-left py-3 px-4">Name / Email</th>
              <th className="text-left py-3 px-4">Department</th>
              <th className="text-left py-3 px-4">Status</th>
              <th className="text-left py-3 px-4">Availability</th>
              <th className="text-left py-3 px-4">Reissues</th>
              <th className="text-left py-3 px-4">Cancellations</th>
              <th className="text-left py-3 px-4">Auto Assign</th>
              <th className="text-right py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && paginated.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-sm" style={{ color: C.muted }}>Loading...</td></tr>
            ) : paginated.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-sm" style={{ color: C.muted }}>No OPS members found</td></tr>
            ) : (
              paginated.map((m) => (
                <tr key={m._id} className="border-t transition-colors hover:bg-gray-50/50" style={{ borderColor: C.border }}>
                  <td className="py-3 px-4">
                    <div className="font-medium text-[13px]" style={{ color: C.nearBlack }}>{m.name}</div>
                    <div className="text-[11px]" style={{ color: C.muted }}>{m.email}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-[13px]" style={{ color: C.nearBlack }}>{m.department}</div>
                    <div className="text-[11px]" style={{ color: C.muted }}>{m.designation}</div>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={m.status === "Active" ? "Active" : "Inactive"} />
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-medium"
                      style={{ color: availabilityColor(m.availabilityStatus) }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ background: availabilityColor(m.availabilityStatus) }} />
                      {m.availabilityStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <CapacityBar current={m.currentActiveReissues ?? 0} max={m.maxConcurrentReissues ?? 10} />
                  </td>
                  <td className="py-3 px-4">
                    <CapacityBar current={m.currentActiveCancellations ?? 0} max={m.maxConcurrentCancellations ?? 10} />
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className="text-xs font-medium"
                      style={{ color: m.autoAssignmentEnabled ? "#059669" : "#DC2626" }}
                    >
                      {m.autoAssignmentEnabled ? "ON" : "OFF"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => navigate(`/ops-members/edit/${m._id}`)}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        title="Edit"
                      >
                        <FiEdit2 size={14} style={{ color: C.muted }} />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(m)}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        title={m.status === "Active" ? "Deactivate" : "Activate"}
                      >
                        <FiRefreshCw size={14} style={{ color: C.muted }} />
                      </button>
                      <button
                        onClick={() => handleDelete(m)}
                        className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <FiTrash2 size={14} style={{ color: "#DC2626" }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ResponsiveDataTable>

      {totalPages > 1 && (
        <div className="mt-4 flex justify-center">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
