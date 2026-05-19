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
import { canConfirmReissue, canPreviewQuote } from "./reissueUi";
import {
  safeDate,
  safeDateTime,
  safeMoney,
  getStatusTone,
  getPnr,
  getTicketUrl,
  getRoute,
  getAirline,
  getStatus,
  resolvePayload,
} from "../../utils/reissueResolvers";

const prettifyLabel = (s) => {
  if (!s) return "N/A";
  return String(s)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

/* ─────────────────────────────────────────────────────────────
   HELPERS
   Online reissue DTO fields (from toReissueDto):
     id, reissueId, originalPnr, newPnr, airline, mode, status,
     billingMode, oldJourney, newJourney, fareDifference,
     reissueCharges, totalAdjustment, billingReservation,
     opsRemarks[], timeline[], revisedTicket, uploadedTicket,
     revisedInvoice, uploadedInvoice, createdAt, updatedAt
   ───────────────────────────────────────────────────────────── */

const safeVal = (v) => (v != null && v !== "" ? v : "N/A");

const getJourneyLabel = (journey) => {
  if (!journey) return "N/A";
  const sectors = Array.isArray(journey.sectors) ? journey.sectors : [];
  if (sectors.length) return sectors.join(" / ");
  const segs = Array.isArray(journey.segments) ? journey.segments : [];
  if (!segs.length) return "N/A";
  const first = segs[0];
  const last = segs[segs.length - 1];
  return `${first?.origin?.airportCode || first?.origin || "?"} → ${last?.destination?.airportCode || last?.destination || "?"}`;
};

/* ─────────────────────────────────────────────────────────────
   LABEL VALUE CELL
   ───────────────────────────────────────────────────────────── */
function LabelValue({ label, value, mono = false, accent = false }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p
        className={`mt-1 text-sm font-semibold ${mono ? "font-mono" : ""} ${accent ? "text-[#0A4D68]" : "text-slate-800"}`}
      >
        {value || "N/A"}
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MODAL
   ───────────────────────────────────────────────────────────── */
export default function ReissueRequestDetailsModal({ requestId, onClose }) {
  const dispatch = useDispatch();
  const { requestDetail, detailLoading, quoteLoading, confirmLoading, error } =
    useSelector((s) => s.reissue);

  const [remarks, setRemarks] = useState("");

  /* Fetch on mount */
  useEffect(() => {
    if (requestId) dispatch(fetchReissueRequestById(requestId));
    return () => {
      dispatch(clearReissueDetail());
      dispatch(resetReissueState());
    };
  }, [dispatch, requestId]);

  /* Surface errors */
  useEffect(() => {
    if (error) {
      toast.error(typeof error === "string" ? error : "Something went wrong");
      dispatch(resetReissueState());
    }
  }, [dispatch, error]);

  const request = resolvePayload(requestDetail);

  /* Sort timeline descending by .at */
  const timeline = useMemo(
    () =>
      [...(request?.timeline || [])].sort(
        (a, b) => new Date(b.at) - new Date(a.at),
      ),
    [request],
  );

  /* ── Actions ── */
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
      toast.error(typeof err === "string" ? err : "Failed to fetch quote");
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
      toast.success("✅ Reissue confirmation submitted successfully");
    } catch (err) {
      const msg =
        typeof err === "string"
          ? err
          : err?.message || "Failed to confirm reissue";
      toast.error(`⚠️ ${msg}`);
    }
  };

  /* ── PNR resolution ── */
  const pnr = getPnr(request);

  /* ── Ticket / invoice URLs ── */
  const ticketUrl =
    getTicketUrl(request) ||
    request?.revisedTicket?.url ||
    request?.uploadedTicket?.url ||
    null;

  const invoiceUrl =
    request?.revisedInvoice?.url || request?.uploadedInvoice?.url || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* Modal Header */}
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
                {request?.reissueId || "Loading request..."}
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

        {/* Modal Body */}
        <div className="max-h-[calc(90vh-88px)] overflow-y-auto px-6 py-6">
          {detailLoading || !request ? (
            <div className="flex flex-col items-center gap-3 py-20 text-slate-400">
              <FiRefreshCw size={28} className="animate-spin" />
              <p className="text-sm font-semibold">
                Loading reissue details...
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Status badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wider ${getStatusTone(getStatus(request))}`}
                >
                  {prettifyLabel(getStatus(request))}
                </span>
                {request.mode && (
                  <span
                    className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wider ${
                      request.mode === "ONLINE"
                        ? "bg-teal-50 text-teal-700 border-teal-200"
                        : "bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    {request.mode}
                  </span>
                )}
                {request.billingMode && (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {request.billingMode}
                  </span>
                )}
              </div>

              {/* Core info grid */}
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <LabelValue
                  label="Reissue ID"
                  value={safeVal(request.reissueId)}
                  mono
                />
                <LabelValue label="Original PNR" value={pnr} mono />

                <LabelValue label="Airline" value={getAirline(request)} />
                <LabelValue
                  label="Last Updated"
                  value={safeDateTime(request.updatedAt)}
                />
              </div>

              {/* Journey + Financials */}
              <div className="grid gap-3 lg:grid-cols-2">
                {/* Journey */}
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
                      value={
                        getJourneyLabel(request.newJourney) !== "N/A"
                          ? getJourneyLabel(request.newJourney)
                          : getJourneyLabel(request.oldJourney)
                      }
                      accent
                    />
                    <LabelValue
                      label="New Departure"
                      value={safeDate(
                        request.newJourney?.departureDate ||
                          request.preferredDate,
                      )}
                    />
                    <LabelValue
                      label="New Return"
                      value={safeDate(request.newJourney?.returnDate)}
                    />
                  </div>
                </div>

                {/* Financials */}
                <div className="rounded-2xl border border-slate-200 p-5">
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                    Financials
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <LabelValue
                      label="Fare Difference"
                      value={
                        request.fareDifference != null
                          ? safeMoney(request.fareDifference)
                          : "N/A"
                      }
                    />
                    <LabelValue
                      label="Reissue Charges"
                      value={
                        request.reissueCharges != null
                          ? safeMoney(request.reissueCharges)
                          : "N/A"
                      }
                    />
                    <LabelValue
                      label="Total Adjustment"
                      value={
                        request.totalAdjustment != null
                          ? safeMoney(request.totalAdjustment)
                          : "N/A"
                      }
                      accent
                    />
                    <LabelValue
                      label="Billing Reservation"
                      value={prettifyLabel(request.billingReservation?.status)}
                    />
                  </div>
                </div>
              </div>

              {/* Online self-service actions */}
              {request.mode === "ONLINE" && (
                <div className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                        Self-Service Actions
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Generate the final fare quote then confirm the reissue.
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
                          {confirmLoading
                            ? "Confirming..."
                            : "Confirm & Reissue"}
                        </button>
                      )}
                    </div>
                  </div>
                  {canConfirmReissue(request) && (
                    <textarea
                      rows={3}
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Optional confirmation note"
                      className="mt-4 w-full rounded-2xl border border-slate-200 p-3 text-sm outline-none transition focus:border-[#0A4D68]"
                    />
                  )}
                </div>
              )}

              {/* Offline info banner */}
              {request.mode === "OFFLINE" && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 text-amber-600">ℹ️</span>
                    <div>
                      <p className="text-sm font-bold text-amber-900">
                        This request is in offline servicing mode.
                      </p>
                      <p className="mt-1 text-sm text-amber-800">
                        Operations will handle supplier execution and upload the
                        revised ticket once available. You will receive a
                        notification when your reissued ticket is ready.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Revised Documents */}
              {(ticketUrl || invoiceUrl) && (
                <div className="rounded-2xl border border-slate-200 p-5">
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                    Revised Documents
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {ticketUrl && (
                      <button
                        onClick={async () => {
                          try {
                            const response = await fetch(ticketUrl);
                            const blob = await response.blob();
                            const blobUrl = window.URL.createObjectURL(blob);
                            const link = document.createElement("a");
                            link.href = blobUrl;
                            link.download = `revised-ticket-${request?.reissueId || "ticket"}.pdf`;
                            document.body.appendChild(link);
                            link.click();
                            link.remove();
                            window.URL.revokeObjectURL(blobUrl);
                          } catch (error) {
                            console.error("Failed to download ticket:", error);
                            window.open(ticketUrl, "_blank");
                          }
                        }}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
                      >
                        <FiDownload size={16} /> Download Revised Ticket
                      </button>
                    )}
                    {invoiceUrl && (
                      <button
                        onClick={async () => {
                          try {
                            const response = await fetch(invoiceUrl);
                            const blob = await response.blob();
                            const blobUrl = window.URL.createObjectURL(blob);
                            const link = document.createElement("a");
                            link.href = blobUrl;
                            link.download = `revised-invoice-${request?.reissueId || "invoice"}.pdf`;
                            document.body.appendChild(link);
                            link.click();
                            link.remove();
                            window.URL.revokeObjectURL(blobUrl);
                          } catch (error) {
                            console.error("Failed to download invoice:", error);
                            window.open(invoiceUrl, "_blank");
                          }
                        }}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
                      >
                        <FiFileText size={16} /> Download Revised Invoice
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* OPS Remarks */}
              {Array.isArray(request.opsRemarks) &&
                request.opsRemarks.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 p-5">
                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                      Ops Remarks
                    </p>
                    <div className="mt-4 space-y-3">
                      {request.opsRemarks.map((item, idx) => (
                        <div
                          key={`${item.at || idx}-${idx}`}
                          className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                        >
                          <p className="text-sm font-medium text-slate-700">
                            {item.message || "—"}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {prettifyLabel(item.byRole)} •{" "}
                            {safeDateTime(item.at)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Timeline */}
              <div className="rounded-2xl border border-slate-200 p-5">
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                  Timeline
                </p>
                {timeline.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-400">
                    No timeline events yet.
                  </p>
                ) : (
                  <div className="mt-4 space-y-4">
                    {timeline.map((item, idx) => (
                      <div
                        key={`${item.at || idx}-${idx}`}
                        className="flex gap-3"
                      >
                        <div className="flex flex-col items-center">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                            {idx === 0 ? (
                              <FiCheckCircle size={16} />
                            ) : (
                              <FiClock size={16} />
                            )}
                          </span>
                          {idx !== timeline.length - 1 && (
                            <span className="mt-2 h-full w-px bg-slate-200" />
                          )}
                        </div>
                        <div className="pb-4">
                          <p className="text-sm font-bold text-slate-800">
                            {item.title ||
                              prettifyLabel(item.status) ||
                              "Event"}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {item.description || "No additional notes"}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {safeDateTime(item.at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
