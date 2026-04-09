import { BsLuggage } from "react-icons/bs";

// Baggage Table Component
export const BaggageTable = ({
  baggage = [],
  selectable = false,
  selectedBaggage = null,
  onAddBaggage,
  onClearBaggage,
  onConfirm,
}) => {
  if (!Array.isArray(baggage) || baggage.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-6">
        No baggage information available
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800 flex items-center gap-2">
          🧳 Choose Your Baggage
        </h2>
        {selectable && (
          <button
            onClick={onClearBaggage}
            className="text-sm font-semibold text-gray-500 hover:text-red-600 transition"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Baggage Options Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {baggage.map((bag, idx) => {
          const isAdded =
            selectedBaggage?.Code === bag.Code &&
            selectedBaggage?.Weight === bag.Weight;

          return (
            <div
              key={idx}
              className={`relative border rounded-2xl p-5 shadow-sm transition-all duration-200 hover:shadow-md flex flex-col justify-between ${
                isAdded
                  ? "border-blue-600 bg-blue-50"
                  : "border-gray-200 bg-white hover:border-blue-300"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                {/* Left: Baggage Info */}
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      isAdded ? "bg-blue-100" : "bg-sky-50"
                    }`}
                  >
                    <BsLuggage
                      className={`text-xl ${
                        isAdded ? "text-blue-700" : "text-blue-500"
                      }`}
                    />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 text-sm sm:text-base">
                      {bag.Weight === 0
                        ? "No Extra Baggage"
                        : `${bag.Weight} Kg Extra`}
                    </h4>
                    <p className="text-xs text-gray-500">
                      {bag.Description || "Add more luggage allowance"}
                    </p>
                  </div>
                </div>

                {/* Right: Action Button */}
                {selectable && (
                  <button
                    onClick={() => onAddBaggage?.(bag)}
                    disabled={isAdded}
                    className={`px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-full transition-all duration-200 shadow-sm ${
                      isAdded
                        ? "bg-gray-300 text-gray-700 cursor-default"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    {isAdded ? "Added" : "Add"}
                  </button>
                )}
              </div>

              {/* Price */}
              <div className="flex justify-between items-center">
                <p className="text-lg sm:text-xl font-bold text-blue-700">
                  ₹{bag.Price}
                </p>
                {isAdded && (
                  <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                    Selected
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Actions */}
      {selectable && (
        <div className="flex justify-end items-center gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={onConfirm}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition"
          >
            Confirm Selection
          </button>
        </div>
      )}
    </div>
  );
};
