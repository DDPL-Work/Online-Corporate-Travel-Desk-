import React, { useState } from "react";

export default function AddApiConfigModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    name: "",
    type: "Flight",
    apiKey: "",
    status: "Active"
  });

  function update(key, value) {
    setForm({ ...form, [key]: value });
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded w-96 shadow">

        <h2 className="text-xl font-semibold mb-4">Add API Configuration</h2>

        <div className="space-y-3">
          <input
            placeholder="API Name"
            className="w-full p-2 border rounded"
            onChange={(e) => update("name", e.target.value)}
          />

          <select
            className="w-full border p-2 rounded"
            onChange={(e) => update("type", e.target.value)}
          >
            <option>Flight</option>
            <option>Hotel</option>
            <option>Finance</option>
          </select>

          <input
            placeholder="API Key"
            className="w-full p-2 border rounded"
            onChange={(e) => update("apiKey", e.target.value)}
          />

          <select
            className="w-full border p-2 rounded"
            onChange={(e) => update("status", e.target.value)}
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
