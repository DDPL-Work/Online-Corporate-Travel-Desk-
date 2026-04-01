// SelectableFlightCard.jsx
import { parseSingleJourney } from "../../../../utils/parseReturnFlight";
import { FlightSegment } from "./FlightSegment";

export default function SelectableFlightCard({ flight, selected, onClick }) {
  const journey = parseSingleJourney(flight.Segments[0]);
  const fare = Math.ceil(flight.Fare?.PublishedFare);

  return (
    <div
      onClick={onClick}
      className={`bg-blue-100 rounded-lg cursor-pointer transition-all duration-200 ${
        selected
          ? "border-2 border-emerald-500 shadow-lg ring-2 ring-green-200"
          : "border border-gray-200 hover:border-emerald-300 hover:shadow-md"
      }`}
    >
      <div className="p-5">
        <FlightSegment data={journey} fare={fare} selected={selected} />
      </div>

      {/* Selection Footer */}
      {selected && (
        <div className="px-5 -mt-10 pb-3 rounded-b-lg">
          <div className="flex items-center justify-end">
            <div className="flex items-center gap-2 text-green-700">
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
