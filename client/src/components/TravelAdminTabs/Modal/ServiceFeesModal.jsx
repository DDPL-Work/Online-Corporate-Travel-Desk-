import React, { useState } from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";
import { FaPlane, FaHotel, FaStar, FaRegStar } from "react-icons/fa";

export default function ServiceFeesModal({ isOpen, onClose, rules = [] }) {
  if (!isOpen) return null;

  const [feeProductTab, setFeeProductTab] = useState("Flight");
  const [feeOperationTab, setFeeOperationTab] = useState("Book");
  const [feeTripTypeTab, setFeeTripTypeTab] = useState("Domestic");

  const getCabinClassName = (code) => {
    switch (Number(code)) {
      case 2: return "Economy";
      case 3: return "Premium Economy";
      case 4: return "Business";
      case 5: return "Premium Business";
      case 6: return "First Class";
      default: return `Class ${code}`;
    }
  };

  const renderStars = (rating) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          star <= rating ? (
            <FaStar key={star} className="text-yellow-400" size={12} />
          ) : (
            <FaStar key={star} className="text-slate-200" size={12} />
          )
        ))}
      </div>
    );
  };

  const filteredRules = rules.filter((r) => {
    const matchProduct = r.productType === feeProductTab;
    const matchOperation = r.operation === feeOperationTab;
    const matchTrip = feeTripTypeTab === "All" || r.tripType === feeTripTypeTab;
    return matchProduct && matchOperation && matchTrip;
  });

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-7xl max-h-[85vh] flex flex-col overflow-hidden relative">
        <button 
          onClick={onClose}
          className="absolute top-8 right-8 w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all z-20 backdrop-blur-sm"
        >
          <FiX size={18} />
        </button>

        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-slate-100 bg-gradient-to-r from-[#00174F] to-[#003399]">
          <h2 className="text-2xl font-black text-white tracking-tight">Service Fee Rules</h2>
          <p className="text-sm font-medium text-blue-100 mt-1">Complete overview of all configured company service charges.</p>
        </div>

        <div className="flex flex-col flex-1 min-h-0">
          <div className="px-8 py-6 flex gap-4 overflow-x-auto border-b border-slate-100">
            {/* Product Type Tabs */}
            <div className="flex bg-[#F5F7FA] p-1 rounded-full w-fit">
              <button
                onClick={() => setFeeProductTab("Flight")}
                className={`px-8 py-2.5 rounded-full text-[11px] font-black tracking-widest uppercase transition-all ${
                  feeProductTab === "Flight"
                    ? "bg-[#000D26] text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                FLIGHT
              </button>
              <button
                onClick={() => {
                  setFeeProductTab("Hotel");
                  if (feeOperationTab === "Re-Issue") setFeeOperationTab("Book");
                }}
                className={`px-8 py-2.5 rounded-full text-[11px] font-black tracking-widest uppercase transition-all ${
                  feeProductTab === "Hotel"
                    ? "bg-[#000D26] text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                HOTEL
              </button>
            </div>

            {/* Operation Tabs */}
            <div className="flex bg-[#F5F7FA] p-1 rounded-full w-fit">
              <button
                onClick={() => setFeeOperationTab("Book")}
                className={`px-8 py-2.5 rounded-full text-[11px] font-black tracking-widest uppercase transition-all ${
                  feeOperationTab === "Book"
                    ? "bg-[#000D26] text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                BOOK
              </button>
              <button
                onClick={() => setFeeOperationTab("Cancel")}
                className={`px-8 py-2.5 rounded-full text-[11px] font-black tracking-widest uppercase transition-all ${
                  feeOperationTab === "Cancel"
                    ? "bg-[#000D26] text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                CANCEL
              </button>
              {feeProductTab === "Flight" && (
                <button
                  onClick={() => setFeeOperationTab("Re-Issue")}
                  className={`px-8 py-2.5 rounded-full text-[11px] font-black tracking-widest uppercase transition-all ${
                    feeOperationTab === "Re-Issue"
                      ? "bg-[#000D26] text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  RE-ISSUE
                </button>
              )}
            </div>

            {/* Trip Type Tabs */}
            <div className="flex bg-[#F5F7FA] p-1 rounded-full w-fit">
              <button
                onClick={() => setFeeTripTypeTab("Domestic")}
                className={`px-8 py-2.5 rounded-full text-[11px] font-black tracking-widest uppercase transition-all ${
                  feeTripTypeTab === "Domestic"
                    ? "bg-[#000D26] text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                DOMESTIC
              </button>
              <button
                onClick={() => setFeeTripTypeTab("International")}
                className={`px-8 py-2.5 rounded-full text-[11px] font-black tracking-widest uppercase transition-all ${
                  feeTripTypeTab === "International"
                    ? "bg-[#000D26] text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                INTERNATIONAL
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#00174F] text-white sticky top-0 z-10 border-b border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                <tr>
                  <th className="px-8 py-4 text-[10px] font-black  uppercase tracking-widest whitespace-nowrap">Scenario</th>
                  <th className="px-8 py-4 text-[10px] font-black  uppercase tracking-widest whitespace-nowrap">Trip</th>
                  <th className="px-8 py-4 text-[10px] font-black  uppercase tracking-widest whitespace-nowrap">{feeProductTab === "Flight" ? "Cabin Class" : "Star Rating"}</th>
                  <th className="px-8 py-4 text-[10px] font-black  uppercase tracking-widest whitespace-nowrap">Fee</th>
                  <th className="px-8 py-4 text-[10px] font-black  uppercase tracking-widest whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRules.length > 0 ? (
                  filteredRules.map((rule) => (
                    <tr key={rule._id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full bg-[#003399]/10 flex items-center justify-center text-[#003399] shrink-0">
                            {rule.productType === "Flight" ? <FaPlane size={12} className="rotate-[-45deg]" /> : <FaHotel size={12} />}
                          </div>
                          <div>
                            <p className="text-[13px] font-black text-slate-800 leading-none mb-1">
                              {rule.productType} / {rule.operation}
                            </p>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">COMPANY RULE</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[9px] font-black tracking-widest uppercase ${
                          rule.tripType === "Domestic" 
                            ? "bg-amber-50 text-amber-600 border border-amber-100" 
                            : rule.tripType === "International"
                            ? "bg-indigo-50 text-indigo-600 border border-indigo-100"
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}>
                          {rule.tripType}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-xs font-bold text-slate-600">
                        {rule.productType === "Flight" ? getCabinClassName(rule.cabinClass) : renderStars(Number(rule.starRating))}
                      </td>
                      <td className="px-8 py-5 text-[13px] font-black text-[#003399]">₹{rule.feeValue?.toLocaleString()}</td>
                      <td className="px-8 py-5">
                        <span className={`inline-flex items-center justify-center px-3 py-1 rounded-md text-[10px] font-black tracking-widest uppercase ${
                          rule.status === "Active" ? "bg-[#E6F8F0] text-[#009951]" : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}>
                          {rule.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-8 py-12 text-center text-sm font-bold text-slate-400">
                      No rules found for {feeProductTab} / {feeOperationTab} / {feeTripTypeTab}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
