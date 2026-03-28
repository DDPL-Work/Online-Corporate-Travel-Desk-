import React, { useState, useMemo } from "react";
import RoomCard from "./RoomCard";

const RoomTypesList = ({
  rooms,
  onSelectRoom,
  selectedRooms,
  requiredRooms,
}) => {
  const [searchText, setSearchText] = useState("");
  const [selectedMeal, setSelectedMeal] = useState("all");

  // ✅ Dynamic Room Categories
  const roomCategories = useMemo(() => {
    return [
      "all",
      ...new Set(
        rooms.map((r) => {
          const name =
            typeof r.RoomTypeName === "string"
              ? r.RoomTypeName
              : Array.isArray(r.Name)
                ? r.Name[0]
                : typeof r.Name === "string"
                  ? r.Name
                  : "Other";

          return name.split(" ")[0];
        }),
      ),
    ];
  }, [rooms]);

  // ✅ Dynamic Meal Types
  const mealTypes = useMemo(() => {
    return [
      "all",
      ...new Set(
        rooms.map((r) =>
          (r.MealType || r.meal || r.BoardType || "Room Only").replace(
            /_/g,
            " ",
          ),
        ),
      ),
    ];
  }, [rooms]);

  const fuzzyMatch = (text, pattern) => {
    if (!pattern) return true;

    text = text.toLowerCase();
    pattern = pattern.toLowerCase();

    let tIndex = 0;
    let pIndex = 0;

    while (tIndex < text.length && pIndex < pattern.length) {
      if (text[tIndex] === pattern[pIndex]) {
        pIndex++;
      }
      tIndex++;
    }

    return pIndex === pattern.length;
  };

  // ✅ Filter Logic
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const roomName =
        typeof room.RoomTypeName === "string"
          ? room.RoomTypeName
          : Array.isArray(room.Name)
            ? room.Name[0]
            : typeof room.Name === "string"
              ? room.Name
              : "";

      const combinedText = `
  ${roomName}
  ${room.MealType || ""}
  ${room.BoardType || ""}
`.toLowerCase();

      const mealType = (
        room.MealType ||
        room.meal ||
        room.BoardType ||
        "room only"
      )
        .toString()
        .replace(/_/g, " ")
        .toLowerCase()
        .trim();

      const categoryMatch = !searchText || fuzzyMatch(roomName, searchText);

      const mealMatch =
        selectedMeal === "all" || mealType.includes(selectedMeal.toLowerCase());

      return categoryMatch && mealMatch;
    });
  }, [rooms, searchText, selectedMeal]);

  return (
    <div className="space-y-4">
      {/* 🔥 HEADER */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
        <h2 className="text-xl font-bold text-gray-900">Room Types</h2>

        <div className="flex items-center gap-4 flex-wrap">
          {/* LEFT → Room Category */}

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Search Room:</span>

            <input
              type="text"
              placeholder="Search room type (e.g. Deluxe)"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#0A4D68] w-48"
            />
          </div>

          {/* RIGHT → Meal Type */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Meal Type:</span>
            <select
              value={selectedMeal}
              onChange={(e) => setSelectedMeal(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#0A4D68]"
            >
              {mealTypes.map((meal) => (
                <option key={meal} value={meal}>
                  {meal}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 🔥 ROOM LIST */}
      <div className="space-y-4">
        {filteredRooms.map((room) => {
          const bookingCode =
            room.BookingCode || room.RoomTypeCode || room.RatePlanCode;

          const count = selectedRooms[bookingCode]?.count || 0;

          return (
            <RoomCard
              key={bookingCode}
              room={room}
              count={count}
              onAdd={() => onSelectRoom(room, "add")}
              onRemove={() => onSelectRoom(room, "remove")}
            />
          );
        })}
        {/* Empty state */}
        {filteredRooms.length === 0 && (
          <div className="text-center text-sm text-gray-500 py-6">
            No rooms found for selected filters
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomTypesList;
