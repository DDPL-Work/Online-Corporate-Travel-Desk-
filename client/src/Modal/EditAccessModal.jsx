import React, { useState } from "react";

export default function EditAccessModal({ data, onClose, onSave }) {
  const [form, setForm] = useState({ ...data });

  function updateField(key, value) {
    setForm({ ...form, [key]: value });
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow w-96">

        <h2 className="text-xl font-semibold mb-4">Edit Access</h2>

        <div className="space-y-3">

          <input
            value={form.company}
            className="w-full p-2 border rounded"
            onChange={(e) => updateField("company", e.target.value)}
          />

          <input
            value={form.user}
            className="w-full p-2 border rounded"
            onChange={(e) => updateField("user", e.target.value)}
          />

          <input
            value={form.role}
            className="w-full p-2 border rounded"
            onChange={(e) => updateField("role", e.target.value)}
          />

          <select
            className="w-full p-2 border rounded"
            value={form.status}
            onChange={(e) => updateField("status", e.target.value)}
          >
            <option>Active</option>
            <option>Inactive</option>
          </select>

        </div>

        <div className="flex justify-end gap-3 mt-4">
          <button className="px-4 py-2 border rounded" onClick={onClose}>Cancel</button>

          <button
            className="px-4 py-2 text-white rounded bg-[#0A4D68]"
            onClick={() => onSave(form)}
          >
            Update
          </button>
        </div>

      </div>
    </div>
  );
}
