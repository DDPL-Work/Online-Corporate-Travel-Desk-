import React from "react";
import { FaPlane, FaHotel } from "react-icons/fa";
import { MdArrowBack } from "react-icons/md";
import { useNavigate } from "react-router-dom";

export default function SearchHeader({ activePage, onChangePage }) {
  const navigate = useNavigate();
  return (
    <div className="items-center mb-5">

      {/* CENTER: Header */}
      <div className="flex flex-col items-center space-y-3">
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/search-flight")}
            className={`flex items-center gap-2 px-8 py-3 rounded-xl
              font-bold text-lg transition-all
              ${
                activePage === "flight"
                  ? "bg-blue-800 text-white shadow-lg"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
          >
            <FaPlane size={18} />
            Flights
          </button>

          <button
            onClick={() => navigate("/search-hotel")}
            className={`flex items-center gap-2 px-8 py-3 rounded-xl
              font-bold text-lg transition-all
              ${
                activePage === "hotel"
                  ? "bg-blue-800 text-white shadow-lg"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
          >
            <FaHotel size={18} />
            Hotels
          </button>
        </div>
      </div>

      {/* RIGHT: Empty spacer (keeps center perfectly centered) */}
      <div />
    </div>
  );
}
