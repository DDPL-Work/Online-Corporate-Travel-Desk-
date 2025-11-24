import React, { useState } from "react";
import { FiSearch, FiEye } from "react-icons/fi";
import { employeeBookings } from "../../data/dummyData";

const colors = {
  primary: "#0A4D68",
  secondary: "#088395",
  accent: "#05BFDB",
  light: "#F8FAFC",
  dark: "#1E293B",
};

export default function MyBookings() {
  const [search, setSearch] = useState("");

  const filtered = employeeBookings.filter((b) =>
    b.destination.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6" style={{ backgroundColor: colors.light }}>
      <h1 className="text-2xl font-bold mb-6" style={{ color: colors.dark }}>
        My Bookings
      </h1>

      {/* Search */}
      <div className="bg-white p-4 rounded shadow flex items-center gap-3 mb-6">
        <FiSearch className="text-gray-500" />
        <input
          type="text"
          placeholder="Search by destination..."
          className="w-full outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Bookings List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="w-full text-left">
          <thead style={{ backgroundColor: colors.primary }}>
            <tr>
              {["Type", "Destination", "Dates", "Cost", "Status", "Actions"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-6 py-3 text-white text-sm font-medium"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-8 text-center text-gray-500">
                  No bookings found
                </td>
              </tr>
            ) : (
              filtered.map((book) => (
                <tr key={book.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-sm font-medium">
                    {book.type === "Flight" ? "✈️ Flight" : "🏨 Hotel"}
                  </td>

                  <td className="px-6 py-4 text-sm">{book.destination}</td>

                  <td className="px-6 py-4 text-sm">
                    {book.startDate} → {book.endDate}
                  </td>

                  <td className="px-6 py-4 text-sm font-semibold text-[#088395]">
                    ₹{book.cost.toLocaleString()}
                  </td>

                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        book.status === "Confirmed"
                          ? "bg-green-100 text-green-700"
                          : book.status === "Cancelled"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {book.status}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-sm">
                    <button className="flex items-center gap-1 px-3 py-2 rounded bg-gray-100 hover:bg-gray-200">
                      <FiEye size={16} /> View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
