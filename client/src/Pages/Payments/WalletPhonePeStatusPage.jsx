import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  clearPaymentStatus,
  fetchWalletBalance,
  fetchWalletTransactions,
  fetchWalletPaymentStatus,
  verifyPhonePePayment,
} from "../../Redux/Slice/walletSlice";

const pageStyles = {
  background: "linear-gradient(180deg, #f8fafc 0%, #eef6ff 100%)",
  cardBorder: "1px solid rgba(15, 23, 42, 0.08)",
};

const statusConfig = {
  SUCCESS: {
    title: "Wallet recharge completed",
    tone: "text-emerald-700",
    badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    note: "Funds have been credited to your corporate wallet.",
  },
  PENDING: {
    title: "Payment is still processing",
    tone: "text-amber-700",
    badge: "bg-amber-50 text-amber-700 border border-amber-200",
    note: "We are verifying the payment on the backend. This page refreshes automatically.",
  },
  FAILED: {
    title: "Payment could not be completed",
    tone: "text-rose-700",
    badge: "bg-rose-50 text-rose-700 border border-rose-200",
    note: "No wallet credit has been applied. You can retry the recharge safely.",
  },
};

export default function WalletPhonePeStatusPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // 💾 Read origin stored before PhonePe redirect — fallback to /corporate-wallet
  const returnUrl = useRef(
    sessionStorage.getItem("phonepe_return_url") || "/corporate-wallet"
  ).current;
  const merchantOrderId =
    searchParams.get("merchantOrderId") ||
    searchParams.get("merchant_order_id") ||
    searchParams.get("orderId") ||
    searchParams.get("id");
  const transactionId =
    searchParams.get("transactionId") || searchParams.get("transaction_id");
  const gateway = searchParams.get("gateway") || "phonepe";

  const { paymentStatus, statusLoading, error } = useSelector(
    (state) => state.wallet,
  );

  useEffect(() => {
    if (!merchantOrderId) {
      return;
    }

    console.info("PhonePe redirect params captured", {
      merchantOrderId,
      transactionId,
      gateway,
      query: Object.fromEntries(searchParams.entries()),
    });
  }, [gateway, merchantOrderId, searchParams, transactionId]);

  useEffect(() => {
    if (!merchantOrderId) {
      return undefined;
    }

    dispatch(verifyPhonePePayment({ orderId: merchantOrderId }));

    return () => {
      dispatch(clearPaymentStatus());
    };
  }, [dispatch, merchantOrderId]);

  useEffect(() => {
    if (!merchantOrderId || ["SUCCESS", "FAILED"].includes(paymentStatus?.status)) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      dispatch(fetchWalletPaymentStatus({ orderId: merchantOrderId, gateway }));
    }, 4000);

    return () => {
      window.clearInterval(interval);
    };
  }, [dispatch, gateway, merchantOrderId, paymentStatus?.status]);

  useEffect(() => {
    if (paymentStatus?.status === "SUCCESS") {
      dispatch(fetchWalletBalance());
      dispatch(fetchWalletTransactions({ page: 1, limit: 10 }));
      // ✅ Clean up and redirect immediately back to origin page
      sessionStorage.removeItem("phonepe_return_url");
      navigate(returnUrl, { replace: true });
    }
  }, [dispatch, paymentStatus?.status, navigate, returnUrl]);

  // ⏱️ Fallback: if payment stays PENDING >30s, redirect anyway
  useEffect(() => {
    if (!merchantOrderId) return undefined;
    const timeout = window.setTimeout(() => {
      sessionStorage.removeItem("phonepe_return_url");
      navigate(returnUrl, { replace: true });
    }, 30000);
    return () => window.clearTimeout(timeout);
  }, [merchantOrderId, navigate, returnUrl]);

  const currentStatus = paymentStatus?.status || "PENDING";
  const ui = statusConfig[currentStatus] || statusConfig.PENDING;

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ background: pageStyles.background }}
    >
      <div
        className="w-full max-w-2xl rounded-[28px] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)] p-8"
        style={{ border: pageStyles.cardBorder }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-2xl bg-[#0A4D68] text-white flex items-center justify-center text-xl font-black">
            P
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              PhonePe Payment Status
            </h1>
            <p className="text-sm text-slate-500">
              Backend verification for wallet recharge
            </p>
          </div>
        </div>

        {!merchantOrderId ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700">
            Missing merchant order id in the redirect URL.
          </div>
        ) : (
          <>
            <div className="rounded-2xl bg-slate-50 p-5 border border-slate-200">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-black ${ui.badge}`}>
                  {currentStatus}
                </span>
                <span className="text-xs font-semibold tracking-wide uppercase text-slate-500">
                  Order: {merchantOrderId}
                </span>
              </div>

              <h2 className={`text-2xl font-black ${ui.tone}`}>{ui.title}</h2>
              <p className="mt-2 text-slate-600">{ui.note}</p>

              <div className="grid sm:grid-cols-2 gap-4 mt-6 text-sm">
                <div className="rounded-2xl bg-white border border-slate-200 p-4">
                  <p className="text-slate-400 uppercase text-[11px] font-black tracking-wider">
                    Amount
                  </p>
                  <p className="text-lg font-bold text-slate-900">
                    INR {Number(paymentStatus?.amount || 0).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-2xl bg-white border border-slate-200 p-4">
                  <p className="text-slate-400 uppercase text-[11px] font-black tracking-wider">
                    Wallet Balance
                  </p>
                  <p className="text-lg font-bold text-slate-900">
                    INR {Number(paymentStatus?.balance || 0).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-2xl bg-white border border-slate-200 p-4">
                  <p className="text-slate-400 uppercase text-[11px] font-black tracking-wider">
                    Payment ID
                  </p>
                  <p className="text-sm font-mono text-slate-700 break-all">
                    {paymentStatus?.paymentId || transactionId || "Awaiting payment attempt"}
                  </p>
                </div>
                <div className="rounded-2xl bg-white border border-slate-200 p-4">
                  <p className="text-slate-400 uppercase text-[11px] font-black tracking-wider">
                    Provider State
                  </p>
                  <p className="text-sm font-bold text-slate-700">
                    {paymentStatus?.state || "PENDING"}
                  </p>
                </div>
              </div>

              {paymentStatus?.failureReason ? (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  {paymentStatus.failureReason}
                </div>
              ) : null}

              {error ? (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/corporate-wallet"
                className="inline-flex items-center justify-center rounded-xl bg-[#0A4D68] px-5 py-3 text-sm font-black text-white"
              >
                Back to wallet
              </Link>
              <button
                type="button"
                onClick={() =>
                  dispatch(
                    fetchWalletPaymentStatus({
                      orderId: merchantOrderId,
                      gateway,
                    }),
                  )
                }
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-black text-slate-700"
              >
                {statusLoading ? "Refreshing..." : "Refresh status"}
              </button>
            </div>

            {currentStatus === "FAILED" ? (
              <p className="mt-4 text-sm text-slate-500">
                Retry the recharge from the wallet page. The backend will prevent duplicate credits.
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
