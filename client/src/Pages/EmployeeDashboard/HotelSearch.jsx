import React, { useState } from "react";
import { FaSearch } from "react-icons/fa";
import SearchHeader from "../../components/search-layout/SearchHeader";
import SearchCard from "../../components/search-layout/SearchCard";
import GuestsRoomsDropdown from "../../components/hotel-search/GuestsRoomsDropdown";
import EmployeeHeader from "./Employee-Header";
import { useNavigate } from "react-router-dom";

export default function HotelSearchPage() {
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState("hotel");
  const [city, setCity] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [roomsData, setRoomsData] = useState([]);

  const handleSearch = () => {
    navigate("/search-hotel-results");
  };
  return (
    <div className="min-h-screen relative">
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "url(https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1920&q=80)",
          backgroundSize: "cover",
        }}
      >
        <div className="absolute inset-0 bg-white/40 backdrop-blur-sm" />
      </div>
      <EmployeeHeader />

      <div className="relative z-10 container mx-auto px-4 py-8">
        <SearchHeader activePage={activePage} onChangePage={setActivePage} />

        <SearchCard>
          {/* Search Card */}
          <div className="max-w-5xl mx-auto">
            {/* FORM GRID */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* City */}
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  City / Hotel / Area
                </label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Enter city or hotel"
                  className="w-full mt-1 p-3 border rounded-xl focus:border-blue-800 focus:outline-none"
                />
              </div>

              {/* Check-in */}
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Check-in
                </label>
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full mt-1 p-3 border rounded-xl focus:border-blue-800 focus:outline-none"
                />
              </div>

              {/* Check-out */}
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Check-out
                </label>
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full mt-1 p-3 border rounded-xl focus:border-blue-800 focus:outline-none"
                />
              </div>

              {/* Guests & Rooms */}
              <div>
                <label className="text-sm font-semibold">Guests & Rooms</label>
                <div className="mt-1">
                  <GuestsRoomsDropdown
                    value={roomsData}
                    onChange={setRoomsData}
                  />
                </div>
              </div>
            </div>

            {/* Search Button */}
            <div className="mt-8">
              <button
                onClick={handleSearch}
                className="w-full bg-blue-800 hover:bg-blue-900 text-white py-4 rounded-xl text-lg font-bold flex justify-center gap-3"
              >
                <FaSearch />
                Search Hotels
              </button>
            </div>
          </div>
        </SearchCard>
      </div>
    </div>
  );
}
