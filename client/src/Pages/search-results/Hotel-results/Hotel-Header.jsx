import React, { useState } from "react";
import { FaArrowLeft, FaChevronDown } from "react-icons/fa";
import { MdArrowBack } from "react-icons/md";

const Header = () => {
  const [searchData, setSearchData] = useState({
    city: "NEW DELHI",
    checkIn: "Tue, 17th Feb 2026",
    nights: "2N",
    checkOut: "Thu, 19th Feb 2026",
    rooms: "1 Room 2 Adults",
  });

  return (
    <header className="bg-blue-100 shadow-sm">
      <div className="container mx-auto px-4 py-4">
        {/* BACK BUTTON */}
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 mb-2"
        >
          <MdArrowBack className="text-lg" />
          Back to search
        </button>

        {/* SEARCH BAR CARD */}
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="flex items-end gap-4 flex-wrap">
            {/* City */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-gray-500 uppercase mb-1 block">
                City, Area or Property
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchData.city}
                  onChange={(e) =>
                    setSearchData({ ...searchData, city: e.target.value })
                  }
                  className="w-full h-11 px-4 border border-gray-300 rounded-lg font-semibold focus:ring-2 focus:ring-blue-500"
                />
                <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              </div>
            </div>

            {/* Check-in */}
            <div className="flex-1 min-w-40">
              <label className="text-xs text-gray-500 uppercase mb-1 block">
                Check-In
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchData.checkIn}
                  onChange={(e) =>
                    setSearchData({ ...searchData, checkIn: e.target.value })
                  }
                  className="w-full h-11 px-4 border border-gray-300 rounded-lg font-semibold"
                />
                <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              </div>
            </div>

            {/* Nights */}
            <div className="w-20">
              <label className="text-xs text-gray-500 uppercase mb-1 block text-center">
                Nights
              </label>
              <input
                type="text"
                value={searchData.nights}
                onChange={(e) =>
                  setSearchData({ ...searchData, nights: e.target.value })
                }
                className="w-full h-11 border border-gray-300 rounded-lg font-semibold text-center bg-gray-100"
              />
            </div>

            {/* Check-out */}
            <div className="flex-1 min-w-40">
              <label className="text-xs text-gray-500 uppercase mb-1 block">
                Check-Out
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchData.checkOut}
                  onChange={(e) =>
                    setSearchData({ ...searchData, checkOut: e.target.value })
                  }
                  className="w-full h-11 px-4 border border-gray-300 rounded-lg font-semibold"
                />
                <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              </div>
            </div>

            {/* Rooms */}
            <div className="flex-1 min-w-[180px]">
              <label className="text-xs text-gray-500 uppercase mb-1 block">
                Rooms & Guests
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchData.rooms}
                  onChange={(e) =>
                    setSearchData({ ...searchData, rooms: e.target.value })
                  }
                  className="w-full h-11 px-4 border border-gray-300 rounded-lg font-semibold"
                />
                <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              </div>
            </div>

            {/* Search Button */}
            <div className="shrink-0">
              <button className="h-11 px-10 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition">
                Search
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
