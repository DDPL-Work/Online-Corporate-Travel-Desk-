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
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
          <BsLuggage className="text-4xl text-slate-300" />
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">No Extra Baggage Options</h3>
        <p className="text-gray-500 max-w-xs mx-auto">
          Additional baggage cannot be pre-booked for this flight. Standard baggage rules still apply.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg sm:text-xl font-black text-[#0A203E] uppercase tracking-tight flex items-center gap-2">
          <BsLuggage className="text-[#C9A84C]" /> Choose Your Baggage
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
                  ? "border-[#0A203E] bg-slate-50"
                  : "border-gray-200 bg-white hover:border-[#C9A84C]"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                {/* Left: Baggage Info */}
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      isAdded ? "bg-slate-100" : "bg-slate-50"
                    }`}
                  >
                    <BsLuggage
                      className={`text-xl ${
                        isAdded ? "text-[#0A203E]" : "text-[#C9A84C]"
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
                        : "bg-[#0A203E] text-white hover:bg-[#0A203E]/90"
                    }`}
                  >
                    {isAdded ? "Added" : "Add"}
                  </button>
                )}
              </div>

              {/* Price */}
              <div className="flex justify-between items-center">
                <p className="text-lg sm:text-xl font-bold text-[#0A203E]">
                  ₹{bag.Price}
                </p>
                {isAdded && (
                  <span className="text-xs font-semibold text-[#0A203E] bg-[#C9A84C]/10 px-2 py-0.5 rounded-full">
                    Selected
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>


    </div>
  );
};
