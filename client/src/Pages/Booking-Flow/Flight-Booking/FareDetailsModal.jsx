import React, { useState } from "react";
import { IoClose } from "react-icons/io5";
import { AiOutlineInfoCircle } from "react-icons/ai";
import { FareOptions, FareRulesAccordion } from "./CommonComponents";
import "./Fares.css"; // animations

export const FareDetailsModal = ({
  fareQuote,
  fareRule,
  normalizeFareRules,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("rules");

  const toggleModal = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={toggleModal}
        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow transition-all duration-200"
      >
        View Fare Rules
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
          {/* Modal Container */}
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-linear-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-2 text-gray-800 font-semibold text-lg">
                <AiOutlineInfoCircle className="text-blue-600" size={22} />
                Fare Details
              </div>
              <button
                onClick={toggleModal}
                className="text-gray-500 hover:text-gray-700 transition"
              >
                <IoClose size={22} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 bg-white">
              <button
                onClick={() => setActiveTab("rules")}
                className={`flex-1 py-3 text-sm font-medium transition-all duration-200 ${
                  activeTab === "rules"
                    ? "border-b-2 border-blue-600 text-blue-700"
                    : "text-gray-600 hover:text-blue-600"
                }`}
              >
                Fare Rules 
              </button>
              <button
                onClick={() => setActiveTab("options")}
                className={`flex-1 py-3 text-sm font-medium transition-all duration-200 ${
                  activeTab === "options"
                    ? "border-b-2 border-blue-600 text-blue-700"
                    : "text-gray-600 hover:text-blue-600"
                }`}
              >
                Charges & Policies
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              {activeTab === "rules" && (
                <div className="space-y-6">
                  <FareRulesAccordion
                    fareRules={normalizeFareRules(fareRule)}
                    fareRulesStatus={!fareRule ? "loading" : "succeeded"}
                  />
                </div>
              )}

              {activeTab === "options" && (
                <div className="space-y-6">
                  <FareOptions
                    fareRules={fareQuote?.Response?.Results}
                    fareRulesStatus={
                      fareQuote?.Response?.Results ? "succeeded" : "loading"
                    }
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end p-4 border-t border-gray-200 bg-white">
              <button
                onClick={toggleModal}
                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm rounded-lg font-medium transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
