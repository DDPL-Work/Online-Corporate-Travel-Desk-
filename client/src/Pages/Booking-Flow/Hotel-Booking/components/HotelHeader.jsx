// components/HotelDetails/HotelHeader.jsx
import React from "react";
import {
  FaStar,
  FaHeart,
  FaShareAlt,
  FaMapMarkerAlt,
  FaPlane,
} from "react-icons/fa";
import { MdArrowBack } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { C } from "../../../../components/Shared/color";

const HotelHeader = ({ name, address, rating, cityName, countryName, checkInDate, checkOutDate, checkInTime, checkOutTime }) => {
  const navigate = useNavigate();

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-US", {
        weekday: "short",
        day: "2-digit",
        month: "short",
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="border-b border-white/10 sticky top-0 shadow-sm" style={{ background: C.navy }}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <FaStar
                    key={i}
                    className={
                      i < Math.floor(rating)
                        ? "text-[#C9A84C]"
                        : "text-white/20"
                    }
                    size={14}
                  />
                ))}
              </div>
              <span className="bg-[#C9A84C]/20 text-[#C9A84C] text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                {rating} STAR HOTEL
              </span>
            </div>

            <h1 className="text-3xl font-black text-white tracking-tight">
              {name}
            </h1>

            <div className="flex items-center gap-2 text-sm text-slate-300">
              <FaMapMarkerAlt className="text-[#C9A84C] shrink-0" />
              <span className="font-medium">
                {address}
                {(cityName || countryName) && (
                  <span className="text-slate-400 font-normal">
                    {" · "}
                    {[cityName, countryName].filter(Boolean).join(", ")}
                  </span>
                )}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 gap-4 sm:gap-6 px-4 sm:px-6 py-3 sm:py-4 bg-[#11294D] rounded-2xl border border-white/10 text-center w-full md:w-auto mt-4 md:mt-0 justify-center">
             <div className="flex flex-col items-center justify-center">
                <div className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Check-In</div>
                <div className="text-[#C9A84C] text-sm font-bold">{formatDate(checkInDate)}</div>
                <div className="text-white text-xs font-semibold">{checkInTime || "—"}</div>
             </div>
             <div className="w-px h-auto bg-white/10" />
             <div className="flex flex-col items-center justify-center">
                <div className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Check-Out</div>
                <div className="text-[#C9A84C] text-sm font-bold">{formatDate(checkOutDate)}</div>
                <div className="text-white text-xs font-semibold">{checkOutTime || "—"}</div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelHeader;
