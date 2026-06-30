import React, { useEffect, useMemo, useState, useCallback } from "react";
import { FiCheck, FiX, FiRefreshCw, FiSearch, FiUserPlus, FiInfo, FiEye, FiArrowRight, FiDollarSign, FiClock, FiUsers, FiPhone, FiMail, FiMapPin, FiFileText } from "react-icons/fi";
import { FaExchangeAlt, FaPlane, FaHotel } from "react-icons/fa";
import { StatusBadge } from "./TravelAdminTabs/Shared/CommonComponents";
import api from "../API/axios";
import Swal from "sweetalert2";

const MODEL_LABELS = {
  cancellation: { icon: FiX, label: "Cancel" },
  reissue: { icon: FaExchangeAlt, label: "Reissue" },
  offline_reissue: { icon: FaExchangeAlt, label: "Offline Reissue" },
  online_reissue: { icon: FaExchangeAlt, label: "Online Reissue" },
};

export default function CancellationReissueApprovalPanel({ role }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchUrl = role === "manager"
    ? "/approvals/manager/cancellation-reissue"
    : role === "configured-approver"
    ? "/approvals/configured-approver/cancellation-reissue"
    : "/approvals/cancellation-reissue";

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(fetchUrl);
      setItems(data?.data?.approvals || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [fetchUrl]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter((i) =>
      (i.bookingReference || "").toLowerCase().includes(q) ||
      (i._id || "").toLowerCase().includes(q) ||
      (i.reason || i.remarks || "").toLowerCase().includes(q)
    );
  }, [items, search]);

  const handleApprove = async (item) => {
    const result = await Swal.fire({
      title: "Approve Request?",
      text: `Approve this ${item._modelType} request?`,
      icon: "question",
      input: "textarea",
      inputPlaceholder: "Optional comments...",
      showCancelButton: true,
      confirmButtonColor: "#10B981",
      confirmButtonText: "Approve",
      cancelButtonText: "Cancel",
    });
    if (!result.isConfirmed) return;
    setActionLoading(true);
    try {
      const id = item._id || item.id;
      await api.post(`/approvals/cancellation-reissue/${item._modelType}/${id}/approve`, { comments: result.value || "" });
      Swal.fire("Approved", "Request approved successfully", "success");
      setItems((prev) => prev.filter((i) => i._id !== item._id));
      setSelectedItem(null);
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || err.response?.data?.error || "Approval failed", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (item) => {
    const result = await Swal.fire({
      title: "Reject Request?",
      text: "Provide a reason for rejection",
      icon: "warning",
      input: "textarea",
      inputPlaceholder: "Reason for rejection...",
      inputValidator: (v) => { if (!v) return "Rejection reason is required"; },
      showCancelButton: true,
      confirmButtonColor: "#DC2626",
      confirmButtonText: "Reject",
      cancelButtonText: "Cancel",
    });
    if (!result.isConfirmed) return;
    setActionLoading(true);
    try {
      const id = item._id || item.id;
      await api.post(`/approvals/cancellation-reissue/${item._modelType}/${id}/reject`, { comments: result.value });
      Swal.fire("Rejected", "Request rejected", "success");
      setItems((prev) => prev.filter((i) => i._id !== item._id));
      setSelectedItem(null);
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || err.response?.data?.error || "Rejection failed", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransfer = async (item) => {
    const { value: formValues } = await Swal.fire({
      title: "Transfer Request",
      html: `
        <div style="text-align:left">
          <label style="font-size:13px;font-weight:700;color:#374151;display:block;margin-bottom:4px">Second Approver ID</label>
          <input id="swal-input-approver" class="swal2-input" placeholder="User ID (Mongo ObjectId)" style="width:100%;box-sizing:border-box">
          <label style="font-size:13px;font-weight:700;color:#374151;display:block;margin-top:12px;margin-bottom:4px">Remark (optional)</label>
          <textarea id="swal-input-remark" class="swal2-textarea" placeholder="Transfer reason..." style="width:100%;box-sizing:border-box;min-height:80px"></textarea>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonColor: "#2563EB",
      confirmButtonText: "Transfer",
      cancelButtonText: "Cancel",
      preConfirm: () => {
        const approverId = document.getElementById("swal-input-approver").value;
        if (!approverId) { Swal.showValidationMessage("Approver ID is required"); return false; }
        return { approverId, remark: document.getElementById("swal-input-remark").value };
      },
    });
    if (!formValues) return;

    setActionLoading(true);
    try {
      const id = item._id || item.id;
      await api.post(`/approvals/cancellation-reissue/${item._modelType}/${id}/transfer`, {
        secondApproverId: formValues.approverId,
        remark: formValues.remark || "",
      });
      Swal.fire("Transferred", "Request transferred successfully", "success");
      setItems((prev) => prev.filter((i) => i._id !== item._id));
      setSelectedItem(null);
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || err.response?.data?.error || "Transfer failed", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const [cancellationDetail, setCancellationDetail] = useState(null);
  const [cancellationDetailLoading, setCancellationDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState("details");

  const handleViewDetail = async (item) => {
    setDetailLoading(true);
    try {
      const { data } = await api.get(`/reissue/${item._id}`);
      setDetailItem({ ...(data?.data || item), _modelType: item._modelType });
    } catch {
      setDetailItem(item);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCancellationViewDetail = async (item) => {
    setCancellationDetailLoading(true);
    setDetailTab("details");
    try {
      const { data } = await api.get(`/corporate-related/cancellation-queries/${item._id}`);
      setCancellationDetail({ ...(data?.data || data || item), _modelType: item._modelType || "cancellation" });
    } catch {
      setCancellationDetail({ ...item, _modelType: item._modelType || "cancellation" });
    } finally {
      setCancellationDetailLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#003399] border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <FiSearch size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text" placeholder="Search by ID, reference or reason..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#003399]/20 focus:border-[#003399]/40 transition-all"
          />
        </div>
        <button onClick={fetchItems} disabled={loading}
          className="p-3 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-all disabled:opacity-50">
          <FiRefreshCw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <Th>Type</Th>
                <Th>Request ID</Th>
                <Th>Reference</Th>
                <Th>Reason</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="!px-6 !py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                        <FiInfo size={32} />
                      </div>
                      <p className="text-sm font-bold text-slate-400">No pending cancellation/reissue requests</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.map((item) => {
                const meta = MODEL_LABELS[item._modelType] || { icon: FiInfo, label: item._modelType };
                const Icon = meta.icon;
                const isReissue = ["reissue", "online_reissue", "offline_reissue"].includes(item._modelType);
                return (
                  <tr key={item._id}
                    className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer"
                    onClick={() => {
                      if (isReissue) handleViewDetail(item);
                      else handleCancellationViewDetail(item);
                    }}>
                    <td className="!px-4 !py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-[#003399]/5 flex items-center justify-center text-[#003399] border border-[#003399]/10">
                          <Icon size={15} />
                        </div>
                        <span className="text-[12px] font-bold text-slate-600 uppercase tracking-wider">{meta.label}</span>
                      </div>
                    </td>
                    <td className="!px-4 !py-4">
                      <span className="text-[13px] font-mono font-bold text-slate-700">
                        {item.reissueId || item.queryId || item._id?.slice(-8)?.toUpperCase() || "—"}
                      </span>
                    </td>
                    <td className="!px-4 !py-4">
                      <span className="text-[13px] font-mono text-slate-500">{item.bookingReference || "—"}</span>
                    </td>
                    <td className="!px-4 !py-4">
                      <span className="text-[13px] text-slate-600 line-clamp-2 max-w-[200px]">
                        {item.reason || item.remarks || "—"}
                      </span>
                    </td>
                    <td className="!px-4 !py-4">
                      <StatusBadge status={item.requestStatus || item.approvalStage} />
                    </td>
                    <td className="!px-4 !py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => isReissue ? handleViewDetail(item) : handleCancellationViewDetail(item)}
                          className="px-3.5 py-2 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5">
                          <FiEye size={14} /> View Details
                        </button>
                        <button onClick={() => handleApprove(item)}
                          disabled={actionLoading}
                          className="px-3.5 py-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 text-[11px] font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-1.5">
                          <FiCheck size={14} /> Approve
                        </button>
                        <button onClick={() => handleReject(item)}
                          disabled={actionLoading}
                          className="px-3.5 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 text-[11px] font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-1.5">
                          <FiX size={14} /> Reject
                        </button>
                        {(role === "travel-admin" || role === "configured-approver") && (
                          <button onClick={() => handleTransfer(item)}
                            disabled={actionLoading}
                            className="px-3.5 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 text-[11px] font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-1.5">
                            <FiUserPlus size={14} /> Transfer
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    
 

      {/* ── Reissue Detail Modal (Issues 30-31) ── */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setDetailItem(null)}>
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Reissue Request Detail</h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {detailItem.reissueId || detailItem._id} · {detailItem.bookingReference}
                </p>
              </div>
              <button onClick={() => setDetailItem(null)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all">
                <FiX size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Reason for Reissue */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                    <FiInfo size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Reason for Reissue</p>
                    <p className="text-sm text-amber-900 mt-1">{detailItem.reason || detailItem.remarks || "Not specified"}</p>
                  </div>
                </div>
              </div>

              {/* Traveller Details */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <FiUsers size={14} /> Traveller Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {(() => {
                    const travellers =
                      detailItem.bookingId?.travellers ||
                      detailItem.bookingId?.originalBookingSnapshot?.passengers ||
                      [];
                    return travellers.length > 0 ? travellers.map((t, i) => (
                      <div key={i} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <p className="text-sm font-bold text-slate-700">
                          {`${t.title || ''} ${t.firstName || ''} ${t.lastName || ''}`.trim() || `Passenger ${i + 1}`}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {t.paxType || t.type || "Adult"}
                          {t.gender ? ` · ${t.gender}` : ''}
                          {t.ticketNumber || t.TicketNumber ? ` · ${t.ticketNumber || t.TicketNumber}` : ''}
                        </p>
                      </div>
                    )) : (
                      <div className="col-span-2 text-sm text-slate-400">No passenger details available</div>
                    );
                  })()}
                </div>
              </div>

              {/* Itinerary Comparison - Side by Side */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <FaPlane size={12} /> Itinerary Comparison
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {/* Original Itinerary */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center">
                        <FaPlane size={10} className="text-slate-500" />
                      </div>
                      <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Original Itinerary</span>
                    </div>
                    {(() => {
                      const original = detailItem.lastTicketedSnapshot?.segments?.[0];
                      if (!original) {
                        return <p className="text-sm text-slate-400">—</p>;
                      }
                      return (
                        <div className="space-y-2 text-sm">
                          <Row label="Travel Date" value={formatDate(original.departureDateTime)} />
                          <Row label="Return Date" value={detailItem.lastTicketedSnapshot?.segments?.[1] ? formatDate(detailItem.lastTicketedSnapshot.segments[1].departureDateTime) : '—'} />
                          <Row label="Airline" value={original.airlineName || '—'} />
                          <Row label="Flight" value={original.airlineCode && original.flightNumber ? `${original.airlineCode} ${original.flightNumber}` : original.flightNumber || '—'} />
                          <Row label="PNR" value={detailItem.originalPnr || detailItem.pnr || '—'} />
                          <Row label="Class" value={original.fareClass || original.cabinClass || '—'} />
                          <Row label="Fare" value={formatMoney(detailItem.oldFare || detailItem.preferredJourney?.oldFare)} />
                          <Row label="Route" value={original.origin?.airportCode && original.destination?.airportCode ? `${original.origin.airportCode} → ${original.destination.airportCode}` : '—'} />
                        </div>
                      );
                    })()}
                  </div>

                  {/* Requested Itinerary */}
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center">
                        <FiArrowRight size={10} className="text-blue-600" />
                      </div>
                      <span className="text-xs font-black text-blue-600 uppercase tracking-wider">Requested Itinerary</span>
                    </div>
                    {(() => {
                      const requested = detailItem.preferredJourney?.segments?.[0] || detailItem.selectedFlight?.segments?.[0];
                      if (!requested) {
                        return <p className="text-sm text-slate-400">—</p>;
                      }
                      return (
                        <div className="space-y-2 text-sm">
                          <Row label="New Travel Date" value={formatDate(detailItem.preferredJourney?.departureDate)} />
                          <Row label="New Return Date" value={detailItem.preferredJourney?.returnDate ? formatDate(detailItem.preferredJourney.returnDate) : '—'} />
                          <Row label="New Airline" value={detailItem.preferredJourney?.airlineName || '—'} />
                          <Row label="New Flight" value={requested.airlineCode && requested.flightNumber ? `${requested.airlineCode} ${requested.flightNumber}` : requested.flightNumber || '—'} />
                          <Row label="New Class" value={requested.fareClass || requested.cabinClass || detailItem.preferredJourney?.cabinClass || '—'} />
                          <Row label="New Fare" value={formatMoney(detailItem.newFare || detailItem.preferredJourney?.newFare || detailItem.preferredJourney?.fare)} />
                          <Row label="New Route" value={requested.origin?.airportCode && requested.destination?.airportCode ? `${requested.origin.airportCode} → ${requested.destination.airportCode}` : `${requested.origin || ''} → ${requested.destination || ''}`.trim() || '—'} />
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Pricing Summary */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <FiDollarSign size={14} /> Pricing Summary
                </h3>
                <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-xl p-4 border border-slate-200">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <PriceBox label="Fare Difference" value={formatMoney(detailItem.fareDifference)} color="text-blue-600" />
                    <PriceBox label="Penalty" value={formatMoney(detailItem.reissuePricingSnapshot?.breakdown?.airlineReissuePenalty || 0)} color="text-red-600" />
                    <PriceBox label="Supplier Charges" value={formatMoney(detailItem.reissueCharge || 0)} color="text-amber-600" />
                    <PriceBox label="Refund Amount" value={formatMoney(detailItem.refundEstimate || 0)} color="text-emerald-600" />
                  </div>
                </div>
              </div>

              {/* Approval History */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <FiClock size={14} /> Approval History
                </h3>
                <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                  {(detailItem.timeline || []).length > 0 ? detailItem.timeline.map((entry, i) => (
                    <div key={i} className="px-4 py-3 flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${entry.eventType?.includes('APPROVED') ? 'bg-emerald-500' : entry.eventType?.includes('REJECTED') ? 'bg-red-500' : 'bg-slate-300'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-700">{entry.title || entry.eventType || '—'}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{entry.description || ''} {entry.actorRole ? `· ${entry.actorRole}` : ''}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(entry.at || entry.timestamp)}</p>
                      </div>
                    </div>
                  )) : (
                    <div className="px-4 py-6 text-center text-sm text-slate-400">No approval history</div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
                <button onClick={() => { setDetailItem(null); handleApprove(detailItem); }}
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 text-[12px] font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-2">
                  <FiCheck size={16} /> Approve
                </button>
                <button onClick={() => { setDetailItem(null); handleReject(detailItem); }}
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 text-[12px] font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-2">
                  <FiX size={16} /> Reject
                </button>
                {role === "travel-admin" && (
                  <button onClick={() => { setDetailItem(null); handleTransfer(detailItem); }}
                    disabled={actionLoading}
                    className="px-5 py-2.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 text-[12px] font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-2">
                    <FiUserPlus size={16} /> Transfer
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Cancellation Detail Modal ── */}
      {cancellationDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setCancellationDetail(null)}>
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Cancellation Request Detail</h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {cancellationDetail.queryId || cancellationDetail._id} · {cancellationDetail.bookingReference}
                </p>
              </div>
              <button onClick={() => setCancellationDetail(null)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all">
                <FiX size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 px-6 bg-slate-50/50">
              {[
                { key: "details", label: "Request Details" },
                { key: "booking", label: "Booking Information" },
                { key: "summary", label: "Cancellation Summary" },
                { key: "history", label: "Approval History" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setDetailTab(tab.key)}
                  className={`px-4 py-3 text-[11px] font-black uppercase tracking-wider transition-all border-b-2 -mb-[1px] ${
                    detailTab === tab.key
                      ? "text-[#003399] border-[#003399]"
                      : "text-slate-400 border-transparent hover:text-slate-600"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6 space-y-6">
              {/* ════════ TAB 1: Request Details ════════ */}
              {detailTab === "details" && (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Request Details</h3>
                  <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 space-y-3">
                    <Row label="Query ID" value={cancellationDetail.queryId || "—"} />
                    <Row label="Booking Reference / PNR" value={cancellationDetail.bookingReference || cancellationDetail.bookingSnapshot?.pnr || "—"} />
                    <Row label="Request Type" value={cancellationDetail.type || "CANCELLATION_REQUEST"} />
                    <Row label="Full / Partial" value={cancellationDetail.segments?.length > 0 ? "Partial" : "Full"} />
                    <Row label="Request Reason" value={cancellationDetail.remarks || cancellationDetail.reason || "—"} />
                    <Row label="Submitted By" value={cancellationDetail.user?.name || cancellationDetail.corporate?.employeeName || "—"} />
                    <Row label="Submitted Date" value={formatDateTime(cancellationDetail.requestedAt || cancellationDetail.createdAt)} />
                    <Row label="Current Status" value={prettifyLabel(cancellationDetail.requestStatus || cancellationDetail.approvalStage)} />
                  </div>
                </div>
              )}

              {/* ════════ TAB 2: Booking Information ════════ */}
              {detailTab === "booking" && (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Booking Information</h3>
                  <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 space-y-3">
                    <Row label="Passenger(s)" value={formatPassengers(cancellationDetail.passengers)} />
                    <Row label="Sector" value={formatSectors(cancellationDetail.bookingSnapshot?.sectors) || formatSegmentsRoute(cancellationDetail.segments) || "—"} />
                    <Row label="Airline" value={cancellationDetail.bookingSnapshot?.airline || "—"} />
                    <Row label="Ticket Number" value={formatTicketNumbers(cancellationDetail.passengers)} />
                    <Row label="Supplier Reference" value={cancellationDetail.bookingSnapshot?.pnr || "—"} />
                    <Row label="Fare Type" value={cancellationDetail.bookingSnapshot?.journeyType || "—"} />
                    <Row label="Booking Date" value={formatDateTime(cancellationDetail.createdAt)} />
                  </div>
                </div>
              )}

              {/* ════════ TAB 3: Cancellation Summary ════════ */}
              {detailTab === "summary" && (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Cancellation Summary</h3>
                  {cancellationDetail.providerExecutionStatus === "COMPLETED" || cancellationDetail.resolution ? (
                    <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 space-y-3">
                      <Row label="Total Fare" value={formatMoney(cancellationDetail.bookingSnapshot?.totalFare)} />
                      <Row label="Supplier Cancellation Charges" value={formatMoney(cancellationDetail.resolution?.cancellationCharge)} />
                      <Row label="Airline Penalty" value={formatMoney(cancellationDetail.resolution?.airlinePenalty)} />
                      <Row label="Estimated Refund" value={formatMoney(cancellationDetail.resolution?.refundAmount)} />
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center">
                      <FiInfo size={24} className="text-amber-400 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-amber-800">Supplier cancellation charges are unavailable.</p>
                      <p className="text-xs text-amber-600 mt-1">Final refund will be determined during processing.</p>
                    </div>
                  )}
                </div>
              )}

              {/* ════════ TAB 4: Approval History ════════ */}
              {detailTab === "history" && (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Approval History</h3>
                  <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                    {(cancellationDetail.approvalAudit || []).length > 0 ? cancellationDetail.approvalAudit.map((entry, i) => (
                      <div key={i} className="px-4 py-3 flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                          entry.action?.includes('APPROVED') || entry.action === 'EXECUTED' ? 'bg-emerald-500'
                          : entry.action?.includes('REJECTED') ? 'bg-red-500'
                          : entry.action === 'TRANSFERRED' ? 'bg-blue-500'
                          : entry.action === 'OPS_ASSIGNED' ? 'bg-purple-500'
                          : 'bg-slate-300'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-700">{prettifyLabel(entry.action)}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {entry.remarks || ''}
                            {entry.role ? ` · ${prettifyLabel(entry.role)}` : ''}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(entry.timestamp)}</p>
                        </div>
                      </div>
                    )) : (
                      <div className="px-4 py-6 text-center text-sm text-slate-400">No approval history</div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
                <button onClick={() => { setCancellationDetail(null); handleApprove(cancellationDetail); }}
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 text-[12px] font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-2">
                  <FiCheck size={16} /> Approve
                </button>
                <button onClick={() => { setCancellationDetail(null); handleReject(cancellationDetail); }}
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 text-[12px] font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-2">
                  <FiX size={16} /> Reject
                </button>
                {(role === "travel-admin" || role === "configured-approver") && (
                  <button onClick={() => { setCancellationDetail(null); handleTransfer(cancellationDetail); }}
                    disabled={actionLoading}
                    className="px-5 py-2.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 text-[12px] font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-2">
                    <FiUserPlus size={16} /> Transfer
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>

  );
}

/* ── Helper sub-components ── */
function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className="text-slate-800 font-medium text-right">{value || "—"}</span>
    </div>
  );
}

function PriceBox({ label, value, color }) {
  return (
    <div className="bg-white rounded-lg p-3 border border-slate-100">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-bold mt-1 ${color || "text-slate-700"}`}>{value}</p>
    </div>
  );
}

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const formatMoney = (value) => {
  const num = Number(value);
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);
};

const prettifyLabel = (value) => {
  if (!value) return "—";
  return String(value).replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
};

const formatSectors = (sectors) => {
  if (!sectors || !Array.isArray(sectors)) return null;
  return sectors.map(s => typeof s === 'string' ? s : `${s.origin || ''}→${s.destination || ''}`).join(', ');
};

const formatSegmentsRoute = (segments) => {
  if (!segments || !Array.isArray(segments) || !segments.length) return null;
  const first = segments[0];
  const last = segments[segments.length - 1];
  return `${first.origin || ''} → ${last.destination || ''}`;
};

function Th({ children, className = "" }) {
  return (
    <th className={`!px-4 !py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 ${className}`}>
      {children}
    </th>
  );
}

const formatPassengers = (passengers) => {
  if (!passengers || !Array.isArray(passengers) || !passengers.length) return "—";
  return passengers.map(p => p.name || "Unknown").join(", ");
};

const formatTicketNumbers = (passengers) => {
  if (!passengers || !Array.isArray(passengers) || !passengers.length) return "—";
  const tickets = passengers.map(p => p.ticketNumber).filter(Boolean);
  return tickets.length ? tickets.join(", ") : "—";
};
