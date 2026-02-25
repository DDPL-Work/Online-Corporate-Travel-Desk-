import React, { useState } from "react";

export default function AddCommissionModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    company: "",
    type: "Flight",
    commission: "",
    status: "Active",
  });

  function updateField(key, value) {
    setForm({ ...form, [key]: value });
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow w-96">

        <h2 className="text-xl font-semibold mb-4">Add Commission Rule</h2>

        <div className="space-y-3">

          <input
            placeholder="Corporate Name"
            className="w-full p-2 border rounded"
            onChange={(e) => updateField("company", e.target.value)}
          />

          <select
            className="w-full p-2 border rounded"
            onChange={(e) => updateField("type", e.target.value)}
          >
            <option>Flight</option>
            <option>Hotel</option>
          </select>

          <input
            placeholder="Commission (%)"
            className="w-full p-2 border rounded"
            onChange={(e) => updateField("commission", e.target.value)}
          />

          <select
            className="w-full p-2 border rounded"
            onChange={(e) => updateField("status", e.target.value)}
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
            Save
          </button>
        </div>

      </div>
    </div>
  );
}
