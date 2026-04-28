import React, { useEffect, useMemo, useState } from "react";
import { AiOutlineClose } from "react-icons/ai";
import { FaArrowRight, FaConciergeBell } from "react-icons/fa";
import {
  MdEventSeat,
  MdFlightLand,
  MdFlightTakeoff,
  MdRestaurant,
} from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { ToastWithTimer } from "../../../../utils/ToastConfirm";
import { BsLuggage } from "react-icons/bs";
import { MealSelectionCards } from "./MealsSelection";
import { BaggageTable } from "./BaggageSelection";
import { normalizeSSRList } from "../CommonComponents";
import { fetchMySSRPolicy } from "../../../../Redux/Actions/ssrPolicy.thunks";

export default function SeatSelectionModal({
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
  const dispatch = useDispatch();
  const { seatMap, loading } = useSelector((state) => state.flights);
  const [seatsFlat, setSeatsFlat] = useState([]);
  const fareQuote = useSelector((state) => state.flights.fareQuote);
  const ssr = useSelector((state) => state.flights.ssr);

  // ── SSR Policy ────────────────────────────────────────────────────────────
  const ssrPolicy = useSelector((s) => s.ssrPolicy?.myPolicy);

  useEffect(() => {
    dispatch(fetchMySSRPolicy());
  }, [dispatch]);

  const policyAllowSeat = ssrPolicy?.allowSeat ?? true;
  const policyAllowMeal = ssrPolicy?.allowMeal ?? true;
  const policyAllowBaggage = ssrPolicy?.allowBaggage ?? true;
  const seatPriceRange = ssrPolicy?.seatPriceRange || { min: 0, max: 99999 };
  const mealPriceRange = ssrPolicy?.mealPriceRange || { min: 0, max: 99999 };
  const baggagePriceRange = ssrPolicy?.baggagePriceRange || {
    min: 0,
    max: 99999,
  };

  const [seatModalOpen, setSeatModalOpen] = useState(true);
  const [mealModalOpen, setMealModalOpen] = useState(false);
  const [baggageModalOpen, setBaggageModalOpen] = useState(false);

  const segmentSSR = useMemo(() => {
    const segmentSeat =
      ssr?.Response?.SeatDynamic?.[0]?.SegmentSeat?.[segmentIndex];

    return {
      seats: segmentSeat?.RowSeats || [],
      meals: ssr?.Response?.MealDynamic || [],
      baggage: ssr?.Response?.Baggage || [],
    };
  }, [ssr, segmentIndex]);

  useEffect(() => {
    const rowSeats = segmentSSR.seats;

    if (!Array.isArray(rowSeats) || rowSeats.length === 0) {
      setSeatsFlat([]);
      return;
    }

    const flat = [];
    rowSeats.forEach((row, rowIndex) => {
      (row.Seats || []).forEach((s) => {
        if (!s?.Code || s.Code === "NoSeat") return;

        const isWindowSeat = (s) => [1, 4, 6, 7].includes(Number(s.SeatType));
        const isAisleSeat = (s) => [2, 10, 12, 13].includes(Number(s.SeatType));
        const isMiddleSeat = (s) =>
          [3, 16, 18, 19].includes(Number(s.SeatType));

        const isExtraLegroomSeat = (s) =>
          s.Text?.toLowerCase().includes("extra leg") ||
          [6, 12, 18, 4, 10, 16].includes(Number(s.SeatType));

        const isEmergencySeat = (s) => [6, 12, 18].includes(Number(s.SeatType));

        flat.push({
          seatNo: s.Code,
          row: Number(s.RowNo || rowIndex + 1),
          col: s.SeatNo ? s.SeatNo.charCodeAt(0) - 64 : null,
          price: Number(s.Price || 0),
          occupied: s.AvailablityType !== 1,

          isWindow: isWindowSeat(s),
          isAisle: isAisleSeat(s),
          isMiddle: isMiddleSeat(s),
          isExtraLegroom: isExtraLegroomSeat(s),
          isEmergency: isEmergencySeat(s),

          raw: s,
        });
      });
    });

    setSeatsFlat(flat);
  }, [segmentSSR]);

  const seatRows = useMemo(() => {
    const rows = {};
    seatsFlat.forEach((seat) => {
      if (!seat.row) return;
      if (!rows[seat.row]) rows[seat.row] = [];
      rows[seat.row].push(seat);
    });

    Object.keys(rows).forEach((row) => {
      rows[row].sort((a, b) => (a.col || 0) - (b.col || 0));
    });

    return rows;
  }, [seatsFlat]);

  const seatConfiguration = useMemo(() => {
    if (Object.keys(seatRows).length === 0) return [];

    const firstRow = seatRows[Object.keys(seatRows)[0]];
    const seatsPerSide = [];
    let currentGroup = [];
    let lastCol = 0;

    firstRow.forEach((seat, index) => {
      if (index === 0) {
        currentGroup.push(seat);
        lastCol = seat.col;
      } else if (seat.col === lastCol + 1) {
        currentGroup.push(seat);
        lastCol = seat.col;
      } else {
        seatsPerSide.push(currentGroup.length);
        currentGroup = [seat];
        lastCol = seat.col;
      }
    });

    if (currentGroup.length > 0) {
      seatsPerSide.push(currentGroup.length);
    }

    return seatsPerSide;
  }, [seatRows]);

  const exitRows = useMemo(() => {
    const rows = new Set();

    seatsFlat.forEach((seat) => {
      if (seat.isEmergency) {
        rows.add(seat.row);
      }
    });

    return rows;
  }, [seatsFlat]);

  const handleSSR = (type) => {
    // ── Note: We allow opening the tabs so users can select FREE items. ──────
    // The restriction happens during individual item selection. ───────────────
    setSeatModalOpen(false);
    setMealModalOpen(false);
    setBaggageModalOpen(false);

    switch (type) {
      case "seat":
        setSeatModalOpen(true);
        break;
      case "meal":
        setMealModalOpen(true);
        break;
      case "baggage":
        setBaggageModalOpen(true);
        break;
      default:
        setSeatModalOpen(true);
    }
  };

  const handleClearMeals = (journeyType, segmentIndex) => {
    const key = `${journeyType}|${segmentIndex}`;
    onToggleMeal((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const normalizedMeals = useMemo(() => {
    const allMeals = segmentSSR.meals || [];
    const flatMeals = Array.isArray(allMeals[0]) ? allMeals.flat() : allMeals;
    const filteredMeals = flatMeals.filter(
      (m) =>
        !m.AirlineCode ||
        !m.FlightNumber ||
        (m.AirlineCode === segment?.fD?.aI?.code &&
          String(m.FlightNumber).trim() === String(segment?.fD?.fN).trim()),
    );
    return normalizeSSRList(filteredMeals);
  }, [segmentSSR.meals, segment]);

  const normalizeBaggage = (list = []) => {
    const flatList = Array.isArray(list[0]) ? list.flat() : list;
    return flatList
      .filter(
        (b) =>
          !b.AirlineCode ||
          !b.FlightNumber ||
          (b.AirlineCode === segment?.fD?.aI?.code &&
            String(b.FlightNumber).trim() === String(segment?.fD?.fN).trim()),
      )
      .map((b) => ({
        ...b,
        Code: b.Code || `BAG_${b.Weight}`,
      }));
  };

  const normalizedBaggage = useMemo(
    () => normalizeBaggage(segmentSSR.baggage),
    [segmentSSR.baggage],
  );

  const isSelected = (seat) => {
    const key = `${journeyType}|${segmentIndex}`;
    const seatObj = selectedSeats[key];
    const list = Array.isArray(seatObj?.list) ? seatObj.list : [];
    return list.includes(seat.seatNo);
  };

  const tryToggle = (seat) => {
    if (!seat || seat.occupied) return;

    // ── Policy: paid seat allowed? ───────────────────────────
    if (seat.price > 0) {
      if (!policyAllowSeat) {
        ToastWithTimer({
          type: "error",
          message:
            "Paid seat selection is restricted for your account. Contact Admin.",
        });
        return;
      }
      if (seat.price < seatPriceRange.min || seat.price > seatPriceRange.max) {
        ToastWithTimer({
          type: "error",
          message: `Selected seat price ₹${seat.price} exceeds your allowed range (₹${seatPriceRange.min}–₹${seatPriceRange.max}).`,
        });
        return;
      }
    }
    // ────────────────────────────────────────────────────────
    // ────────────────────────────────────────────────────────
    const key = `${journeyType}|${segmentIndex}`;
    const seatObj = selectedSeats[key] || { list: [], priceMap: {} };
    const list = Array.isArray(seatObj.list) ? seatObj.list : [];

    if (list.includes(seat.seatNo)) {
      onSeatSelect(journeyType, segmentIndex, seat.seatNo, seat.price);
    } else {
      if (list.length >= travelers.length) {
        ToastWithTimer({
          type: "info",
          message: `You can select max ${travelers.length} seats`,
        });
        return;
      }
      onSeatSelect(journeyType, segmentIndex, seat.seatNo, seat.price);
    }
  };

  const getSelectedSeatsCount = () => {
    const key = `${journeyType}|${segmentIndex}`;
    const seatObj = selectedSeats[key] || { list: [] };
    return seatObj.list.length;
  };

  const getTotalPrice = () => {
    let total = 0;
    // Seats
    Object.values(selectedSeats).forEach((v) => {
      v?.list?.forEach((s) => (total += v.priceMap?.[s] || 0));
    });
    // Meals
    Object.values(selectedMeals).forEach((meals) => {
      meals?.forEach((m) => {
        if (m?.Price) total += Number(m.Price || 0);
      });
    });
    // Baggage
    Object.values(selectedBaggage).forEach((bag) => {
      if (bag?.Price) total += Number(bag.Price) * travelers.length;
    });
    return total;
  };

  // Tooltip + Seat Render
  const renderSeat = (seat) => {
    if (!seat) return null;
    const selected = isSelected(seat);
    const isPremium = seat.isExtraLegroom;
    const isEmergencyExit = seat.isExtraLegroom;

    let seatClasses =
      "relative w-10 h-10 sm:w-11 sm:h-11 transition-all duration-200 group";
    const seatStyle =
      "absolute inset-0 rounded-t-xl rounded-b-md flex items-center justify-center";
    let colorClass = "";
    let borderClass = "";
    let hoverEffect = "";

    if (seat.occupied) {
      colorClass = "bg-gray-200";
      borderClass = "border-2 border-gray-300";
      seatClasses += " cursor-not-allowed";
    } else if (selected) {
      colorClass = "bg-green-500";
      borderClass = "border-2 border-green-50";
      hoverEffect = "hover:bg-green-600";
      seatClasses += " cursor-pointer";
    } else if (seat.isExtraLegroom) {
      colorClass = "bg-purple-100";
      borderClass = "border-2 border-purple-500";
      hoverEffect = "hover:bg-purple-200";
    } else if (seat.price > 0) {
      // Paid Seat (but not extra legroom)
      colorClass = "bg-orange-50";
      borderClass = "border-2 border-orange-400";
      hoverEffect = "hover:bg-orange-500";
      seatClasses += " cursor-pointer shadow-sm";
    } else {
      // Free Standard Seat
      colorClass = "bg-slate-50";
      borderClass = "border-2 border-slate-200";
      hoverEffect = "hover:bg-slate-100";
      seatClasses += " cursor-pointer";
    }

    const tooltipText = seat.occupied
      ? "This seat is already selected"
      : `Seat: ${seat.seatNo}\nType: ${
          seat.isExtraLegroom
            ? "Extra Legroom"
            : seat.isWindow
              ? "Window"
              : seat.isAisle
                ? "Aisle"
                : "Middle"
        }\n${seat.price ? `Price: ₹${seat.price}` : "Free"}`;

    return (
      <div key={`${seat.row}-${seat.col}`} className="relative">
        <button
          onClick={() => tryToggle(seat)}
          disabled={seat.occupied}
          className={seatClasses}
        >
          <div
            className={`${seatStyle} ${colorClass} ${borderClass} ${hoverEffect}`}
          >
            {/* Paid seat marker (yellow) */}
            {/* {seat.price > 0 &&
              !seat.isExtraLegroom &&
              !seat.occupied &&
              !selected && (
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-1 bg-yellow-400 rounded-full" />
              )} */}

            {isEmergencyExit && !seat.occupied && (
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-1 bg-red-500 rounded-full"></div>
            )}
            {seat.raw?.SeatType === 4 && !seat.occupied && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800 rounded-b"></div>
            )}
            {seat.occupied && (
              <div className="absolute inset-0 flex items-center justify-center">
                <AiOutlineClose className="text-gray-400 text-xs font-bold" />
              </div>
            )}
          </div>
          {!seat.occupied && (
            <div className="relative z-10 flex flex-col items-center justify-center h-full text-[9px] sm:text-[10px] font-semibold text-gray-700">
              <span>{seat.seatNo}</span>
              {seat.price > 0 && (
                <span className="text-[7px] sm:text-[8px] text-gray-600">
                  ₹{seat.price}
                </span>
              )}
            </div>
          )}
          <div className="absolute -top-14 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col bg-gray-800 text-white text-[10px] sm:text-xs font-medium rounded-md px-2 py-1.5 whitespace-pre z-20 shadow-lg">
            {tooltipText}
            <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-2 h-2 bg-gray-800 rotate-45"></div>
          </div>
        </button>
      </div>
    );
  };

  const renderSeatRow = (rowNumber) => {
    const seats = seatRows[rowNumber] || [];
    const sorted = [...seats].sort((a, b) => (a.col ?? 0) - (b.col ?? 0));

    // Find all aisle seats
    const aisleIndexes = sorted
      .map((seat, index) => (seat.isAisle ? index : -1))
      .filter((i) => i !== -1);

    const isExitRowsGroup = exitRows.has(rowNumber);

    // We expect 2 aisle seats in 3-3 layout
    const leftAisleIndex = aisleIndexes[0];
    const rightAisleIndex = aisleIndexes[1];
    return (
      <div
        key={rowNumber}
        className="flex items-center justify-center relative w-full mb-1"
        style={{ columnGap: "clamp(8px, 1vw, 14px)" }}
      >
        {/* Left row number */}
        <div className="w-6 text-center text-xs font-semibold text-gray-500 z-10">
          {rowNumber}
        </div>

        <div
          className="flex items-center"
          style={{ gap: "clamp(6px, 0.8vw, 10px)" }}
        >
          {sorted.map((seat, index) => (
            <React.Fragment key={seat.seatNo}>
              {renderSeat(seat)}

              {/* INSERT WALK PATH ONLY BETWEEN TWO AISLE SEATS */}
              {index === leftAisleIndex && rightAisleIndex !== undefined && (
                <div
                  style={{ width: "clamp(30px, 4vw, 50px)" }}
                  className="flex items-center justify-center"
                >
                  {/* <div className="w-[2px] h-10 bg-gray-300 rounded-full" /> */}
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Right row number */}
        <div className="w-6 text-center text-xs font-semibold text-gray-500 z-10">
          {rowNumber}
        </div>
      </div>
    );
  };

  const legendItems = useMemo(() => {
    if (!seatsFlat.length) return [];

    const hasFree = seatsFlat.some((s) => !s.occupied && s.price === 0);
    const hasPaid = seatsFlat.some((s) => !s.occupied && s.price > 0);
    const hasPremium = seatsFlat.some((s) => s.isExtraLegroom && !s.occupied);
    const hasOccupied = seatsFlat.some((s) => s.occupied);

    const items = [];

    if (hasFree)
      items.push({
        key: "free",
        label: "Standard",
        seatClass: "bg-slate-50 border-slate-300",
      });

    if (hasPaid)
      items.push({
        key: "paid",
        label: "Paid Seat",
        seatClass: "bg-white border-orange-500",
        paid: true,
      });

    if (hasPremium)
      items.push({
        key: "premium",
        label: "Extra Legroom",
        seatClass: "bg-purple-100 border-purple-500",
        exit: true,
      });

    if (hasOccupied)
      items.push({
        key: "occupied",
        label: "Occupied",
        seatClass: "bg-gray-200 border-gray-300",
        occupied: true,
      });

    return items;
  }, [seatsFlat]);

  if (!isOpen) return null;

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
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#0A203E] text-white">
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

        {/* Tabs (Seats, Meals, Baggage) */}
        <div className="flex items-center justify-center gap-4 bg-slate-50 py-3 border-b border-slate-200">
          {[
            {
              key: "seat",
              label: "Seats",
              icon: MdEventSeat,
              allowed: policyAllowSeat,
            },
            {
              key: "meal",
              label: "Meals",
              icon: MdRestaurant,
              allowed: policyAllowMeal,
            },
            {
              key: "baggage",
              label: "Baggage",
              icon: BsLuggage,
              allowed: policyAllowBaggage,
            },
          ].map(({ key, label, icon: Icon, allowed }) => (
            <button
              key={key}
              onClick={() => handleSSR(key)}
              title={!allowed ? "Restricted by company policy" : undefined}
              className={`relative flex items-center gap-2 px-4 py-1.5 rounded-full font-medium text-sm transition-all ${
                !allowed
                  ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-70"
                  : (key === "seat" && seatModalOpen) ||
                      (key === "meal" && mealModalOpen) ||
                      (key === "baggage" && baggageModalOpen)
                    ? "bg-[#0A203E] text-white shadow-md border-[#0A203E]"
                    : "bg-white text-[#0A203E] border border-slate-200 hover:bg-slate-100"
              }`}
            >
              <Icon className="text-base" /> {label}
              {!allowed && (
                <span className="absolute -top-2.5 -right-1.5 text-[8px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                  Locked
                </span>
              )}
            </button>
          ))}
        </div>

        {/* MAIN BODY */}
        <div className="flex-1 overflow-hidden">
          {seatModalOpen && (
            <div className="h-full flex flex-col lg:flex-row overflow-hidden">
              {/* LEFT SIDE — Seat Map */}
              <div className="flex-1 bg-slate-50 p-4 sm:p-6 overflow-auto">
                <div className="relative bg-linear-to-b from-slate-100 to-white rounded-2xl shadow-inner p-5">
                  {/* Cockpit */}
                  <div className="flex justify-center mb-4">
                    <div className="w-48 sm:w-56">
                      <svg viewBox="0 0 200 90" className="w-full">
                        <defs>
                          <linearGradient
                            id="cockpitGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop offset="0%" stopColor="#e2e8f0" />
                            <stop offset="100%" stopColor="#94a3b8" />
                          </linearGradient>
                          <linearGradient
                            id="windowGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop offset="0%" stopColor="#1e293b" />
                            <stop offset="100%" stopColor="#0f172a" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M 20 85 Q 20 20, 100 5 Q 180 20, 180 85 Z"
                          fill="url(#cockpitGradient)"
                          stroke="#64748b"
                          strokeWidth="1.2"
                        />
                        <path
                          d="M 55 40 Q 100 15, 145 40 Q 100 25, 55 40 Z"
                          fill="url(#windowGradient)"
                          stroke="#334155"
                          strokeWidth="1"
                          opacity="0.9"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Cabin Body */}
                  <div className="bg-white rounded-xl shadow-inner border border-gray-100 p-4">
                    {Object.keys(seatRows).length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                          <MdEventSeat className="text-4xl text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">
                          Seat Map Unavailable
                        </h3>
                        <p className="text-gray-500 max-w-xs mx-auto">
                          The airline has not released the seat map for this
                          flight yet. You can still select meals and baggage
                          from the tabs above.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-center gap-4 mb-3 text-xs font-semibold text-gray-600">
                          {seatConfiguration.map((groupSize, groupIndex) => {
                            const startCol = seatConfiguration
                              .slice(0, groupIndex)
                              .reduce((a, b) => a + b, 0);
                            const groupCols = Array.from(
                              { length: groupSize },
                              (_, i) => String.fromCharCode(65 + startCol + i),
                            );
                            return (
                              <div key={groupIndex} className="flex gap-2">
                                {groupCols.map((col) => (
                                  <div key={col} className="w-8 text-center">
                                    {col}
                                  </div>
                                ))}
                                {groupIndex < seatConfiguration.length - 1 && (
                                  <div className="w-6"></div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <div className="relative mx-auto max-w-[720px] bg-linear-to-b from-gray-50 to-white rounded-[60px] border border-gray-200 shadow-inner px-6 py-8">
                          <div
                            className="flex flex-col items-center"
                            style={{ rowGap: "clamp(14px, 2.2vh, 22px)" }}
                          >
                            {Object.keys(seatRows)
                              .sort((a, b) => a - b)
                              .map((rowNumber) => {
                                const rowNum = Number(rowNumber);
                                const isExit = exitRows.has(rowNum);
                                return (
                                  <React.Fragment key={rowNum}>
                                    {isExit && (
                                      <div
                                        className="w-full relative flex items-center justify-center mt-3 mb-3 z-0"
                                        style={{ height: "24px" }}
                                      >
                                        <div className="absolute -left-[24px] flex items-center z-10">
                                          <div className="w-8 h-12 bg-orange-400 blur-xl opacity-40 absolute -left-4 pointer-events-none"></div>
                                          <div className="w-3.5 h-4 bg-red-600 rounded-[2px] flex items-center justify-center shadow-md">
                                            <span className="text-white text-[9px] font-bold leading-none">
                                              {"<"}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="bg-red-600 text-white text-[10px] font-semibold px-3 py-0.5 rounded-[3px] shadow-sm z-10 border border-red-700">
                                          Emergency Door
                                        </div>
                                        <div className="absolute -right-[24px] flex items-center justify-end z-10">
                                          <div className="w-8 h-12 bg-orange-400 blur-xl opacity-40 absolute -right-4 pointer-events-none"></div>
                                          <div className="w-3.5 h-4 bg-red-600 rounded-[2px] flex items-center justify-center shadow-md">
                                            <span className="text-white text-[9px] font-bold leading-none">
                                              {">"}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    {renderSeatRow(rowNum)}
                                  </React.Fragment>
                                );
                              })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex justify-center mt-6 sm:mt-8">
                    <div className="w-56 sm:w-64">
                      <svg viewBox="0 0 200 80" className="w-full">
                        <defs>
                          <linearGradient
                            id="tailGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop offset="0%" stopColor="#cbd5e1" />
                            <stop offset="100%" stopColor="#64748b" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M 40 10 Q 100 70, 160 10 Q 150 50, 100 75 Q 50 50, 40 10 Z"
                          fill="url(#tailGradient)"
                          stroke="#475569"
                          strokeWidth="1.2"
                        />
                        <path
                          d="M 90 5 L 110 5 L 105 35 L 95 35 Z"
                          fill="#94a3b8"
                          stroke="#64748b"
                          strokeWidth="0.8"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT SIDE — Selection Summary */}
              <div className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-gray-200 bg-white flex flex-col p-4 overflow-auto">
                <h3 className="font-semibold text-gray-800 mb-3">
                  Seat Selection
                </h3>
                <div className="space-y-2 mb-4">
                  {(() => {
                    const key = `${journeyType}|${segmentIndex}`;
                    const seatObj = selectedSeats[key] || {
                      list: [],
                      priceMap: {},
                    };
                    if (seatObj.list.length === 0)
                      return (
                        <p className="text-xs text-gray-400 text-center">
                          No seats selected
                        </p>
                      );
                    return seatObj.list.map((seatNo) => (
                      <div
                        key={seatNo}
                        className="flex justify-between items-center bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 shadow-sm text-xs"
                      >
                        <span className="font-medium text-gray-800">
                          Seat {seatNo}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">
                            {seatObj.priceMap[seatNo]
                              ? `₹${seatObj.priceMap[seatNo]}`
                              : "Free"}
                          </span>
                          <button
                            onClick={() =>
                              onSeatSelect(
                                journeyType,
                                segmentIndex,
                                seatNo,
                                seatObj.priceMap[seatNo],
                              )
                            }
                            className="text-gray-400 hover:text-red-500"
                          >
                            <AiOutlineClose size={12} />
                          </button>
                        </div>
                      </div>
                    ));
                  })()}
                </div>

                <div className="mt-auto pt-4 border-t border-gray-200">
                  <h4 className="font-semibold text-gray-800 text-[10px] uppercase tracking-wider mb-3">
                    Legend
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-700">
                    {legendItems.map((item) => (
                      <div key={item.key} className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded-[4px] border ${item.seatClass}`}
                        ></div>
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {mealModalOpen && (
            <div className="h-full p-4 overflow-auto bg-slate-50">
              <MealSelectionCards
                meals={normalizedMeals}
                selectedMeals={selectedMeals}
                onToggleMeal={(j, si, meal, tc) => {
                  const price = Number(meal.Price || 0);
                  if (price > 0) {
                    if (!policyAllowMeal) {
                      ToastWithTimer({
                        type: "error",
                        message:
                          "Paid meal selection is not allowed for your account.",
                      });
                      return;
                    }
                    if (
                      price < mealPriceRange.min ||
                      price > mealPriceRange.max
                    ) {
                      ToastWithTimer({
                        type: "error",
                        message: `Meal price ₹${price} exceeds your allowed range.`,
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
                // Universal footer handles confirmation
              />
            </div>
          )}

          {baggageModalOpen && (
            <div className="h-full p-4 overflow-auto bg-slate-50">
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
                      ToastWithTimer({
                        type: "error",
                        message:
                          "Paid baggage selection is restricted for your account.",
                      });
                      return;
                    }
                    if (
                      price < baggagePriceRange.min ||
                      price > baggagePriceRange.max
                    ) {
                      ToastWithTimer({
                        type: "error",
                        message: `Baggage price ₹${price} exceeds your allowed range.`,
                      });
                      return;
                    }
                  }
                  onSelectBaggage(journeyType, segmentIndex, bag);
                }}
                onClearBaggage={() =>
                  onSelectBaggage(journeyType, segmentIndex, null)
                }
                // Universal footer handles confirmation
              />
            </div>
          )}
        </div>

        {/* UNIVERSAL FOOTER */}
        <div className="p-4 border-t bg-white flex items-center justify-between gap-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                Total Price
              </p>
              <p className="text-xl font-black text-[#0A203E] leading-none mt-1">
                ₹{getTotalPrice()?.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 border-l border-gray-100 pl-6">
              <div className="text-center">
                <p className="text-[10px] text-gray-400 font-bold uppercase">
                  Seats
                </p>
                <p className="text-xs font-bold text-gray-700 mt-0.5">
                  {getSelectedSeatsCount()}
                </p>
              </div>
              <div className="text-center ml-4">
                <p className="text-[10px] text-gray-400 font-bold uppercase">
                  Meals
                </p>
                <p className="text-xs font-bold text-gray-700 mt-0.5">
                  {selectedMeals[`${journeyType}|${segmentIndex}`]?.length || 0}
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-8 py-3 bg-[#0A203E] hover:bg-[#0A203E]/90 text-white rounded-xl font-black text-sm transition-all shadow-lg shadow-blue-200 uppercase tracking-widest"
            >
              Confirm Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
