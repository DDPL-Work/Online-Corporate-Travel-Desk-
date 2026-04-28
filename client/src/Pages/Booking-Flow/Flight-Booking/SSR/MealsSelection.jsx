import { PiForkKnifeBold } from "react-icons/pi";
import { MdRestaurant } from "react-icons/md";
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
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-6">
          <PiForkKnifeBold className="text-4xl text-orange-300" />
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">No Meals Available</h3>
        <p className="text-gray-500 max-w-xs mx-auto">
          The airline hasn't provided any meal options for this specific flight segment.
        </p>
      </div>
    );
  }

  const key = `${journeyType}|${flightIndex}`;
  const selected = selectedMeals[key] || [];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg sm:text-xl font-black text-[#0A203E] uppercase tracking-tight flex items-center gap-2">
          <MdRestaurant className="text-[#C9A84C]" /> Choose Your Meal
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
                  : "border-gray-200 bg-white hover:border-[#C9A84C]"
              }`}
            >
              {/* Top Section */}
              <div className="flex gap-4 items-center">
                {/* Icon */}
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 transition ${
                    isSelected ? "bg-green-100" : "bg-slate-50"
                  }`}
                >
                  <PiForkKnifeBold
                    className={`text-2xl transition ${
                      isSelected ? "text-green-600" : "text-[#C9A84C]"
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
                <div className="text-lg font-bold text-[#0A203E]">
                  ₹{meal.Price}
                </div>
                <button
                  onClick={() =>
                    onToggleMeal(journeyType, flightIndex, meal, travelersCount)
                  }
                  className={`px-4 py-1.5 text-sm font-semibold rounded-full shadow-sm transition-all duration-200 ${
                    isSelected
                      ? "bg-red-500 text-white hover:bg-red-600"
                      : "bg-[#0A203E] text-white hover:bg-[#0A203E]/90"
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


    </div>
  );
};
