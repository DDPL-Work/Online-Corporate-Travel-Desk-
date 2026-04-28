import React, { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FaMinus, FaPlus, FaGlobe, FaBed, FaUser, FaChild, FaChevronRight, FaTrashAlt, FaUsers, FaChevronDown } from "react-icons/fa";
import { MdClose } from "react-icons/md";

const GOLD = "#C9A240";
const NAVY = "#000D26";

/* ─── Premium Counter Sub-component ─── */
const Counter = ({ val, setVal, min, max }) => (
  <div className="flex items-center gap-1.5 bg-white rounded-lg p-0.5 border border-slate-100 shadow-sm transition-colors">
    <button
      type="button"
      onClick={() => setVal(Math.max(min, val - 1))}
      disabled={val <= min}
      className="w-6 h-6 rounded-md bg-slate-50 flex items-center justify-center text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-all disabled:opacity-20"
    >
      <FaMinus size={6} />
    </button>
    <span className="w-4 text-center font-black text-slate-900 text-[11px]">
      {val}
    </span>
    <button
      type="button"
      onClick={() => setVal(Math.min(max, val + 1))}
      disabled={val >= max}
      className="w-6 h-6 rounded-md bg-slate-50 flex items-center justify-center text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-all disabled:opacity-20"
    >
      <FaPlus size={6} />
    </button>
  </div>
);

