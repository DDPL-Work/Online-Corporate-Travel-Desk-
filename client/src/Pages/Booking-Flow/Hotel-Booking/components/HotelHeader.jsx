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

const HotelHeader = ({ name, address, rating, cityName, countryName }) => {
  const navigate = useNavigate();

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

          {/* <div className="hidden lg:block shrink-0 px-6 py-4 bg-blue-50/50 rounded-2xl border border-blue-100 text-center">
             <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Price starting from</div>
             <div className="flex items-baseline justify-center gap-1">
                <span className="text-slate-400 text-xs font-bold">INR</span>
                <span className="text-2xl font-black text-[#0a2540]">Live Rates</span>
             </div>
             <div className="text-[10px] text-blue-500 font-bold mt-1">Refreshed by TBO Session</div>
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default HotelHeader;
