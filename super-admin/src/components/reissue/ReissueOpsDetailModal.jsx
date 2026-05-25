import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiRefreshCw,
  FiSend,
  FiUser,
  FiX,
} from "react-icons/fi";
import { toast } from "react-toastify";
import axios from "../../API/axios";
import {
  generateReissueTicket,
  reassignReissueRequest,
  updateReissueStatus,
} from "../../Redux/Actions/reissueThunks";
import {
  resetReissueState,
  setCurrentReissueRequest,
} from "../../Redux/Slice/reissueSlice";
import {
  formatDate,
  formatDateTime,
  getAllowedOpsTransitions,
  getJourneyLabel,
  getStatusTone,
  prettifyLabel,
} from "./reissueUi";

const PLACEHOLDER = "--";

const formatMoney = (value, currency = "INR") => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return PLACEHOLDER;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 2,
  }).format(amount);
};

const pickMoney = (...values) => {
  for (const value of values) {
    const amount = Number(value);
    if (Number.isFinite(amount)) return amount;
  }
  return 0;
};

const resolveFinancialBreakdown = (request = {}) => {
  const ledger = request?.financialLedger || {};
  const ssrFinancials = request?.ssrFinancials || ledger?.ssrFinancials || {};
  const normalizedPricing = request?.normalizedPricing || {};
  const lastCycle = Array.isArray(request?.pricingHistory) && request.pricingHistory.length
    ? request.pricingHistory[request.pricingHistory.length - 1]
    : {};

  return {
    previouslyPaid: pickMoney(
      lastCycle?.previousTotalPaid,
      ledger?.lastTicketedSnapshot?.fare?.totalFare,
      ledger?.currentTicketValue,
      ledger?.originalTicketAmount,
    ),
    newFlight: pickMoney(
      normalizedPricing?.newFlightBase,
      lastCycle?.newFare,
      request?.lastTicketedSnapshot?.fare?.totalFare,
      request?.newFare,
      request?.displayInfo?.newFare,
    ),
    newSSR: pickMoney(
      normalizedPricing?.newSSRTotal,
      lastCycle?.newSSR,
      ssrFinancials?.newSSR,
      ledger?.currentSSRValue,
    ),
    ssrRefund: pickMoney(ssrFinancials?.refundableSSR, lastCycle?.refundSSRValue),
    reissuePenalty: pickMoney(
      normalizedPricing?.reissuePenalty,
      lastCycle?.airlinePenalty,
      request?.reissueCharges,
      request?.reissueCharge,
    ),
    netCollection: pickMoney(
      request?.totalAdjustment,
      lastCycle?.additionalCollection,
      normalizedPricing?.netPayable > 0 ? normalizedPricing.netPayable : null,
    ),
    netRefund: pickMoney(normalizedPricing?.refundDue, lastCycle?.refundAmount),
    currency:
      request?.displayInfo?.currency ||
      request?.currency ||
      request?.reissuePricingSnapshot?.currency ||
      request?.pricingSnapshot?.currency ||
      "INR",
  };
};

function Card({ label, value, accent }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p className={`mt-1 text-sm font-semibold ${accent || "text-slate-800"}`}>
        {value || PLACEHOLDER}
      </p>
    </div>
  );
}

function getSegmentRoute(segment = {}) {
  return `${segment.origin || PLACEHOLDER} -> ${segment.destination || PLACEHOLDER}`;
}

function getTimelineIcon(item = {}) {
  if (item.status === "COMPLETED" || item.eventType === "DOWNLOAD_READY") {
    return <FiCheckCircle size={16} />;
  }
  if (item.status === "WAITING_AIRLINE") {
    return <FiClock size={16} />;
  }
  return <FiSend size={16} />;
}

