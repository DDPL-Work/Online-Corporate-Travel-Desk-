import React, { useState } from "react";

export default function EditUserModal({ onClose, onSave, user }) {
  const [form, setForm] = useState({ ...user });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow w-96 animate-fadeIn">

        <h2 className="text-xl font-semibold mb-4">Edit User</h2>

        <div className="space-y-3">
          <input
            value={form.name}
            className="w-full p-2 border rounded"
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <input
            value={form.email}
            className="w-full p-2 border rounded"
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />

          <input
            value={form.department}
            className="w-full p-2 border rounded"
            onChange={(e) => setForm({ ...form, department: e.target.value })}
          />
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
