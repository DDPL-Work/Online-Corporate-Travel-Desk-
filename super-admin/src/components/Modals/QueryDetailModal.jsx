import React, { useState, useEffect } from "react";
import { FiX } from "react-icons/fi";

const QUERY_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "REJECTED"];

function LabeledInput({ label, children }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-black text-[#65758B] uppercase tracking-widest">
        {label}
      </label>
      {children}
    </div>
  );
}

function InfoCell({ label, value }) {
  return (
    <div className="bg-[#F8FAFC] border border-[#E1E7EF] rounded-xl px-4 py-3">
      <p className="text-[10px] font-black text-[#65758B] uppercase tracking-widest mb-1">
        {label}
      </p>
      <p className="text-[13px] font-bold text-[#1A1714]">{value || "—"}</p>
    </div>
  );
}

export default function QueryDetailModal({ query, onClose, onStatusChange }) {
  const [activeTab, setActiveTab] = useState("details");
  const [status, setStatus] = useState(query.status || "OPEN");
  const [resolutionMsg, setResolutionMsg] = useState(
    query.resolution?.message || "",
  );
  const [refundAmount, setRefundAmount] = useState(
    query.resolution?.refundAmount || "",
  );
  const [cancelCharge, setCancelCharge] = useState(
    query.resolution?.cancellationCharge || "",
  );
  const [creditNoteNo, setCreditNoteNo] = useState(
    query.resolution?.creditNoteNo || "",
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStatus(query.status || "OPEN");
    setResolutionMsg(query.resolution?.message || "");
    setRefundAmount(query.resolution?.refundAmount || "");
    setCancelCharge(query.resolution?.cancellationCharge || "");
    setCreditNoteNo(query.resolution?.creditNoteNo || "");
  }, [query]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await onStatusChange(query._id || query.queryId, {
        status,
        remarks: query.remarks,
        resolution: {
          message: resolutionMsg,
          refundAmount: Number(refundAmount) || 0,
          cancellationCharge: Number(cancelCharge) || 0,
          creditNoteNo,
          resolvedAt:
            status === "RESOLVED" ? new Date().toISOString() : undefined,
        },
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const fmt = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#04112F] to-[#000D26] px-6 py-4 flex items-center justify-between rounded-t-2xl shrink-0">
          <div>
            <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-0.5">
              Cancellation Query
            </p>
            <h2 className="text-lg font-black text-white leading-none">
              {query.queryId || query._id || "—"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#E1E7EF] px-4 shrink-0 bg-[#F8FAFC]">
          {[
            { id: "details", label: "Details" },
            { id: "status", label: "Update Status" },
            { id: "logs", label: "Activity Logs" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3.5 text-[12px] font-black uppercase tracking-widest transition-all border-b-2 ${
                activeTab === tab.id
                  ? "border-[#C9A240] text-[#C9A240]"
                  : "border-transparent text-[#65758B] hover:text-[#1A1714] hover:bg-[#F5F5F5]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-white">
          {activeTab === "details" && (
            <div className="space-y-6">
              {/* Booking Info */}
              <section>
                <p className="text-[10px] font-black text-[#65758B] uppercase tracking-widest mb-3">
                  Booking Details
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {query.bookingSnapshot?.hotelName ? (
                    <>
                      <InfoCell label="Hotel Name" value={query.bookingSnapshot?.hotelName} />
                      <InfoCell label="Room Type" value={query.bookingSnapshot?.roomType} />
                      <InfoCell label="Check-In" value={fmt(query.bookingSnapshot?.checkInDate)} />
                      <InfoCell label="Check-Out" value={fmt(query.bookingSnapshot?.checkOutDate)} />
                      <InfoCell label="Requested On" value={fmt(query.requestedAt)} />
                    </>
                  ) : (
                    <>
                      <InfoCell label="Booking Ref" value={query.bookingReference || "—"} />
                      <InfoCell label="Journey Type" value={query.bookingSnapshot?.journeyType || "—"} />
                      <InfoCell label="Travel Date" value={fmt(query.bookingSnapshot?.travelDate)} />
                      <InfoCell label="Return Date" value={fmt(query.bookingSnapshot?.returnDate)} />
                      <InfoCell label="Airline / PNR" value={`${query.bookingSnapshot?.airline || "—"} / ${query.bookingSnapshot?.pnr || "—"}`} />
                      <InfoCell label="Requested On" value={fmt(query.requestedAt)} />
                    </>
                  )}
                </div>
              </section>

              {/* Fare Breakdown */}
              <section>
                <p className="text-[10px] font-black text-[#65758B] uppercase tracking-widest mb-3">
                  Fare Breakdown
                </p>
                <div className="bg-[#F8FAFC] rounded-xl p-4 grid grid-cols-2 gap-2 text-sm border border-[#E1E7EF]">
                  {[
                    ["Total Fare", query.bookingSnapshot?.totalFare],
                    ["Base Fare", query.bookingSnapshot?.baseFare],
                    ["Taxes", query.bookingSnapshot?.taxes],
                    ["Service Fee", query.bookingSnapshot?.serviceFee],
                  ].map(([l, v]) => (
                    <div key={l} className="flex justify-between">
                      <span className="text-[#65758B] text-[12px]">{l}</span>
                      <span className="font-bold text-[#1A1714] text-[12px]">
                        {v != null ? `₹${Number(v).toLocaleString()}` : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Corporate */}
              <section>
                <p className="text-[10px] font-black text-[#65758B] uppercase tracking-widest mb-3">
                  Corporate & Employee
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <InfoCell
                    label="Company"
                    value={query.corporate?.companyName || "—"}
                  />
                  <InfoCell
                    label="Employee"
                    value={query.corporate?.employeeName || "—"}
                  />
                  <InfoCell
                    label="Email"
                    value={query.corporate?.employeeEmail || "—"}
                  />
                  <InfoCell
                    label="Employee ID"
                    value={query.corporate?.employeeId || "—"}
                  />
                </div>
              </section>

              {/* Sectors */}
              {query.bookingSnapshot?.sectors?.length > 0 && (
                <section>
                  <p className="text-[10px] font-black text-[#65758B] uppercase tracking-widest mb-3">
                    Sectors
                  </p>
                  <div className="space-y-2">
                    {query.bookingSnapshot.sectors.map((s, i) => (
                      <div
                        key={i}
                        className="bg-[#F8FAFC] rounded-xl p-3 flex items-center justify-between text-sm border border-[#E1E7EF]"
                      >
                        <div>
                          <p className="font-black text-[#1A1714]">
                            {s.origin} → {s.destination}
                          </p>
                          <p className="text-[11px] text-[#65758B]">
                            {s.airline} · {s.flightNumber}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] text-[#65758B]">
                            {s.departureTime ? fmt(s.departureTime) : "—"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Passengers */}
              {query.passengers?.length > 0 && (
                <section>
                  <p className="text-[10px] font-black text-[#65758B] uppercase tracking-widest mb-3">
                    Passengers
                  </p>
                  <div className="space-y-2">
                    {query.passengers.map((p, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between bg-[#F8FAFC] rounded-xl px-4 py-3 border border-[#E1E7EF]"
                      >
                        <div>
                          <p className="font-bold text-[#1A1714] text-sm">
                            {p.name || "—"}
                          </p>
                          <p className="text-[11px] text-[#65758B] uppercase">
                            {p.type || "—"}
                          </p>
                        </div>
                        <span className="font-mono text-[11px] text-[#65758B]">
                          {p.ticketNumber || "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Remarks */}
              {query.remarks && (
                <section>
                  <p className="text-[10px] font-black text-[#65758B] uppercase tracking-widest mb-2">
                    Remarks
                  </p>
                  <p className="text-sm text-[#1A1714] bg-[#FFFBEB] border border-[#C9A240]/20 rounded-xl px-4 py-3">
                    {query.remarks}
                  </p>
                </section>
              )}
            </div>
          )}

          {activeTab === "status" && (
            <div className="space-y-6">
              {/* Status Update */}
              <section>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <LabeledInput label="Status">
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full px-3 py-2.5 border border-[#E1E7EF] rounded-lg text-sm font-medium outline-none transition-all focus:border-[#C9A240] focus:ring-2 focus:ring-[#C9A240]/20 bg-[#F8FAFC] cursor-pointer text-[#1A1714]"
                    >
                      {QUERY_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </LabeledInput>
                  <LabeledInput label="Credit Note No.">
                    <input
                      type="text"
                      value={creditNoteNo}
                      onChange={(e) => setCreditNoteNo(e.target.value)}
                      placeholder="e.g. CN-2024-001"
                      className="w-full px-3 py-2.5 border border-[#E1E7EF] rounded-lg text-sm font-medium outline-none transition-all focus:border-[#C9A240] focus:ring-2 focus:ring-[#C9A240]/20 bg-[#F8FAFC] text-[#1A1714]"
                    />
                  </LabeledInput>
                  <LabeledInput label="Refund Amount (₹)">
                    <input
                      type="number"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2.5 border border-[#E1E7EF] rounded-lg text-sm font-medium outline-none transition-all focus:border-[#C9A240] focus:ring-2 focus:ring-[#C9A240]/20 bg-[#F8FAFC] text-[#1A1714]"
                    />
                  </LabeledInput>
                  <LabeledInput label="Cancellation Charge (₹)">
                    <input
                      type="number"
                      value={cancelCharge}
                      onChange={(e) => setCancelCharge(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2.5 border border-[#E1E7EF] rounded-lg text-sm font-medium outline-none transition-all focus:border-[#C9A240] focus:ring-2 focus:ring-[#C9A240]/20 bg-[#F8FAFC] text-[#1A1714]"
                    />
                  </LabeledInput>
                </div>
                <LabeledInput label="Resolution Message">
                  <textarea
                    value={resolutionMsg}
                    onChange={(e) => setResolutionMsg(e.target.value)}
                    rows={4}
                    placeholder="Describe the resolution or reason for rejection..."
                    className="w-full px-3 py-2.5 border border-[#E1E7EF] rounded-lg text-sm font-medium outline-none transition-all focus:border-[#C9A240] focus:ring-2 focus:ring-[#C9A240]/20 bg-[#F8FAFC] resize-none text-[#1A1714]"
                  />
                </LabeledInput>
              </section>

              {/* Save */}
              <div className="flex justify-end gap-3 pt-4 border-t border-[#E1E7EF]">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-lg border border-[#E1E7EF] text-sm font-bold text-[#65758B] hover:bg-[#F5F5F5] hover:text-[#1A1714] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-[#C9A240] to-[#D97706] text-[#000D26] text-sm font-black shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-60 disabled:hover:scale-100"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          )}

          {activeTab === "logs" && (
            <div className="space-y-6">
              {/* Logs */}
              {query.logs?.length > 0 ? (
                <div className="relative pl-4 sm:pl-6 border-l-2 border-[#E1E7EF] ml-2 sm:ml-4 space-y-6">
                  {query.logs.map((log, i) => (
                    <div key={i} className="relative">
                      {/* Timeline Dot */}
                      <div className="absolute -left-[23px] sm:-left-[31px] top-1.5 w-3 h-3 rounded-full border-2 border-white bg-[#C9A240] shadow-sm ring-2 ring-[#C9A240]/20" />
                      
                      {/* Content Card */}
                      <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E1E7EF] shadow-sm hover:shadow-md transition-shadow relative">
                        {/* Caret pointing to the line */}
                        <div className="absolute top-2 -left-2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[8px] border-r-[#E1E7EF]"></div>
                        <div className="absolute top-[9px] -left-[6px] w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-r-[7px] border-r-[#F8FAFC]"></div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <p className="text-[#1A1714] font-bold text-sm mt-0.5">
                            {log.message || log.action}
                          </p>
                          <span className="text-[10px] font-bold text-[#65758B] bg-white px-2 py-1 rounded-md border border-[#E1E7EF] shadow-sm shrink-0">
                            {log.at ? new Date(log.at).toLocaleString("en-IN", {
                              day: '2-digit', month: 'short', year: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            }) : "—"}
                          </span>
                        </div>
                        
                        {log.by && (
                          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#E1E7EF]/60">
                            <div className="w-5 h-5 rounded-full bg-[#04112F] text-white flex items-center justify-center text-[10px] font-bold uppercase shrink-0">
                              {log.by.charAt(0)}
                            </div>
                            <p className="text-[11px] font-semibold text-[#65758B]">
                              Action by <span className="text-[#000D26]">{log.by}</span>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center bg-[#F8FAFC] rounded-xl border border-dashed border-[#E1E7EF]">
                  <p className="text-[#65758B] text-sm font-medium">No activity logs recorded yet.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
