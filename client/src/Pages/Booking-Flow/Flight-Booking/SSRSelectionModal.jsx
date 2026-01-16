import Modal from "../../../utils/Modal";
import { useState } from "react";
import {
  BaggageTable,
  MealSelectionCards,
  normalizeSSRList,
} from "./CommonComponents";

const SSRSelectionModal = ({
  isOpen,
  onClose,
  type,
  ssr,
  travelers,
  selectedMeals,
  onToggleMeal,
  selectedBaggage,
  onSelectBaggage,
  routes,
  segments,
}) => {
  const [journey, setJourney] = useState("onward");
  const [segmentIndex, setSegmentIndex] = useState(0);

  const data =
    type === "baggage"
      ? normalizeSSRList(
          ssr?.[journey]?.Response?.Baggage?.filter(
            (b) => b.SegmentIndex === segmentIndex
          )
        )
      : normalizeSSRList(
          ssr?.[journey]?.Response?.MealDynamic?.filter(
            (m) => m.SegmentIndex === segmentIndex
          )
        );

  const segmentsForJourney = segments?.[journey] || [];

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={
        <div className="flex flex-col">
          <span className="text-lg font-bold">
            {type === "baggage" ? "Extra Baggage" : "Meals"}
          </span>
          <span className="text-sm text-gray-500">{routes?.[journey]}</span>
        </div>
      }
    >
      {/* ROUTE TOGGLE */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {segmentsForJourney.map((seg, idx) => (
          <button
            key={idx}
            onClick={() => setSegmentIndex(idx)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap ${
              segmentIndex === idx
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {seg.da.code} → {seg.aa.code}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      {type === "baggage" ? (
        <BaggageTable
          baggage={data}
          selectable
          selectedBaggage={selectedBaggage?.[journey]}
          onAddBaggage={(bag) => onSelectBaggage(journey, segmentIndex, bag)}
        />
      ) : (
        <MealSelectionCards
          meals={data}
          selectedMeals={selectedMeals}
          onToggleMeal={onToggleMeal}
          journeyType={journey}
          //   flightIndex={0}
          flightIndex={segmentIndex}
          travelersCount={travelers.length}
        />
      )}

      {/* FOOTER */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={onClose}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold"
        >
          Confirm
        </button>
      </div>
    </Modal>
  );
};

export default SSRSelectionModal;
