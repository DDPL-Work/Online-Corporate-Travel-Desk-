import { PiForkKnifeBold } from "react-icons/pi";
import { normalizeSSRList } from "../CommonComponents";

export const MealSelectionCards = ({
  meals = [],
  selectedMeals = {},
  onToggleMeal,
  journeyType,
  flightIndex,
  travelersCount = 1,
  onClearMeals,
  onConfirm,
}) => {
  const normalizedMeals = normalizeSSRList(meals).filter(
    (m) => m.Code !== "NoMeal",
  );

  if (!normalizedMeals.length) {
    return (
      <p className="text-sm text-gray-500 text-center py-6">
        No meals available for this flight
      </p>
    );
  }

  const key = `${journeyType}|${flightIndex}`;
  const selected = selectedMeals[key] || [];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
          🍱 Choose Your Meal
        </h2>
        <button
          onClick={() => onClearMeals?.(journeyType, flightIndex)}
          className="text-sm font-semibold text-gray-500 hover:text-red-600"
        >
          Clear All
        </button>
      </div>

      {/* Meal Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {normalizedMeals.map((meal, idx) => {
          const isSelected = selected.some((m) => m.Code === meal.Code);

          return (
            <div
              key={idx}
              className={`group relative border rounded-2xl p-4 flex flex-col justify-between shadow-sm transition-all duration-200 hover:shadow-lg ${
                isSelected
                  ? "border-green-500 bg-green-50"
                  : "border-gray-200 bg-white hover:border-orange-400"
              }`}
            >
              {/* Top Section */}
              <div className="flex gap-4 items-center">
                {/* Icon */}
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 transition ${
                    isSelected ? "bg-green-100" : "bg-orange-50"
                  }`}
                >
                  <PiForkKnifeBold
                    className={`text-2xl transition ${
                      isSelected ? "text-green-600" : "text-orange-600"
                    }`}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 text-sm sm:text-base truncate">
                    {meal.AirlineDescription || "Meal Option"}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {meal.Description || "Delicious in-flight meal"}
                  </p>
                </div>
              </div>

              {/* Price + Button */}
              <div className="mt-4 flex justify-between items-center">
                <div className="text-lg font-bold text-orange-600">
                  ₹{meal.Price}
                </div>
                <button
                  onClick={() =>
                    onToggleMeal(journeyType, flightIndex, meal, travelersCount)
                  }
                  className={`px-4 py-1.5 text-sm font-semibold rounded-full shadow-sm transition-all duration-200 ${
                    isSelected
                      ? "bg-red-500 text-white hover:bg-red-600"
                      : "bg-orange-600 text-white hover:bg-orange-700"
                  }`}
                >
                  {isSelected ? "Remove" : "Add Meal"}
                </button>
              </div>

              {/* Selection Ribbon (MMT style) */}
              {isSelected && (
                <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                  Selected
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Actions */}
      <div className="flex justify-end items-center gap-3 pt-3 border-t border-gray-200">
        <button
          onClick={onConfirm}
          className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
        >
          Confirm Selection
        </button>
      </div>
    </div>
  );
};
