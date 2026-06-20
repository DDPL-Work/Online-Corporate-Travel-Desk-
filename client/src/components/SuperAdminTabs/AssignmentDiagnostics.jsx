import React, { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FiRefreshCw, FiCheckCircle, FiXCircle } from "react-icons/fi";
import { C } from "../Shared/color";
import { fetchOpsDiagnostics } from "../../Redux/Actions/opsMember.thunks";
import ResponsiveDataTable from "../TravelAdminTabs/Shared/ResponsiveDataTable";

const ReasonTag = ({ reason }) => {
  const colorMap = {
    "Permission Missing": { bg: "#FEF2F2", text: "#DC2626" },
    "Auto Assignment Disabled": { bg: "#FFFBEB", text: "#D97706" },
    "Capacity Full": { bg: "#FEF2F2", text: "#DC2626" },
    "On Leave": { bg: "#F3F4F6", text: "#65758B" },
    "Availability:": { bg: "#F3F4F6", text: "#65758B" },
  };

  const prefix = reason.startsWith("Availability:") ? "Availability:" : reason.startsWith("Capacity Full") ? "Capacity Full" : reason;
  const style = colorMap[prefix] || { bg: "#F3F4F6", text: "#65758B" };

  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold mr-1 mb-1"
      style={{ background: style.bg, color: style.text }}
    >
      {reason}
    </span>
  );
};

const EligibleBadge = ({ eligible }) => (
  <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: eligible ? "#059669" : "#DC2626" }}>
    {eligible ? <FiCheckCircle size={12} /> : <FiXCircle size={12} />}
    {eligible ? "ELIGIBLE" : "NOT ELIGIBLE"}
  </span>
);

export default function AssignmentDiagnostics() {
  const dispatch = useDispatch();
  const { diagnostics, loading } = useSelector((s) => s.opsMember);

  useEffect(() => {
    dispatch(fetchOpsDiagnostics());
  }, [dispatch]);

  const summary = useMemo(() => {
    if (!diagnostics || diagnostics.length === 0) return { reissueEligible: 0, cancellationEligible: 0, total: 0 };
    return {
      total: diagnostics.length,
      reissueEligible: diagnostics.filter((d) => d.reissue.eligible).length,
      cancellationEligible: diagnostics.filter((d) => d.cancellation.eligible).length,
    };
  }, [diagnostics]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: C.navy }}>Assignment Diagnostics</h1>
          <p className="text-xs mt-1" style={{ color: C.muted }}>
            {loading ? "Loading..." : `${summary.reissueEligible} reissue-eligible · ${summary.cancellationEligible} cancellation-eligible · ${summary.total} members`}
          </p>
        </div>
        <button
          onClick={() => dispatch(fetchOpsDiagnostics())}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border transition-colors hover:bg-gray-50"
          style={{ borderColor: C.border, color: C.navy }}
        >
          <FiRefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="space-y-6">
        {(!diagnostics || diagnostics.length === 0) && !loading ? (
          <div className="text-center py-12 text-sm" style={{ color: C.muted }}>No diagnostics data available</div>
        ) : (
          diagnostics.map((d) => (
            <div key={d.memberId} className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: C.border }}>
              {/* Header */}
              <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: C.border, background: C.offWhite }}>
                <div>
                  <span className="font-semibold text-[13px]" style={{ color: C.nearBlack }}>{d.name}</span>
                  <span className="ml-3 text-[11px]" style={{ color: C.muted }}>{d.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: C.muted }}>
                    {d.availabilityStatus}
                  </span>
                  <span className={`text-[10px] font-bold uppercase ${d.autoAssignmentEnabled ? "text-green-600" : "text-red-500"}`}>
                    AUTO: {d.autoAssignmentEnabled ? "ON" : "OFF"}
                  </span>
                </div>
              </div>

              {/* Reissue Row */}
              <div className="px-5 py-3 border-b flex items-center gap-6" style={{ borderColor: C.border }}>
                <div className="w-24 text-[11px] font-bold uppercase tracking-wider" style={{ color: C.muted }}>Reissues</div>
                <div className="flex items-center gap-3 min-w-[140px]">
                  <EligibleBadge eligible={d.reissue.eligible} />
                  <span className="text-xs font-medium" style={{ color: C.muted }}>
                    {d.reissue.current}/{d.reissue.max}
                    {d.reissue.storedCounter !== d.reissue.current && (
                      <span className="ml-1 text-[10px] text-amber-600">(stored: {d.reissue.storedCounter})</span>
                    )}
                  </span>
                </div>
                <div className="flex flex-wrap">
                  {!d.reissue.eligible && d.reissue.reasons.map((r, i) => (
                    <ReasonTag key={i} reason={r} />
                  ))}
                </div>
              </div>

              {/* Cancellation Row */}
              <div className="px-5 py-3 flex items-center gap-6" style={{ borderColor: C.border }}>
                <div className="w-24 text-[11px] font-bold uppercase tracking-wider" style={{ color: C.muted }}>Cancellations</div>
                <div className="flex items-center gap-3 min-w-[140px]">
                  <EligibleBadge eligible={d.cancellation.eligible} />
                  <span className="text-xs font-medium" style={{ color: C.muted }}>
                    {d.cancellation.current}/{d.cancellation.max}
                    {d.cancellation.storedCounter !== d.cancellation.current && (
                      <span className="ml-1 text-[10px] text-amber-600">(stored: {d.cancellation.storedCounter})</span>
                    )}
                  </span>
                </div>
                <div className="flex flex-wrap">
                  {!d.cancellation.eligible && d.cancellation.reasons.map((r, i) => (
                    <ReasonTag key={i} reason={r} />
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
