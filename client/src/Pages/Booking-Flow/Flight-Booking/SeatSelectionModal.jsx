import React, { useEffect, useMemo, useState } from "react";
import { AiOutlineClose } from "react-icons/ai";
import { FaArrowRight } from "react-icons/fa";
import { MdEventSeat, MdFlightLand, MdFlightTakeoff } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";

import {
  fetchSeatMap,
  selectSeatMap,
  selectSeatMapStatus,
} from "../../../Redux/Slice/flightSearchSlice";

const ORANGE = "bg-[#F97415]";
const BLUE = "bg-[#1a2957]";

export const buildSeatMapPayload = ({
  bookingId,
  reviewResponse,
  segment,
  segmentIndex,
  journeyType,
  date,
}) => {
  if (!reviewResponse || !segment) return null;

  const sI = reviewResponse?.tripInfos?.[0]?.sI?.[segmentIndex];

  if (!sI) return null;

  return {
    bookingId,

    priceIds:
      reviewResponse.priceIds || reviewResponse?.searchQuery?.priceIds || [],

    tripType: reviewResponse?.searchQuery?.tripType || "OW",

    segmentKey: sI.sK,

    airlineCode: segment?.fD?.aI?.code,
    flightNumber: segment?.fD?.fN,

    from: segment?.da?.code,
    to: segment?.aa?.code,

    dt: date || segment?.dt,
    at: segment?.at,

    cabinClass: segment?.cT || "ECONOMY",

    paxInfo: reviewResponse?.searchQuery?.paxInfo || {
      adt: 1,
      chd: 0,
      inf: 0,
    },
  };
};