const AgeSelect = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const dropdownRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const handler = (e) => {
      if (
        ref.current && !ref.current.contains(e.target) &&
        (!dropdownRef.current || !dropdownRef.current.contains(e.target))
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    const scrollHandler = () => setOpen(false);
    window.addEventListener("scroll", scrollHandler, true);
    return () => {
      document.removeEventListener("mousedown", handler);
      window.removeEventListener("scroll", scrollHandler, true);
    };
  }, []);

  const handleOpen = () => {
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      });
    }
    setOpen(!open);
  };

  const ages = Array.from({ length: 18 }, (_, i) => i + 1);

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={handleOpen}
        className="w-full flex items-center justify-between border border-slate-200 rounded-md px-1.5 py-1 text-[10px] font-black text-slate-700 bg-slate-50/50 hover:bg-white transition-all shadow-sm"
      >
        <span>{value}y</span>
        <FaChevronDown className={`text-[8px] text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && createPortal(
        <div
          ref={dropdownRef}
          className="absolute bg-white border border-slate-100 rounded-lg shadow-2xl z-[9999] p-2 animate-fade-in"
          style={{ top: coords.top, left: coords.left, width: 200 }}
        >
          <div className="text-[8px] font-black text-slate-400 uppercase mb-2 tracking-widest text-center">Child Age</div>
          <div className="grid grid-cols-6 gap-1">
            {ages.map((age) => (
              <div
                key={age}
                onClick={() => {
                  onChange(age);
                  setOpen(false);
                }}
                className={`flex items-center justify-center rounded-md py-1.5 text-[10px] font-black cursor-pointer transition-colors ${
                  Number(value) === age ? "bg-amber-500 text-white" : "bg-slate-50 text-slate-600 hover:bg-amber-100 hover:text-amber-700"
                }`}
              >
                {age}
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default function HotelGuestSelection({
  rooms,
  setRooms,
  guestNationality,
  setGuestNationality,
  roomConfigs,
  setRoomConfigs,
  normalizedCountries,
  onApply,
  CountrySelector,
}) {
  const [isMobile, setIsMobile] = useState(false);
  const modalRef = useRef(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const totalAdults = roomConfigs.reduce((acc, r) => acc + (r.adults || 0), 0);
  const totalChildren = roomConfigs.reduce((acc, r) => acc + (r.children || 0), 0);

  const updateRoom = (idx, updater) => {
    setRoomConfigs((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, ...updater(r) } : r)),
    );
  };

  const removeRoom = (idx) => {
    if (rooms <= 1) return;
    setRooms(rooms - 1);
    setRoomConfigs((prev) => prev.filter((_, i) => i !== idx));
  };

  const renderRoomConfig = (room, idx) => {
    const setAdults = (val) => updateRoom(idx, () => ({ adults: val }));
    const setChildren = (val) => updateRoom(idx, (r) => {
      const count = val;
      const ages = Array.from({ length: count }, (_, i) => r.childrenAges?.[i] || 5);
      return { children: count, childrenAges: ages };
    });
    const setChildAge = (cIdx, val) => updateRoom(idx, (r) => {
      const ages = [...(r.childrenAges || [])];
      ages[cIdx] = Number(val);
      return { childrenAges: ages };
    });

    return (
      <div key={idx} className="group relative border border-slate-100 rounded-xl p-3 bg-white hover:border-amber-200 transition-all">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-amber-50 transition-all">
              <FaBed className="text-slate-400 group-hover:text-amber-600 text-[10px]" />
            </div>
            <p className="text-[10px] font-black text-slate-800">Room {idx + 1}</p>
          </div>
          {rooms > 1 && (
            <button onClick={() => removeRoom(idx)} className="w-6 h-6 rounded-md flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all">
              <FaTrashAlt size={8} />
            </button>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between bg-slate-50/50 px-2 py-1 rounded-lg transition-all group-hover:bg-white group-hover:border-slate-100 border border-transparent">
            <span className="text-[9px] font-black text-slate-500 uppercase">Adults</span>
            <Counter val={room.adults} setVal={setAdults} min={1} max={8} />
          </div>
          <div className="flex items-center justify-between bg-slate-50/50 px-2 py-1 rounded-lg transition-all group-hover:bg-white group-hover:border-slate-100 border border-transparent">
            <span className="text-[9px] font-black text-slate-500 uppercase">Children</span>
            <Counter val={room.children} setVal={setChildren} min={0} max={4} />
          </div>
        </div>

        {room.children > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-50 grid grid-cols-4 gap-1.5">
            {Array.from({ length: room.children }).map((_, cIdx) => (
              <AgeSelect
                key={cIdx}
                value={room.childrenAges?.[cIdx] || 5}
                onChange={(val) => setChildAge(cIdx, val)}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  const content = (
    <div
      ref={modalRef}
      className="bg-white rounded-t-[1.5rem] sm:rounded-[1.25rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-100 overflow-hidden flex flex-col w-full sm:w-[520px] max-w-[95vw] animate-premium-pop origin-top-right transition-all duration-300"
      style={isMobile ? {} : { position: "absolute", right: 0, zIndex: 1000 }}
    >
      {/* Ultra Compact Header */}
      <div className="bg-[#000D26] p-4 text-white relative overflow-hidden shrink-0">
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
               <span className="text-[7px] font-black uppercase tracking-[0.3em] text-amber-400 mb-0.5">Setup</span>
               <div className="flex items-center gap-2">
                  <span className="text-lg font-black leading-none">{rooms}</span>
                  <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest mt-0.5">Rooms</span>
               </div>
            </div>
            <div className="h-6 w-px bg-white/10" />
            <div className="flex flex-col">
               <span className="text-[7px] font-black uppercase tracking-[0.3em] text-amber-400 mb-0.5">Total</span>
               <div className="flex items-center gap-2">
                  <span className="text-lg font-black leading-none text-amber-400">{totalAdults + totalChildren}</span>
                  <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest mt-0.5">Guests</span>
               </div>
            </div>
          </div>
          <button onClick={onApply} className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all">
            <MdClose className="text-sm" />
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row overflow-y-auto custom-scrollbar max-h-[50vh] sm:max-h-[380px]">
        {/* Left Side: Management */}
        <div className="flex-1 p-4 bg-slate-50/40 border-b sm:border-b-0 sm:border-r border-slate-100 space-y-5">
           <div>
              <div className="flex items-center gap-1.5 mb-2.5">
                <div className="w-1 h-1 rounded-full bg-amber-500" />
                <h4 className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Nationality</h4>
              </div>
              <div className="bg-white p-0.5 rounded-lg border border-slate-100 shadow-sm">
                 <CountrySelector value={guestNationality} onChange={setGuestNationality} countries={normalizedCountries} />
              </div>
           </div>

           <div className="pt-4 border-t border-slate-100">
              <div className="p-3 rounded-xl bg-white border border-slate-100 shadow-sm space-y-2">
                 <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-slate-400 uppercase">Rooms</span>
                    <Counter val={rooms} setVal={(v) => {
                       if (v > rooms) setRoomConfigs([...roomConfigs, { adults: 1, children: 0, childrenAges: [] }]);
                       else if (v < rooms && rooms > 1) setRoomConfigs(roomConfigs.slice(0, v));
                       setRooms(v);
                    }} min={1} max={6} />
                 </div>
                 <div className="flex items-center gap-1.5 opacity-60">
                    <FaGlobe className="text-[8px] text-slate-300" />
                    <p className="text-[7px] text-slate-400 font-bold uppercase tracking-tight">Market based pricing</p>
                 </div>
              </div>
           </div>
        </div>

        {/* Right Side: Room Config */}
        <div className="flex-[1.1] p-4 bg-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-amber-500" />
              <h4 className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Details</h4>
            </div>
            <button onClick={() => { if (rooms < 6) { setRooms(rooms + 1); setRoomConfigs([...roomConfigs, { adults: 1, children: 0, childrenAges: [] }]); } }} className="text-[8px] font-black text-amber-600 uppercase tracking-widest hover:text-amber-700 transition-colors">+ Add</button>
          </div>
          <div className="space-y-2.5">{roomConfigs.map((room, idx) => renderRoomConfig(room, idx))}</div>
        </div>
      </div>

      {/* Ultra Compact Footer */}
      <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
        <div className="flex flex-col">
          <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">Confirm</p>
          <p className="text-[11px] font-black text-slate-900 mt-0.5">{rooms} Rms · {totalAdults + totalChildren} Guests</p>
        </div>
        <button onClick={onApply} className="px-6 py-2.5 bg-[#000D26] text-white rounded-lg font-black text-[11px] shadow-md hover:shadow-lg transition-all uppercase tracking-[0.2em] flex items-center gap-2 group">
          Apply
          <FaChevronRight className="text-amber-400 group-hover:translate-x-1 transition-transform text-[8px]" />
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes premiumPop { 0% { opacity: 0; transform: scale(0.98) translateY(5px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
        .animate-premium-pop { animation: premiumPop 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
      `}} />
    </div>
  );

  if (isMobile) return <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">{content}</div>;
  return content;
}
