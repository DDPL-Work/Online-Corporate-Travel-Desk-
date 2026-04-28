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
import { useDispatch } from "react-redux";
import { fetchMySSRPolicy } from "../../../../Redux/Actions/ssrPolicy.thunks";
import { ToastWithTimer } from "../../../../utils/ToastConfirm";

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
    <span className="ml-1.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-white text-[#0A203E] text-[9px] font-black leading-none">
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
  const dispatch = useDispatch();

  const ssr = useSelector((state) => state.flights.ssr);
  const ssrPolicy = useSelector((s) => s.ssrPolicy?.myPolicy);

  React.useEffect(() => {
    dispatch(fetchMySSRPolicy());
  }, [dispatch]);

  const policyAllowSeat    = ssrPolicy?.allowSeat    ?? true;
  const policyAllowMeal    = ssrPolicy?.allowMeal    ?? true;
  const policyAllowBaggage = ssrPolicy?.allowBaggage ?? true;
  const seatPriceRange     = ssrPolicy?.seatPriceRange    || { min: 0, max: 99999 };
  const mealPriceRange     = ssrPolicy?.mealPriceRange    || { min: 0, max: 99999 };
  const baggagePriceRange  = ssrPolicy?.baggagePriceRange || { min: 0, max: 99999 };

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
            className="px-4 py-2 bg-[#0A203E] text-white rounded-lg font-bold uppercase tracking-wider text-xs"
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
        <div className="flex items-center justify-between px-5 py-4 bg-[#0A203E] text-white shrink-0">
          <div className="flex items-center gap-3 font-bold text-lg uppercase tracking-widest">
            <FaConciergeBell className="text-[#C9A84C]" /> Selection Center
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/20 transition-colors"
          >
            <AiOutlineClose className="text-white text-lg" />
          </button>
        </div>

        {/* ── TAB BAR ── */}
        <div className="flex items-center justify-center gap-4 bg-slate-50 py-3 border-b border-slate-200 shrink-0">
          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-5 py-1.5 rounded-full font-medium text-sm transition-all ${
                activeTab === key
                  ? "bg-[#0A203E] text-white shadow-md"
                  : "bg-white text-[#0A203E] border border-slate-200 hover:bg-slate-100"
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
            <div className="flex-1 overflow-auto p-4 bg-slate-50">
              <MealSelectionCards
                meals={normalizedMeals}
                selectedMeals={selectedMeals}
                onToggleMeal={(j, si, meal, tc) => {
                  const price = Number(meal.Price || 0);
                  if (price > 0) {
                    if (!policyAllowMeal) {
                      ToastWithTimer({ type: "error", message: "Paid meal selection is not allowed for your account." });
                      return;
                    }
                    if (price < mealPriceRange.min || price > mealPriceRange.max) {
                      ToastWithTimer({
                        type: "error",
                        message: `Meal price ₹${price} exceeds your allowed range (₹${mealPriceRange.min}–₹${mealPriceRange.max}).`,
                      });
                      return;
                    }
                  }
                  onToggleMeal(j, si, meal, tc);
                }}
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
            <div className="flex-1 overflow-auto p-4 bg-slate-50">
              <BaggageTable
                baggage={normalizedBaggage}
                selectable
                selectedBaggage={
                  selectedBaggage?.[`${journeyType}|${segmentIndex}`]
                }
                onAddBaggage={(bag) => {
                  const price = Number(bag.Price || 0);
                  if (price > 0) {
                    if (!policyAllowBaggage) {
                      ToastWithTimer({ type: "error", message: "Paid baggage selection is restricted for your account." });
                      return;
                    }
                    if (price < baggagePriceRange.min || price > baggagePriceRange.max) {
                      ToastWithTimer({
                        type: "error",
                        message: `Baggage price ₹${price} exceeds your allowed range (₹${baggagePriceRange.min}–₹${baggagePriceRange.max}).`,
                      });
                      return;
                    }
                  }
                  onSelectBaggage(journeyType, segmentIndex, bag);
                }}
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
              <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full text-xs font-semibold text-[#0A203E]">
                <MdEventSeat /> {seatCount} Seat{seatCount > 1 ? "s" : ""}
              </span>
            )}
            {mealCount > 0 && (
              <span className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 px-3 py-1 rounded-full text-xs font-semibold text-orange-700">
                <MdRestaurant /> {mealCount} Meal{mealCount > 1 ? "s" : ""}
              </span>
            )}
            {baggageCount > 0 && (
              <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full text-xs font-semibold text-[#0A203E]">
                <BsLuggage /> Baggage Added
              </span>
            )}
            {seatCount === 0 && mealCount === 0 && baggageCount === 0 && (
              <span className="text-gray-400 text-xs">No add-ons selected yet</span>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-8 py-2.5 bg-[#0A203E] hover:bg-[#0A203E]/90 text-white rounded-xl text-sm font-bold transition-all shadow-lg uppercase tracking-widest"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}