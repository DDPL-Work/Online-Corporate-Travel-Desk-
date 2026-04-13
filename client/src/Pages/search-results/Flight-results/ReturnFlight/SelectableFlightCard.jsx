// SelectableFlightCard.jsx
import { parseSingleJourney } from "../../../../utils/parseReturnFlight";
import { FlightSegment } from "./FlightSegment";

export default function SelectableFlightCard({ group, selected, selectedFlight, onSelect }) {
  const activeFlight = selected && selectedFlight ? selectedFlight : group.flightInfo;
  const journey = parseSingleJourney(activeFlight.Segments[0]);
  const currentFare = Math.ceil(activeFlight.Fare?.PublishedFare);

  return (
    <div
      className={`bg-blue-100 rounded-lg transition-all duration-200 ${
        selected
          ? "border-2 border-emerald-500 shadow-lg ring-2 ring-green-200"
          : "border border-gray-200 hover:border-emerald-300 hover:shadow-md"
      }`}
    >
      <div 
        className="p-5 cursor-pointer" 
        onClick={() => {
           if (!selected) {
             onSelect(group.flightInfo);
           }
        }}
      >
        <FlightSegment data={journey} fare={currentFare} selected={selected} />
      </div>

      {group.fareOptions && group.fareOptions.length > 0 && (
        <div className="px-5 pb-3">
          <div className="flex flex-wrap gap-2 mt-2 border-t border-blue-200/50 pt-3">
            {group.fareOptions.map((fare, idx) => {
              const isFareSelected = selected && selectedFlight?.ResultIndex === fare.resultIndex;
              return (
                <button
                  key={fare.resultIndex || idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    const flightVariant = group.flightOptionsByResultIndex[fare.resultIndex];
                    if (flightVariant) onSelect(flightVariant);
                  }}
                  className={`flex flex-col items-center justify-center px-4 py-1.5 rounded-lg border transition-all ${
                    isFareSelected
                      ? "bg-emerald-500 text-white border-emerald-600 shadow-md"
                      : "bg-white text-blue-800 border-blue-200 hover:bg-blue-50"
                  }`}
                >
                  <span className="text-[11px] font-medium opacity-90">{fare.supplierFareClass}</span>
                  <span className="text-sm font-bold">₹{Math.ceil(fare.publishedFare).toLocaleString()}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selection Footer */}
      {selected && (
        <div className="px-5 -mt-6 pb-3 rounded-b-lg pointer-events-none">
          <div className="flex items-center justify-end">
            <div className="flex items-center gap-2 text-green-700 bg-white rounded-full">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
