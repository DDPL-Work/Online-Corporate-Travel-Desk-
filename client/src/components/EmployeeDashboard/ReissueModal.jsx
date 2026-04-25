import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { FiX, FiRefreshCw, FiAlertCircle } from "react-icons/fi";
import { toast } from "react-toastify";
import { createReissueRequest } from "../../Redux/Actions/reissueThunks";

export default function ReissueModal({ booking, onClose }) {
  const dispatch = useDispatch();
  const [reissueType, setReissueType] = useState("FULL_JOURNEY"); // "FULL_JOURNEY", "ONWARD", "RETURN"
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const isRoundTrip = booking?.flightRequest?.journeyType === "Return";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error("Please provide a reason for the reissue request.");
      return;
    }

    setLoading(true);
    try {
      const userStr = sessionStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : {};

      await dispatch(
        createReissueRequest({
          bookingId: booking._id,
          reissueType,
          reason,
          userId: user._id,
        })
      ).unwrap();

      toast.success("Reissue request submitted successfully");
      onClose();
    } catch (err) {
      toast.error(err || "Failed to submit reissue request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <FiRefreshCw className="text-indigo-600" />
            Request Flight Reissue
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"
          >
            <FiX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-5">
            {/* Type Selection */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Reissue Journey Type
              </label>
              <div className="grid grid-cols-1 gap-2">
                <label className="flex items-center p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="radio"
                    name="reissueType"
                    value="FULL_JOURNEY"
                    checked={reissueType === "FULL_JOURNEY"}
                    onChange={(e) => setReissueType(e.target.value)}
                    className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-600"
                  />
                  <span className="ml-3 text-sm font-medium text-slate-700">Full Journey</span>
                </label>
                
                {isRoundTrip && (
                  <>
                    <label className="flex items-center p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                      <input
                        type="radio"
                        name="reissueType"
                        value="ONWARD"
                        checked={reissueType === "ONWARD"}
                        onChange={(e) => setReissueType(e.target.value)}
                        className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-600"
                      />
                      <span className="ml-3 text-sm font-medium text-slate-700">Onward Only</span>
                    </label>
                    <label className="flex items-center p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                      <input
                        type="radio"
                        name="reissueType"
                        value="RETURN"
                        checked={reissueType === "RETURN"}
                        onChange={(e) => setReissueType(e.target.value)}
                        className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-600"
                      />
                      <span className="ml-3 text-sm font-medium text-slate-700">Return Only</span>
                    </label>
                  </>
                )}
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Reason for Reissue <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="E.g., Need to change travel date to next Monday..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm resize-none"
                rows="4"
                required
              />
            </div>

            {/* Disclaimer */}
            <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 flex gap-3 items-start">
              <FiAlertCircle className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 leading-relaxed">
                Reissue requests are subject to approval. Additional fare differences and airline penalties may apply.
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <FiRefreshCw className="animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Request"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
