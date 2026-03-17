
import React, { useState, useMemo } from "react";
import RoomCard from "./RoomCard";

const RoomTypesList = ({ rooms, onSelectRoom }) => {
  const [selectedType, setSelectedType] = useState("All");
  const [sortBy, setSortBy] = useState("Popularity");

  // 1. Extract dynamic room types
  const roomTypes = useMemo(() => {
    const types = new Set(["All"]);
    rooms.forEach((r) => {
      const name = r.Name?.[0]?.split(",")?.[0] || "Other";
      types.add(name.trim());
    });
    return Array.from(types);
  }, [rooms]);

  // 2. Filter and Sort logic
  const filteredSortedRooms = useMemo(() => {
    let result = [...rooms];

    // Filter
    if (selectedType !== "All") {
      result = result.filter(
        (r) => (r.Name?.[0]?.split(",")?.[0] || "Other").trim() === selectedType,
      );
    }

    // Sort
    if (sortBy === "Price: Low to High") {
      result.sort((a, b) => {
        const fareA = a.Price?.TotalFare || a.TotalFare || 0;
        const fareB = b.Price?.TotalFare || b.TotalFare || 0;
        return fareA - fareB;
      });
    } else if (sortBy === "Price: High to Low") {
      result.sort((a, b) => {
        const fareA = a.Price?.TotalFare || a.TotalFare || 0;
        const fareB = b.Price?.TotalFare || b.TotalFare || 0;
        return fareB - fareA;
      });
    }
    // "Popularity" or default - use original order or add logic if popularity field exists

    return result;
  }, [rooms, selectedType, sortBy]);

  return (
    <div className="space-y-6">
      {/* Header & Sort */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">Room Types</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">
            Order by:
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 px-3 font-semibold cursor-pointer outline-none transition-all hover:bg-gray-50 shadow-sm"
          >
            <option>Popularity</option>
            <option>Price: Low to High</option>
            <option>Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Dynamic Type Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {roomTypes.map((type) => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-200 border-2
              ${
                selectedType === type
                  ? "bg-blue-600 text-white border-blue-600 shadow-md"
                  : "bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600"
              }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Room List */}
      <div className="space-y-4">
        {filteredSortedRooms.length > 0 ? (
          filteredSortedRooms.map((room) => (
            <RoomCard
              key={room.BookingCode}
              room={room}
              onSelect={() => onSelectRoom(room)}
            />
          ))
        ) : (
          <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-200">
            <p className="text-gray-500 font-medium">
              No rooms found for "{selectedType}"
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomTypesList;
