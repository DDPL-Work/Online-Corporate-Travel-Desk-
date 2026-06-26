import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  FiX,
  FiGift,
  FiCheckCircle,
  FiInfo,
  FiShield,
  FiList,
  FiAlertCircle,
} from "react-icons/fi";
import { MdCheckCircle } from "react-icons/md";

function CancelPolicyTable({ policies = [] }) {
  if (!policies.length)
    return (
      <div className="p-4 text-center text-xs text-slate-400 italic">
        Policy information unavailable.
      </div>
    );

  return (
    <table className="w-full text-[11px]">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-100">
          <th className="text-left px-4 py-3 font-black text-slate-400 uppercase tracking-tighter">
            From Date
          </th>
          <th className="text-right px-4 py-3 font-black text-slate-400 uppercase tracking-tighter">
            Charge
          </th>
        </tr>
      </thead>
      <tbody>
        {policies.map((p, i) => (
          <tr key={i} className="border-b border-slate-50 last:border-0">
            <td className="px-4 py-3 font-bold text-slate-700">
              {p.FromDate || "—"}
            </td>
            <td className="px-4 py-3 text-right">
              <span
                className={`font-black ${p.CancellationCharge === 0 ? "text-emerald-600" : "text-red-600"}`}
              >
                {p.CancellationCharge === 0
                  ? "FREE"
                  : p.ChargeType === "Fixed" || p.ChargeType === 1
                    ? `₹${Number(p.CancellationCharge).toLocaleString()}`
                    : `${p.CancellationCharge}%`}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RoomDetailsModal({ open, onClose, room, preBookData, loading }) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const roomInfo = preBookData?.HotelResult?.[0]?.Rooms?.[0] || room;
  const rateConditions = preBookData?.HotelResult?.[0]?.RateConditions || [];
  const promotions = roomInfo?.RoomPromotion || [];
  const supplements = roomInfo?.Supplements || [];
  const cancelPolicies = roomInfo?.CancelPolicies || [];
  const inclusions = (roomInfo?.Inclusion || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white sticky top-0 z-10">
          <div>
            <h3 className="text-lg font-black text-[#0A203E]">Room Details</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              {room?.RoomTypeName || room?.Name?.[0] || "Standard Room"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition cursor-pointer border-none"
          >
            <FiX size={18} className="text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <div className="w-10 h-10 border-4 border-[#C9A84C]/20 border-t-[#C9A84C] rounded-full animate-spin" />
              <p className="text-sm font-bold text-slate-500 animate-pulse">
                Fetching live room data...
              </p>
            </div>
          ) : (
            <>
              {/* Promotions */}
              {promotions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[#C9A84C]">
                    <FiGift size={16} />
                    <h4 className="text-xs font-black uppercase tracking-widest">
                      Special Promotions
                    </h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {promotions.map((promo, i) => (
                      <span
                        key={i}
                        className="text-[11px] font-bold text-[#C9A84C] bg-[#C9A84C]/10 border border-[#C9A84C]/20 px-3 py-1.5 rounded-xl"
                      >
                        {promo}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Inclusions */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-600">
                  <FiCheckCircle size={16} />
                  <h4 className="text-xs font-black uppercase tracking-widest">
                    What's Included
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {inclusions.length > 0 ? (
                    inclusions.map((inc, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-[12px] text-slate-600 font-medium"
                      >
                        <MdCheckCircle className="text-emerald-500 shrink-0" />
                        <span>{inc}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      No specific inclusions listed.
                    </p>
                  )}
                </div>
              </div>

              {/* Supplements */}
              {supplements.some((s) => s?.length > 0) && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-blue-600">
                    <FiInfo size={16} />
                    <h4 className="text-xs font-black uppercase tracking-widest">
                      Mandatory Supplements & Taxes
                    </h4>
                  </div>
                  <div className="space-y-3">
                    {supplements.map(
                      (roomSup, roomIdx) =>
                        roomSup?.length > 0 && (
                          <div key={roomIdx} className="space-y-2">
                            {supplements.length > 1 && (
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                Room {roomIdx + 1}
                              </p>
                            )}
                            <div className="grid grid-cols-1 gap-2">
                              {roomSup.map((sup, idx) => (
                                <div
                                  key={idx}
                                  className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100"
                                >
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-800 capitalize">
                                      {sup.Description?.replace(/_/g, " ")}
                                    </span>
                                    <span className="text-[10px] text-slate-500">
                                      {sup.Type?.replace(
                                        /([A-Z])/g,
                                        " $1",
                                      ).trim()}
                                    </span>
                                  </div>
                                  <span className="text-sm font-black text-[#C9A84C]">
                                    {sup.Price === 0
                                      ? "Included"
                                      : `${sup.Currency} ${sup.Price}`}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ),
                    )}
                  </div>
                </div>
              )}

              {/* Cancellation Policy */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-red-500">
                  <FiShield size={16} />
                  <h4 className="text-xs font-black uppercase tracking-widest">
                    Cancellation Policy
                  </h4>
                </div>
                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                  <CancelPolicyTable policies={cancelPolicies} />
                </div>
              </div>

              {/* Rate Conditions / Rules */}
              {rateConditions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[#0A203E]">
                    <FiList size={16} />
                    <h4 className="text-xs font-black uppercase tracking-widest">
                      Important Rules & Conditions
                    </h4>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                    {rateConditions.map((cond, i) => {
                      const cleanCond = cond
                        .replace(/&amp;lt;/g, "<")
                        .replace(/&amp;gt;/g, ">")
                        .replace(/&lt;/g, "<")
                        .replace(/&gt;/g, ">")
                        .replace(/<[^>]+>/g, " ")
                        .trim();
                      if (!cleanCond) return null;
                      return (
                        <div key={i} className="flex items-start gap-2.5">
                          <FiAlertCircle
                            size={14}
                            className="text-[#C9A84C] mt-0.5 shrink-0"
                          />
                          <p className="text-[12px] text-slate-600 leading-relaxed">
                            {cleanCond}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-[#0A203E] text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-[#1E293B] transition active:scale-95 cursor-pointer border-none"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default RoomDetailsModal;
