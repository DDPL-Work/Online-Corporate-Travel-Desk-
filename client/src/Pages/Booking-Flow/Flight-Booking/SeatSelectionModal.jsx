import React, { useEffect, useMemo, useState } from "react";
import { AiOutlineClose } from "react-icons/ai";
import { FaArrowRight } from "react-icons/fa";
import { MdEventSeat, MdFlightLand, MdFlightTakeoff } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { ToastConfirm } from "../../../utils/ToastConfirm";

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
}) {
  const dispatch = useDispatch();
  const { seatMap, loading } = useSelector((state) => state.flights);
  const [seatsFlat, setSeatsFlat] = useState([]);
  const fareQuote = useSelector((state) => state.flights.fareQuote);
  const ssr = useSelector((state) => state.flights.ssr);

  useEffect(() => {
    const rowSeats =
      ssr?.Response?.SeatDynamic?.[0]?.SegmentSeat?.[0]?.RowSeats;

    if (!Array.isArray(rowSeats) || rowSeats.length === 0) {
      setSeatsFlat([]);
      return;
    }

    const flat = rowSeats.flatMap((row) =>
      (row.Seats || []).map((s) => ({
        seatNo: s.Code,
        row: Number(s.RowNo),
        col: s.SeatNo ? s.SeatNo.charCodeAt(0) - 64 : null,
        price: Number(s.Price || 0),
        occupied: s.AvailablityType !== 1 && s.Code !== "NoSeat",
        premium: s.SeatType === 2 || s.SeatType === 3,
        isEmergencyExit: s.SeatType === 3,
        raw: s,
      }))
    );

    setSeatsFlat(flat);
  }, [ssr]);

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

  const isSelected = (seat) => {
    const key = `${journeyType}|${flightIndex}`;
    const seatObj = selectedSeats[key];
    const list = Array.isArray(seatObj?.list) ? seatObj.list : [];
    return list.includes(seat.seatNo);
  };

  const tryToggle = (seat) => {
    if (!seat || seat.occupied) return;
    const key = `${journeyType}|${flightIndex}`;
    const seatObj = selectedSeats[key] || { list: [], priceMap: {} };
    const list = Array.isArray(seatObj.list) ? seatObj.list : [];

    if (list.includes(seat.seatNo)) {
      onSeatSelect(journeyType, flightIndex, seat.seatNo, seat.price);
    } else {
      if (list.length >= travelers.length) {
        ToastConfirm({
          message: `You can select max ${travelers.length} seats`,
        });
        return;
      }
      onSeatSelect(journeyType, flightIndex, seat.seatNo, seat.price);
    }
  };

  const getSelectedSeatsCount = () => {
    const key = `${journeyType}|${flightIndex}`;
    const seatObj = selectedSeats[key] || { list: [] };
    return seatObj.list.length;
  };

  const getTotalPrice = () => {
    const key = `${journeyType}|${flightIndex}`;
    const seatObj = selectedSeats[key] || { list: [], priceMap: {} };
    return seatObj.list.reduce((total, seatNo) => {
      return total + (seatObj.priceMap[seatNo] || 0);
    }, 0);
  };

  const renderSeat = (seat) => {
    if (!seat) return null;

    const selected = isSelected(seat);
    const isPremium = seat.premium;
    const isEmergencyExit = seat.isEmergencyExit;

    let seatClasses = "w-9 h-9 sm:w-10 sm:h-10 rounded flex flex-col items-center justify-center text-[9px] sm:text-[10px] font-semibold transition-all duration-200 border-2 ";
    
    if (seat.occupied) {
      seatClasses += "bg-gray-300 border-gray-400 text-gray-500 cursor-not-allowed ";
    } else if (selected) {
      seatClasses += "bg-green-500 border-green-600 text-white shadow-md scale-105 ";
    } else if (isEmergencyExit) {
      seatClasses += "bg-orange-100 border-orange-400 text-orange-700 hover:border-orange-600 cursor-pointer hover:scale-105 ";
    } else if (isPremium) {
      seatClasses += "bg-blue-100 border-blue-400 text-blue-700 hover:border-blue-500 cursor-pointer hover:scale-105 ";
    } else {
      seatClasses += "bg-white border-gray-300 text-gray-700 hover:border-blue-400 cursor-pointer hover:scale-105 ";
    }

    return (
      <button
        key={`${seat.row}-${seat.col}`}
        onClick={() => tryToggle(seat)}
        disabled={seat.occupied}
        className={seatClasses}
        title={`${seat.seatNo}${seat.price ? ` • ₹${seat.price}` : ''}${isEmergencyExit ? ' • Emergency Exit' : ''}`}
      >
        <span className="font-bold text-[10px] sm:text-xs">{seat.seatNo}</span>
        {seat.price > 0 && !seat.occupied && (
          <span className="text-[7px] sm:text-[8px]">₹{seat.price}</span>
        )}
      </button>
    );
  };

  const renderSeatRow = (rowNumber) => {
    const seats = seatRows[rowNumber] || [];
    
    return (
      <div key={rowNumber} className="flex items-center justify-center gap-2 sm:gap-3">
        <div className="w-5 sm:w-6 text-center text-[10px] sm:text-xs font-bold text-gray-600">
          {rowNumber}
        </div>
        
        <div className="flex items-center gap-3 sm:gap-4">
          {seatConfiguration.map((groupSize, groupIndex) => {
            const groupSeats = seats.slice(
              seatConfiguration.slice(0, groupIndex).reduce((a, b) => a + b, 0),
              seatConfiguration.slice(0, groupIndex + 1).reduce((a, b) => a + b, 0)
            );
            
            return (
              <div key={groupIndex} className="flex items-center gap-1 sm:gap-1.5">
                {groupSeats.map((seat) => renderSeat(seat))}
                {groupIndex < seatConfiguration.length - 1 && (
                  <div className="w-6 sm:w-8 h-9 sm:h-10 flex items-center justify-center">
                    <div className="w-0.5 h-7 sm:h-8 bg-gray-300"></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="w-5 sm:w-6 text-center text-[10px] sm:text-xs font-bold text-gray-600">
          {rowNumber}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg sm:rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-800 to-blue-600 px-3 sm:px-5 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <MdEventSeat className="text-white text-base sm:text-lg" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-white text-sm sm:text-lg font-bold truncate">Select Your Seats</h2>
              <p className="text-blue-100 text-[10px] sm:text-xs mt-0.5 flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="flex items-center gap-1">
                  <MdFlightTakeoff className="text-xs sm:text-sm" />
                  <span className="truncate">{segment?.da?.city} ({segment?.da?.code})</span>
                </span>
                <FaArrowRight className="text-[8px] sm:text-[10px]" />
                <span className="flex items-center gap-1">
                  <MdFlightLand className="text-xs sm:text-sm" />
                  <span className="truncate">{segment?.aa?.city} ({segment?.aa?.code})</span>
                </span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <div className="hidden sm:block text-white text-xs bg-white/20 px-3 py-1 rounded-full font-medium">
              {segment?.fD?.aI?.code} {segment?.fD?.fN}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              <AiOutlineClose className="text-white text-base sm:text-lg" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left Panel - Seat Map */}
          <div className="flex-1 p-3 sm:p-5 overflow-auto">
            {loading && (
              <div className="flex items-center justify-center h-full min-h-[300px]">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                  <p className="mt-3 text-gray-600 text-sm">Loading seat map...</p>
                </div>
              </div>
            )}

            {!loading && Object.keys(seatRows).length === 0 && (
              <div className="flex items-center justify-center h-full min-h-[300px]">
                <div className="text-center text-gray-500">
                  <MdEventSeat className="text-4xl mx-auto mb-2 text-gray-300" />
                  <p className="text-sm sm:text-base">No seat map available</p>
                </div>
              </div>
            )}

            {!loading && Object.keys(seatRows).length > 0 && (
              <div className="w-full max-w-4xl mx-auto">
                {/* Flight Info */}
                <div className="mb-4 sm:mb-5 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <h3 className="font-bold text-gray-800 text-xs sm:text-sm">
                        {segment?.fD?.aI?.name} • {segment?.cT || "ECONOMY"}
                      </h3>
                      <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5">
                        {new Date(segment?.dt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="text-[10px] sm:text-xs text-gray-600">Selected</div>
                      <div className="text-lg sm:text-xl font-bold text-blue-700">
                        {getSelectedSeatsCount()}/{travelers.length}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cabin Layout */}
                <div className="relative">
                  {/* Cockpit */}
                  <div className="flex justify-center mb-4 sm:mb-5">
                    <div className="w-28 sm:w-32 h-7 sm:h-8 bg-gradient-to-b from-gray-700 to-gray-800 rounded-t-xl flex items-center justify-center">
                      <div className="text-white text-[9px] sm:text-[10px] font-bold">COCKPIT</div>
                    </div>
                  </div>

                  {/* Cabin */}
                  <div className="bg-gradient-to-b from-gray-100 to-gray-200 rounded-lg sm:rounded-xl p-3 sm:p-5 border border-gray-300">
                    {/* Overhead Bins */}
                    <div className="flex justify-center mb-3 sm:mb-4">
                      <div className="w-full h-3 sm:h-4 bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 rounded"></div>
                    </div>

                    {/* Seats - Centered */}
                    <div className="flex justify-center">
                      <div className="space-y-2.5 sm:space-y-3">
                        {Object.keys(seatRows)
                          .sort((a, b) => a - b)
                          .map((rowNumber) => renderSeatRow(rowNumber))}
                      </div>
                    </div>

                    
                  </div>

                  {/* Rear */}
                  <div className="flex justify-center mt-4 sm:mt-5">
                    <div className="w-32 sm:w-40 h-5 sm:h-6 bg-gradient-to-t from-gray-600 to-gray-700 rounded-b-lg"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Summary */}
          <div className="w-full lg:w-64 border-t lg:border-t-0 lg:border-l border-gray-200 bg-gray-50 flex flex-col max-h-[40vh] lg:max-h-none">
            <div className="p-3 sm:p-4 flex-1 overflow-auto">
              <h3 className="font-bold text-gray-800 text-sm sm:text-base mb-3 sm:mb-4">Your Selection</h3>
              
              {/* Selected Seats */}
              <div className="mb-3 sm:mb-4">
                <h4 className="font-semibold text-gray-700 text-xs sm:text-sm mb-2">Seats</h4>
                <div className="space-y-2">
                  {(() => {
                    const key = `${journeyType}|${flightIndex}`;
                    const seatObj = selectedSeats[key] || { list: [], priceMap: {} };
                    
                    if (seatObj.list.length === 0) {
                      return (
                        <div className="text-center py-3 sm:py-4 text-gray-400">
                          <MdEventSeat className="text-xl sm:text-2xl mx-auto mb-1" />
                          <p className="text-[10px] sm:text-xs">No seats selected</p>
                        </div>
                      );
                    }
                    
                    return seatObj.list.map((seatNo) => (
                      <div
                        key={seatNo}
                        className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-200"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 sm:w-7 sm:h-7 bg-green-500 rounded flex items-center justify-center">
                            <span className="text-white text-[10px] sm:text-xs font-bold">{seatNo}</span>
                          </div>
                          <div className="text-[10px] sm:text-xs">
                            <div className="font-medium text-gray-800">Seat {seatNo}</div>
                            <div className="text-[9px] sm:text-[10px] text-gray-500">
                              {seatObj.priceMap[seatNo] ? `₹${seatObj.priceMap[seatNo]}` : 'Free'}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => onSeatSelect(journeyType, flightIndex, seatNo, seatObj.priceMap[seatNo])}
                          className="text-gray-400 hover:text-red-500 text-xs"
                        >
                          <AiOutlineClose />
                        </button>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Total */}
              <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-white rounded-lg border border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-gray-600">Total</span>
                  <span className="font-bold text-base sm:text-lg text-blue-700">
                    ₹{getTotalPrice()}
                  </span>
                </div>
                <div className="text-[9px] sm:text-[10px] text-gray-500 mt-1">
                  {travelers.length} seat(s) available
                </div>
              </div>

              {/* Legend */}
                    <div className="mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-gray-300 flex flex-wrap gap-2 sm:gap-3 justify-center text-[9px] sm:text-[10px]">
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 bg-white border-2 border-gray-300 rounded"></div>
                        <span className="text-gray-600">Available</span>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 bg-gray-300 border-2 border-gray-400 rounded"></div>
                        <span className="text-gray-600">Occupied</span>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 bg-green-500 border-2 border-green-600 rounded"></div>
                        <span className="text-gray-600">Selected</span>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 bg-blue-100 border-2 border-blue-400 rounded"></div>
                        <span className="text-gray-600">Premium</span>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 bg-orange-100 border-2 border-orange-400 rounded"></div>
                        <span className="text-gray-600">Exit Row</span>
                      </div>
                    </div>
            </div>

            {/* Actions */}
            <div className="p-3 sm:p-4 border-t border-gray-200 space-y-2">
              <button
                onClick={onClose}
                className="w-full py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs sm:text-sm transition-colors"
              >
                Confirm {getSelectedSeatsCount() > 0 ? `(${getSelectedSeatsCount()})` : ''}
              </button>
              <button
                onClick={() => {
                  const key = `${journeyType}|${flightIndex}`;
                  const seatObj = selectedSeats[key];
                  if (seatObj?.list) {
                    seatObj.list.forEach(seatNo => {
                      onSeatSelect(journeyType, flightIndex, seatNo, seatObj.priceMap[seatNo]);
                    });
                  }
                }}
                className="w-full py-1.5 sm:py-2 text-gray-600 hover:text-gray-800 text-[10px] sm:text-xs font-medium"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}