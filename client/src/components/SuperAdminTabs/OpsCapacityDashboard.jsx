import React, { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FiRefreshCw, FiUsers } from "react-icons/fi";
import { C } from "../Shared/color";
import { fetchOpsMembers } from "../../Redux/Actions/opsMember.thunks";

const capacityMeta = (current, max) => {
  if (max === 0) return { color: "#DC2626", label: "AT CAPACITY" };
  const pct = (current / max) * 100;
  if (pct >= 90) return { color: "#DC2626", label: "CRITICAL" };
  if (pct >= 70) return { color: "#D97706", label: "HIGH" };
  return { color: "#059669", label: "OK" };
};

const availMeta = (status) => {
  switch (status) {
    case "AVAILABLE": return { color: "#059669", bg: "#ECFDF5", label: "Available" };
    case "BUSY": return { color: "#D97706", bg: "#FFFBEB", label: "Busy" };
    case "BREAK": return { color: "#65758B", bg: "#F3F4F6", label: "On Break" };
    case "OFFLINE": return { color: "#DC2626", bg: "#FEF2F2", label: "Offline" };
    case "ON_LEAVE": return { color: "#65758B", bg: "#F3F4F6", label: "On Leave" };
    default: return { color: "#65758B", bg: "#F3F4F6", label: status };
  }
};

const DonutChart = ({ current, max, label, color }) => {
  const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0;
  const r = 24;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="flex flex-col items-center">
      <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#E5E7EB" strokeWidth="6" />
        <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="6" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <span className="text-xs font-bold mt-1" style={{ color }}>{current}/{max}</span>
      <span className="text-[9px] uppercase tracking-wider" style={{ color: C.muted }}>{label}</span>
    </div>
  );
};

export default function OpsCapacityDashboard() {
  const dispatch = useDispatch();
  const { members, loading } = useSelector((s) => s.opsMember);

  useEffect(() => {
    dispatch(fetchOpsMembers());
  }, [dispatch]);

  const stats = useMemo(() => {
    const active = (members || []).filter((m) => m.status === "Active");
    const total = active.length;
    const available = active.filter((m) => m.availabilityStatus === "AVAILABLE").length;
    const atReissueCap = active.filter((m) => (m.currentActiveReissues ?? 0) >= (m.maxConcurrentReissues ?? 10)).length;
    const atCancellationCap = active.filter((m) => (m.currentActiveCancellations ?? 0) >= (m.maxConcurrentCancellations ?? 10)).length;
    return { total, available, atReissueCap, atCancellationCap };
  }, [members]);

  if (loading && (members || []).length === 0) {
    return <div className="p-6 text-sm" style={{ color: C.muted }}>Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: C.navy }}>Ops Capacity Dashboard</h1>
          <p className="text-xs mt-1" style={{ color: C.muted }}>Real-time workforce allocation and capacity usage</p>
        </div>
        <button
          onClick={() => dispatch(fetchOpsMembers())}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border transition-colors hover:bg-gray-50"
          style={{ borderColor: C.border, color: C.navy }}
        >
          <FiRefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Active Members", value: stats.total, icon: <FiUsers size={18} />, color: C.navy },
          { label: "Available Now", value: stats.available, icon: <FiUsers size={18} />, color: "#059669" },
          { label: "At Reissue Capacity", value: stats.atReissueCap, icon: <FiUsers size={18} />, color: "#DC2626" },
          { label: "At Cancellation Capacity", value: stats.atCancellationCap, icon: <FiUsers size={18} />, color: "#D97706" },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl border p-4" style={{ borderColor: C.border }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: C.muted }}>{card.label}</span>
              <span style={{ color: card.color }}>{card.icon}</span>
            </div>
            <span className="text-2xl font-bold" style={{ color: card.color }}>{card.value}</span>
          </div>
        ))}
      </div>

      {/* Per-member capacity */}
      <div className="bg-white rounded-xl border" style={{ borderColor: C.border }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: C.border }}>
          <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: C.muted }}>Per-Member Capacity</h2>
        </div>
        <div className="divide-y" style={{ borderColor: C.border }}>
          {(members || []).length === 0 ? (
            <div className="p-5 text-sm text-center" style={{ color: C.muted }}>No OPS members found</div>
          ) : (
            (members || []).map((m) => {
              const reissue = capacityMeta(m.currentActiveReissues ?? 0, m.maxConcurrentReissues ?? 10);
              const cancellation = capacityMeta(m.currentActiveCancellations ?? 0, m.maxConcurrentCancellations ?? 10);
              const avail = availMeta(m.availabilityStatus);
              return (
                <div key={m._id} className="px-5 py-4 flex items-center gap-6">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[13px]" style={{ color: C.nearBlack }}>{m.name}</div>
                    <div className="text-[11px]" style={{ color: C.muted }}>{m.email}</div>
                  </div>
                  <DonutChart current={m.currentActiveReissues ?? 0} max={m.maxConcurrentReissues ?? 10} label="Reissues" color={reissue.color} />
                  <DonutChart current={m.currentActiveCancellations ?? 0} max={m.maxConcurrentCancellations ?? 10} label="Cancellations" color={cancellation.color} />
                  <div className="flex flex-col items-center min-w-[80px]">
                    <span className="text-xs font-bold" style={{ color: avail.color }}>{avail.label}</span>
                    <div
                      className="mt-1 px-2 py-0.5 rounded text-[10px] font-semibold"
                      style={{ background: avail.bg, color: avail.color }}
                    >
                      {m.autoAssignmentEnabled ? "AUTO ON" : "AUTO OFF"}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
