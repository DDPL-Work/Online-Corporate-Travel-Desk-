import React, { useState } from "react";

export default function EditCorporateModal({ corporate, onClose, onSave }) {
  const [form, setForm] = useState({ ...corporate });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow w-96">
        <h2 className="text-xl font-semibold mb-4">Edit Corporate</h2>

        <div className="space-y-3">
          <input
            value={form.company}
            className="w-full p-2 border rounded"
            onChange={(e) => setForm({ ...form, company: e.target.value })}
          />

          <input
            value={form.industry}
            className="w-full p-2 border rounded"
            onChange={(e) => setForm({ ...form, industry: e.target.value })}
          />

          <input
            value={form.contact}
            className="w-full p-2 border rounded"
            onChange={(e) => setForm({ ...form, contact: e.target.value })}
          />

          <select
            className="w-full p-2 border rounded"
            value={form.status}
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
            Update
          </button>
        </div>
      </div>
    </div>
  );
}
