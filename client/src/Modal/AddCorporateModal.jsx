import React, { useState } from "react";

export default function AddCorporateModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    company: "",
    industry: "",
    contact: "",
    status: "Active",
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow w-96">
        <h2 className="text-xl font-semibold mb-4">Add Corporate</h2>

        <div className="space-y-3">
          <input
            placeholder="Company Name"
            className="w-full p-2 border rounded"
            onChange={(e) => setForm({ ...form, company: e.target.value })}
          />

          <input
            placeholder="Industry"
            className="w-full p-2 border rounded"
            onChange={(e) => setForm({ ...form, industry: e.target.value })}
          />

          <input
            placeholder="Contact (Phone/Email)"
            className="w-full p-2 border rounded"
            onChange={(e) => setForm({ ...form, contact: e.target.value })}
          />

          <select
            className="w-full p-2 border rounded"
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <button className="px-4 py-2 border rounded" onClick={onClose}>
            Cancel
          </button>
          <button
            className="px-4 py-2 text-white rounded bg-[#0A4D68]"
            onClick={() => onSave(form)}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
