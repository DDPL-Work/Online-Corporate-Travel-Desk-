//client\src\Pages\search-results\Hotel-results\Hotel-Card.jsx

import React, { useState } from "react";
import { BsStarFill, BsStar } from "react-icons/bs";
import { FaHeart, FaChevronLeft, FaChevronRight, FaWifi, FaCheck, FaTimes, FaTag } from "react-icons/fa";
import { MdLocationOn, MdBreakfastDining } from "react-icons/md";
import { useNavigate } from "react-router-dom";

/* ─── Color Tokens ─── */
const ORANGE = "#C9A84C";
const DARK   = "#000D26";
const AZURE  = "#1E293B";

/* ⭐ Star Renderer */
const Stars = ({ rating = 0 }) =>
  Array.from({ length: 5 }, (_, i) =>
    i < Math.round(rating) ? (
      <BsStarFill key={i} className="text-amber-400 text-xs" />
    ) : (
      <BsStar key={i} className="text-amber-300 text-xs" />
    ),
  );

/* 🏨 Main Card */
const HotelCard = ({ hotel }) => {
  const navigate = useNavigate();
  const [imgIndex, setImgIndex] = useState(0);
  const [wishlisted, setWishlisted] = useState(false);

  const images = hotel.images?.length
    ? hotel.images
    : ["https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800"];

  const totalImages = images.length;

  const prev = (e) => { e.stopPropagation(); setImgIndex((i) => (i === 0 ? totalImages - 1 : i - 1)); };
  const next = (e) => { e.stopPropagation(); setImgIndex((i) => (i === totalImages - 1 ? 0 : i + 1)); };

  return (
    <div
      className="bg-white rounded-xl border border-slate-200 hover:shadow-lg transition-all duration-200 overflow-hidden mb-4"
      style={{ borderColor: "transparent", outline: "1px solid #E2E8F0" }}
      onMouseEnter={e => e.currentTarget.style.outline = `1px solid ${ORANGE}`}
      onMouseLeave={e => e.currentTarget.style.outline = "1px solid #E2E8F0"}
    >
      <div className="flex flex-col md:flex-row">
        {/* 🖼 Image Section */}
        <div className="relative w-full md:w-72 h-52 md:h-52 shrink-0">
          <img src={images[imgIndex]} alt={hotel.name} className="w-full h-full object-cover transition-transform duration-500" />

          {totalImages > 1 && (
            <>
              <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-7 h-7 flex items-center justify-center">
                <FaChevronLeft className="text-xs" />
              </button>
              <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-7 h-7 flex items-center justify-center">
                <FaChevronRight className="text-xs" />
              </button>
            </>
          )}

          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">
            {imgIndex + 1} / {totalImages}
          </div>

          <button onClick={() => setWishlisted((v) => !v)} className="absolute top-2 right-2 bg-white rounded-full w-8 h-8 flex items-center justify-center shadow">
            <FaHeart className={wishlisted ? "text-red-500" : "text-gray-300"} />
          </button>

          {hotel.promotion && (
            <div className="absolute top-2 left-2 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1" style={{ background: ORANGE, color: DARK }}>
              <FaTag className="text-[8px]" />
              {hotel.promotion}
            </div>
          )}
        </div>

        {/* 📄 Middle Section */}
        <div className="flex-1 p-4 flex flex-col justify-between">
          <div>
            {/* Title + Rating */}
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-base font-bold" style={{ color: AZURE }}>{hotel.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex gap-0.5"><Stars rating={hotel.rating} /></div>
                  <span className="text-xs text-slate-400">{hotel.propertyType}</span>
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-center gap-1 text-xs text-slate-500 mb-2">
              <MdLocationOn style={{ color: ORANGE }} />
              {hotel.address}
            </div>

            {/* Meal + Cancellation */}
            <div className="flex flex-wrap gap-2 mb-3">
              {hotel.meal && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded px-2 py-0.5">
                  <MdBreakfastDining className="text-sm" />{hotel.meal}
                </span>
              )}
              {hotel.refundable ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-green-50 text-green-700 border border-green-200 rounded px-2 py-0.5">
                  <FaCheck className="text-[10px]" />Free Cancellation
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-red-50 text-red-500 border border-red-200 rounded px-2 py-0.5">
                  <FaTimes className="text-[10px]" />Non-Refundable
                </span>
              )}
            </div>

            {/* Amenities */}
            <div className="flex flex-wrap gap-2">
              {hotel.inclusions?.slice(0, 5).map((item, index) => (
                <div key={index} className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded px-2 py-0.5 text-xs text-slate-600">
                  <FaWifi className="text-[10px]" style={{ color: ORANGE }} />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Info */}
          <div className="mt-3 pt-2 border-t border-dashed border-slate-200 text-xs text-slate-500">
            {hotel.nights} Night(s)
          </div>
        </div>

        {/* 💰 Right Pricing Section */}
        <div className="w-full md:w-56 border-t md:border-t-0 md:border-l border-slate-200 flex flex-col items-center justify-between p-4" style={{ background: `${ORANGE}08` }}>
          <div className="text-[15px] font-bold" style={{ color: AZURE }}>Starts From</div>
          <div className="w-full text-center">
            <div className="text-xl font-black" style={{ color: AZURE }}>
              ₹{Math.round(hotel.perNight)?.toLocaleString()} / night
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-2 mt-3">
              <div className="text-[10px] text-slate-400 uppercase">Total Amount</div>
              <div className="text-lg font-black" style={{ color: ORANGE }}>
                ₹{hotel.price?.toLocaleString()}
              </div>
              <div className="text-[9px] text-slate-400">Incl. ₹{hotel.totalTax?.toLocaleString()} tax</div>
            </div>
          </div>

          <button
            onClick={() => { navigate("/one-hotel-details", { state: { hotelCode: hotel.id, traceId: hotel.traceId } }); }}
            className="w-full py-2 font-bold text-xs uppercase tracking-widest rounded-lg shadow mt-3 transition-all active:scale-95 hover:brightness-110"
            style={{ background: ORANGE, color: DARK }}
          >
            Check Availability
          </button>
        </div>
      </div>
    </div>
  );
};

export default HotelCard;
