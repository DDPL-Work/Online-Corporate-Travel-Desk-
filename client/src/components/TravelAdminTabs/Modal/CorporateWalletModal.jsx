import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { FiX, FiHash, FiActivity, FiClock, FiCreditCard, FiArrowRight } from "react-icons/fi";
import { C } from "../../Shared/color";
import { fetchServiceChargeDetails } from "../../../Redux/Slice/walletSlice";

export const StatusBadge = ({ status }) => {
  const config = {
    success: {
      bg: "#ECFDF5",
      text: "#065F46",
      border: "#A7F3D0",
      label: "Success",
    },
    credit: {
      bg: "#ECFDF5",
      text: "#065F46",
      border: "#A7F3D0",
      label: "Credit",
    },
    debit: {
      bg: "#FEF2F2",
      text: "#991B1B",
      border: "#FECACA",
      label: "Debit",
    },
    pending: {
      bg: "#FFFBEB",
      text: "#92400E",
      border: "#FDE68A",
      label: "Pending",
    },
    failed: {
      bg: "#FEF2F2",
      text: "#991B1B",
      border: "#FECACA",
      label: "Failed",
    },
  };
  const style = config[status] || config.success;
  return (
    <span
      className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm"
      style={{
        backgroundColor: style.bg,
        color: style.text,
        borderColor: style.border,
      }}
    >
      {style.label}
    </span>
  );
};

export const DetailItem = ({ label, value, icon, isCode, isBold }) => (
  <div className="flex gap-3">
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-sm"
      style={{ background: C.offWhite, borderColor: C.border }}
    >
      {icon}
    </div>
    <div className="min-w-0">
      <p
        className="text-[9px] font-black uppercase tracking-widest mb-1"
        style={{ color: C.muted }}
      >
        {label}
      </p>
      <p
        className={`text-[12px] truncate ${isCode ? "font-mono px-1.5 py-0.5 rounded border" : "font-black"} ${isBold ? "" : ""}`}
        style={{
          background: isCode ? C.offWhite : "transparent",
          borderColor: isCode ? C.border : "transparent",
          color: isBold ? C.navy : C.muted,
        }}
      >
        {value || "—"}
      </p>
    </div>
  </div>
);

export const DetailRow = ({ label, value }) => (
  <div
    className="flex justify-between items-center py-2 border-b last:border-0"
    style={{ borderColor: C.border }}
  >
    <p
      className="text-[10px] font-bold uppercase tracking-tight"
      style={{ color: C.muted }}
    >
      {label}
    </p>
    <p
      className="text-[10px] font-black font-mono select-all px-2 py-0.5 rounded border"
      style={{ background: C.offWhite, borderColor: C.border, color: C.navy }}
    >
      {value || "—"}
    </p>
  </div>
);

