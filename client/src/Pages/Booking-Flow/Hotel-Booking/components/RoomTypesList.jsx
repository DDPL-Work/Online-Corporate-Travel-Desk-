import React, { useState, useMemo } from "react";
import RoomCard from "./RoomCard";

const RoomTypesList = ({ rooms, onSelectRoom }) => {
  const [selectedCategory, setSelectedCategory] = useState("all");
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

  // ✅ Filter Logic
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const roomName = (
        typeof room.RoomTypeName === "string"
          ? room.RoomTypeName
          : Array.isArray(room.Name)
            ? room.Name[0]
            : typeof room.Name === "string"
              ? room.Name
              : ""
      ).toLowerCase();

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

      const categoryMatch =
        selectedCategory === "all" ||
        roomName.includes(selectedCategory.toLowerCase());

      const mealMatch =
        selectedMeal === "all" || mealType.includes(selectedMeal.toLowerCase());

      return categoryMatch && mealMatch;
    });
  }, [rooms, selectedCategory, selectedMeal]);

  return (
    <div className="space-y-4">
      {/* 🔥 HEADER */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
        <h2 className="text-xl font-bold text-gray-900">Room Types</h2>

        <div className="flex items-center gap-4 flex-wrap">
          {/* LEFT → Room Category */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Room Type:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#0A4D68]"
            >
              {roomCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
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
        {filteredRooms.map((room) => (
          <RoomCard
            key={room.BookingCode}
            room={room}
            onSelect={() => onSelectRoom(room)}
          />
        ))}

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
