import React, { useState } from "react";
import { FiFilter, FiPlusCircle, FiDownload } from "react-icons/fi";
import { corporateWalletData } from "../../data/dummyData";

const colors = {
  primary: "#0A4D68",
  secondary: "#088395",
  accent: "#05BFDB",
  light: "#F8FAFC",
  dark: "#1E293B",
};

export default function CorporateWallet() {
  const [openModal, setOpenModal] = useState(false);
  const [transactions, setTransactions] = useState(corporateWalletData);

  const [filterType, setFilterType] = useState("All");
  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState("2024-12-31");

  const balance = transactions.reduce(
    (sum, t) => (t.type === "Credit" ? sum + t.amount : sum - t.amount),
    0
  );

  // FILTERS
  const filtered = transactions.filter((t) => {
    const d = new Date(t.date);
    const start = new Date(startDate);
    const end = new Date(endDate);

    const dateMatch = d >= start && d <= end;
    const typeMatch = filterType === "All" || t.type === filterType;

    return dateMatch && typeMatch;
  });

  function addFunds(amount) {
    const newTx = {
      id: Date.now(),
      date: new Date().toISOString().split("T")[0],
      description: "Wallet Top-Up",
      amount: parseInt(amount),
      type: "Credit",
    };

    setTransactions((prev) => [newTx, ...prev]);
    setOpenModal(false);
  }

  return (
    <div className="p-6" style={{ backgroundColor: colors.light }}>
      <div className="max-w-5xl mx-auto">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold" style={{ color: colors.dark }}>
            Corporate Wallet
          </h1>

          <button
            onClick={() => setOpenModal(true)}
            className="flex items-center gap-2 px-5 py-2 rounded text-white font-medium shadow"
            style={{ backgroundColor: colors.primary }}
          >
            <FiPlusCircle /> Add Funds
          </button>
        </div>

        {/* WALLET SUMMARY */}
        <div
          className="bg-white shadow rounded-lg p-6 mb-6"
          style={{ borderLeft: `6px solid ${colors.primary}` }}
        >
          <p className="text-gray-600 text-sm">Available Balance</p>
          <h2 className="text-4xl font-bold mt-1" style={{ color: colors.primary }}>
            ₹{balance.toLocaleString()}
          </h2>
        </div>

        {/* FILTERS */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FiFilter className="text-[22px] text-[#0A4D68]" />
            <h2 className="text-lg font-semibold">Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border p-2 rounded mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border p-2 rounded mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Transaction Type</label>
              <select
                className="w-full p-2 border rounded mt-1"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option>All</option>
                <option>Credit</option>
                <option>Debit</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                className="flex items-center gap-2 px-4 py-2 rounded text-white w-full"
                style={{ backgroundColor: colors.primary }}
              >
                <FiDownload /> Export
              </button>
            </div>
          </div>
        </div>

        {/* TRANSACTION TABLE */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Transaction History</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead style={{ backgroundColor: colors.primary }}>
                <tr>
                  {["Date", "Description", "Type", "Amount"].map((h) => (
                    <th key={h} className="px-6 py-3 text-sm font-semibold text-white">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan="4"
                      className="text-center py-8 text-gray-600"
                    >
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  filtered.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm">{t.date}</td>
                      <td className="px-6 py-4 text-sm">{t.description}</td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-3 py-1 text-xs rounded-full ${
                            t.type === "Credit"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-600"
                          }`}
                        >
                          {t.type}
                        </span>
                      </td>

                      <td
                        className={`px-6 py-4 text-sm font-semibold ${
                          t.type === "Credit"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {t.type === "Credit" ? "+" : "-"} ₹
                        {t.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL */}
        {openModal && <AddFundsModal onClose={() => setOpenModal(false)} onSave={addFunds} />}
      </div>
    </div>
  );
}

// ----------------------
// ADD FUNDS MODAL
// ----------------------
function AddFundsModal({ onClose, onSave }) {
  const [amount, setAmount] = useState("");

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow w-96 animate-fadeIn">
        <h2 className="text-xl font-semibold mb-4">Add Funds</h2>

        <input
          type="number"
          placeholder="Enter Amount"
          className="w-full border p-2 rounded mb-4"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border rounded">
            Cancel
          </button>

          <button
            onClick={() => onSave(amount)}
            className="px-4 py-2 text-white rounded"
            style={{ backgroundColor: "#0A4D68" }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
