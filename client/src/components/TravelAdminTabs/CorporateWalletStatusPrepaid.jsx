import React, { useEffect, useState } from "react";
import {
  FiFilter,
  FiDownload,
  FiPlusCircle,
  FiArrowUpRight,
  FiArrowDownLeft,
} from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchWalletBalance,
  fetchWalletTransactions,
  initiateWalletRecharge,
  verifyWalletPayment,
} from "../../Redux/Slice/walletSlice";

const colors = {
  primary: "#0A4D68",
  light: "#F8FAFC",
  dark: "#1E293B",
};

export default function CorporateWallet() {
  const dispatch = useDispatch();

  const { balance, currency, transactions, loading, rechargeOrder } =
    useSelector((state) => state.wallet);

  const [filterType, setFilterType] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showRecharge, setShowRecharge] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // all | recharge

  // INITIAL LOAD
  useEffect(() => {
    dispatch(fetchWalletBalance());
    dispatch(fetchWalletTransactions());
  }, [dispatch]);

  // APPLY FILTERS
  const applyFilters = () => {
    dispatch(
      fetchWalletTransactions({
        type: filterType !== "All" ? filterType.toLowerCase() : undefined,
        dateFrom: startDate || undefined,
        dateTo: endDate || undefined,
      })
    );
  };


  useEffect(() => {
  if (!rechargeOrder) return;

  const openRazorpay = async () => {
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      alert("Razorpay SDK failed to load");
      return;
    }

    const options = {
      key: rechargeOrder.keyId,
      amount: rechargeOrder.amount,
      currency: rechargeOrder.currency,
      name: "Corporate Wallet Recharge",
      description: "Wallet Top-up",
      order_id: rechargeOrder.orderId,

      handler: function (response) {
        dispatch(
          verifyWalletPayment({
            orderId: rechargeOrder.orderId,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
            amount: rechargeOrder.amount,
          })
        ).then(() => {
          dispatch(fetchWalletBalance());
          dispatch(fetchWalletTransactions());
        });
        console.log("Signature", signature);
      },

      theme: {
        color: colors.primary,
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  openRazorpay();
}, [rechargeOrder, dispatch]);




  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleRecharge = async () => {
    if (!rechargeAmount || rechargeAmount <= 0) {
      alert("Enter a valid amount");
      return;
    }

    const result = await dispatch(
      initiateWalletRecharge({ amount: Number(rechargeAmount) })
    );

    if (result.error) return;

    setShowRecharge(false);
  };

  const visibleTransactions =
    activeTab === "recharge"
      ? transactions.filter((t) => t.type === "credit")
      : transactions;

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: colors.light }}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-3xl font-bold" style={{ color: colors.dark }}>
            Corporate Wallet
          </h1>

          <button
            onClick={() => setShowRecharge(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-lg text-white font-semibold shadow hover:opacity-90"
            style={{ backgroundColor: colors.primary }}
          >
            <FiPlusCircle size={18} />
            Recharge Wallet
          </button>
          {/* RECHARGE MODAL */}
          {showRecharge && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Recharge Wallet</h3>
                  <button
                    onClick={() => setShowRecharge(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                {/* Amount Input */}
                <label className="text-sm text-gray-600 mb-1 block">
                  Enter Amount
                </label>
                <input
                  type="number"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  placeholder="Enter recharge amount"
                  className="w-full border rounded-lg px-3 py-2 mb-4"
                />

                {/* Quick Amount Buttons */}
                <div className="flex gap-3 mb-6">
                  {[1000, 5000, 10000].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setRechargeAmount(amt)}
                      className="flex-1 border rounded-lg py-2 text-sm hover:bg-gray-100"
                    >
                      ₹ {amt.toLocaleString()}
                    </button>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowRecharge(false)}
                    className="px-4 py-2 rounded-lg border"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleRecharge}
                    className="px-4 py-2 rounded-lg text-white font-medium"
                    style={{ backgroundColor: colors.primary }}
                  >
                    Proceed to Pay
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* BALANCE CARD */}
        <div className="bg-white rounded-xl shadow p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <p className="text-sm text-gray-500">Available Balance</p>
            <h2
              className="text-4xl font-bold mt-2"
              style={{ color: colors.primary }}
            >
              {currency} {balance.toLocaleString()}
            </h2>
          </div>

          <div className="text-sm text-gray-500">Last updated just now</div>
        </div>

        {/* FILTERS */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <FiFilter className="text-xl" style={{ color: colors.primary }} />
            <h2 className="text-lg font-semibold">Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border rounded-lg px-3 py-2"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border rounded-lg px-3 py-2"
            />
            <select
              className="border rounded-lg px-3 py-2"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option>All</option>
              <option>Credit</option>
              <option>Debit</option>
            </select>

            <button
              onClick={applyFilters}
              className="text-white rounded-lg px-4 py-2 font-medium"
              style={{ backgroundColor: colors.primary }}
            >
              Apply
            </button>

            <button className="flex items-center justify-center gap-2 border rounded-lg px-4 py-2 text-sm">
              <FiDownload />
              Export
            </button>
          </div>
        </div>

        {/* TRANSACTIONS */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {/* HEADER + TABS */}
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold mb-4">Transaction History</h2>

            {/* HORIZONTAL TABS */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition
          ${
            activeTab === "all"
              ? "bg-[#0A4D68] text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
              >
                All Transactions
              </button>

              <button
                onClick={() => setActiveTab("recharge")}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition
          ${
            activeTab === "recharge"
              ? "bg-[#0A4D68] text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
              >
                Recharge History
              </button>
            </div>
          </div>

          {/* TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ backgroundColor: colors.primary }}>
                <tr>
                  {["Date", "Description", "Type", "Amount"].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-white font-medium text-left"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="4" className="text-center py-10 text-gray-500">
                      Loading transactions...
                    </td>
                  </tr>
                ) : visibleTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-10 text-gray-500">
                      No records found
                    </td>
                  </tr>
                ) : (
                  visibleTransactions.map((t) => (
                    <tr
                      key={t._id}
                      className="border-t hover:bg-gray-50 transition"
                    >
                      <td className="px-6 py-4">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>

                      <td className="px-6 py-4">{t.description}</td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            t.type === "credit"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {t.type === "credit" ? (
                            <FiArrowDownLeft />
                          ) : (
                            <FiArrowUpRight />
                          )}
                          {t.type}
                        </span>
                      </td>

                      <td
                        className={`px-6 py-4 font-semibold ${
                          t.type === "credit"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {t.type === "credit" ? "+" : "-"} ₹
                        {t.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
