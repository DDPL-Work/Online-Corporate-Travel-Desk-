import React from "react";

export default function ReissueModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h2 className="text-base font-black text-slate-900">Reissue Unavailable</h2>
        <p className="mt-2 text-sm text-slate-500">
          Reissue actions are managed from the Super Admin reissue module.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white"
        >
          Close
        </button>
      </div>
    </div>
  );
}
