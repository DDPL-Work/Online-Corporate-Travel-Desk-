import React, { useState } from "react";
import { FiFilter, FiPlusCircle, FiEdit2, FiTrash2 } from "react-icons/fi";
import { onboardedCorporates } from "../../data/dummyData";
import AddCorporateModal from "../../Modal/AddCorporateModal";
import EditCorporateModal from "../../Modal/EditCorporateModal";

const colors = {
  primary: "#0A4D68",
  secondary: "#088395",
  accent: "#05BFDB",
  light: "#F8FAFC",
  dark: "#1E293B",
};

export default function OnboardedCorporates() {
  const [corporates, setCorporates] = useState(onboardedCorporates);

  const [openAddModal, setOpenAddModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [selectedCorporate, setSelectedCorporate] = useState(null);

  const [industry, setIndustry] = useState("All");
  const [status, setStatus] = useState("All");

  const industries = ["All", ...new Set(corporates.map((c) => c.industry))];
  const statuses = ["All", "Active", "Inactive"];

  const filtered = corporates.filter((c) => {
    const industryMatch = industry === "All" || c.industry === industry;
    const statusMatch = status === "All" || c.status === status;

    return industryMatch && statusMatch;
  });

  const total = corporates.length;
  const active = corporates.filter((c) => c.status === "Active").length;
  const inactive = total - active;

  function addCorporate(data) {
    setCorporates((prev) => [...prev, { id: Date.now(), ...data }]);
    setOpenAddModal(false);
  }

  function updateCorporate(updated) {
    setCorporates((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
    setOpenEditModal(false);
  }

  function deleteCorporate(id) {
    if (!confirm("Are you sure you want to delete this corporate?")) return;
    setCorporates((prev) => prev.filter((x) => x.id !== id));
  }

  return (
    <div className="p-6" style={{ backgroundColor: colors.light }}>
      <div className="max-w-6xl mx-auto">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold" style={{ color: colors.dark }}>
            Onboarded Corporates
          </h1>

          <button
            onClick={() => setOpenAddModal(true)}
            className="flex items-center gap-2 px-5 py-2 rounded text-white font-medium shadow"
            style={{ backgroundColor: colors.primary }}
          >
            <FiPlusCircle /> Add Corporate
          </button>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow border-l-4" style={{ borderColor: colors.primary }}>
            <p className="text-gray-600 text-sm">Total Corporates</p>
            <h2 className="text-3xl font-bold mt-1" style={{ color: colors.primary }}>
              {total}
            </h2>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border-l-4" style={{ borderColor: "#10B981" }}>
            <p className="text-gray-600 text-sm">Active Corporates</p>
            <h2 className="text-3xl font-bold mt-1 text-[#10B981]">
              {active}
            </h2>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border-l-4" style={{ borderColor: "#EF4444" }}>
            <p className="text-gray-600 text-sm">Inactive Corporates</p>
            <h2 className="text-3xl font-bold mt-1 text-[#EF4444]">
              {inactive}
            </h2>
          </div>
        </div>

        {/* FILTERS */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FiFilter className="text-[#0A4D68]" size={22} />
            <h2 className="text-lg font-semibold">Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Industry</label>
              <select
                className="border w-full p-2 rounded mt-1"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              >
                {industries.map((i) => (
                  <option key={i}>{i}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Status</label>
              <select
                className="border w-full p-2 rounded mt-1"
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
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Corporate List</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead style={{ backgroundColor: colors.primary }}>
                <tr>
                  {["Company", "Industry", "Contact", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-6 py-3 text-sm text-white font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-gray-500">
                      No corporates found
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm font-medium">{c.company}</td>
                      <td className="px-6 py-4 text-sm">{c.industry}</td>
                      <td className="px-6 py-4 text-sm">{c.contact}</td>

                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            c.status === "Active"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-600"
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 flex gap-4 text-gray-600">
                        <button
                          className="text-blue-600 hover:text-blue-800"
                          onClick={() => {
                            setSelectedCorporate(c);
                            setOpenEditModal(true);
                          }}
                        >
                          <FiEdit2 size={18} />
                        </button>

                        <button
                          className="text-red-600 hover:text-red-800"
                          onClick={() => deleteCorporate(c.id)}
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODALS */}
        {openAddModal && (
          <AddCorporateModal onClose={() => setOpenAddModal(false)} onSave={addCorporate} />
        )}

        {openEditModal && selectedCorporate && (
          <EditCorporateModal
            corporate={selectedCorporate}
            onClose={() => setOpenEditModal(false)}
            onSave={updateCorporate}
          />
        )}

      </div>
    </div>
  );
}
