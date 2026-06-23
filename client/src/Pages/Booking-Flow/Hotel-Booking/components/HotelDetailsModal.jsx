import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FiX, FiInfo, FiGrid, FiMapPin } from "react-icons/fi";
import HotelInfo from "./HotelInfo";
import Amenities from "./Amenities";
import Attractions from "./Attractions";

const HotelDetailsModal = ({ open, onClose, hotel, searchPayload }) => {
  const [activeTab, setActiveTab] = useState("info");

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const tabs = [
    { id: "info", label: "Overview", icon: FiInfo },
    { id: "amenities", label: "Amenities", icon: FiGrid },
  ];
  if (hotel?.attractions?.length > 0) {
    tabs.push({ id: "attractions", label: "Attractions", icon: FiMapPin });
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-4xl bg-slate-50 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-col border-b border-slate-200 bg-white sticky top-0 z-10">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h3 className="text-lg font-black text-[#0A203E]">Hotel Details</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                {hotel?.name || "Information"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition cursor-pointer border-none"
            >
              <FiX size={18} className="text-slate-600" />
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex px-6 gap-6 mt-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 pb-3 px-1 border-b-2 transition-all ${
                    isActive
                      ? "border-[#E5B869] text-[#0A203E]"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <Icon size={16} className={isActive ? "text-[#E5B869]" : ""} />
                  <span className="text-sm font-bold uppercase tracking-wider">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-hide">
          {activeTab === "info" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <HotelInfo
                description={hotel?.description}
                checkIn={hotel?.checkIn}
                checkOut={hotel?.checkOut}
                checkInDate={searchPayload?.CheckIn}
                checkOutDate={searchPayload?.CheckOut}
                contact={hotel?.contact}
                map={hotel?.map}
              />
            </div>
          )}

          {activeTab === "amenities" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Amenities amenities={hotel?.facilities} />
            </div>
          )}

          {activeTab === "attractions" && hotel?.attractions?.length > 0 && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Attractions attractions={hotel?.attractions} />
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default HotelDetailsModal;
