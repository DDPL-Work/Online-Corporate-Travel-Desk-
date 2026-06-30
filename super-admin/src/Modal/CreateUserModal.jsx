import React, { useState } from "react";

export default function CreateUserModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    department: "",
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow w-96 animate-fadeIn">

        <h2 className="text-xl font-semibold mb-4">Add New User</h2>

        <div className="space-y-3">
          <input
            placeholder="Name"
            className="w-full p-2 border rounded"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <input
            placeholder="Email"
            className="w-full p-2 border rounded"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />

          <input
            placeholder="Department"
            className="w-full p-2 border rounded"
            value={form.department}
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
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
