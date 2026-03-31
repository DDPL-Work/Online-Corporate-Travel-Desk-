import React, { useMemo, useState } from "react";
import { AiOutlineClose } from "react-icons/ai";
import { FaConciergeBell } from "react-icons/fa";
import { MdEventSeat, MdRestaurant } from "react-icons/md";
import { useSelector } from "react-redux";
import { BsLuggage } from "react-icons/bs";
import { MealSelectionCards } from "./MealsSelection";
import { BaggageTable } from "./BaggageSelection";
import SeatPanel from "./SeatSelectionModal"; 
import { normalizeSSRList } from "../CommonComponents";

/* ─────────────────────────────────────────────────────────────── */
/*  Tab config                                                     */
/* ─────────────────────────────────────────────────────────────── */
const TABS = [
  { key: "seat",    label: "Seats",   Icon: MdEventSeat  },
  { key: "meal",    label: "Meals",   Icon: MdRestaurant },
  { key: "baggage", label: "Baggage", Icon: BsLuggage    },
];

/* ─────────────────────────────────────────────────────────────── */
/*  Small badge shown on each tab button                          */
/* ─────────────────────────────────────────────────────────────── */
function TabBadge({ count }) {
  if (!count) return null;
  return (
    <span className="ml-1.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-white text-blue-600 text-[9px] font-black leading-none">
      {count}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Main Modal                                                     */
/* ─────────────────────────────────────────────────────────────── */
export default function SSRModal({
  isOpen,
  onClose,
  flight,
  flightIndex,
  journeyType,
  travelers = [],
  selectedSeats = {},
  onSeatSelect,
  date,
  reviewResponse,
  segment,
  segmentIndex,
  traceId,
  resultIndex,
  selectedMeals,
  onToggleMeal,
  selectedBaggage,
  onSelectBaggage,
  ssrError,
  ssrErrorMessage,
}) {
  const [activeTab, setActiveTab] = useState("seat");

  const ssr = useSelector((state) => state.flights.ssr);

  /* ── Derive per-segment SSR data (same logic as before) ── */
  const segmentSSR = useMemo(() => {
    const segmentSeat =
      ssr?.Response?.SeatDynamic?.[0]?.SegmentSeat?.[segmentIndex];
    return {
      seats:   segmentSeat?.RowSeats || [],
      meals:   ssr?.Response?.MealDynamic || [],
      baggage: ssr?.Response?.Baggage    || [],
    };
  }, [ssr, segmentIndex]);

  const normalizedMeals = useMemo(
    () =>
      normalizeSSRList(segmentSSR.meals).filter((m) => m.Code !== "NoMeal"),
    [segmentSSR.meals],
  );

  const normalizedBaggage = useMemo(
    () =>
      segmentSSR.baggage.map((b) => ({
        ...b,
        Code: b.Code || `BAG_${b.Weight}`,
      })),
    [segmentSSR.baggage],
  );

  /* ── Badge counts for each tab ── */
  const seatCount = useMemo(() => {
    const key = `${journeyType}|${segmentIndex}`;
    return selectedSeats[key]?.list?.length || 0;
  }, [selectedSeats, journeyType, segmentIndex]);

  const mealCount = useMemo(() => {
    const key = `${journeyType}|${segmentIndex}`;
    return selectedMeals?.[key]?.length || 0;
  }, [selectedMeals, journeyType, segmentIndex]);

  const baggageCount = useMemo(() => {
    const key = `${journeyType}|${segmentIndex}`;
    return selectedBaggage?.[key] ? 1 : 0;
  }, [selectedBaggage, journeyType, segmentIndex]);

  const badgeMap = { seat: seatCount, meal: mealCount, baggage: baggageCount };

  const handleClearMeals = (jType, sIdx) => {
    const key = `${jType}|${sIdx}`;
    onToggleMeal((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  if (!isOpen) return null;

  /* ── SSR unavailable error state ── */
  if (ssrError) {
    return (
      <div
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
        onClick={onClose}
      >
        <div
          className="bg-white p-6 rounded-xl text-center max-w-sm w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-lg font-semibold mb-2">No SSR Available</h2>
          <p className="text-gray-600 mb-4">{ssrErrorMessage}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-[1200px] h-[90vh] flex flex-col overflow-hidden border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-blue-700 to-blue-600 text-white shrink-0">
          <div className="flex items-center gap-3 font-semibold text-lg">
            <FaConciergeBell /> Add-ons &amp; Extras
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/20 transition-colors"
          >
            <AiOutlineClose className="text-white text-lg" />
          </button>
        </div>

        {/* ── TAB BAR ── */}
        <div className="flex items-center justify-center gap-3 bg-blue-50 py-2.5 border-b border-blue-100 shrink-0">
          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-5 py-1.5 rounded-full font-medium text-sm transition-all ${
                activeTab === key
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-blue-600 border border-blue-200 hover:bg-blue-100"
              }`}
            >
              <Icon className="text-base" />
              {label}
              <TabBadge count={badgeMap[key]} />
            </button>
          ))}
        </div>

        {/* ── PANEL BODY ── */}
        <div className="flex-1 overflow-hidden flex flex-col">

          {/* SEATS — uses your existing SeatPanel component untouched */}
          {activeTab === "seat" && (
            <SeatPanel
              segmentSSR={segmentSSR}
              journeyType={journeyType}
              segmentIndex={segmentIndex}
              selectedSeats={selectedSeats}
              travelers={travelers}
              onSeatSelect={onSeatSelect}
              onClose={onClose}
            />
          )}

          {/* MEALS — uses your existing MealSelectionCards component untouched */}
          {activeTab === "meal" && (
            <div className="flex-1 overflow-auto p-4 bg-sky-50">
              <MealSelectionCards
                meals={normalizedMeals}
                selectedMeals={selectedMeals}
                onToggleMeal={onToggleMeal}
                journeyType={journeyType}
                flightIndex={segmentIndex}
                travelersCount={travelers.length}
                onClearMeals={handleClearMeals}
                onConfirm={() => setActiveTab("seat")}
              />
            </div>
          )}

          {/* BAGGAGE — uses your existing BaggageTable component untouched */}
          {activeTab === "baggage" && (
            <div className="flex-1 overflow-auto p-4 bg-sky-50">
              <BaggageTable
                baggage={normalizedBaggage}
                selectable
                selectedBaggage={
                  selectedBaggage?.[`${journeyType}|${segmentIndex}`]
                }
                onAddBaggage={(bag) =>
                  onSelectBaggage(journeyType, segmentIndex, bag)
                }
                onClearBaggage={() =>
                  onSelectBaggage(journeyType, segmentIndex, null)
                }
                onConfirm={() => setActiveTab("seat")}
              />
            </div>
          )}

        </div>

        {/* ── FOOTER — always-visible summary + Done button ── */}
        <div className="shrink-0 border-t bg-white px-5 py-3 flex items-center justify-between gap-4">
          {/* Selection summary chips */}
          <div className="flex items-center gap-3 flex-wrap">
            {seatCount > 0 && (
              <span className="flex items-center gap-1.5 bg-sky-50 border border-sky-200 px-3 py-1 rounded-full text-xs font-semibold text-sky-700">
                <MdEventSeat /> {seatCount} Seat{seatCount > 1 ? "s" : ""}
              </span>
            )}
            {mealCount > 0 && (
              <span className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 px-3 py-1 rounded-full text-xs font-semibold text-orange-700">
                <MdRestaurant /> {mealCount} Meal{mealCount > 1 ? "s" : ""}
              </span>
            )}
            {baggageCount > 0 && (
              <span className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full text-xs font-semibold text-blue-700">
                <BsLuggage /> Baggage Added
              </span>
            )}
            {seatCount === 0 && mealCount === 0 && baggageCount === 0 && (
              <span className="text-gray-400 text-xs">No add-ons selected yet</span>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors shrink-0"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}