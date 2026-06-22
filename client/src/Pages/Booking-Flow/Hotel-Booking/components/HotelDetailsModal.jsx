import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";
import HotelInfo from "./HotelInfo";
import Amenities from "./Amenities";
import Attractions from "./Attractions";

const HotelDetailsModal = ({ open, onClose, hotel, searchPayload }) => {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

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
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white sticky top-0 z-10">
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-hide">
          <HotelInfo
            description={hotel?.description}
            checkIn={hotel?.checkIn}
            checkOut={hotel?.checkOut}
            checkInDate={searchPayload?.CheckIn}
            checkOutDate={searchPayload?.CheckOut}
            contact={hotel?.contact}
            map={hotel?.map}
          />

          <Amenities amenities={hotel?.facilities} />

          {hotel?.attractions?.length > 0 && (
            <Attractions attractions={hotel?.attractions} />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default HotelDetailsModal;
