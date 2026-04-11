// OnwardFlightList.jsx
import SelectableFlightCard from "./SelectableFlightCard";

export default function OnwardFlightList({ flights, selectedFlight, onSelect }) {
  return (
    <div className="space-y-3">

      {/* Flight Cards */}
      <div className="space-y-3">
        {flights.map((group) => {
          const isSelected = selectedFlight && group.flightOptionsByResultIndex[selectedFlight.ResultIndex];
          return (
            <SelectableFlightCard
              key={group.flightKey}
              group={group}
              selected={isSelected}
              selectedFlight={selectedFlight}
              onSelect={onSelect}
            />
          );
        })}
      </div>
    </div>
  );
}