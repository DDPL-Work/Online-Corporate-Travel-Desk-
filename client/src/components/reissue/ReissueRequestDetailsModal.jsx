import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiFileText,
  FiRefreshCw,
  FiRepeat,
  FiX,
} from "react-icons/fi";
import { toast } from "react-toastify";
import {
  clearReissueDetail,
  resetReissueState,
} from "../../Redux/Slice/reissueSlice";
import {
  confirmReissueRequest,
  fetchReissueRequestById,
  previewReissueQuote,
} from "../../Redux/Actions/reissueThunks";
import {
  canConfirmReissue,
  canPreviewQuote,
  formatDate,
  formatDateTime,
  formatMoney,
  getJourneyLabel,
  getModeTone,
  getStatusTone,
  prettifyLabel,
} from "./reissueUi";

function LabelValue({ label, value, mono = false, accent = false }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p
        className={`mt-1 text-sm font-semibold ${mono ? "font-mono" : ""} ${
          accent ? "text-[#0A4D68]" : "text-slate-800"
        }`}
      >
        {value || "—"}
      </p>
    </div>
  );
}

export default function ReissueRequestDetailsModal({ requestId, onClose }) {
  const dispatch = useDispatch();
  const {
    requestDetail,
    detailLoading,
    quoteLoading,
    confirmLoading,
    error,
  } = useSelector((state) => state.reissue);
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    if (requestId) {
      dispatch(fetchReissueRequestById(requestId));
    }

    return () => {
      dispatch(clearReissueDetail());
      dispatch(resetReissueState());
    };
  }, [dispatch, requestId]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(resetReissueState());
    }
  }, [dispatch, error]);

  const request = requestDetail;
  const timeline = useMemo(
    () => [...(request?.timeline || [])].sort((a, b) => new Date(b.at) - new Date(a.at)),
    [request],
  );

  const handleQuote = async () => {
    try {
      await dispatch(
        previewReissueQuote({
          requestId,
          resultIndex: request?.metadata?.selectedResultIndex,
        }),
      ).unwrap();
      toast.success("Reissue fare quote generated");
    } catch (err) {
      toast.error(err || "Failed to fetch quote");
    }
  };

  const handleConfirm = async () => {
    try {
      await dispatch(
        confirmReissueRequest({
          requestId,
          remarks: remarks.trim() || undefined,
        }),
      ).unwrap();
      toast.success("Reissue confirmation submitted");
    } catch (err) {
      toast.error(err || "Failed to confirm reissue");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0A4D68] text-white">
              <FiRepeat size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Reissue Tracker
              </h2>
              <p className="text-xs font-medium text-slate-400">
                {request?.reissueId || "Loading request"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"
          >
            <FiX size={18} />
          </button>
        </div>

        <div className="max-h-[calc(90vh-88px)] overflow-y-auto px-6 py-6">
          {detailLoading || !request ? (
            <div className="flex flex-col items-center gap-3 py-20 text-slate-400">
              <FiRefreshCw size={28} className="animate-spin" />
              <p className="text-sm font-semibold">Loading reissue details...</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wider ${getStatusTone(request.status)}`}
                >
                  {prettifyLabel(request.status)}
                </span>
                <span
                  className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wider ${getModeTone(request.mode)}`}
                >
                  {prettifyLabel(request.mode)}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  {prettifyLabel(request.billingMode)}
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <LabelValue label="Reissue ID" value={request.reissueId} mono />
                <LabelValue label="Original PNR" value={request.originalPnr} mono />
                <LabelValue label="Airline" value={request.airline} />
                <LabelValue
                  label="Last Updated"
                  value={formatDateTime(request.updatedAt)}
                />
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-5">
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                    Journey Change
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <LabelValue
                      label="Current Route"
                      value={getJourneyLabel(request.oldJourney)}
                      accent
                    />
                    <LabelValue
                      label="Requested Route"
                      value={getJourneyLabel(request.oldJourney)}
                      accent
                    />
                    <LabelValue
                      label="New Departure"
                      value={formatDate(request.newJourney?.departureDate)}
                    />
                    <LabelValue
                      label="New Return"
                      value={formatDate(request.newJourney?.returnDate)}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-5">
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                    Financials
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <LabelValue
                      label="Fare Difference"
                      value={formatMoney(request.fareDifference)}
                    />
                    <LabelValue
                      label="Reissue Charges"
                      value={formatMoney(request.reissueCharges)}
                    />
                    <LabelValue
                      label="Total Adjustment"
                      value={formatMoney(request.totalAdjustment)}
                      accent
                    />
                    <LabelValue
                      label="Billing Reservation"
                      value={prettifyLabel(request.billingReservation?.status)}
                    />
                  </div>
                </div>
              </div>

              {request.mode === "ONLINE" && (
                <div className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                        Self-Service Actions
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Generate the final fare quote to reserve internal
                        billing, then confirm the reissue once you review the
                        additional amount.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {canPreviewQuote(request) && (
                        <button
                          onClick={handleQuote}
                          disabled={quoteLoading}
                          className="rounded-xl bg-[#0A4D68] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#08394d] disabled:opacity-50"
                        >
                          {quoteLoading ? "Refreshing..." : "Get Fare Quote"}
                        </button>
                      )}
                      {canConfirmReissue(request) && (
                        <button
                          onClick={handleConfirm}
                          disabled={confirmLoading}
                          className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {confirmLoading ? "Confirming..." : "Confirm & Reissue"}
                        </button>
                      )}
                    </div>
                  </div>

                  {canConfirmReissue(request) && (
                    <textarea
                      rows={3}
                      value={remarks}
                      onChange={(event) => setRemarks(event.target.value)}
                      placeholder="Optional confirmation note"
                      className="mt-4 w-full rounded-2xl border border-slate-200 p-3 text-sm outline-none transition focus:border-[#0A4D68]"
                    />
                  )}
                </div>
              )}

              {false && request.mode === "OFFLINE" && (
                <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5">
                  <p className="text-sm font-bold text-violet-800">
                    This request is in offline servicing mode.
                  </p>
                  <p className="mt-1 text-sm text-violet-700">
                    Operations will handle supplier execution and upload the
                    revised ticket and invoice once available.
                  </p>
                </div>
              )}

              {(request.revisedTicket?.url ||
                request.revisedInvoice?.url ||
                request.uploadedTicket?.url ||
                request.uploadedInvoice?.url) && (
                <div className="rounded-2xl border border-slate-200 p-5">
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                    Revised Documents
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {(request.revisedTicket?.url || request.uploadedTicket?.url) && (
                      <a
                        href={request.revisedTicket?.url || request.uploadedTicket?.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <FiDownload size={16} />
                        Download Revised Ticket
                      </a>
                    )}
                    {(request.revisedInvoice?.url || request.uploadedInvoice?.url) && (
                      <a
                        href={request.revisedInvoice?.url || request.uploadedInvoice?.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <FiFileText size={16} />
                        Download Revised Invoice
                      </a>
                    )}
                  </div>
                </div>
              )}

              {Array.isArray(request.opsRemarks) && request.opsRemarks.length > 0 && (
                <div className="rounded-2xl border border-slate-200 p-5">
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                    Ops Remarks
                  </p>
                  <div className="mt-4 space-y-3">
                    {request.opsRemarks.map((item, index) => (
                      <div
                        key={`${item.at || index}-${index}`}
                        className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                      >
                        <p className="text-sm font-medium text-slate-700">
                          {item.message || "—"}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {prettifyLabel(item.byRole)} • {formatDateTime(item.at)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 p-5">
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                  Timeline
                </p>
                <div className="mt-4 space-y-4">
                  {timeline.map((item, index) => (
                    <div key={`${item.at || index}-${index}`} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                          {index === 0 ? (
                            <FiCheckCircle size={16} />
                          ) : (
                            <FiClock size={16} />
                          )}
                        </span>
                        {index !== timeline.length - 1 && (
                          <span className="mt-2 h-full w-px bg-slate-200" />
                        )}
                      </div>
                      <div className="pb-4">
                        <p className="text-sm font-bold text-slate-800">
                          {item.title}
                        </p>
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
          )}
        </div>
      </div>
    </div>
  );
}
