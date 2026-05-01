import React from "react";
import { FaPlane, FaHotel } from "react-icons/fa";

const SearchLoadingModal = ({ type = "flight", origin, destination, date }) => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full mx-4 flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
        
        {/* Animated Icon Container */}
        <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
          <div className="absolute inset-0 bg-amber-100 rounded-full animate-ping opacity-25"></div>
          <div className="absolute inset-2 bg-amber-200 rounded-full animate-pulse opacity-50"></div>
          <div className="relative z-10 w-16 h-16 bg-[#C9A84C] rounded-full flex items-center justify-center shadow-lg">
            {type === "flight" ? (
              <FaPlane className="text-white text-3xl animate-bounce" />
            ) : (
              <FaHotel className="text-white text-3xl animate-bounce" />
            )}
          </div>
        </div>

        {/* Route Info */}
        {/* <div className="mb-6">
          <h2 className="text-2xl font-black text-[#000D26] mb-1">
            {origin} {destination ? `→ ${destination}` : ""}
          </h2>
          {date && (
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">
              {date}
            </p>
          )}
        </div> */}

        {/* Loading Text */}
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-[#C9A84C] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-[#C9A84C] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-[#C9A84C] rounded-full animate-bounce"></div>
          </div>
          <p className="text-[#000D26] font-bold text-lg">
            Searching for the best {type === "flight" ? "flights" : "hotels"}...
          </p>
          <p className="text-slate-400 text-sm italic">
            Please wait while we fetch real-time availability and fares.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-8 overflow-hidden">
          <div className="bg-[#C9A84C] h-full rounded-full animate-progress-wide"></div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes progress-wide {
          0% { width: 0%; transform: translateX(-100%); }
          50% { width: 100%; transform: translateX(0); }
          100% { width: 0%; transform: translateX(100%); }
        }
        .animate-progress-wide {
          animation: progress-wide 2s infinite ease-in-out;
        }
      `}} />
    </div>
  );
};

export default SearchLoadingModal;