export default function ReissueOpsDetailModal({
  request,
  onClose,
  canReassign = false,
  opsMembers = [],
}) {
  const dispatch = useDispatch();
  const { currentRequest, actionLoading, error } = useSelector((state) => state.reissue);
  const [message, setMessage] = useState("");
  const [reassignTo, setReassignTo] = useState("");

  const activeRequest = currentRequest || request;
  const selectedFlight =
    activeRequest?.selectedFlight || activeRequest?.preferredJourney || null;
  const selectedSegments = useMemo(() => {
    if (Array.isArray(activeRequest?.selectedSegments) && activeRequest.selectedSegments.length) {
      return activeRequest.selectedSegments;
    }
    return Array.isArray(selectedFlight?.segments) ? selectedFlight.segments : [];
  }, [activeRequest?.selectedSegments, selectedFlight?.segments]);
  const pricingSnapshot = activeRequest?.reissuePricingSnapshot || null;
  const pricingCurrency =
    activeRequest?.currency ||
    pricingSnapshot?.currency ||
    selectedFlight?.currency ||
    "INR";
  const transitions = useMemo(
    () => getAllowedOpsTransitions(activeRequest?.status),
    [activeRequest?.status],
  );
  const ticketUrl =
    activeRequest?.generatedTicketUrl || activeRequest?.revisedTicketUrl || null;
  const financialBreakdown = resolveFinancialBreakdown(activeRequest || {});
  const canDownloadTicket = ["TICKET_GENERATED", "COMPLETED"].includes(activeRequest?.status);
  const corporateName =
    activeRequest?.displayInfo?.corporateName ||
    activeRequest?.corporateId?.corporateName ||
    activeRequest?.companyId?.corporateName ||
    activeRequest?.metadata?.corporateName ||
    "N/A";

  useEffect(() => {
    dispatch(setCurrentReissueRequest(request));
    setReassignTo(request?.assignedOpsMember?._id || request?.assignedTo?._id || "");
    return () => {
      dispatch(setCurrentReissueRequest(null));
      dispatch(resetReissueState());
    };
  }, [dispatch, request]);

  useEffect(() => {
    if (!activeRequest) return;
    setReassignTo(
      activeRequest?.assignedOpsMember?._id ||
        activeRequest?.assignedTo?._id ||
        "",
    );
  }, [activeRequest]);

  useEffect(() => {
    if (!error) return;
    toast.error(error);
    dispatch(resetReissueState());
  }, [dispatch, error]);

  const clearMessage = () => setMessage("");

  const handleStatusUpdate = async (status) => {
    try {
      await dispatch(
        updateReissueStatus({
          requestId: activeRequest.id,
          status,
          message: message.trim() || undefined,
        }),
      ).unwrap();
      toast.success(`Status moved to ${prettifyLabel(status)}`);
      clearMessage();
    } catch (err) {
      toast.error(err || "Failed to update status");
    }
  };

  const handleGenerateTicket = async () => {
    if (!selectedFlight) {
      toast.error("A selected replacement flight is required before ticket generation.");
      return;
    }

    try {
      await dispatch(
        generateReissueTicket({
          requestId: activeRequest.id,
          message: message.trim() || undefined,
        }),
      ).unwrap();
      toast.success("Reissued ticket generated successfully.");
      clearMessage();
    } catch (err) {
      toast.error(err || "Failed to generate revised ticket");
    }
  };

  const handleReassign = async () => {
    if (!reassignTo) {
      toast.error("Please choose an OPS member to reassign this request.");
      return;
    }

    if (
      String(reassignTo) ===
      String(activeRequest?.assignedOpsMember?._id || activeRequest?.assignedTo?._id || "")
    ) {
      toast.error("This request is already assigned to the selected OPS member.");
      return;
    }

    try {
      await dispatch(
        reassignReissueRequest({
          requestId: activeRequest.id,
          assignedTo: reassignTo,
          message: message.trim() || undefined,
        }),
      ).unwrap();
      toast.success("Offline reissue request reassigned.");
      clearMessage();
    } catch (err) {
      toast.error(err || "Failed to reassign request");
    }
  };

  const handleDownload = async () => {
    try {
      const response = await axios.get(
        `/reissue/offline/${activeRequest.id}/download-ticket`,
        { responseType: "blob" },
      );
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${activeRequest.requestId || "reissued-ticket"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(
        `${axios.defaults.baseURL}/reissue/offline/${activeRequest.id}/download-ticket`,
        "_blank",
        "noopener,noreferrer",
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-xl font-black text-slate-900">Offline Reissue Workspace</h2>
            <p className="mt-1 text-xs font-medium text-slate-400">
              {activeRequest?.requestId}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"
          >
            <FiX size={18} />
          </button>
        </div>

        <div className="max-h-[calc(92vh-88px)] overflow-y-auto px-6 py-6">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wider ${getStatusTone(activeRequest?.status)}`}
              >
                {prettifyLabel(activeRequest?.status)}
              </span>
              {activeRequest?.overdue && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-amber-700">
                  Overdue
                </span>
              )}
              {activeRequest?.breached && (
                <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-rose-700">
                  SLA Breached
                </span>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <Card label="Passenger" value={activeRequest?.metadata?.employeeName} />
              <Card label="Email" value={activeRequest?.metadata?.employeeEmail} />
              <Card label="Corporate" value={corporateName} />
              <Card label="Booking ID" value={activeRequest?.bookingId} />
              <Card label="Original PNR" value={activeRequest?.originalPnr} />
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Card label="Preferred Date" value={formatDate(activeRequest?.preferredDate)} />
              <Card label="Route" value={getJourneyLabel(selectedFlight)} />
              <Card
                label="SLA Deadline"
                value={formatDateTime(activeRequest?.slaDeadline)}
                accent={
                  activeRequest?.breached
                    ? "text-rose-700"
                    : activeRequest?.overdue
                      ? "text-amber-700"
                      : "text-slate-800"
                }
              />
              <Card label="Generated At" value={formatDateTime(activeRequest?.generatedAt)} />
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
              <div className="rounded-2xl border border-slate-200 p-5">
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                  Selected Replacement Flight
                </p>
                <div className="mt-4 space-y-2 text-sm text-slate-700">
                  <p className="text-base font-bold text-slate-900">
                    {selectedFlight?.airlineName ||
                      selectedFlight?.airlineCode ||
                      activeRequest?.airline ||
                      "Airline"}
                    {selectedFlight?.flightNumber ? ` | ${selectedFlight.flightNumber}` : ""}
                  </p>
                  <p>{getJourneyLabel(selectedFlight)}</p>
                  <p>
                    Departure {formatDate(selectedFlight?.departureDate || activeRequest?.preferredDate)}
                  </p>
                  <p>
                    Timing {formatDateTime(selectedFlight?.departureTime)} to{" "}
                    {formatDateTime(selectedFlight?.arrivalTime)}
                  </p>
                  <p>Duration {selectedFlight?.duration || PLACEHOLDER}</p>
                  <p>Stops {selectedFlight?.stops ?? PLACEHOLDER}</p>
                  <p>Passenger remarks: {activeRequest?.remarks || PLACEHOLDER}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                  Reissued Ticket
                </p>
                <div className="mt-4 space-y-3">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Ticket Status
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {ticketUrl ? "Generated and ready to download" : "Awaiting generation"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateTicket}
                    disabled={actionLoading || !selectedFlight}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0A4D68] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#08394d] disabled:opacity-50"
                  >
                    <FiRefreshCw size={16} className={actionLoading ? "animate-spin" : ""} />
                    {ticketUrl ? "Regenerate Revised Ticket" : "Generate Revised Ticket"}
                  </button>

                  {ticketUrl && canDownloadTicket && (
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700"
                    >
                      <FiDownload size={16} />
                      Download Revised Ticket
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                  Selected Segments
                </p>
                <span className="text-xs font-semibold text-slate-400">
                  {selectedSegments.length} segment(s)
                </span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {selectedSegments.length ? (
                  selectedSegments.map((segment, index) => (
                    <div
                      key={`${segment.origin || "segment"}-${segment.destination || index}-${index}`}
                      className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                    >
                      <p className="text-sm font-bold text-slate-900">
                        {getSegmentRoute(segment)}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {formatDateTime(segment.departureTime)} to{" "}
                        {formatDateTime(segment.arrivalTime)}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {segment.airlineName || segment.airlineCode || selectedFlight?.airlineName || "Airline"}
                        {segment.flightNumber ? ` | ${segment.flightNumber}` : ""}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">
                    Selected segment details are not available for this request.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                Fare Breakdown
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <Card
                  label="Previously Paid"
                  value={formatMoney(financialBreakdown.previouslyPaid, financialBreakdown.currency)}
                />
                <Card
                  label="New Flight"
                  value={formatMoney(financialBreakdown.newFlight, financialBreakdown.currency)}
                />
                <Card
                  label="New SSR"
                  value={formatMoney(financialBreakdown.newSSR, financialBreakdown.currency)}
                />
                <Card
                  label="SSR Refund"
                  value={formatMoney(financialBreakdown.ssrRefund, financialBreakdown.currency)}
                />
                <Card
                  label={
                    financialBreakdown.netRefund > 0 ? "Net Refund" : "Net Collection"
                  }
                  value={formatMoney(
                    financialBreakdown.netRefund > 0
                      ? financialBreakdown.netRefund
                      : financialBreakdown.netCollection,
                    financialBreakdown.currency,
                  )}
                  accent={financialBreakdown.netRefund > 0 ? "text-emerald-700" : "text-rose-700"}
                />
              </div>
              <div className="mt-3">
                <Card
                  label="Reissue Penalty"
                  value={formatMoney(financialBreakdown.reissuePenalty, financialBreakdown.currency)}
                />
              </div>
            </div>

            {activeRequest?.financialLedger && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
                <p className="text-[11px] font-black uppercase tracking-widest text-amber-800">
                  Cumulative Financial Ledger (Multi-Reissue Safe)
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <Card
                    label="Original Ticket Fare"
                    value={formatMoney(
                      activeRequest.financialLedger.originalTicketAmount || 0,
                      pricingCurrency,
                    )}
                  />
                  <Card
                    label="Original SSR Paid"
                    value={formatMoney(
                      activeRequest.financialLedger.originalSSR || 0,
                      pricingCurrency,
                    )}
                  />
                  <Card
                    label="Previous Reissue Charges"
                    value={formatMoney(
                      activeRequest.financialLedger.cumulativeReissueCharges || 0,
                      pricingCurrency,
                    )}
                  />
                  <Card
                    label="Previous SSR Cumulative"
                    value={formatMoney(
                      activeRequest.financialLedger.cumulativeSSR || 0,
                      pricingCurrency,
                    )}
                  />
                  <Card
                    label="Previous Collections"
                    value={formatMoney(
                      activeRequest.financialLedger.cumulativeCollections || 0,
                      pricingCurrency,
                    )}
                  />
                  <Card
                    label="Previous Refunds"
                    value={formatMoney(
                      activeRequest.financialLedger.cumulativeRefunds || 0,
                      pricingCurrency,
                    )}
                  />
                  <Card
                    label="Total Net Paid To Date"
                    value={formatMoney(
                      activeRequest.financialLedger.totalNetPaid || 0,
                      pricingCurrency,
                    )}
                    accent="text-emerald-700 font-bold"
                  />
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 p-5">
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                Assignment
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Card
                  label="Assigned OPS"
                  value={
                    activeRequest?.assignedOpsMember?.name ||
                    activeRequest?.assignedTo?.name ||
                    "Auto round robin"
                  }
                />
                <Card
                  label="Assignment Method"
                  value={prettifyLabel(activeRequest?.assignmentMode || "ROUND_ROBIN")}
                />
                <Card label="Assigned At" value={formatDateTime(activeRequest?.assignedAt)} />
                <Card
                  label="Generated By"
                  value={
                    activeRequest?.generatedBy?.name ||
                    activeRequest?.generatedBy?.email ||
                    PLACEHOLDER
                  }
                />
              </div>

              {canReassign && (
                <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                    <select
                      value={reassignTo}
                      onChange={(event) => setReassignTo(event.target.value)}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none"
                    >
                      <option value="">Select OPS member</option>
                      {opsMembers.map((member) => (
                        <option key={member._id} value={member._id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleReassign}
                      disabled={actionLoading || !reassignTo}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      <FiUser size={15} />
                      Reassign Request
                    </button>
                  </div>
                </div>
              )}

              {Array.isArray(activeRequest?.assignmentHistory) &&
                activeRequest.assignmentHistory.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {activeRequest.assignmentHistory.map((item, index) => (
                      <div
                        key={`${item.assignedAt || index}-${index}`}
                        className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                      >
                        <p className="text-sm font-semibold text-slate-800">
                          {item.assignedTo?.name ||
                            item.assignedTo?.email ||
                            item.assignedTo ||
                            "OPS member"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {prettifyLabel(item.mode)} | {formatDateTime(item.assignedAt)}
                        </p>
                        {item.remarks ? (
                          <p className="mt-1 text-sm text-slate-600">{item.remarks}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                Ops Note
              </p>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={3}
                placeholder="Add a servicing note for the next status update, reassignment, or ticket generation"
                className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#0A4D68] focus:ring-1 focus:ring-[#0A4D68]"
              />
            </div>

            {Array.isArray(activeRequest?.opsRemarks) && activeRequest.opsRemarks.length > 0 && (
              <div className="rounded-2xl border border-slate-200 p-5">
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                  Remarks History
                </p>
                <div className="mt-4 space-y-3">
                  {activeRequest.opsRemarks.map((item, index) => (
                    <div
                      key={`${item.at || index}-${index}`}
                      className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                    >
                      <p className="text-sm font-medium text-slate-700">
                        {item.message || PLACEHOLDER}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {prettifyLabel(item.byRole)} | {formatDateTime(item.at)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 p-5">
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                Next Actions
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {transitions.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    No additional status transitions are available from this stage.
                  </div>
                ) : (
                  transitions.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => handleStatusUpdate(status)}
                      disabled={actionLoading}
                      className="rounded-xl bg-[#0A4D68] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#08394d] disabled:opacity-50"
                    >
                      {actionLoading ? "Updating..." : prettifyLabel(status)}
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                Timeline
              </p>
              <div className="mt-4 space-y-4">
                {[...(activeRequest?.timeline || [])]
                  .sort((left, right) => new Date(right.at) - new Date(left.at))
                  .map((item, index) => (
                    <div key={`${item.at || index}-${index}`} className="flex gap-3">
                      <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                        {getTimelineIcon(item)}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{item.title}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {item.description || "No additional notes"}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {formatDateTime(item.at)}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
