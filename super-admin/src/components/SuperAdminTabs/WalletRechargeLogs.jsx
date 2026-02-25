import React, { useEffect, useMemo, useState } from "react";
import { FiFilter, FiDownload, FiCheckCircle, FiXCircle } from "react-icons/fi";
import { FaRupeeSign, FaCreditCard, FaBuilding } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { fetchWalletRechargeLogs } from "../../Redux/Slice/walletRechargeLogsSlice";

const colors = {
  primary: "#0A4D68",
  secondary: "#088395",
  accent: "#05BFDB",
  light: "#F8FAFC",
  dark: "#1E293B",
};

export default function WalletRechargeLogs() {
  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState("2024-12-31");
  const [corporate, setCorporate] = useState("All");
  const [method, setMethod] = useState("All");
  const [status, setStatus] = useState("All");
  const dispatch = useDispatch();

  const { logs, loading } = useSelector((state) => state.walletRechargeLogs);

  useEffect(() => {
    dispatch(
      fetchWalletRechargeLogs({
        status: status !== "All" ? status.toUpperCase() : undefined,
        corporateId: corporate !== "All" ? corporate : undefined,
        from: startDate || undefined,
        to: endDate || undefined,
        page: 1,
        limit: 100,
      })
    );
  }, [dispatch, status, corporate, startDate, endDate]);

  const normalizedLogs = useMemo(() => {
    return logs.map((log) => ({
      id: log._id,
      date: new Date(log.createdAt).toLocaleDateString(),
      company: log.corporateId?.corporateName || "—",
      amount: log.amount,
      method: "Razorpay", // backend truth
      status:
        log.status === "SUCCESS"
          ? "Success"
          : log.status === "FAILED"
          ? "Failed"
          : "Pending",
    }));
  }, [logs]);

  const corporates = useMemo(() => {
    return [
      "All",
      ...new Set(normalizedLogs.map((l) => l.company).filter(Boolean)),
    ];
  }, [normalizedLogs]);

  // const corporates = [
  //   "All",
  //   ...new Set(walletRechargeLogs.map((r) => r.company)),
  // ];
  const methods = ["All", "Bank Transfer", "UPI", "Card", "NEFT"];
  const statuses = ["All", "Success", "Failed", "Pending"];

  const totalRecharge = normalizedLogs.reduce((sum, l) => sum + l.amount, 0);

  const success = normalizedLogs.filter((l) => l.status === "Success").length;

  const failed = normalizedLogs.filter((l) => l.status === "Failed").length;

  const pending = normalizedLogs.filter((l) => l.status === "Pending").length;

  return (
    <div className="p-6" style={{ backgroundColor: colors.light }}>
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <h1 className="text-3xl font-bold mb-6" style={{ color: colors.dark }}>
          Wallet Recharge Logs
        </h1>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <SummaryCard
            title="Total Recharge Amount"
            value={`₹${totalRecharge.toLocaleString()}`}
            color={colors.primary}
            icon={<FaRupeeSign size={26} />}
          />

          <SummaryCard
            title="Successful Recharges"
            value={success}
            color="#10B981"
            icon={<FiCheckCircle size={26} />}
          />

          <SummaryCard
            title="Failed Recharges"
            value={failed}
            color="#EF4444"
            icon={<FiXCircle size={26} />}
          />

          <SummaryCard
            title="Pending Recharges"
            value={pending}
            color="#F59E0B"
            icon={<FiXCircle size={26} />}
          />
        </div>

        {/* FILTERS */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FiFilter size={22} className="text-[#0A4D68]" />
            <h2 className="text-lg font-semibold">Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Start Date */}
            <div>
              <label className="text-sm font-medium">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border p-2 rounded mt-1"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="text-sm font-medium">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border p-2 rounded mt-1"
              />
            </div>

            {/* Corporate */}
            <div>
              <label className="text-sm font-medium">Corporate</label>
              <select
                className="w-full border p-2 rounded mt-1"
                value={corporate}
                onChange={(e) => setCorporate(e.target.value)}
              >
                {corporates.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Method */}
            <div>
              <label className="text-sm font-medium">Payment Method</label>
              <select
                className="w-full border p-2 rounded mt-1"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                {methods.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="text-sm font-medium">Status</label>
              <select
                className="w-full border p-2 rounded mt-1"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {statuses.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center">
            <h2 className="text-xl font-semibold">Recharge Records</h2>

            <button
              className="flex items-center gap-2 px-4 py-2 rounded text-white"
              style={{ backgroundColor: colors.primary }}
            >
              <FiDownload /> Export
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead style={{ backgroundColor: colors.primary }}>
                <tr>
                  {["Date", "Company", "Amount", "Method", "Status"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-6 py-3 text-sm text-white font-medium"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-gray-500">
                      Loading recharge logs...
                    </td>
                  </tr>
                ) : normalizedLogs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-gray-500">
                      No recharge logs found
                    </td>
                  </tr>
                ) : (
                  normalizedLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm">{log.date}</td>

                      <td className="px-6 py-4 text-sm flex items-center gap-2">
                        <FaBuilding className="text-[#088395]" />
                        {log.company}
                      </td>

                      <td className="px-6 py-4 text-sm font-semibold text-[#0A4D68]">
                        ₹{log.amount.toLocaleString()}
                      </td>

                      <td className="px-6 py-4 text-sm flex items-center gap-2">
                        <FaCreditCard className="text-[#05BFDB]" />
                        Razorpay
                      </td>

                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium
            ${
              log.status === "Success"
                ? "bg-green-100 text-green-700"
                : log.status === "Failed"
                ? "bg-red-100 text-red-700"
                : "bg-yellow-100 text-yellow-700"
            }
          `}
                        >
                          {log.status}
                        </span>
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

// Summary Card Component
function SummaryCard({ title, value, color, icon }) {
  return (
    <div
      className="bg-white shadow rounded-lg p-6 flex items-center justify-between border-l-4"
      style={{ borderColor: color }}
    >
      <div>
        <p className="text-gray-600 text-sm">{title}</p>
        <h3 className="text-3xl font-bold mt-1" style={{ color }}>
          {value}
        </h3>
      </div>

      <div className="p-3 rounded-full bg-[#F8FAFC]">{icon}</div>
    </div>
  );
}
