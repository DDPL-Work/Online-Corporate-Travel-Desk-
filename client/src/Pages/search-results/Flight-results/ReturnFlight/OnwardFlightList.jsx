// OnwardFlightList.jsx
import SelectableFlightCard from "./SelectableFlightCard";

export default function OnwardFlightList({ flights, selectedFlight, onSelect }) {
  return (
    <div className="space-y-3">

      {/* Flight Cards */}
      <div className="space-y-3">
        {flights.map((flight) => (
          <SelectableFlightCard
            key={flight.ResultIndex}
            flight={flight}
            selected={selectedFlight?.ResultIndex === flight.ResultIndex}
            onClick={() => onSelect(flight)}
          />
        ))}
      </div>
    </div>
  );
}