import React, { useRef, useEffect } from "react";
import { FaMinus, FaPlus, FaGlobe } from "react-icons/fa";

const GOLD = "#C9A240";
const NAVY = "#000D26";
const NAVY_LIGHT = "#0A243D";

/* ─── Counter Sub-component ─── */
const Counter = ({ val, setVal, min, max }) => (
  <div className="flex items-center gap-3">
    <button
      type="button"
      onClick={() => setVal(Math.max(min, val - 1))}
      disabled={val <= min}
      className="w-7 h-7 rounded-full border border-slate-300 flex items-center justify-center text-slate-600 disabled:opacity-20 disabled:cursor-not-allowed hover:border-gold hover:text-gold transition-all bg-white shadow-sm"
      style={{
        "--tw-hover-border-color": GOLD,
        "--tw-hover-text-color": GOLD,
      }}
    >
      <FaMinus size={8} />
    </button>
    <span className="w-4 text-center font-extrabold text-slate-800 text-[15px]">
      {val}
    </span>
    <button
      type="button"
      onClick={() => setVal(Math.min(max, val + 1))}
      disabled={val >= max}
      className="w-7 h-7 rounded-full border border-slate-300 flex items-center justify-center text-slate-600 disabled:opacity-20 disabled:cursor-not-allowed hover:border-[#C9A240] hover:text-[#C9A240] transition-all bg-white shadow-sm"
    >
      <FaPlus size={8} />
    </button>
  </div>
);

/* ─── Shared Guest Selection Dropdown ─── */
export default function HotelGuestSelection({
  rooms,
  setRooms,
  guestNationality,
  setGuestNationality,
  roomConfigs,
  setRoomConfigs,
  normalizedCountries,
  onApply,
  CountrySelector, // Passing as prop if it's already defined in parent
}) {
  const updateRoom = (idx, updater) => {
    setRoomConfigs((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, ...updater(r) } : r)),
    );
  };

  const renderRoomConfig = (room, idx) => {
    const setAdults = (val) =>
      updateRoom(idx, () => ({ adults: Math.max(1, Math.min(8, val)) }));
    const setChildren = (val) =>
      updateRoom(idx, (r) => {
        const count = Math.max(0, Math.min(4, val));
        const ages = Array.from(
          { length: count },
          (_, i) => r.childrenAges?.[i] || 5,
        );
        return { children: count, childrenAges: ages };
      });

    const setChildAge = (cIdx, val) =>
      updateRoom(idx, (r) => {
        const ages = [...(r.childrenAges || [])];
        ages[cIdx] = Math.min(18, Math.max(1, Number(val) || 1));
        return { childrenAges: ages };
      });

    return (
      <div
        key={idx}
        className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: GOLD }} />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Room {idx + 1}
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
            {room.adults} Ad • {room.children} Ch
          </span>
        </div>

        <div className="flex flex-col sm:grid sm:grid-cols-2 gap-3">
          <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-black text-slate-500 uppercase">Adults</span>
            <Counter val={room.adults} setVal={setAdults} min={1} max={8} />
          </div>

          <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-black text-slate-500 uppercase">Children</span>
            <Counter val={room.children} setVal={setChildren} min={0} max={4} />
          </div>
        </div>

        {room.children > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
              Child Ages
            </p>
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: room.children }).map((_, cIdx) => (
                <select
                  key={cIdx}
                  value={room.childrenAges?.[cIdx] || 5}
                  onChange={(e) => setChildAge(cIdx, e.target.value)}
                  className="border border-slate-200 rounded-lg px-2 py-2 text-xs font-bold text-slate-700 focus:ring-1 focus:ring-gold outline-none bg-white transition-all"
                  style={{ "--tw-ring-color": GOLD }}
                >
                  {Array.from({ length: 18 }, (_, i) => i + 1).map((age) => (
                    <option key={age} value={age}>
                      {age} {age === 1 ? 'year' : 'years'}
                    </option>
                  ))}
                </select>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl z-50 w-full origin-top-right transition-all">
      {/* ── Header ── */}
      <div className="space-y-3 mb-4">
        {/* Row 1 */}
        <div className="flex items-center justify-between">
          <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.1em]">
            Guests & Rooms
          </h4>

          <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
            <span className="text-[9px] font-bold text-slate-400 uppercase">Rooms</span>
            <Counter val={rooms} setVal={setRooms} min={1} max={6} />
          </div>
        </div>

        {/* Row 2 - Nationality Selector */}
        <div className="w-full">
          <CountrySelector
            label="Guest Nationality"
            value={guestNationality}
            onChange={setGuestNationality}
            countries={normalizedCountries}
          />
        </div>
      </div>

      {/* ── Room Configurations ── */}
      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 border-t border-slate-100 pt-4 custom-scrollbar">
        {roomConfigs.map((room, idx) => renderRoomConfig(room, idx))}
      </div>

      {/* ── Footer Button ── */}
      <button
        type="button"
        onClick={onApply}
        className="w-full mt-6 text-white text-xs font-black py-4 rounded-xl transition-all shadow-lg active:scale-[0.98] uppercase tracking-[0.12em]"
        style={{ background: NAVY, boxShadow: `0 8px 20px -4px rgba(0,13,38,0.3)` }}
      >
        Apply Selection
      </button>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }
        
        .hover\\:text-gold:hover { color: #C9A240 !important; }
        .hover\\:border-gold:hover { border-color: #C9A240 !important; }
      `}} />
    </div>
  );
}