export const RechargeDetailsModal = ({ tx, onClose }) => {
  const navigate = useNavigate();
  const processorName = tx.processedBy?.name
    ? `${tx.processedBy.name.firstName || ""} ${tx.processedBy.name.lastName || ""}`.trim()
    : "System Protocol";

  const handleViewBooking = () => {
    if (!tx.bookingId?._id) return;
    const route =
      tx.bookingModel === "HotelBookingRequest"
        ? `/employee-hotel-booking/${tx.bookingId._id}?source=wallet`
        : `/employee-flight-booking/${tx.bookingId._id}?source=wallet`;
    // We pass returnToWalletTx and returnToWalletTab so the ledger can reopen this tx
    navigate(route, {
      state: { returnToWalletTx: tx._id, returnToWalletTab: "booking" } // Assuming credit/deductions mostly show in booking tab
    });
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 backdrop-blur-sm animate-in fade-in duration-300"
        style={{ background: `${C.navy}99` }}
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-4xl rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border"
        style={{ background: C.white, borderColor: `${C.white}33` }}
      >
        {/* Header */}
        <div
          className="p-8 text-white relative"
          style={{
            background: `linear-gradient(135deg, ${C.navyMid}, ${C.navy})`,
          }}
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest"
                  style={{
                    background: `${C.gold}33`,
                    borderColor: `${C.gold}4D`,
                    color: C.gold,
                  }}
                >
                  Transaction
                </div>
                <div
                  className="px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest"
                  style={{
                    background:
                      tx.status === "completed"
                        ? `${C.emerald}33`
                        : `${C.amber}33`,
                    borderColor:
                      tx.status === "completed"
                        ? `${C.emerald}4D`
                        : `${C.amber}4D`,
                    color: tx.status === "completed" ? C.emerald : C.amber,
                  }}
                >
                  {tx.status}
                </div>
              </div>
              <h2 className="text-2xl font-black tracking-tight leading-none">
                Transaction Details
              </h2>
              <p className="text-white/60 text-[10px] font-bold mt-2 uppercase tracking-[2px]">
                Transaction ID: {tx._id}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10"
            >
              <FiX size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8 overflow-y-auto max-h-[60vh]">
          {/* Main Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <DetailItem
              label="Transaction ID"
              value={tx.transactionId || tx._id}
              icon={<FiHash style={{ color: C.gold }} />}
              isCode
            />
            <DetailItem
              label="Amount"
              value={`₹${(tx.amount || 0).toLocaleString()}`}
              icon={<FiActivity style={{ color: C.emerald }} />}
              isBold
            />
            <DetailItem
              label="Date & Time"
              value={new Date(tx.createdAt).toLocaleString("en-IN", {
                day: "2-digit",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
              icon={<FiClock className="text-blue-500" />}
            />
            <DetailItem
              label="Payment Gateway"
              value={tx.paymentGateway?.name?.toUpperCase() || "N/A"}
              icon={<FiCreditCard className="text-violet-500" />}
            />
          </div>

          {/* User Info & Balance Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              className="rounded-2xl p-6 border"
              style={{ background: C.offWhite, borderColor: C.border }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${C.navyMid}, ${C.navy})`,
                  }}
                >
                  {tx.processedBy?.name?.firstName?.[0] || "S"}
                  {tx.processedBy?.name?.lastName?.[0] || "P"}
                </div>
                <div>
                  <p
                    className="text-[10px] font-black uppercase tracking-widest mb-1"
                    style={{ color: C.muted }}
                  >
                    Processed By
                  </p>
                  <p className="text-sm font-black" style={{ color: C.navy }}>
                    {processorName}
                  </p>
                  <p
                    className="text-[11px] font-bold"
                    style={{ color: C.muted }}
                  >
                    {tx.processedBy?.email ||
                      "system.protocol@corporate.travel"}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div
                className="p-4 rounded-2xl border shadow-sm"
                style={{ background: C.white, borderColor: C.border }}
              >
                <p
                  className="text-[9px] font-black uppercase tracking-widest mb-2"
                  style={{ color: C.muted }}
                >
                  Balance Before
                </p>
                <p className="text-lg font-black" style={{ color: C.muted }}>
                  ₹
                  {parseFloat(tx.balanceBefore || 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div
                className="p-4 rounded-2xl border shadow-sm"
                style={{
                  background: `${C.gold}0D`,
                  borderColor: `${C.gold}33`,
                }}
              >
                <p
                  className="text-[9px] font-black uppercase tracking-widest mb-2"
                  style={{ color: C.gold }}
                >
                  Balance After
                </p>
                <p className="text-lg font-black" style={{ color: C.navy }}>
                  ₹
                  {parseFloat(tx.balanceAfter || 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Technical Metadata */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div
                className="w-1.5 h-4 rounded-full"
                style={{ background: C.gold }}
              />
              <h3
                className="text-xs font-black uppercase tracking-wider"
                style={{ color: C.navy }}
              >
                Metadata
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
              <DetailRow
                label="Gateway Order Ref"
                value={tx.paymentGateway?.orderId}
              />
              <DetailRow
                label="Gateway Payment Ref"
                value={tx.paymentGateway?.paymentId}
              />
              <DetailRow
                label="Provider Identifier"
                value={tx.paymentGateway?.providerOrderId}
              />
              <DetailRow label="Description" value={tx.description} />
              {tx.metadata?.source && (
                <DetailRow label="Sync Source" value={tx.metadata.source} />
              )}
              {tx.metadata?.creditedAt && (
                <DetailRow
                  label="Credit Time"
                  value={new Date(tx.metadata.creditedAt).toLocaleString()}
                />
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="p-6 border-t flex justify-end gap-3"
          style={{ background: C.offWhite, borderColor: C.border }}
        >
          {tx.bookingId?._id && (
            <button
              onClick={handleViewBooking}
              className="px-6 py-3 rounded-xl border font-black text-xs uppercase tracking-[2px] transition-all hover:bg-slate-50"
              style={{ borderColor: C.border, color: C.navy }}
            >
              View Booking
            </button>
          )}
          <button
            onClick={onClose}
            className="px-8 py-3 rounded-xl text-white font-black text-xs uppercase tracking-[2px] shadow-xl hover:scale-105 transition-all active:scale-95"
            style={{ background: C.navy }}
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export const ServiceFeeDetailsModal = ({ tx, onClose }) => {
  const navigate = useNavigate();
  const processorName = tx.processedBy?.name
    ? `${tx.processedBy.name.firstName || ""} ${tx.processedBy.name.lastName || ""}`.trim()
    : "System Protocol";

  const dispatch = useDispatch();
  const [serviceDetails, setServiceDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const handleViewBooking = () => {
    if (!tx.bookingId?._id) return;
    
    if (tx.bookingModel === "HotelBookingRequest") {
      navigate(`/employee-hotel-booking/${tx.bookingId._id}?source=wallet`, { state: { returnToWalletFeeTx: tx._id } });
    } else {
      navigate(`/employee-flight-booking/${tx.bookingId._id}?source=wallet`, { state: { returnToWalletFeeTx: tx._id } });
    }
    onClose();
  };

  useEffect(() => {
    if (tx.bookingId?._id) {
      setLoadingDetails(true);
      dispatch(fetchServiceChargeDetails({ 
        bookingId: tx.bookingId._id, 
        operationType: tx.operationType 
      }))
        .unwrap()
        .then((res) => {
          setServiceDetails(res);
          setLoadingDetails(false);
        })
        .catch(() => {
          setLoadingDetails(false);
        });
    }
  }, [tx, dispatch]);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 backdrop-blur-sm animate-in fade-in duration-300"
        style={{ background: `${C.navy}99` }}
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-4xl rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border"
        style={{ background: C.white, borderColor: `${C.white}33` }}
      >
        {/* Header */}
        <div
          className="p-8 text-white relative"
          style={{
            background: `linear-gradient(135deg, ${C.navyMid}, ${C.navy})`,
          }}
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest"
                  style={{
                    background: `${C.gold}33`,
                    borderColor: `${C.gold}4D`,
                    color: C.gold,
                  }}
                >
                  Transaction
                </div>
                <div
                  className="px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest"
                  style={{
                    background: `${C.emerald}33`,
                    borderColor: `${C.emerald}4D`,
                    color: C.emerald,
                  }}
                >
                  {tx.status}
                </div>
              </div>
              <h2 className="text-2xl font-black tracking-tight leading-none">
                Service Fee Details
              </h2>
              <p className="text-white/60 text-[10px] font-bold mt-2 uppercase tracking-[2px]">
                Order ID: {tx.bookingId?.orderId || "N/A"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10"
            >
              <FiX size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8 overflow-y-auto max-h-[60vh]">
          {/* Main Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <DetailItem
              label="Order ID"
              value={tx.bookingId?.orderId || "N/A"}
              icon={<FiHash style={{ color: C.gold }} />}
              isCode
            />
            <DetailItem
              label="Amount"
              value={`₹${(tx.amount || 0).toLocaleString()}`}
              icon={<FiActivity style={{ color: C.emerald }} />}
              isBold
            />
            <DetailItem
              label="Date & Time"
              value={new Date(tx.createdAt).toLocaleString("en-IN", {
                day: "2-digit",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
              icon={<FiClock className="text-blue-500" />}
            />
          </div>

          {/* User Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              className="rounded-2xl p-6 border"
              style={{ background: C.offWhite, borderColor: C.border }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${C.navyMid}, ${C.navy})`,
                  }}
                >
                  {tx.processedBy?.name?.firstName?.[0] || "S"}
                  {tx.processedBy?.name?.lastName?.[0] || "P"}
                </div>
                <div>
                  <p
                    className="text-[10px] font-black uppercase tracking-widest mb-1"
                    style={{ color: C.muted }}
                  >
                    Processed By
                  </p>
                  <p className="text-sm font-black" style={{ color: C.navy }}>
                    {processorName}
                  </p>
                  <p
                    className="text-[11px] font-bold"
                    style={{ color: C.muted }}
                  >
                    {tx.processedBy?.email ||
                      "system.protocol@corporate.travel"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Service Fee Rule Snapshot */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-2">
              <div
                className="w-1.5 h-4 rounded-full"
                style={{ background: C.emerald }}
              />
              <h3
                className="text-xs font-black uppercase tracking-wider"
                style={{ color: C.navy }}
              >
                Service Fee Rule Applied
              </h3>
            </div>

            <div
              className="rounded-2xl p-6 border text-xs"
              style={{ background: C.offWhite, borderColor: C.border }}
            >
              {loadingDetails ? (
                <p className="text-slate-400 font-bold uppercase tracking-widest animate-pulse">
                  Loading rule details...
                </p>
              ) : serviceDetails?.ruleSnapshot ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Action</p>
                    <p className="font-bold text-navy">{serviceDetails.action}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Product</p>
                    <p className="font-bold text-navy">{serviceDetails.ruleSnapshot.productType}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Trip Type</p>
                    <p className="font-bold text-navy">{serviceDetails.ruleSnapshot.tripType}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Fee Type / Value</p>
                    <p className="font-bold text-navy">
                      {serviceDetails.ruleSnapshot.feeType}
                      <span className="opacity-50 mx-1">|</span>
                      {serviceDetails.ruleSnapshot.feeType === "Percentage"
                        ? `${serviceDetails.ruleSnapshot.feeValue}%`
                        : `₹${parseFloat(serviceDetails.ruleSnapshot.feeValue || 0).toLocaleString()}`}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Notes</p>
                    <p className="font-bold text-navy">{serviceDetails.notes || "None"}</p>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 font-bold uppercase tracking-widest">
                  No rule details available
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="p-6 border-t flex justify-end gap-3"
          style={{ background: C.offWhite, borderColor: C.border }}
        >
          {tx.bookingId?._id && (
            <button
              onClick={handleViewBooking}
              className="px-6 py-3 rounded-xl font-black text-xs uppercase tracking-[2px] shadow-sm hover:scale-105 transition-all active:scale-95 flex items-center gap-2"
              style={{ background: C.white, color: C.navy, border: `1px solid ${C.border}` }}
            >
              View Details <FiArrowRight size={14} />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-8 py-3 rounded-xl text-white font-black text-xs uppercase tracking-[2px] shadow-xl hover:scale-105 transition-all active:scale-95"
            style={{ background: C.navy }}
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};