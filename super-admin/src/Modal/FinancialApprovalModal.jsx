import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { approveCorporate } from "../Redux/Slice/corporateListSlice";
import { toast } from "react-toastify";

export default function FinancialApprovalModal({ corporate, onClose }) {
  const dispatch = useDispatch();

  const [form, setForm] = useState({
    classification: "prepaid",
    billingCycle: "30days",
    customBillingDays: "",
    creditLimit: 0,
    walletBalance: 0,
  });

  const handleSubmit = async () => {
    if (form.classification === "postpaid" && !form.creditLimit) {
      toast.error("Credit limit is required for postpaid");
      return;
    }

    const payload = {
      classification: form.classification,
      billingCycle:
        form.classification === "postpaid"
          ? form.billingCycle
          : undefined,
      customBillingDays:
        form.billingCycle === "custom"
          ? Number(form.customBillingDays)
          : undefined,
      creditLimit:
        form.classification === "postpaid"
          ? Number(form.creditLimit)
          : 0,
      walletBalance:
        form.classification === "prepaid"
          ? Number(form.walletBalance)
          : 0,
    };

    try {
      await dispatch(
        approveCorporate({
          id: corporate._id,
          payload,
        })
      ).unwrap();

      toast.success("Corporate approved & activated");
      onClose();
    } catch (err) {
      toast.error(err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-[500px] rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">
          Approve & Configure Account
        </h2>

        {/* Account Type */}
        <div className="mb-4">
          <label className="text-sm font-medium">Account Type</label>
          <select
            className="w-full border p-2 mt-1"
            value={form.classification}
            onChange={(e) =>
              setForm({
                ...form,
                classification: e.target.value,
              })
            }
          >
            <option value="prepaid">Prepaid</option>
            <option value="postpaid">Postpaid</option>
          </select>
        </div>

        {/* Postpaid Config */}
        {form.classification === "postpaid" && (
          <>
            <div className="mb-4">
              <label>Billing Cycle</label>
              <select
                className="w-full border p-2 mt-1"
                value={form.billingCycle}
                onChange={(e) =>
                  setForm({
                    ...form,
                    billingCycle: e.target.value,
                  })
                }
              >
                <option value="15days">15 Days</option>
                <option value="30days">30 Days</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            {form.billingCycle === "custom" && (
              <div className="mb-4">
                <label>Custom Days</label>
                <input
                  type="number"
                  className="w-full border p-2 mt-1"
                  value={form.customBillingDays}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      customBillingDays: e.target.value,
                    })
                  }
                />
              </div>
            )}

            <div className="mb-4">
              <label>Credit Limit (₹)</label>
              <input
                type="number"
                className="w-full border p-2 mt-1"
                value={form.creditLimit}
                onChange={(e) =>
                  setForm({
                    ...form,
                    creditLimit: e.target.value,
                  })
                }
              />
            </div>
          </>
        )}

        {/* Prepaid Config */}
        {form.classification === "prepaid" && (
          <div className="mb-4">
            <label>Wallet Balance (₹)</label>
            <input
              type="number"
              className="w-full border p-2 mt-1"
              value={form.walletBalance}
              onChange={(e) =>
                setForm({
                  ...form,
                  walletBalance: e.target.value,
                })
              }
            />
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="border px-4 py-2">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="bg-[#0A4D68] text-white px-4 py-2"
          >
            Approve & Activate
          </button>
        </div>
      </div>
    </div>
  );
}