export default function SeatSelectionModal({
  isOpen,
  onClose,
  flight,
  flightIndex,
  journeyType,
  travelers = [],
  selectedSeats = {},
  onSeatSelect,
  bookingId,
  date,
  reviewResponse,
  segment,
  segmentIndex,
}) {
  const dispatch = useDispatch();
  const seatMap = useSelector(selectSeatMap);
  const seatMapStatus = useSelector(selectSeatMapStatus);

  const [seatsFlat, setSeatsFlat] = useState([]);

  /* ---------- fetch seatmap when opened ---------- */
  useEffect(() => {
    console.log("SEAT MODAL TRIGGER:", {
      isOpen,
      bookingId,
      segment,
      reviewResponse,
    });

    if (isOpen && bookingId && reviewResponse && segment) {
      dispatch(
        fetchSeatMap({
          bookingId,
          reviewResponse,
          segment,
          segmentIndex,
          journeyType,
          date,
        })
      );
    }
  }, [isOpen, bookingId, reviewResponse, segment]);

  /* ---------- parse different TripJack formats ---------- */
  useEffect(() => {
    if (!seatMap) return;

    // helper to normalize seat entries -> items with row,column,seatNo,price,flags
    const normalizeFromSInfo = (sinfo) =>
      sinfo.map((s) => ({
        seatNo: s.seatNo,
        row: Number(s.seatPosition?.row) || null,
        col: Number(s.seatPosition?.column) || null,
        price: Number(s.amount || s.price || 0) || 0,
        occupied: !!s.isBooked,
        premium: !!s.isLegroom,
        exitRow: !!s.isExitRow,
        isAisle: !!s.isAisle,
        raw: s,
      }));

    // 1) dynamic-key format: tripSeatMap.tripSeat.{<dynamicKey>}.sInfo
    const tripSeatRoot = seatMap?.tripSeatMap?.tripSeat;
    if (tripSeatRoot && typeof tripSeatRoot === "object") {
      const keys = Object.keys(tripSeatRoot).filter((k) => k !== "__proto__");
      if (keys.length) {
        // prefer block that has sInfo
        const blockKey =
          keys.find((k) => Array.isArray(tripSeatRoot[k]?.sInfo)) || keys[0];
        const block = tripSeatRoot[blockKey];
        if (block?.sInfo && Array.isArray(block.sInfo)) {
          setSeatsFlat(normalizeFromSInfo(block.sInfo));
          return;
        }
      }
    }

    // 2) older: seatMap -> array of rows each with seats array
    if (Array.isArray(seatMap?.seatMap)) {
      const arr = [];
      seatMap.seatMap.forEach((r) => {
        (r.seats || []).forEach((s) => {
          arr.push({
            seatNo: `${r.row}${s.column}`,
            row: Number(r.row) || null,
            col: Number(s.column) || null,
            price: Number(s.amount || 0) || 0,
            occupied: ["O", "BOOKED"].includes(s.status) || !!s.isBooked,
            premium: s.type === "P" || !!s.isLegroom,
            exitRow: s.type === "E",
            isAisle: !!s.isAisle,
            raw: s,
          });
        });
      });
      setSeatsFlat(arr);
      return;
    }

    // 3) fallback: maybe tripSeatMap.tripSeat directly is array
    if (Array.isArray(seatMap?.tripSeatMap?.tripSeat)) {
      setSeatsFlat(normalizeFromSInfo(seatMap.tripSeatMap.tripSeat));
      return;
    }

    console.warn("SeatSelectionModal: unknown seat map shape", seatMap);
  }, [seatMap]);

  /* ---------- derive grid dimensions and matrix ---------- */
  const { rows, cols, matrix } = useMemo(() => {
    let maxR = 0,
      maxC = 0;
    seatsFlat.forEach((s) => {
      if (s.row && s.col) {
        maxR = Math.max(maxR, s.row);
        maxC = Math.max(maxC, s.col);
      }
    });

    // build matrix: rows indexed 1..maxR, cols 1..maxC
    const mat = {};
    for (let r = 1; r <= maxR; r++) mat[r] = {};

    seatsFlat.forEach((s) => {
      if (!s.row || !s.col) return;
      mat[s.row][s.col] = s;
    });

    return { rows: maxR, cols: maxC, matrix: mat };
  }, [seatsFlat]);

  /* ---------- helpers ---------- */
  const keyFor = (r, c) => `${journeyType}|${flightIndex}-${r}-${c}`;

  const isSelected = (seat) => {
    // const key = `${journeyType}-flight-${flightIndex}`;
    const key = `${journeyType}|${flightIndex}`;
    const seatObj = selectedSeats[key];

    // always look inside seatObj.list
    const list = Array.isArray(seatObj?.list) ? seatObj.list : [];

    return list.includes(seat.seatNo);
  };

  const tryToggle = (seat) => {
    if (!seat || seat.occupied) return;
    // const key = `${journeyType}-flight-${flightIndex}`;
    const key = `${journeyType}|${flightIndex}`;

    const seatObj = selectedSeats[key] || { list: [], priceMap: {} };
    const list = Array.isArray(seatObj.list) ? seatObj.list : [];

    if (list.includes(seat.seatNo)) {
      onSeatSelect(journeyType, flightIndex, seat.seatNo, seat.price);
    } else {
      if (list.length >= travelers.length) {
        alert(`You can select max ${travelers.length} seats`);
        return;
      }
      onSeatSelect(journeyType, flightIndex, seat.seatNo, seat.price);
    }
  };

  /* ---------- UI pieces ---------- */
  const Legend = () => (
    <div className="flex flex-wrap gap-3 items-center text-sm">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 bg-white border rounded-sm" />
        <div className="text-xs text-gray-600">Available</div>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 bg-gray-300 rounded-sm" />
        <div className="text-xs text-gray-600">Booked / Occupied</div>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 bg-yellow-100 border rounded-sm" />
        <div className="text-xs text-gray-600">Premium / Extra legroom</div>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 bg-green-500 rounded-sm" />
        <div className="text-xs text-gray-600">Selected</div>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div
          className={`${BLUE} p-5 flex items-start justify-between gap-4 shrink-0`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 ${ORANGE} rounded-full flex items-center justify-center`}
            >
              <MdEventSeat className="text-white text-2xl" />
            </div>
            <div>
              <h3 className="text-white text-xl font-semibold">Select Seats</h3>
              <p className="text-sm text-blue-100 mt-1">
                {segment?.fD?.aI?.name || "Airline"} •
                {segment?.fD?.aI?.code || ""}-{segment?.fD?.fN || ""}
              </p>

              <div className="mt-2 text-xs text-blue-100">
                Booking: <span className="font-medium">{bookingId || "—"}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="p-2 bg-white/20 rounded-full hover:bg-white/30"
            >
              <AiOutlineClose className="text-white text-lg" />
            </button>
          </div>
        </div>

        {/* body */}
        <div className="flex-1 lg:flex overflow-hidden">
          {/* left: seat grid */}
          <div className="flex-1 p-6 overflow-auto">
            {seatMapStatus === "loading" && (
              <div className="text-center py-12 text-gray-600">
                Loading seat map…
              </div>
            )}

            {seatMapStatus === "failed" && (
              <div className="text-center py-12 text-red-600 font-semibold">
                Failed to load seat map
              </div>
            )}

            {seatMapStatus === "succeeded" && rows === 0 && (
              <div className="text-center py-12 text-gray-600">
                No seat data available for this itinerary.
              </div>
            )}

            {seatMapStatus === "succeeded" && rows > 0 && (
              <div className="mx-auto max-w-[900px]">
                {/* top column numbers */}
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="w-8" />
                  <div
                    className="grid"
                    style={{ gridTemplateColumns: `repeat(${cols}, 48px)` }}
                  >
                    {Array.from({ length: cols }).map((_, ci) => (
                      <div
                        key={ci}
                        className="text-center text-xs text-gray-500"
                      >
                        {ci + 1}
                      </div>
                    ))}
                  </div>
                  <div className="w-8" />
                </div>

                {/* grid rows */}
                <div className="space-y-2">
                  {Array.from({ length: rows }).map((_, ri) => {
                    const rowIndex = ri + 1;
                    return (
                      <div
                        key={rowIndex}
                        className="flex items-center justify-center gap-2"
                      >
                        <div className="w-8 text-center text-sm font-semibold text-gray-600">
                          {rowIndex}
                        </div>

                        <div
                          className="grid"
                          style={{
                            gridTemplateColumns: `repeat(${cols}, 48px)`,
                            gap: "8px",
                          }}
                        >
                          {Array.from({ length: cols }).map((_, ci) => {
                            const colIndex = ci + 1;
                            const seat = matrix[rowIndex]
                              ? matrix[rowIndex][colIndex]
                              : undefined;

                            if (!seat) {
                              // Render gap (aisle / empty)
                              return (
                                <div
                                  key={`${rowIndex}-${colIndex}`}
                                  className="w-12 h-12"
                                />
                              );
                            }

                            const selected = isSelected(seat);

                            const base =
                              "w-12 h-12 rounded-md border-2 flex items-center justify-center font-semibold relative text-xs";
                            const classes = seat.occupied
                              ? `${base} bg-gray-300 border-gray-400 text-gray-700 cursor-not-allowed`
                              : selected
                              ? `${base} bg-green-500 border-green-700 text-white scale-105`
                              : seat.premium
                              ? `${base} bg-yellow-50 border-yellow-300 text-gray-800`
                              : `${base} bg-white border-gray-200 text-gray-800 hover:scale-105 cursor-pointer`;

                            return (
                              <button
                                key={`${rowIndex}-${colIndex}`}
                                onClick={() => tryToggle(seat)}
                                className={classes}
                                title={`${seat.seatNo} ${
                                  seat.price ? "• ₹" + seat.price : ""
                                }`}
                              >
                                <div className="text-sm">{seat.seatNo}</div>
                                <div className="absolute top-0 right-0 text-[10px] px-1 py-0.5 rounded-bl-md bg-orange-500 text-white">
                                  {seat.price > 0 ? `₹${seat.price}` : ""}
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        <div className="w-8 text-center text-sm font-semibold text-gray-600">
                          {rowIndex}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* small key / notes */}
                <div className="mt-6 text-xs text-gray-600">
                  Tip: Click a seat to select. Premium seats may have additional
                  charge.
                </div>
              </div>
            )}
          </div>

          {/* right: details + legend + selected */}
          <div className="w-full lg:w-[360px] border-l px-6 py-6 bg-gray-50 overflow-auto">
            <div className="mb-4">
              <h4 className="font-semibold text-gray-700">Flight</h4>
              <div className="text-sm text-gray-600">
                {segment?.da?.city} → {segment?.aa?.city}
              </div>
              {/* <div className="mt-2 text-xs text-gray-500">
                Date:{" "}
                {date
                  ? date.split("T")[0]
                  : segment?.fD?.date || segment?.date || "—"}
              </div> */}
              <div className="mt-2 text-xs text-gray-500">
  Date:{" "}
  {segment?.dt
    ? new Date(segment.dt).toDateString()
    : "—"}
</div>

            </div>

            <div className="mb-4">
              <h4 className="font-semibold text-gray-700">Selected seats</h4>
              <div className="mt-2 text-sm text-gray-700">
                {(() => {
                  const seatObj = selectedSeats[
                    // `${journeyType}-flight-${flightIndex}`
                      `${journeyType}|${flightIndex}`
                  ] || { list: [] };

                  return (
                    <>
                      {seatObj.list.length === 0 && (
                        <div className="text-xs text-gray-500">
                          No seats selected
                        </div>
                      )}

                      <ul className="space-y-1">
                        {seatObj.list.map((s) => (
                          <li
                            key={s}
                            className="flex items-center justify-between text-sm"
                          >
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="mb-4">
              <h4 className="font-semibold text-gray-700">Legend</h4>
              <div className="mt-2">
                <Legend />
              </div>
            </div>

            <div className="mt-auto">
              <button
                onClick={onClose}
                className={`w-full py-3 ${ORANGE} text-white rounded-lg font-semibold`}
              >
                Confirm & Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
