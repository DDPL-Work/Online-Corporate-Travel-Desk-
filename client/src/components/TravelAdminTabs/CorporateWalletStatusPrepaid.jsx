import React, { useEffect, useState } from "react";
import { FiFilter, FiDownload, FiPlusCircle } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchWalletBalance,
  fetchWalletTransactions,
} from "../../Redux/Slice/walletSlice";

const colors = {
  primary: "#0A4D68",
  light: "#F8FAFC",
  dark: "#1E293B",
};

export default function CorporateWallet() {
  const dispatch = useDispatch();

  const { balance, currency, transactions, loading } = useSelector(
    (state) => state.wallet
  );

  const [filterType, setFilterType] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

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

  return (
    <div className="p-6" style={{ backgroundColor: colors.light }}>
      <div className="max-w-5xl mx-auto">
        {/* HEADER */}
        <h1 className="text-3xl font-bold mb-6" style={{ color: colors.dark }}>
          Corporate Wallet
        </h1>

        {/* BALANCE */}
        <div className="bg-white shadow rounded-lg p-6 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Balance Info */}
          <div>
            <p className="text-gray-500 text-sm">Available Balance</p>
            <h2
              className="text-4xl font-bold mt-1"
              style={{ color: colors.primary }}
            >
              {currency} {balance.toLocaleString()}
            </h2>
          </div>

          {/* Recharge Button */}
          <button
            // onClick={() => setOpenModal(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-semibold shadow transition hover:opacity-90"
            style={{ backgroundColor: colors.primary }}
          >
            <FiPlusCircle size={18} />
            Recharge Wallet
          </button>
        </div>

        {/* FILTERS */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FiFilter className="text-xl text-[#0A4D68]" />
            <h2 className="text-lg font-semibold">Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border p-2 rounded"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border p-2 rounded"
            />
            <select
              className="border p-2 rounded"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option>All</option>
              <option>Credit</option>
              <option>Debit</option>
            </select>
            <button
              onClick={applyFilters}
              className="text-white rounded px-4 py-2"
              style={{ backgroundColor: colors.primary }}
            >
              Apply
            </button>
          </div>
        </div>

        {/* TRANSACTIONS */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Transaction History</h2>
          </div>

          <table className="w-full">
            <thead style={{ backgroundColor: colors.primary }}>
              <tr>
                {["Date", "Description", "Type", "Amount"].map((h) => (
                  <th key={h} className="px-6 py-3 text-white text-sm">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="text-center py-6">
                    Loading...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-6 text-gray-500">
                    No transactions found
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t._id} className="border-t hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 text-sm">{t.description}</td>
                    <td className="px-6 py-3 text-sm capitalize">{t.type}</td>
                    <td
                      className={`px-6 py-3 text-sm font-semibold ${
                        t.type === "credit" ? "text-green-600" : "text-red-600"
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
  );
}
